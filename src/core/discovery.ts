import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import Logger from "./logger.js";
import FileUtil from "./util/fd.js";
import { ParserClass, ParserMeta } from "./types/parse.js";
import { PrinterClass, PrinterMeta } from "./types/print.js";
import { EngineExports } from "./types/engine.js";

function isParserMeta(meta: ParserMeta | PrinterMeta): meta is ParserMeta {
  return 'language' in meta;
}

function isPrinterMeta(meta: ParserMeta | PrinterMeta): meta is PrinterMeta {
  return 'format' in meta;
}

type Discovered = {
  parser: { [key: string]: DiscoveredParser };
  printer: { [key: string]: DiscoveredPrinter };
};

type DiscoveredParser = {
  meta: ParserMeta;
  parser: ParserClass;
};

type DiscoveredPrinter = {
  meta: PrinterMeta;
  printer: PrinterClass;
};

export default class Discovery {
  private core: any;
  private logger: Logger;
  private fileUtil: FileUtil;

  constructor(core: any) {
    this.core = core;
    this.logger = new Logger(core);
    this.fileUtil = new FileUtil();
  }

  /**
   * Discover modules from local or global node_modules
   * @param mockPath - The path to the mock modules
   * @returns A map of discovered modules
   */
  async discoverModules(mockPath?: string): Promise<Discovered> {
    if (mockPath) {
      this.logger.debug(`[discoverModules] Discovering mock modules in ${mockPath}`);
      return await this.discoverMockModules(mockPath);
    }

    // TODO: Need to use workspace path instead of __dirname
    const localModulesPath = path.resolve(__dirname, "../../node_modules");
    const globalNodeModules = execSync("npm root -g").toString().trim();

    const discovered: Discovered = { parser: {}, printer: {} };

    for (const modulesPath of [localModulesPath, globalNodeModules]) {
      const modules = fs
        .readdirSync(modulesPath)
        .filter((name) => name.startsWith("bedoc-"));

      for (const moduleName of modules) {
        const modulePath = path.join(modulesPath, moduleName);
        const module = await import(modulePath) as EngineExports;

        if (module.Parser && module.meta && isParserMeta(module.meta)) {
          const parsers = discovered.parser;
          const parser = {
            meta: module.meta,
            parser: module.Parser
          };
          parsers[module.meta.language] = parser;
        }
        if (module.Printer && module.meta && isPrinterMeta(module.meta)) {
          const printers = discovered.printer || {};
          const printer = {
            meta: module.meta,
            printer: module.Printer
          };
          printers[module.meta.format] = printer;
        }
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

    for (const file of files) {
      const resolvedFile = await resolveFile(file);
      const absoluteUri = resolvedFile.absoluteUri;
      if (!absoluteUri) continue;

      this.logger.debug(`[discoverMockModules] Processing file ${absoluteUri}`);
      const module = await import(absoluteUri) as EngineExports;
      this.logger.debug(`[discoverMockModules] Found meta ${JSON.stringify(module.meta, null, 2)}`);

      if (module.Parser && module.meta && isParserMeta(module.meta)) {
        this.logger.debug(`[discoverMockModules] Found parser for language ${module.meta.language}`);
        const parser = {
          meta: module.meta,
          parser: module.Parser as ParserClass
        };
        discovered.parser[module.meta.language] = parser;
      }

      if (module.Printer && module.meta && isPrinterMeta(module.meta)) {
        this.logger.debug(`[discoverMockModules] Found printer for format ${module.meta.format}`);
        const printer = {
          meta: module.meta,
          printer: module.Printer as PrinterClass
        };
        discovered.printer[module.meta.format] = printer;
      }
    }

    return discovered;
  }
}
