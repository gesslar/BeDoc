const Core = require('./core/core');
const Logger = require('./core/logger');
const Util = require('./core/util');

// We need our own logger instance, because we aren't the Core object.
const logger = new Logger(null);

(async() => {
  try {
    const { program } = require('commander');
    const fs = require('fs');
    const path = require('path');
    const packageJson = require('../package.json');
    const Environment = require('./core/env');
    const ConfigurationParameters = require('./core/configuration');

    program
      .name('bedoc')
      .description('Pluggable documentation engine for any language and format')

    // Build CLI
    ConfigurationParameters
    .forEach((parameter, name) => {
      let arg = parameter.short ? `-${parameter.short}, --${name}` : `--${name}`;
      const param = parameter.param ? parameter.param : name;
      if(param)
        arg += parameter.required ? ` <${param}>` : ` [${param}]`;

      const description = `${parameter.description} (${parameter.type})`;
      const defaultValue = parameter.default ?? null;

      if(defaultValue === null)
        program.option(arg, description);
      else
        program.option(arg, description, defaultValue);
    });

    program.version(packageJson.version, '-v, --version', 'Output version');
    program.parse();
    const options = program.opts();

    logger.debug(`[CLI] Options passed: ${JSON.stringify(options, null, 2)}`, options.debug);

    let finalConfig = {};

    if(options.config) {
      const configFile = await Util.resolveFile(options.config);
      options.config = configFile.get('path');

      if(!fs.existsSync(configFile.get('path')))
        throw new Error(`Config file does not exist: ${configFile.get('path')}`);

      const config = require(configFile.get('path'));
      finalConfig = { ...config, ...options };
      logger.debug(`[CLI] Loaded configuration from ${configFile.get('path')}`, config.debug);
    }

    // Log all options
    logger.debug(`[CLI] Final Options: ${JSON.stringify(finalConfig, null, 2)}`, finalConfig.debug);

    for(const [key, value]of Object.entries(finalConfig)) {
      if(ConfigurationParameters.has(key)) {
        const parameter = ConfigurationParameters.get(key);
        const [_, type, array] = /^(\w+)(\[\])?$/.exec(parameter.type);

        logger.debug(`[CLI] Parameter: ${key} = ${value}`, parameter.debug);

        if(array) {
          if(!Array.isArray(value)) throw new Error(`${key} must be an array`);
          if(value.some(item => typeof item !== type)) throw new Error(`${key} must be an array of ${type}`);
        } else {
          if(typeof value !== type) throw new Error(`${key} must be a ${type}`);
        }

        if(parameter.subtype?.path) {
          if(key === "input")
            value = Array.isArray(value) ? value : [value];

          const pathType = parameter.subtype.path.type;
          if(pathType !== "directory" && pathType !== "file")
            throw new Error(`Invalid path type: ${pathType}`);

          const resolveFunction = pathType === "directory" ? Util.resolvePath : Util.resolveFile;
          const mustExist = parameter.subtype.path.mustExist;

          if(Array.isArray(value)) {
            logger.debug(`[CLI] Resolving ${pathType}s for ${key} = ${JSON.stringify(value, null, 2)}`, options.debug);

            const resolvedFiles = [];
            for(const file of value) {
              logger.debug(`[CLI] Resolving ${pathType}: ${file}`);
              const resolvedFile = await resolveFunction(file);
              logger.debug(`[CLI] Resolved ${pathType}: ${resolvedFile}`);
              resolvedFiles.push(resolvedFile);
            }

            logger.debug(`[CLI] Resolved paths for ${key} = ${JSON.stringify(resolvedFiles, null, 2)}`, options.debug);
            finalConfig[key] = resolvedFiles;
          } else {
            logger.debug(`[CLI] Resolving ${pathType} for ${key} = ${value}`, options.debug);
            const resolvedFile = await resolveFunction(value);
            logger.debug(`[CLI] Resolved ${pathType} for ${key} = ${JSON.stringify(resolvedFile, null, 2)}`, options.debug);
            finalConfig[key] = resolvedFile;
          }

          if(mustExist) {
            const missingPaths = Array.isArray(value)
              ? value.filter(item => !fs.existsSync(item))
              : (!fs.existsSync(value) ? [value] : []);

            if(missingPaths.size > 0) throw new Error(`${key} path(s) do not exist: ${missingPaths.join(", ")}`);
          }
        }

        finalConfig[key] = value;
      } else {
        logger.warn(`[CLI] Unknown option: ${key}`);
      }
    }

    logger.debug(`[CLI] Final configuration (resolved): ${JSON.stringify(finalConfig, null, 2)}`, finalConfig.debug);
    // Validate input options
    if(!finalConfig.input && !finalConfig.directory) {
      throw new Error('You must specify either a directory (-d) or trailing file arguments.');
    }

    finalConfig.env = Environment.CLI;
    const core = await Core.new(finalConfig);
    await core.processFiles(finalConfig);
  } catch(e) {
    logger.error(`Error: ${e.message}`);
    logger.error(e.stack);
    process.exit(1);
  }
})();
