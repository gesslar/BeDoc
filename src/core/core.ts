import Environment from "./env.js";
import Logger from "./logger.js";
import Discovery from "./discovery.js";
import HookManager from "./hook_manager.js";
import FDUtil from "./util/fd.js";
import DataUtil from "./util/data.js";
import ModuleUtil from "./util/module.js";
import StringUtil from "./util/string.js";
import ValidUtil from "./util/valid.js";
import { CoreOptions, ParseResponse, PrintResponse, ParserMap, PrinterMap, ParserClass, PrinterClass } from "./types.js";

export default class Core {
  private options: CoreOptions;
  public logger!: Logger;
  public fdUtil!: FDUtil;
  public string!: typeof StringUtil;
  public valid!: typeof ValidUtil;
  public module!: typeof ModuleUtil;
  public data!: typeof DataUtil;
  public parser!: { parse: (file: string, content: string) => Promise<ParseResponse> };
  public printer!: { print: (module: string, content: any) => Promise<PrintResponse> };

  constructor(options: CoreOptions) {
    if (!options.env || typeof options.env !== "string") {
      throw new Error("Env is required");
    }
    if (options.mock && typeof options.mock !== "string") {
      throw new Error("Mock must be a string");
    }

    this.options = options;
  }

  static async new(options: CoreOptions): Promise<Core> {
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
    const discovered = await discovery.discoverModules(options.mock);

    const parsers = discovered.parser;
    const numParsers = Object.keys(parsers).length;
    if (numParsers === 0)
      throw new Error(`[New] No parsers discovered.`);
    const printers = discovered.printer;
    const numPrinters = Object.keys(printers).length;
    if (numPrinters === 0)
      throw new Error(`[New] No printers discovered.`);

    logger.debug(`[New] Discovered ${numParsers} parsers and ${numPrinters} printers`);

    // Select the parser based on the language
    const language = instance.options.language;
    const selectedParser = parsers[language];
    if (!selectedParser)
      throw new Error(`[New] No parser found for language ${language}`);

    // Initialize the parser
    const parserClass = selectedParser.parser;
    if (!parserClass)
      throw new Error(`[New] Invalid parser found for language ${language}`);
    // Instantiate the parser and assign it to the instance
    const parser = new parserClass(instance);
    instance.parser = parser;

    // Select the printer based on the format
    const format = instance.options.format;
    const selectedPrinter = printers[format];
    if (!selectedPrinter)
      throw new Error(`[New] No printer found for format ${format}`);

    // Initialize the printer
    const printerClass = selectedPrinter.printer;
    if (!printerClass)
      throw new Error(`[New] Invalid printer found for format ${format}`);
    // Instantiate the printer and assign it to the instance
    const printer = new printerClass(instance);
    instance.printer = printer;

    // We need to initialize the hook manager after the parser and printer
    // are registered, since the hook manager injects hooks into the parser
    // and printer.
    const hookManager = new HookManager(instance);
    await hookManager.load();

    const parserHooks = hookManager.attachHooks(parser);
    const printerHooks = hookManager.attachHooks(printer);

    instance.logger.debug(`[New] Attached ${parserHooks} parser hooks and ${printerHooks} printer hooks`);

    return instance;
  }

  async processFiles(): Promise<Object> {
    this.logger.debug("Processing files...");

    // Get input files
    const { input, output } = this.options;

    if (!input) {
      throw new Error("No input files specified");
    }

    const resolvedFiles = await this.fdUtil.getFiles(input);

    // Process each file
    for (const file of resolvedFiles) {
      this.logger.debug(`Processing file: ${file}`);

      // Read the file
      const resolvedFile = await this.fdUtil.resolveFile(file);
      const fileContent = await this.fdUtil.readFile(resolvedFile);

      // Parse the file
      this.logger.debug(`Parsing file: ${resolvedFile.path}`);
      const parseResult = await this.parser.parse(resolvedFile.path, fileContent);
      if (!parseResult.success) {
        throw new Error(`Failed to parse ${resolvedFile.path}: ${parseResult.message}`);
      }

      // Print the results
      this.logger.debug(`Printing results for: ${resolvedFile.path}`);
      const printResult = await this.printer.print(resolvedFile.module, parseResult.result) as PrintResponse;

      if (!printResult)
        throw new Error(`Failed to print ${resolvedFile.path}: ${printResult}`);

      if (printResult.status === "error")
        throw new Error(`Failed to print ${resolvedFile.path}: ${printResult.message}`);

      const { destFile, content } = printResult;
      if (!destFile || !content)
        throw new Error(`Failed to print ${resolvedFile.path}: ${printResult.message}`);

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
  async outputFile(output: string | undefined, destFile: string, content: string): Promise<Object> {
    this.logger.debug(`[outputFile] Output: ${output}, DestFile: ${destFile}, Content length: ${content.length}`);
    if (this.options.env === Environment.CLI && !output) {
      // Print to stdout if no output file is specified in CLI mode
      process.stdout.write(content + "\n");
      this.logger.debug("[outputFile] Output written to stdout.");
      return {
        destFile: null,
        status: "success",
        message: "Output written to stdout.",
      };
    } else if (output && destFile) {
      // Write to a file if outputPath is specified
      const outputPath = await this.fdUtil.resolveDir(output);
      const destFileMap = await this.fdUtil.composeFilename(outputPath.path, destFile);
      this.logger.debug(`[outputFile] Resolved Dest File: ${destFileMap.path}`);
      this.fdUtil.writeFile(destFileMap, content);
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
