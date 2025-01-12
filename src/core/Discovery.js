import { execSync } from "child_process"
import FDUtil from "./util/FDUtil.js"
import ModuleUtil from "./util/ModuleUtil.js"

const isParserMeta = meta => "language" in meta
const isPrinterMeta = meta => "format" in meta

export default class Discovery {
  constructor(core) {
    this.logger = core.logger
  }

  /**
   * Process a module and register any discovered parsers/printers
   *
   * @param discovered - The current discovery state
   * @param moduleSource - The module source information
   */
  async processModule(discovered, moduleSource) {
    const { absolutePath } = moduleSource

    const packageJsonFile = await FDUtil.resolveFilename(`${absolutePath}/package.json`)
    const packageJson = await ModuleUtil.loadJson(packageJsonFile)

    const {
      parsers: parserFilenames,
      printers: printerFilenames
    } = packageJson.bedoc

    const getFileObjects = async fileName =>
      await FDUtil.resolveFilename(fileName, packageJsonFile.directory)
    const parserFileObjects = parserFilenames
      ? await Promise.all(parserFilenames?.map(getFileObjects))
      : []
    const printerFileObjects = printerFilenames
      ? await Promise.all(printerFilenames?.map(getFileObjects))
      : []

    const loadEngine = async fileObject => await import(fileObject.absoluteUri)
    const parsers = await Promise.all(parserFileObjects?.map(loadEngine))
    const printers = await Promise.all(printerFileObjects?.map(loadEngine))

    parsers?.forEach(parser => {
      if(parser.Parser && parser.meta && isParserMeta(parser.meta)) {
        this.logger.debug(`[processModule] Found parser for language ${parser.meta.language}`)
        discovered.parser[parser.meta.language] = {
          meta: parser.meta,
          parser: parser.Parser
        }
      }
    })

    printers?.forEach(printer => {
      if(printer.Printer && printer.meta && isPrinterMeta(printer.meta)) {
        this.logger.debug(`[processModule] Found printer for format ${printer.meta.format}`)
        discovered.printer[printer.meta.format] = {
          meta: printer.meta,
          printer: printer.Printer
        }
      }
    })
  }

  /**
   * Discover modules from local or global node_modules
   * @param mockPath - The path to the mock modules
   * @returns A map of discovered modules
   */
  async discoverModules(mockPath) {
    const modules = {parser: {}, printer: {}}

    if(mockPath) {
      this.logger.debug(`[discoverModules] Discovering mock modules in ${mockPath}`)
      const {parser, printer} = await this.discoverMockModules(mockPath)
      modules.parser = parser
      modules.printer = printer
    } else {
      const localModuleDirectory = await FDUtil.resolveDirectory("c:/temp")
      const globalModuleDirectory = await FDUtil.resolveDirectory(execSync("npm root -g").toString().trim())
      const discovered = { parser: {}, printer: {} }

      for(const moduleDirectory of [
        localModuleDirectory,
        globalModuleDirectory]
      ) {
        const {directories} = await FDUtil.ls(moduleDirectory.absolutePath)
        const matchingModules = directories.filter(d => d.name.startsWith("bedoc-"))
        for(const moduleSource of matchingModules) {
          await this.processModule(discovered, moduleSource)
        }
      }

      modules.parser = discovered.parser
      modules.printer = discovered.printer
    }

    return modules
  }

  /**
   * Discover modules from a mock path
   * @param mockPath - The path to the mock modules
   * @returns A map of discovered modules
   */
  async discoverMockModules(mockPath) {
    const { getFiles } = FDUtil

    this.logger.debug(`[discoverMockModules] Discovering mock modules in ${mockPath}`)

    const files = await getFiles(
      [`${mockPath}/bedoc-*-printer.js`, `${mockPath}/bedoc-*-parser.js`]
    )

    this.logger.debug(`[discoverMockModules] Files: ${JSON.stringify([...files], null, 2)}`)

    const discovered = { parser: {}, printer: {} }

    for(const file of files) {
      if(!file.absoluteUri)
        continue

      await this.processModule(discovered, file)
    }

    return discovered
  }

  /**
   * Get a specific printer
   *
   * @param fileMap - The FileMap object for the printer
   * @returns The printer
   */
  async specificPrinter(fileMap) {
    if(!fileMap.path)
      throw new Error(`[specificPrinter] No path specified in ${fileMap.path}`)

    const printer = await this.specificModule(fileMap)

    return {
      meta: printer.meta,
      printer: printer.Printer
    }
  }

  /**
   * Get a specific parser
   *
   * @param fileMap - The FileMap object for the parser
   * @returns The parser
   */
  async specificParser(fileMap) {
    if(!fileMap.path)
      throw new Error(`[specificParser] No path specified in ${fileMap.path}`)

    const parser = await this.specificModule(fileMap)

    return {
      meta: parser.meta,
      parser: parser.Parser
    }
  }

  /**
   * Get a specific module
   *
   * @param fileMap - The FileMap object for the module
   * @returns The module
   */
  async specificModule(fileMap) {
    const result = await import(fileMap.absoluteUri)

    if(result.Parser && result.meta && isParserMeta(result.meta))
      return result

    if(result.Printer && result.meta && isPrinterMeta(result.meta))
      return result

    throw new Error(`[specificModule] Module ${fileMap.path} does not export a Parser or Printer`)
  }
}
