import {process} from "node:process"
import {console} from "node:console"
import Discovery from "./Discovery.js"
import HookManager from "./HookManager.js"
import { Environment } from "./include/Environment.js"
import Logger from "./Logger.js"
import FDUtil from "./util/FDUtil.js"
import ModuleContract from "./ModuleContract.js"
export default class Core {
  constructor(options) {
    this.options = options
  }

  static async new(options) {
    const instance = new Core(options)
    const logger = new Logger(instance)
    instance.logger = logger

    const discovery = new Discovery(instance)
    logger.debug(`[New] Discovering modules in ${options.mock}`, 4)

    let requestedPrinter, requestedParser

    if(options.printer) {
      requestedPrinter = options.printer
      const { printer } = await discovery.specificPrinter(options.printer)
      instance.printer = new printer(instance)
    }

    if(options.parser) {
      requestedParser = options.parser
      const { parser } = await discovery.specificParser(options.parser)
      instance.parser = new parser(instance)
    }

    if(!instance.printer || !instance.parser) {
      const discovered = await discovery.discoverModules(options.mock)
      console.log(discovered)
      if(!instance.parser) {
        const parsers = discovered.parser
        const numParsers = Object.keys(parsers).length
        if(numParsers === 0)
          throw new Error("[New] No parsers discovered.")

        // Select the parser based on the language
        const language = instance.options.language
        const selectedParser = parsers[language]
        if(!selectedParser)
          throw new Error(`[New] No parser found for language ${language}`)

        // Instantiate the parser and assign it to the instance
        const parser = new selectedParser.parser(instance)
        instance.parser = parser
        requestedParser = selectedParser
      }

      if(!instance.printer) {
        const printers = discovered.printer
        const numPrinters = Object.keys(printers).length
        if(numPrinters === 0)
          throw new Error("[New] No printers discovered.")

        // Select the printer based on the format
        const format = instance.options.format
        const selectedPrinter = printers[format]
        if(!selectedPrinter)
          throw new Error(`[New] No printer found for format ${format}`)

        // Instantiate the printer and assign it to the instance
        const printer = new selectedPrinter.printer(instance)
        instance.printer = printer
        requestedPrinter = selectedPrinter
      }
    }

    if(!instance.parser)
      throw new Error(`[New] No parser found for language ${instance.options.language}`)

    if(!instance.printer)
      throw new Error(`[New] No printer found for format ${instance.options.format}`)

    const contract = new ModuleContract(instance)
    const result = contract.satisfies(requestedParser, requestedPrinter)
    if(!result?.success)
      throw new Error(`[New] Module contract failed: ${result?.errors?.join(", ")}`)

    // We need to initialize the hook manager after the parser and printer
    // are registered, since the hook manager injects hooks into the parser
    // and printer.
    const hookManager = new HookManager(instance)
    await hookManager.load()

    const parserHooks = hookManager.attachHooks(instance.parser)
    const printerHooks = hookManager.attachHooks(instance.printer)

    instance.logger.debug(`[New] Attached ${parserHooks} parser hooks and `+
      `${printerHooks} printer hooks`)

    return instance
  }

  async processFiles() {
    let result

    this.logger.debug("Processing files...")

    // Get input files - these are already FileMap objects from validation
    const { input, output } = this.options

    if(!input) {
      throw new Error("No input files specified")
    }

    // Process each file
    for(const fileMap of input) {
      this.logger.debug(`Processing file: ${fileMap.path}`)

      // Read the file using the FileMap
      const fileContent = await FDUtil.readFile(fileMap)

      // Parse the file
      this.logger.debug(`Parsing file: ${fileMap.path}`)
      const parseResult = await this.parser.parse(fileMap.path, fileContent)
      if(parseResult.status === "error") {
        throw new Error(`Failed to parse ${fileMap.path}: ${parseResult.message}`)
      }

      // Print the results
      this.logger.debug(`Printing results for: ${fileMap.path}`)
      const printResult = await this.printer.print(
        fileMap.module,
        parseResult.result
      )

      if(!printResult)
        throw new Error(`Failed to print ${fileMap.path}: ${printResult}`)

      if(printResult.status === "error")
        throw new Error(`Failed to print ${fileMap.path}: ${printResult.message}`)

      const { destFile, content } = printResult
      if(!destFile || !content)
        throw new Error(`Failed to print ${fileMap.path}: ${printResult.message}`)

      result = await this.outputFile(output, destFile, content)
    }

    return {
      status: "success",
      message: "Files processed successfully",
      result
    }
  }

  /**
   * Writes content to the output file or prints to stdout if in CLI mode.
   * @param output
   * @param destFile
   * @param content
   * @returns {Promise<Object>}
   */
  async outputFile(output, destFile, content) {
    this.logger.debug(`[outputFile] Output: ${output?.path}, DestFile: `+
      `${destFile}, Content length: ${content.length}`)
    if(this.options.env === Environment.CLI && !output) {
      // Print to stdout if no output file is specified in CLI mode
      process.stdout.write(content + "\n")
      this.logger.debug("[outputFile] Output written to stdout.")
      return {
        destFile: null,
        status: "success",
        message: "Output written to stdout.",
      }
    } else if(output && destFile) {
      // Use the already resolved output directory
      const destFileMap = await FDUtil.composeFilename(output.path, destFile)
      this.logger.debug(`[outputFile] Resolved Dest File: ${destFileMap.path}`)
      await FDUtil.writeFile(destFileMap, content)
      this.logger.debug(`[outputFile] Successfully wrote to output: ${JSON.stringify(destFileMap)}`)
      return {
        destFile: destFileMap.path,
        status: "success",
        message: `Output written to file ${destFileMap.path}`,
      }
    }

    // For non-CLI environments, an output file must be specified
    throw new Error("[outputFile] Output path and destination file is " +
      "required for non-CLI environments.")
  }
}
