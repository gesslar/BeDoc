import fs from "fs";
import Environment from "./env.js";
import Logger from "./logger.js";
import Discovery from "./discovery.js";
import HookManager from "./hook_manager.js";
import FDUtil from "./util/fd.js";
import DataUtil from "./util/data.js";
import ModuleUtil from "./util/module.js";
import StringUtil from "./util/string.js";
import ValidUtil from "./util/valid.js";


/**
 * @class BeDocEngine
 */
export default class Core {
  /**
   * @param {Object} options
   */
  constructor(options) {
    if(!options.env || typeof options.env !== "string") {
      throw new Error("Env is required");
    }
    if(options.mock && typeof options.mock !== "string") {
      throw new Error("Mock must be a string");
    }

    this.options = options;
    console.log(`[Core.Constructor] options`, options);
  }

  /**
   * @param {Object} options
   * @returns {Promise<Core>}
   */
  static async new(options) {
    const instance = new Core(options);
    const logger = new Logger(instance);
    instance.logger = logger;
    const fdUtil = new FDUtil(instance);
    instance.fdUtil = fdUtil;

    // Utilities
    instance.string = StringUtil;
    instance.valid = ValidUtil;
    instance.module = ModuleUtil;
    instance.data = DataUtil;

    const discovery = new Discovery(instance);
    logger.debug(`[New] Discovering modules in ${options.mock}`, 4);
    const discovered = await discovery.discoverModules(options.mock);
    logger.debug(`[New] Discovered ${discovered.get("parsers").size} parsers and ${discovered.get("printers").size} printers`);

    const parsers = discovered.get("parsers");
    if(!parsers.size)
      throw new Error(`[New] No parsers found in ${options.mock}`);

    const printers = discovered.get("printers");
    if(!printers.size)
      throw new Error(`[New] No printers found in ${options.mock}`);

    const selectedParser = discovered.get("parsers").get(instance.options.language);
    if(!selectedParser)
      throw new Error(`[New] No parser found for language ${instance.options.language}`);

    const selectedPrinter = discovered.get("printers").get(instance.options.format);
    if(!selectedPrinter)
      throw new Error(`[New] No printer found for format ${instance.options.format}`);

    const parserClass = selectedParser.get("parser");
    const parser = new parserClass(instance);
    const printerClass = selectedPrinter.get("printer");
    const printer = new printerClass(instance);

    instance.parser = parser;
    instance.printer = printer;

    // We need to initialize the hook manager after the parser and printer
    // are registered, since the hook manager injects hooks into the parser
    // and printer.
    const hookManager = new HookManager(instance);
    await hookManager.load();

    hookManager.attachHooks(parser);
    hookManager.attachHooks(printer);

    return instance;
  }

  /**
   * @param {Object} config
   * @returns true
   * @throws {Error}
   **/
  validateConfig(config) {
    if(!config)
      throw new Error("Config is required");

    const have = Object.keys(config).filter((key) =>
      Configuration.required.includes(key)
    );
    const haveNot = Configuration.required.filter(
      (key) => !have.includes(key)
    );

    if(have.length !== Configuration.required.length)
      throw new Error(
        `Config is missing required fields: ${haveNot.join(", ")}`
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
    if(!this.reader || typeof this.reader.validFile !== "function") {
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
   * @returns {Promise<Object>}
   */
  async processFiles() {
    const {input, language, format, output} = this.options;

    console.log(this.options);

    this.logger.debug(`[processFiles] Input: ${JSON.stringify(input, null, 2)}`);
    this.logger.debug(`[processFiles] Language: ${JSON.stringify(language, null, 2)}`);
    this.logger.debug(`[processFiles] Format: ${JSON.stringify(format, null, 2)}`);

    const resolvedFiles = await this.fdUtil.getFiles(input);
    this.logger.debug(`[processFiles] Resolved Files: ${JSON.stringify(resolvedFiles, null, 2)}`);

    const {parser, printer} = this;
    if(!parser)
      throw new Error(`[processFiles] No parser registered for language: ${language}`);
    if(!printer)
      throw new Error(`[processFiles] No printer registered for format: ${format}`);

    this.logger.debug(`[processFiles] Options: ${JSON.stringify(this.options)}`);

    for(const file of resolvedFiles) {
      const fileMap = await this.fdUtil.resolveFile(file);

      const name = fileMap.get("name");
      const absoluteUri = fileMap.get("absoluteUri");
      const module = fileMap.get("module");

      this.logger.debug(`[processFiles] Processing file: ${absoluteUri}`);
      try {
        this.logger.debug(`[processFiles] Reading file: ${absoluteUri}`);
        const source = await this.fdUtil.readFile(fileMap);
        this.logger.debug(`[processFiles] Read file: ${absoluteUri}`);
        this.logger.debug(`[processFiles] Parsing file: ${absoluteUri}`);
        const parseResponse = await parser.parse(absoluteUri, source);
        this.logger.debug(`[processFiles] Parsed file: ${absoluteUri}`);
        if(!parseResponse.success) {
          const {file, line, lineNumber, message} = parseResponse;
          throw new Error(`[processFiles] Activity: Parse\nFile: ${file}, Line: ${lineNumber}\nContext: ${line}\nError: ${message}`);
        }

        this.logger.debug(`[processFiles] Printing file: ${absoluteUri}`);
        const printResponse = await printer.print(module, parseResponse.result);
        this.logger.debug(`[processFiles] Printed file: ${absoluteUri}`);
        if(printResponse.status !== "success") {
          const {file, line, message} = printResponse;
          throw new Error(`[processFiles] Activity: Print\nFile: ${file}\nContext: ${line}\nError: ${message}`);
        }

        const {destFile, content} = printResponse;
        this.logger.debug(`[processFiles] Print response: ${JSON.stringify(printResponse, null, 2)}`);
        const writeResult = await this.outputFile(output, destFile, content);

        this.logger.debug(`[processFiles] Processed file: ${name}`);
        return {file, destFile: writeResult.destFile, status: writeResult.status, message: writeResult.message, content: content};
      } catch(error) {
        this.logger.error(`[processFiles] Failed to process file ${name}\n${error.message}\n${error.stack}`);
        return {file, destFile: null, status: "error", message: error.message, stack: error.stack};
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
    if(this.options.env === Environment.CLI && !output) {
      // Print to stdout if no output file is specified in CLI mode
      process.stdout.write(content + "\n");
      this.logger.debug("[outputFile] Output written to stdout.");
      return {
        destFile: null,
        status: "success",
        message: "Output written to stdout.",
      };
    } else if(output && destFile) {
      // Write to a file if outputPath is specified
      const outputPath = await this.fdUtil.resolveDir(output);
      const destFileMap = await this.fdUtil.composeFile(outputPath.get("path"), destFile);
      this.logger.debug(`[outputFile] Resolved Dest File: ${destFileMap.get("path")}`);
      this.fdUtil.writeFile(destFileMap, content);
      this.logger.debug(`[outputFile] Successfully wrote to output: ${JSON.stringify(destFileMap)}`);
      return {
        destFile: destFileMap.get("path"),
        status: "success",
        message: `Output written to file ${destFileMap.get("path")}`,
      };
    } else {
      // For non-CLI environments, an output file must be specified
      this.logger.error("[outputFile] Output path and destination file is required for non-CLI environments.");
    }
  }
}
