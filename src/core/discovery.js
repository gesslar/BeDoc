import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import Logger from "./Logger.js"
import FDUtil from "./util/FDUtil.js"

const isParserMeta = meta => "language" in meta
const isPrinterMeta = meta => "format" in meta

let logger

export default class Discovery {
  constructor(core) {
    logger = new Logger(core)
  }

  /**
   * Process a module and register any discovered parsers/printers
   *
   * @param discovered - The current discovery state
   * @param moduleSource - The module source information
   */
  async processModule(discovered, moduleSource) {
    const { absoluteUri } = moduleSource

    this.logger.debug(`[processModule] Processing module ${absoluteUri}`)
    const module = await import(absoluteUri)

    if(module.Parser && module.meta && isParserMeta(module.meta)) {
      this.logger.debug(`[processModule] Found parser for language ${module.meta.language}`)
      discovered.parser[module.meta.language] = {
        meta: module.meta,
        parser: module.Parser
      }
    }

    if(module.Printer && module.meta && isPrinterMeta(module.meta)) {
      this.logger.debug(`[processModule] Found printer for format ${module.meta.format}`)
      discovered.printer[module.meta.format] = {
        meta: module.meta,
        printer: module.Printer
      }
    }
  }

  /**
   * Discover modules from local or global node_modules
   * @param mockPath - The path to the mock modules
   * @returns A map of discovered modules
   */
  async discoverModules(mockPath) {
    if(mockPath) {
      this.logger.debug(`[discoverModules] Discovering mock modules in ${mockPath}`)
      return await this.discoverMockModules(mockPath)
    }

    // TODO: Need to use workspace path instead of __dirname
    const localModulesPath = await FDUtil.resolveDirectory("node_modules")
    const globalNodeModules = await FDUtil.resolveDirectory(execSync("npm root -g").toString().trim())
    const discovered = { parser: {}, printer: {} }

    for(const modulesPath of [localModulesPath, globalNodeModules]) {
      const pathToCheck = `${modulesPath}/bedoc-*`
      const modules = await FDUtil.getFiles(pathToCheck)
      for(const moduleSource of modules) {
        await this.processModule(discovered, moduleSource)
      }
    }

    return discovered
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
