(async() => {
  try {
    const { program } = require('commander');
    const Core = require('./core/core');
    const Logger = require('./core/logger');
    const logger = new Logger(null);
    const fs = require('fs');
    const path = require('path');
    const packageJson = require('../package.json');
    const Environment = require('./core/env');
    const ConfigurationParameters = require('./core/configuration');

    program
      .name('bedoc')
      .description('Pluggable documentation engine for any language and format')
      .version(packageJson.version, '-v, --version', 'Output version')
      .usage('[options] [files...]');

    // Build CLI
    ConfigurationParameters.forEach((parameter, name) => {
      if(name === 'input')
        return;
      let arg = `-${parameter.short}, --${name}`;
      const param = parameter.param ? parameter.param : name;
      if(param) {
        arg += parameter.required ? ` <${param}>` : ` [${param}]`;
      }

      const description = `${parameter.description} (${parameter.type})`;
      const defaultValue = parameter.default || null;

      if(defaultValue === null) {
        program.option(arg, description);
      } else {
        program.option(arg, description, defaultValue);
      }
    });

    // Add custom usage text for trailing arguments
    program.addHelpText('after', `
Arguments:
  [files...]               Trailing space-delimited file arguments to process
`);

    program.parse();

    const options = program.opts();
    logger.debug(`Options passed: ${JSON.stringify(options, null, 2)}`, options.debug);
    const trailingArgs = program.args; // Files provided as trailing arguments
    logger.debug(`Trailing arguments: ${JSON.stringify(trailingArgs, null, 2)}`, options.debug);

    let finalConfig = {};

    if(options.config) {
      try {
        options.config = path.resolve(options.config);
        const config = require(options.config);
        finalConfig = { ...config, ...options };
        logger.debug(`Loaded configuration from ${options.config}`, config.debug);
      } catch(err) {
        logger.error(`Failed to load config: ${err.message}`);
        process.exit(1);
      } finally {
        config = {};
      }
    }

    // Validate trailing arguments
    if(trailingArgs.length > 0) {
      const resolvedFiles = trailingArgs.map(file => path.resolve(file));
      resolvedFiles.forEach(file => {
        if(!fs.existsSync(file)) {
          throw new Error(`File does not exist: ${file}`);
        }
      });
      finalConfig.input = resolvedFiles;
    }

    // Validate mutual exclusivity of -d and trailing files
    if(finalConfig.directory && finalConfig.input) {
      throw new Error('You cannot specify both a directory (-d) and individual files.');
    }

    // Log all options
    logger.debug(`Final Options: ${JSON.stringify(finalConfig, null, 2)}`, finalConfig.debug);

    try {
      Object.entries(finalConfig).forEach(([key, value]) => {
        if(ConfigurationParameters.has(key)) {
          const parameter = ConfigurationParameters.get(key);
          const [_, type, array] = /^(\w+)(\[\])?$/.exec(parameter.type);

          if(array) {
            if(!Array.isArray(value))
              throw new Error(`${key} must be an array`);
            if(value.some(item => typeof item !== type))
              throw new Error(`${key} must be an array of ${type}`);
          } else {
            if(typeof value !== type)
              throw new Error(`${key} must be a ${type}`);
          }

          if(parameter.subtype?.path) {
            // We must force an array for input
            if(key === "input")
              value = Array.isArray(value) ? value : [value];

            value = Array.isArray(value)
              ? value.map(item => path.resolve(item))
              : path.resolve(value);

            if(parameter.subtype.path.mustExist) {
              const missingPaths = Array.isArray(value)
                ? value.filter(item => !fs.existsSync(item))
                : (!fs.existsSync(value) ? [value] : []);

              if(missingPaths.length > 0)
                throw new Error(`${key} path(s) do not exist: ${missingPaths.join(", ")}`);
            }
          }

          finalConfig[key] = value;
        } else {
          logger.warn(`[CLI] Unknown option: ${key}`);
        }
      });
    } catch(e) {
      logger.error(`[CLI] ${e.message}`);
      process.exit(1);
    }

    logger.debug(`Final configuration (resolved): ${JSON.stringify(finalConfig, null, 2)}`, finalConfig.debug);
    // Validate input options
    if(!finalConfig.input && !finalConfig.directory) {
      throw new Error('You must specify either a directory (-d) or trailing file arguments.');
    }

    finalConfig.env = Environment.CLI;
    const core = new Core(finalConfig);

    if(finalConfig.input) {
      const result = await core.processFiles(finalConfig);
    } else if(finalConfig.directory) {
      const result = await core.processDirectory(finalConfig);
    }
  } catch(e) {
    console.error(`Error: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
})();
