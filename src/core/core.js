import Logger from "./logger.js";
import Discovery from "./discovery.js";
import HookManager from "./hook_manager.js";
import FDUtil from "./util/fd.js";
import DataUtil from "./util/data.js";
import ModuleUtil from "./util/module.js";
import StringUtil from "./util/string.js";
import ValidUtil from "./util/valid.js";
import { Environment }from "./include/environment.js";

export default class Core {
  constructor(options) {
    this.options = options;
  }

  static async new(options) {
    const instance = new Core(options);
    const logger = new Logger(instance);
    instance.logger = logger;
    const fdUtil = new FDUtil();
    instance.fdUtil = fdUtil;

    // Utilities
    instance.string = StringUtil;
    instance.valid = ValidUtil;
    instance.module = ModuleUtil;
    instance.data = DataUtil;

    const discovery = new Discovery(instance);
    logger.debug(`[New] Discovering modules in ${options.mock}`, 4);

    if(options.printer) {
      const { printer } = await discovery.specificPrinter(options.printer);
      instance.printer = new printer(instance);
    }

    if(options.parser) {
      const { parser } = await discovery.specificParser(options.parser);
      instance.parser = new parser(instance);
    }

    if(!instance.printer || !instance.parser) {
      const discovered = await discovery.discoverModules(options.mock);

      if(!instance.parser) {
        const parsers = discovered.parser;
        const numParsers = Object.keys(parsers).length;
        if(numParsers === 0)
          throw new Error("[New] No parsers discovered.");

        // Select the parser based on the language
        const language = instance.options.language;
        const selectedParser = parsers[language];
        if(!selectedParser)
          throw new Error(`[New] No parser found for language ${language}`);

        // Initialize the parser
        const parserClass = selectedParser.parser;
        if(!parserClass)
          throw new Error(`[New] Invalid parser found for language ${language}`);
        // Instantiate the parser and assign it to the instance
        const parser = new parserClass(instance);
        instance.parser = parser;
      }

      if(!instance.printer) {
        const printers = discovered.printer;
        const numPrinters = Object.keys(printers).length;
        if(numPrinters === 0)
          throw new Error("[New] No printers discovered.");

        // Select the printer based on the format
        const format = instance.options.format;
        const selectedPrinter = printers[format];
        if(!selectedPrinter)
          throw new Error(`[New] No printer found for format ${format}`);

        // Initialize the printer
        const printerClass = selectedPrinter.printer;
        if(!printerClass)
          throw new Error(`[New] Invalid printer found for format ${format}`);
        // Instantiate the printer and assign it to the instance
        const printer = new printerClass(instance);
        instance.printer = printer;
      }
    }

    if(!instance.parser)
      throw new Error("[New] No parser found");

    if(!instance.printer)
      throw new Error("[New] No printer found");

    // We need to initialize the hook manager after the parser and printer
    // are registered, since the hook manager injects hooks into the parser
    // and printer.
    const hookManager = new HookManager(instance);
    await hookManager.load();

    const parserHooks = hookManager.attachHooks(instance.parser);
    const printerHooks = hookManager.attachHooks(instance.printer);

    instance.logger.debug(`[New] Attached ${parserHooks} parser hooks and ${printerHooks} printer hooks`);

    return instance;
  }

  async processFiles() {
    this.logger.debug("Processing files...");

    // Get input files - these are already FileMap objects from validation
    const { input, output } = this.options;

    if(!input) {
      throw new Error("No input files specified");
    }

    console.log("input", input);

    // Process each file
    for(const fileMap of input) {
      this.logger.debug(`Processing file: ${fileMap.path}`);

      // Read the file using the FileMap
      const fileContent = await this.fdUtil.readFile(fileMap);

      // Parse the file
      this.logger.debug(`Parsing file: ${fileMap.path}`);
      const parseResult = await this.parser.parse(fileMap.path, fileContent);
      if(parseResult.status === "error") {
        throw new Error(`Failed to parse ${fileMap.path}: ${parseResult.message}`);
      }

      // Print the results
      this.logger.debug(`Printing results for: ${fileMap.path}`);
      const printResult = await this.printer.print(fileMap.module, parseResult.result);

      if(!printResult)
        throw new Error(`Failed to print ${fileMap.path}: ${printResult}`);

      if(printResult.status === "error")
        throw new Error(`Failed to print ${fileMap.path}: ${printResult.message}`);

      const { destFile, content } = printResult;
      if(!destFile || !content)
        throw new Error(`Failed to print ${fileMap.path}: ${printResult.message}`);

      const writeResult = await this.outputFile(output, destFile, content);
    }

    return {
      status: "success",
      message: "Files processed successfully",
    };
  }

  /**
   * Writes content to the output file or prints to stdout if in CLI mode.
   * @param output
   * @param destFile
   * @param content
   * @returns {Promise<Object>}
   */
  async outputFile(output, destFile, content) {
    this.logger.debug(`[outputFile] Output: ${output?.path}, DestFile: ${destFile}, Content length: ${content.length}`);
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
      // Use the already resolved output directory
      const destFileMap = await this.fdUtil.composeFilename(output.path, destFile);
      this.logger.debug(`[outputFile] Resolved Dest File: ${destFileMap.path}`);
      await this.fdUtil.writeFile(destFileMap, content);
      this.logger.debug(`[outputFile] Successfully wrote to output: ${JSON.stringify(destFileMap)}`);
      return {
        destFile: destFileMap.path,
        status: "success",
        message: `Output written to file ${destFileMap.path}`,
      };
    }

    // For non-CLI environments, an output file must be specified
    throw new Error("[outputFile] Output path and destination file is " +
      "required for non-CLI environments.");
  }
}
