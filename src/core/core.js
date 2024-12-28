const fs = require('fs');
const path = require('path');
const Environment = require('./env');
const Logger = require('./logger');
const Registry = require('./registry');
const Discovery = require('./discovery');

/**
 * @class BeDocEngine
 */
class Core {
  /**
   * @param {Object} config
   */
  constructor(options) {
    if(!options.env || typeof options.env !== 'string') throw new Error('Env is required');
    if(options.mock && typeof options.mock !== 'string') throw new Error('Mock must be a string');

    this.options = options;
    this.logger = new Logger(this);
    this.registry = new Registry(this);
    this.discovery = new Discovery(this);

    const {parsers, printers} = this.discovery.discoverModules(this.options.mock);

    parsers.forEach(([meta, parser]) => this.registry.registerParser(meta, parser));
    printers.forEach(([meta, printer]) => this.registry.registerPrinter(meta, printer));
  }

  resolvePath(_path = null) {
    if(!_path)
      throw new Error('Path is required');

    return path.resolve(process.cwd(), _path);
  }

  resolveFile(_path, file) {
    if(!file || typeof file !== 'string')
      throw new Error('File is required');

    return {
      name: file,
      path: path.resolve(_path, file),
      module: file.split('/').pop().split('.').shift()
    };
  }

  /**
   * @param {Object} config
   * @returns true
   * @throws {Error}
   **/
  validateConfig(config) {
    if(!config)
      throw new Error('Config is required');

    const have = Object.keys(config).filter((key) =>
      Configuration.required.includes(key)
    );
    const haveNot = Configuration.required.filter(
      (key) => !have.includes(key)
    );

    if(have.length !== Configuration.required.length)
      throw new Error(
        `Config is missing required fields: ${haveNot.join(', ')}`
      );

    return true;
  }

  /**
   * Retrieve all files matching a specific extension in a directory.
   * @param {string} dirPath - The directory to search.
   * @param {string} extension - The file extension to filter by.
   * @returns {string[]} Array of file paths.
   */
  getFiles(dirPath, extension) {
    try {
      const fileNames = fs.readdirSync(dirPath).filter(
        file => file.endsWith(extension)
      );
      this.logger.debug(`[getFiles] Found ${fileNames.length} files in ${dirPath} with extension "${extension}".`);
      return fileNames;
    } catch(error) {
      this.logger.error(`[getFiles] Failed to read directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reads the content of a file asynchronously.
   * @param {string} filePath
   * @returns {Promise<string>}
   * @throws {Error}
   */
  async readFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      this.logger.debug(`[readFile] Successfully read file: ${filePath}`);
      return content;
    } catch(error) {
      this.logger.error(`[readFile] Failed to read file: ${filePath}`);
      throw error;
    }
  }

  /**
   * Determines if a file is valid for processing (language-specific logic).
   * @param {string} content
   * @param {string} filePath
   * @returns {boolean}
   */
  validFile(content, filePath) {
    if(!this.reader || typeof this.reader.validFile !== 'function') {
      // No reader or no validFile method, assume file is valid
      return true;
    }

    try {
      // Call the external reader's validFile method
      const isValid = this.reader.validFile(content, filePath);
      return isValid !== undefined ? isValid : true; // Default to true if no result
    } catch(error) {
      this.logger.error(`[validFile] Error validating file "${filePath}": ${error.message}`);
      return false; // Treat as invalid if validation fails
    }
  }

  /**
   * Processes all files matching the given extension in a directory.
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async processDirectory(options) {
    const {directory, extension, language, format} = options;
    const files = this.getFiles(directory, extension);

    if(!files.length) {
      this.logger.warn(`[processDirectory] No files found in ${directory} with extension "${extension}".`);
      return;
    }

    const results = await this.processFiles(options, files);
    this.logger.debug(`[processDirectory] Processed ${results.length} files.`);
    return results;
  }

  /**
   * Processes files and generates documentation.
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async processFiles(options, files = []) {
    const {input = [], language, format} = options;

    if(!files.length && !input.length)
      this.logger.error(`[processFiles] No files or input provided`);
    else if(files.length && input.length)
      this.logger.error(`[processFiles] Cannot process both files and input`);
    else if(!input.length)
      input.push(...files);

    const parserEngine = this.registry.getParser(language);
    if(!parserEngine)
      this.logger.error(`[processFiles] No parser registered for language: ${language}`);

    const printerEngine = this.registry.getPrinter(format);
    if(!printerEngine)
      this.logger.error(`[processFiles] No printer registered for format: ${format}`);

    const parser = new parserEngine(this);
    const printer = new printerEngine(this);

    this.logger.debug(`[processFiles] Options: ${JSON.stringify(this.options)}`);

    const fileObjects = input.map(file => this.resolveFile(options.directory, file));
    const filePromises = fileObjects.map(async file => {
      const {name, path, module} = file;
      try {
        const content = await fs.promises.readFile(path, 'utf8');
        const parseResponse = parser.parse(path, content);
        if(!parseResponse.success) {
          const {file, line, lineNumber, message} = parseResponse;
          this.logger.error(`[processFiles] Activity: Parse\nFile: ${file}, Line: ${lineNumber}\nContext: ${line}\nError: ${message}`);
        }
        const printResponse = await printer.print(module, parseResponse.result);
        if(printResponse.status !== 'success') {
          const {file, line, message} = printResponse;
          this.logger.error(`[processFiles] Activity: Print\nFile: ${file}\nContext: ${line}\nError: ${message}`);
        }

        const {destFile, content: printedContent} = printResponse;
        const writeResult = await this.outputFile(options.output, destFile, printedContent);

        this.logger.debug(`[processFiles] Processed file: ${name}`);
        return {file, destFile: writeResult.destFile, status: writeResult.status, message: writeResult.message, content: printedContent};
      } catch(error) {
        this.logger.error(`[processFiles] Failed to process file ${name}\n${error.message}\n${error.stack}`);
        return {file, destFile: null, status: 'error', message: error.message, stack: error.stack};
      }
    });

    return Promise.all(filePromises);
  }

  /**
   * Writes content to the output file or prints to stdout if in CLI mode.
   * @param {string} output
   * @param {string} destFile
   * @param {string} content
   * @returns {Promise<void>}
   */
  async outputFile(output, destFile, content) {
    try {
      if(this.options.env === Environment.CLI && !output) {
        // Print to stdout if no output file is specified in CLI mode
        process.stdout.write(content + '\n');
        this.logger.debug('[outputFile] Output written to stdout.');
        return {
          destFile: null,
          status: 'success',
          message: 'Output written to stdout.',
        };
      } else if(output && destFile) {
        // Write to a file if outputPath is specified
        const resolvedDestFile = this.resolveFile(output, destFile);
        await fs.promises.writeFile(resolvedDestFile.path, content, 'utf8');
        this.logger.debug(`[outputFile] Successfully wrote to output: ${JSON.stringify(resolvedDestFile)}`);
        return {
          destFile: resolvedDestFile,
          status: 'success',
          message: `Output written to file ${resolvedDestFile.path}`,
        };
      } else {
        // For non-CLI environments, an output file must be specified
        this.logger.error(`[outputFile] Output path and destination file is required for non-CLI environments.`);
      }
    } catch(error) {
      this.logger.error(`[outputFile] Failed to write output: ${error.message}`);
      throw error;
    }
  }

  /**
   * @param {string} message
   */
  reportError(message) {
    this.logger.error(message);
  }
}

module.exports = Core;
