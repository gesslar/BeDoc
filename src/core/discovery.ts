import fs from "fs";
import path from "path";
import { execSync }from "child_process";
import Logger from "./logger.js";
import FileUtil from "./util/fd.js";
import { ParserClass, ParserMeta }from "./types/parse.js";
import { PrinterClass, PrinterMeta }from "./types/print.js";
import { Engine, EngineClass }from "./types/engine.js";
import {
  EngineExports,
  Discovered,
  ModuleSource,
  DiscoveredPrinter,
  DiscoveredParser
}from "./types/engine.js";
import { ICore }from "./types/core.js";
import { FileMap }from "./types/fd.js";

function isParserMeta(meta: ParserMeta | PrinterMeta): meta is ParserMeta {
  return "language" in meta;
}

function isPrinterMeta(meta: ParserMeta | PrinterMeta): meta is PrinterMeta {
  return "format" in meta;
}

export default class Discovery {
  private core: ICore;
  private logger: Logger;
  private fileUtil: FileUtil;

  constructor(core: ICore) {
    this.core = core;
    this.logger = new Logger(core);
    this.fileUtil = new FileUtil();
  }

  /**
   * Process a module and register any discovered parsers/printers
   *
   * @param discovered - The current discovery state
   * @param moduleSource - The module source information
   */
  private async processModule(
    discovered: Discovered,
    moduleSource: ModuleSource
  ): Promise<void> {
    const { absoluteUri } = moduleSource;

    this.logger.debug(`[processModule] Processing module ${absoluteUri}`);
    const module = await import(absoluteUri) as EngineExports;

    if(module.Parser && module.meta && isParserMeta(module.meta)) {
      this.logger.debug(`[processModule] Found parser for language ${module.meta.language}`);
      discovered.parser[module.meta.language] = {
        meta: module.meta,
        parser: module.Parser
      };
    }

    if(module.Printer && module.meta && isPrinterMeta(module.meta)) {
      this.logger.debug(`[processModule] Found printer for format ${module.meta.format}`);
      discovered.printer[module.meta.format] = {
        meta: module.meta,
        printer: module.Printer
      };
    }
  }

  /**
   * Discover modules from local or global node_modules
   * @param mockPath - The path to the mock modules
   * @returns A map of discovered modules
   */
  public async discoverModules(mockPath?: string): Promise<Discovered> {
    if(mockPath) {
      this.logger.debug(`[discoverModules] Discovering mock modules in ${mockPath}`);
      return await this.discoverMockModules(mockPath);
    }

    // TODO: Need to use workspace path instead of __dirname
    const localModulesPath = path.resolve(__dirname, "../../node_modules");
    const globalNodeModules = execSync("npm root -g").toString().trim();
    const discovered: Discovered = { parser: {}, printer: {} };

    for(const modulesPath of [localModulesPath, globalNodeModules]) {
      const modules = fs
        .readdirSync(modulesPath)
        .filter((name) => name.startsWith("bedoc-"))
        .map(name => ({
          path: path.join(modulesPath, name),
          absoluteUri: path.join(modulesPath, name)
        }));

      for(const moduleSource of modules) {
        await this.processModule(discovered, moduleSource);
      }
    }

    return discovered;
  }

  /**
   * Discover modules from a mock path
   * @param mockPath - The path to the mock modules
   * @returns A map of discovered modules
   */
  private async discoverMockModules(mockPath: string): Promise<Discovered> {
    const { getFiles, resolveFile } = this.fileUtil;

    this.logger.debug(`[discoverMockModules] Discovering mock modules in ${mockPath}`);

    const files = await getFiles(
      [`${mockPath}/bedoc-*-printer.js`, `${mockPath}/bedoc-*-parser.js`]
    );

    this.logger.debug(`[discoverMockModules] Files: ${JSON.stringify([...files], null, 2)}`);

    const discovered: Discovered = { parser: {}, printer: {} };

    for(const file of files) {
      if(!file.absoluteUri)
        continue;

      await this.processModule(discovered, file);
    }

    return discovered;
  }

  /**
   * Get a specific printer
   *
   * @param fileMap - The FileMap object for the printer
   * @returns The printer
   */
  public async specificPrinter(fileMap: FileMap): Promise<DiscoveredPrinter> {
    if(!fileMap.path)
      throw new Error(`[specificPrinter] No path specified in ${fileMap.path}`);

    const printer = await this.specificModule(fileMap);

    return {
      meta: printer.meta as PrinterMeta,
      printer: printer.Printer as PrinterClass
    };
  }

  /**
   * Get a specific parser
   *
   * @param fileMap - The FileMap object for the parser
   * @returns The parser
   */
  public async specificParser(fileMap: FileMap): Promise<DiscoveredParser> {
    if(!fileMap.path)
      throw new Error(`[specificParser] No path specified in ${fileMap.path}`);

    const parser = await this.specificModule(fileMap);

    return {
      meta: parser.meta as ParserMeta,
      parser: parser.Parser as ParserClass
    };
  }

  /**
   * Get a specific module
   *
   * @param fileMap - The FileMap object for the module
   * @returns The module
   */
  private async specificModule(fileMap: FileMap): Promise<EngineExports> {
    const result: EngineExports = await import(fileMap.absoluteUri) as EngineExports;

    if(result.Parser && result.meta && isParserMeta(result.meta))
      return result;

    if(result.Printer && result.meta && isPrinterMeta(result.meta))
      return result;

    throw new Error(`[specificModule] Module ${fileMap.path} does not export a Parser or Printer`);
  }
}
