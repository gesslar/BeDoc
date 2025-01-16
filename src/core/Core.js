import process from "node:process"
import Discovery from "./Discovery.js"
import HookManager from "./HookManager.js"
import { Environment } from "./include/Environment.js"
import Logger from "./Logger.js"
import DataUtil from "./util/DataUtil.js"
import FDUtil from "./util/FDUtil.js"
import ModuleUtil from "./util/ModuleUtil.js"

export default class Core {
  constructor(options) {
    this.options = { name: "bedoc", ...options }
    this.logger = new Logger(options)
    this.packageJson = this.#loadPackageJson()
  }

  static async new(options) {
    const instance = new Core({...options, name: "BeDoc"})

    const debug = instance.logger.newDebug()

    debug("Initializing Core instance", 1)
    debug("Core passed options", 3, options)

    const discovery = new Discovery(instance)

    if(options.mock)
      debug("Initiating module discovery with mock path:", 2, options.mock)
    else
      debug("Initiating module discovery", 2)

    let requestedPrinter, requestedParser

    if(options.printer) {
      requestedPrinter = options.printer
      const { printer } = await discovery.specificPrinter(options.printer)
      instance.printer = new printer(instance)
      debug("Printer loaded", 3, options.printer)
    }

    if(options.parser) {
      requestedParser = options.parser
      const { parser } = await discovery.specificParser(options.parser)
      instance.parser = new parser(instance)
      debug("Parser loaded:", 3, options.parser)
    }

    if(!instance.printer || !instance.parser) {
      const discovered = await discovery.discoverModules(options.mock)
      debug("Discovered modules:", 4, discovered)

      if(!instance.parser) {
        const language = instance.options.language
        const selectedParser = discovered.parser[language]

        if(!selectedParser) {
          instance.logger.error(`[Core.new] No parser found for language ${language}`)
          throw new Error(`[Core.new] No parser found for language ${language}`)
        }

        instance.parser = new selectedParser.parser(instance)
        requestedParser = selectedParser
      }

      if(!instance.printer) {
        const format = instance.options.format
        const selectedPrinter = discovered.printer[format]

        if(!selectedPrinter) {
          instance.logger.error(`[Core.new] No printer found for format ${format}`)
          throw new Error(`[Core.new] No printer found for format ${format}`)
        }

        instance.printer = new selectedPrinter.printer(instance)
        requestedPrinter = selectedPrinter
      }
    }

    if(!requestedParser || !requestedPrinter)
      throw new Error("[Core.new] No parser or printer loaded")

    if(!requestedParser.contract)
      throw new Error("[Core.new] Parser contract not defined")

    if(!requestedPrinter.contract)
      throw new Error("[Core.new] Printer contract not defined")

    const satisfied = DataUtil.schemaCompare(
      requestedParser.contract,
      requestedPrinter.contract
    )

    if(satisfied.status === "error") {
      instance.logger.error(`[Core.new] Module contract failed: ${satisfied.errors}`)
      throw new AggregateError(satisfied.errors, "Module contract failed")
    } else if(satisfied.status !== "success") {
      throw new Error(`[Core.new] Module contract failed: ${satisfied.message}`)
    }

    debug("Contracts satisfied between parser and printer", 2)

    const hookManager = new HookManager(instance)
    await hookManager.load()

    await hookManager.attachHooks(instance.parser)
    await hookManager.attachHooks(instance.printer)

    debug("Hooks attached to parser and printer", 2)

    return instance
  }

  async processFiles() {
    const debug = this.logger.newDebug()
    debug("Starting file processing", 1)

    const { input, output } = this.options

    debug("Processing input files", 2, input)

    if(!input)
      throw new Error("No input files specified")

    for(const fileMap of input) {
      debug("Processing file:", 2, fileMap.path)

      const fileContent = await FDUtil.readFile(fileMap)
      debug(`Read file content: ${fileMap.path} (${fileContent.length} bytes)`, 2)

      const parseResult = await this.parser.parse(fileMap.path, fileContent)

      if(parseResult.status === "error")
        throw new Error(`Failed to parse ${fileMap.path}: ${parseResult.message}`)

      debug("File parsed successfully:", 2, fileMap.path)
      debug("Parse result for ${fileMap.path}:", 4, parseResult.result)

      const printResult = await this.printer.print(
        fileMap.module,
        parseResult.result
      )

      if(printResult.status === "error")
        throw new Error(`[processFiles] Failed to print ${fileMap.path}: ${printResult.message}`)

      debug(`File printed successfully: ${fileMap.path}`, 2)
      debug(`Print result for ${fileMap.path}:`, 4, printResult)

      const { destFile, content } = printResult

      await this.#outputFile(output, destFile, content)
    }

    debug("File processing completed successfully", 1)
  }

  async #outputFile(output, destFile, content) {
    const debug = this.logger.newDebug()

    debug(`Preparing to write output to ${destFile}.`, 3, output)

    if(this.options.env === Environment.CLI && !output) {
      process.stdout.write(content + "\n")
      debug("Output written to stdout", 2)
    } else if(output && destFile) {
      const destFileMap = FDUtil.composeFilename(output.path, destFile)
      await FDUtil.writeFile(destFileMap, content)
      debug(`Output written to file: ${destFileMap.path}`, 2)
    } else {
      throw new Error("Output path and destination file required")
    }
  }

  async #loadPackageJson() {
    const packageJsonFile = await FDUtil.resolveFilename("./package.json")
    const packageJsonContent = await ModuleUtil.loadJson(packageJsonFile)
    return DataUtil.deepFreeze(packageJsonContent)
  }
}
