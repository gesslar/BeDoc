import Environment from "./env.js";
import Logger from "./logger.js";
import Discovery from "./discovery.js";
import HookManager from "./hook_manager.js";
import FDUtil from "./util/fd.js";
import DataUtil from "./util/data.js";
import ModuleUtil from "./util/module.js";
import StringUtil from "./util/string.js";
import ValidUtil from "./util/valid.js";
import { CoreOptions, UserOptions } from "./types/config.js";
import { ParseResponse, PrintResponse } from "./types.js";
import { ICore } from "./types/core.js";
import { ConfigurationParameters } from "./configuration.js";

export default class Core implements ICore {
  public options: CoreOptions;
  public logger!: Logger;
  public fdUtil!: FDUtil;
  public string!: typeof StringUtil;
  public valid!: typeof ValidUtil;
  public module!: typeof ModuleUtil;
  public data!: typeof DataUtil;
  public parser!: { parse: (file: string, content: string) => Promise<ParseResponse> };
  public printer!: { print: (module: string, content: any) => Promise<PrintResponse> };

  private validateOptions(options: UserOptions): CoreOptions {
    // Check required options
    for (const [key, config] of Object.entries(ConfigurationParameters)) {
      if (config.required && !(key in options)) {
        throw new Error(`[Core] Required option missing: ${key}`);
      }
    }

    // Validate option types
    const validatedOptions: Partial<CoreOptions> = {};
    for (const [key, value] of Object.entries(options)) {
      const config = ConfigurationParameters[key as keyof typeof ConfigurationParameters];

      // Skip unknown options
      if (!config) continue;

      // Validate type
      const expectedType = config.type;
      const actualType = typeof value;
      if (value !== undefined && actualType !== expectedType) {
        throw new Error(`[Core] Invalid type for ${key}: expected ${expectedType}, got ${actualType}`);
      }

      // Validate path subtypes if needed
      if (config.subtype?.path && typeof value === "string") {
        const { type, mustExist } = config.subtype.path;
        // Path validation would go here - for now we just pass it through
      }

      // Use default if value is undefined
      validatedOptions[key as keyof CoreOptions] = value ?? config.default;
    }

    // Ensure we have all required properties for CoreOptions
    return validatedOptions as CoreOptions;
  }

  constructor(options: CoreOptions | UserOptions) {
    this.options = 'env' in options ? options as CoreOptions : this.validateOptions(options as UserOptions);
  }

  static async new(options: CoreOptions | UserOptions): Promise<Core> {
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

  async processFiles(): Promise<{ status: string; message: string }> {
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
      if (parseResult.status === "error") {
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
  async outputFile(
    output: string | undefined,
    destFile: string,
    content: string
  ): Promise<{ destFile: string | null; status: string; message: string }> {
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
