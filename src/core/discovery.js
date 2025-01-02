import fs from "fs";
import path from "path";
import Logger from "./logger.js";
import FileUtil from "./util/fd.js";

export default class Discovery {
  constructor(core) {
    this.core = core;
    this.logger = new Logger(core);
    this.fileUtil = new FileUtil();
  }

  /**
   * @param {string} path
   */
  async discoverModules(mockPath) {
    if(mockPath) {
      this.logger.debug(`[discoverModules] Discovering mock modules in ${mockPath}`);
      return await this.discoverMockModules(mockPath);
    }

    // TODO: Need to use workspace path instead of __dirname
    const localModulesPath = path.resolve(__dirname, "../../node_modules");
    const globalNodeModules = execSync("npm root -g").toString().trim();

    const discovered = {parsers: [], printers: []};

    [localModulesPath, globalNodeModules].forEach((modulesPath) => {
      const modules = fs
        .readdirSync(modulesPath)
        .filter((name) => name.startsWith("bedoc-"));

      modules.forEach((moduleName) => {
        const modulePath = path.join(modulesPath, moduleName);
        const {meta, Parser, Printer} = require(modulePath);
        const {language, format} = meta;

        if(language && Printer)
          discovered.printers.push([meta, Printer]);
        if(format && Parser)
          discovered.parsers.push([meta, Parser]);
      });
    });

    return discovered;
  }

  /**
   * @param {string} mockPath
   * @returns {Map<string, Map<string, [meta, Parser | Printer]>>}
   */
  async discoverMockModules(mockPath) {
    const {getFiles, resolveFile} = this.fileUtil;

    console.debug(`this.logger.name: ${this.logger.name}`);
    console.debug(`this.logger.debugMode: ${this.logger.debugMode}`);
    console.debug(`this.logger.debugLevel: ${this.logger.debugLevel}`);

    this.logger.debug(`[discoverMockModules] Discovering mock modules in ${mockPath}`);

    const files = await getFiles(
      [`${mockPath}/bedoc-*-printer.js`, `${mockPath}/bedoc-*-parser.js`]
    );
    const resolvedFiles = new Set();

    this.logger.debug(`[discoverMockModules] Files: ${JSON.stringify([...files], null, 2)}`);

    const discovered = new Map([
      ["parsers", new Map()],
      ["printers", new Map()],
    ]);

    for(const file of files) {
      const resolvedFile = await resolveFile(file);
      const uri = resolvedFile.get("uri");
      const filePath = resolvedFile.get("path");
      const absolutePath = resolvedFile.get("absolutePath");
      const absoluteUri = resolvedFile.get("absoluteUri");
      this.logger.debug(`[discoverMockModules] Resolved file ${uri}`);
      this.logger.debug(`[discoverMockModules] Resolved file ${filePath}`);
      this.logger.debug(`[discoverMockModules] Resolved file ${absolutePath}`);
      this.logger.debug(`[discoverMockModules] Resolved file ${absoluteUri}`);

      this.logger.debug(`[discoverMockModules] Processing file ${absoluteUri}`);
      const {meta, Parser, Printer} = await import(absoluteUri);
      console.log(meta, Parser, Printer);
      const {language, format} = {language: meta?.language || null, format: meta?.format || null};

      this.logger.debug(`[discoverMockModules] Found meta ${JSON.stringify(meta, null, 2)}`);
      this.logger.debug(`[discoverMockModules] meta.language: ${language}`);
      this.logger.debug(`[discoverMockModules] meta.format: ${format}`);

      if(language && Parser) {
        this.logger.debug(`[discoverMockModules] Found parser for language ${language}`);
        discovered.get("parsers").set(language, new Map([["meta", meta], ["parser", Parser]]));
      }

      if(format && Printer) {
        this.logger.debug(`[discoverMockModules] Found printer for format ${format}`);
        discovered.get("printers").set(format, new Map([["meta", meta], ["printer", Printer]]));
      }
    }

    this.logger.debug(`[discoverMockModules] Discovered ${resolvedFiles.size} files`);


    return discovered;
  }
}
