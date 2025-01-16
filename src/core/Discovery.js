import { execSync } from "child_process"
import yaml from "yaml"
import DataUtil from "./util/DataUtil.js"
import FDUtil from "./util/FDUtil.js"
import ModuleUtil from "./util/ModuleUtil.js"

const isParserMeta = meta => "language" in meta
const isPrinterMeta = meta => "format" in meta

export default class Discovery {
  #logger

  constructor(core) {
    this.#logger = core.logger
  }

  /**
   * Discover modules from local or global node_modules
   * @param {string} mockPath - The path to the mock modules
   * @returns {Promise<object>} A map of discovered modules
   */
  async discoverModules(mockPath) {
    const debug = this.#logger.newDebug()
    const modules = {parser: {}, printer: {}}

    if(mockPath) {
      debug(`Discovering mock modules in ${mockPath}`, 1)

      const {parser, printer} = await this.#discoverMockModules(mockPath)
      modules.parser = parser
      modules.printer = printer
    } else {
      debug("Discovering modules", 1)
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
          await this.#processModule(discovered, moduleSource)
        }
      }

      modules.parser = discovered.parser
      modules.printer = discovered.printer
    }

    return modules
  }

  /**
   * Process a module and register any discovered parsers/printers, loading
   * contracts.
   * @param {object} discovered - The current discovery state
   * @param {object} moduleSource - The module source information
   */
  async #processModule(discovered, moduleSource) {
    const debug = this.#logger.newDebug()

    debug(`Processing module: ${moduleSource.path}`, 1)

    const {absolutePath} = moduleSource

    // Load the package.json file that accompanies the module
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

    const loadEngine = async fileObject => {
      const engine = await import(fileObject.absoluteUri)
      const contract = await this.#loadContract(fileObject)

      const result = {...engine}

      if(contract.status === "success") {
        if(isParserMeta(engine.meta)) {
          result.contract = DataUtil.deepFreeze(contract.provides)
        } else if(isPrinterMeta(engine.meta)) {
          result.contract = DataUtil.deepFreeze(contract.accepts)
        }
      } else
        throw new Error(`Failed to load contract for ${fileObject.path}: ${contract.error.message}`)

      return result
    }

    const parsers = await Promise.all(parserFileObjects?.map(loadEngine))
    const printers = await Promise.all(printerFileObjects?.map(loadEngine))

    parsers?.forEach(parser => {
      if(parser.Parser && parser.meta && isParserMeta(parser.meta)) {
        debug(`Found parser for language \`${parser.meta.language}\``, 1)
        discovered.parser[parser.meta.language] = {
          meta: parser.meta,
          parser: parser.Parser,
          contract: parser.contract
        }
      }
    })

    printers?.forEach(printer => {
      if(printer.Printer && printer.meta && isPrinterMeta(printer.meta)) {
        debug(`Found printer for format \`${printer.meta.format}\``, 1)
        discovered.printer[printer.meta.format] = {
          meta: printer.meta,
          printer: printer.Printer,
          contract: printer.contract
        }
      }
    })
  }

  /**
   * Discover modules from a mock path
   * @param {string} mockPath - The path to the mock modules
   * @returns {Promise<object>} A map of discovered modules
   */
  async #discoverMockModules(mockPath) {
    const debug = this.#logger.newDebug()
    const { getFiles } = FDUtil

    debug(`Discovering mock modules in ${mockPath}`)

    const files = await getFiles(
      [`${mockPath}/bedoc-*-printer.js`, `${mockPath}/bedoc-*-parser.js`]
    )

    debug("Files:", 2, files)

    const discovered = { parser: {}, printer: {} }

    for(const file of files) {
      if(!file.absoluteUri)
        continue

      await this.#processModule(discovered, file)
    }

    return discovered
  }

  /**
   * Get a specific printer
   * @param {object} fileMap - The FileMap object for the printer
   * @returns {Promise<object>} The printer
   */
  async specificPrinter(fileMap) {
    const debug = this.#logger.newDebug()

    debug(`Loading printer: ${fileMap.path}`, 1)

    if(!fileMap.path)
      throw new Error(`[specificPrinter] No path specified in ${fileMap.path}`)

    const printer = await this.#specificModule(fileMap)

    return {
      meta: printer.meta,
      printer: printer.Printer
    }
  }

  /**
   * Get a specific parser
   * @param {object} fileMap - The FileMap object for the parser
   * @returns {Promise<object>} The parser
   */
  async specificParser(fileMap) {
    const debug = this.#logger.newDebug()

    debug(`Loading parser: ${fileMap.path}`, 1)

    if(!fileMap.path)
      throw new Error(`[specificParser] No path specified in ${fileMap.path}`)

    const parser = await this.#specificModule(fileMap)

    return {
      meta: parser.meta,
      parser: parser.Parser
    }
  }

  /**
   * Get a specific module
   * @param {object} fileMap - The FileMap object for the module
   * @returns {Promise<object>} The module
   */
  async #specificModule(fileMap) {
    const debug = this.#logger.newDebug()

    debug(`Loading module: ${fileMap.path}`, 1)

    const result = await import(fileMap.absoluteUri)

    if(result.Parser && result.meta && isParserMeta(result.meta))
      return result

    if(result.Printer && result.meta && isPrinterMeta(result.meta))
      return result

    throw new Error(`[specificModule] Module ${fileMap.path} does not export a Parser or Printer`)
  }

  /**
   * Loads the contract for a given module.
   * @param {string} moduleFile - Path to the module file.
   * @returns {Promise<object>} - The loaded contract object.
   */
  async #loadContract(moduleFile) {
    const debug = this.#logger.newDebug()

    // Try to find and load the contract(s)
    const contents = await (async function(file, debug) {
      // Step 1: Extract embedded YAML block from the module file
      const moduleContent = await FDUtil.readFile(file)
      const yamlBlockRegex = /---\n([\s\S]+)?\n---/
      const match = yamlBlockRegex.exec(moduleContent)

      debug("Match:", 4, match)

      if(match)
        return [yaml.parseDocument(match[1]).toJS()]

      // Step 2: Check for an external YAML file
      const baseName = file.module
      const contractFile = await FDUtil.resolveFilename(`${baseName}.yaml`, file.directory)
      debug(`Using external YAML contract: ${contractFile.path}`, 2)
      const content = await FDUtil.readFile(contractFile)
      const documents = yaml.parseAllDocuments(content)
        .map(doc => doc.toJS())

      return documents
    })(moduleFile, debug)

    debug("Contents:", 2, contents)
    debug(`Number of documents: ${contents.length}`, 2)

    const provides = contents.find(doc => doc.provides)?.provides || {}
    debug("Provides:", 3, Object.keys(provides))
    const accepts = contents.find(doc => doc.accepts)?.accepts || {}
    debug("Accepts:", 3, Object.keys(accepts))

    debug("Result:", 4, provides, accepts)

    return {status: "success", provides, accepts}
  }
}
