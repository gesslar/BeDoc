const fs = require('fs');
const path = require('path');
const Util = require('./util');

class Discovery {
  constructor(core) {
    this.core = core;
    this.logger = core.logger;
  }

  /**
   * @param {string} path
   */
  discoverModules(mockPath) {
    if(mockPath)
      return this.discoverMockModules(mockPath);

    // TODO: Need to use workspace path instead of __dirname
    const localModulesPath = path.resolve(__dirname, '../../node_modules');
    const globalNodeModules = execSync('npm root -g').toString().trim();

    const discovered = {parsers: [], printers: []};

    [localModulesPath, globalNodeModules].forEach((modulesPath) => {
      try {
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
      } catch(error) {
        this.core.logger.error(`[discoverModules] Error discovering modules in ${modulesPath}: ${error.message}`);
        throw error;
      }
    });

    return discovered;
  }

  /**
   * @param {string} mockPath
   */
  discoverMockModules(mockPath) {
    this.logger.debug(`[Discovery] Discovering mock modules in ${mockPath}`);

    const discovered = {parsers: [], printers: []};
    const files = this.core.getFiles(mockPath, ".js")
      .map(file => Util.resolveFile(mockPath, file));

    this.logger.debug(`[Discovery] Discovered ${files.length} files`);

    files.forEach(file => {
      this.logger.debug(`[Discovery] Processing file ${file.path}`);
      const {path: filePath} = file;
      const {meta, Parser, Printer} = require(filePath);
      const {language, format} = meta;

      this.logger.debug(`[Discovery] Found meta ${JSON.stringify(meta, null, 2)}`);
      this.logger.debug(`[Discovery] meta.language: ${language}`);
      this.logger.debug(`[Discovery] meta.format: ${format}`);

      if(language && Parser) {
        this.logger.debug(`[Discovery] Found parser for language ${language}`);
        discovered.parsers.push([meta, Parser]);
      }

      if(format && Printer) {
        this.logger.debug(`[Discovery] Found printer for format ${format}`);
        discovered.printers.push([meta, Printer]);
      }
    });

    return discovered;
  }
}

module.exports = Discovery;
