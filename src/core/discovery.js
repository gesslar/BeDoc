const fs = require('fs');
const path = require('path');

class Discovery {
  constructor(core) {
    this.core = core;
  }

  /**
   * @param {string} path
   */
  discoverModules(mockPath) {
    if(mockPath)
      return this.discoverMockModules(mockPath);

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
    const discovered = {parsers: [], printers: []};
    const files = this.core.getFiles(mockPath, ".js")
      .map(file => this.core.resolveFile(mockPath, file));

    files.forEach(file => {
      try {
        const {path: filePath} = file;
        const {meta, Parser, Printer} = require(filePath);
        const {language, format} = meta;

        if(language && Printer)
          discovered.printers.push([meta, Printer]);
        if(format && Parser)
          discovered.parsers.push([meta, Parser]);
      } catch(error) {
        this.core.logger.error(`[discoverMockModules] Error discovering mock modules: ${error.message}`);
        throw error;
      }
    });

    return discovered;
  }
}

module.exports = Discovery;
