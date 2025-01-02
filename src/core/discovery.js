const fs = require('fs');
const path = require('path');

class Discovery {
  constructor(core) {
    this.core = core;
    this.logger = core.logger;
    this.fileUtil = core.fileUtil;
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
    const localModulesPath = path.resolve(__dirname, '../../node_modules');
    const globalNodeModules = execSync('npm root -g').toString().trim();

    const discovered = {parsers: [], printers: []};

    [localModulesPath, globalNodeModules].forEach((modulesPath) => {
      const modules = fs
        .readdirSync(modulesPath)
        .filter((name) => name.startsWith('bedoc-'));

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
    this.logger.debug(`[discoverMockModules] Discovering mock modules in ${mockPath}`);

    const files = await this.fileUtil.getFiles(
      [`${mockPath}/bedoc-*-printer.js`, `${mockPath}/bedoc-*-parser.js`]
    );
    const resolvedFiles = new Set();

    this.logger.debug(`[discoverMockModules] Files: ${JSON.stringify([...files], null, 2)}`);

    const discovered = new Map([
      ['parsers', new Map()],
      ['printers', new Map()],
    ]);

    for(const file of files) {
      const resolvedFile = await this.fileUtil.resolveFile(file);
      this.logger.debug(`[discoverMockModules] Resolved file ${resolvedFile.get('path')}`);

      this.logger.debug(`[discoverMockModules] Processing file ${resolvedFile.get('path')}`);
      const {meta, Parser, Printer} = require(resolvedFile.get('path'));
      const {language, format} = meta;

      this.logger.debug(`[discoverMockModules] Found meta ${JSON.stringify(meta, null, 2)}`);
      this.logger.debug(`[discoverMockModules] meta.language: ${language}`);
      this.logger.debug(`[discoverMockModules] meta.format: ${format}`);

      if(language && Parser) {
        this.logger.debug(`[discoverMockModules] Found parser for language ${language}`);
        discovered.get('parsers').set(language, new Map([["meta", meta], ["parser", Parser]]));
      }

      if(format && Printer) {
        this.logger.debug(`[discoverMockModules] Found printer for format ${format}`);
        discovered.get('printers').set(format, new Map([["meta", meta], ["printer", Printer]]));
      }
    }

    this.logger.debug(`[discoverMockModules] Discovered ${resolvedFiles.size} files`);


    return discovered;
  }
}

module.exports = Discovery;
