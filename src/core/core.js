const fs = require('fs');
const Environment = require('./env');
const Logger = require('./logger');
const Discovery = require('./discovery');
const HookManager = require('./hook_manager');
const Util = require('./util');

/**
 * @class BeDocEngine
 */
class Core {
  /**
   * @param {Object} config
   */
  constructor(options) {
    if(!options.env || typeof options.env !== 'string') {
      throw new Error('Env is required');
    }
    if(options.mock && typeof options.mock !== 'string') {
      throw new Error('Mock must be a string');
    }

    this.options = options;
    this.data = null; // Marker for initialization
  }

  static async new(options) {
    const instance = new Core(options);

    instance.logger = new Logger(instance);
    instance.discovery = new Discovery(instance);
    instance.util = Util;

    instance.logger.debug(`[New] Discovering modules in ${options.mock}`);
    const discovered = await instance.discovery.discoverModules(options.mock);
    instance.logger.debug(`[New] Discovered ${discovered.get('parsers').size} parsers and ${discovered.get('printers').size} printers`);

    const parsers = discovered.get('parsers');
    if(!parsers.size)
      throw new Error(`[New] No parsers found in ${options.mock}`);

    const printers = discovered.get('printers');
    if(!printers.size)
      throw new Error(`[New] No printers found in ${options.mock}`);

    const selectedParser = discovered.get('parsers').get(instance.options.language);
    if(!selectedParser)
      throw new Error(`[New] No parser found for language ${instance.options.language}`);

    const selectedPrinter = discovered.get('printers').get(instance.options.format);
    if(!selectedPrinter)
      throw new Error(`[New] No printer found for format ${instance.options.format}`);

    const parserClass = selectedParser.get('parser');
    const parser = new parserClass(instance);
    const printerClass = selectedPrinter.get('printer');
    const printer = new printerClass(instance);

    // We need to initialize the hook manager after the parser and printer
    // are registered, since the hook manager injects hooks into the parser
    // and printer.
    const hookManager = new HookManager(instance);
    await hookManager.load();
    hookManager.attachHooks(parser);
    hookManager.attachHooks(printer);

    instance.hookManager = hookManager;
    instance.printer = printer;
    instance.parser = parser;

    instance.data = true; // Mark as initialized
    return instance;
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
   * Processes files and generates documentation.
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async processFiles(options) {
    const {input, language, format} = options;

    this.logger.debug(`[processFiles] Input: ${JSON.stringify(input, null, 2)}`);
    this.logger.debug(`[processFiles] Language: ${JSON.stringify(language, null, 2)}`);
    this.logger.debug(`[processFiles] Format: ${JSON.stringify(format, null, 2)}`);

    const resolvedFiles = await Util.getFiles(input);
    this.logger.debug(`[processFiles] Resolved Files: ${JSON.stringify(resolvedFiles, null, 2)}`);

    const {parser, printer} = this;
    if(!parser)
      throw new Error(`[processFiles] No parser registered for language: ${language}`);
    if(!printer)
      throw new Error(`[processFiles] No printer registered for format: ${format}`);

    this.logger.debug(`[processFiles] Options: ${JSON.stringify(this.options)}`);

    for(const file of resolvedFiles) {
      const fileMap = await Util.resolveFile(file);

      const name = fileMap.get('name');
      const path = fileMap.get('path');
      const module = fileMap.get('module');

      this.logger.debug(`[processFiles] Processing file: ${JSON.stringify(fileMap, null, 2)}`);
      try {
        this.logger.debug("Path", path);
        const source = await Util.readFile(path);
        const parseResponse = await parser.parse(path, source);
        if(!parseResponse.success) {
          const {file, line, lineNumber, message} = parseResponse;
          this.logger.error(`[processFiles] Activity: Parse\nFile: ${file}, Line: ${lineNumber}\nContext: ${line}\nError: ${message}`);
        }

        const printResponse = await printer.print(module, parseResponse.result);
        if(printResponse.status !== 'success') {
          const {file, line, message} = printResponse;
          throw new Error(`[processFiles] Activity: Print\nFile: ${file}\nContext: ${line}\nError: ${message}`);
        }

        const {destFile, content} = printResponse;
        this.logger.debug(`[processFiles] Print response: ${JSON.stringify(printResponse, null, 2)}`);
        const writeResult = await this.outputFile(options.output, destFile, content);

        this.logger.debug(`[processFiles] Processed file: ${name}`);
        return {file, destFile: writeResult.destFile, status: writeResult.status, message: writeResult.message, content: content};
      } catch(error) {
        this.logger.error(`[processFiles] Failed to process file ${name}\n${error.message}\n${error.stack}`);
        return {file, destFile: null, status: 'error', message: error.message, stack: error.stack};
      }
    }

    return result;
  }

  /**
   * Writes content to the output file or prints to stdout if in CLI mode.
   * @param {string} output
   * @param {string} destFile
   * @param {string} content
   * @returns {Promise<void>}
   */
  async outputFile(output, destFile, content) {
    this.logger.debug(`[outputFile] Output: ${output}, DestFile: ${destFile}, Content length: ${content.length}`);
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
        const outputPath = await Util.resolvePath(output);
        const resolvedDestFile = `${outputPath}/${destFile}`;
        await fs.promises.writeFile(resolvedDestFile, content, 'utf8');
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
