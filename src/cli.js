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
    const trailingArgs = program.args; // Files provided as trailing arguments

    let config = {};
    if(options.config) {
      try {
        const configContent = fs.readFileSync(options.config, 'utf8');
        config = JSON.parse(configContent);
        logger.debug(`[CLI] Loaded configuration from ${options.config}`, config.debug);
      } catch(err) {
        logger.error(`[CLI] Failed to load config: ${err.message}`);
        process.exit(1);
      } finally {
        config = {};
      }
    }

    // Merge CLI options (CLI flags override config file)
    const finalOptions = { ...config, ...options };

    // Validate trailing arguments
    if(trailingArgs.length > 0) {
      const resolvedFiles = trailingArgs.map(file => path.resolve(file));
      resolvedFiles.forEach(file => {
        if(!fs.existsSync(file)) {
          throw new Error(`File does not exist: ${file}`);
        }
      });
      finalOptions.input = resolvedFiles;
    }

    // Validate mutual exclusivity of -d and trailing files
    if(finalOptions.directory && finalOptions.input) {
      throw new Error('You cannot specify both a directory (-d) and individual files.');
    }

    // Log all options
    if(finalOptions.debug) logger.debug(`[CLI] Final Options: ${JSON.stringify(finalOptions, null, 2)}`, finalOptions.debug);

    try {
      Object.entries(finalOptions).forEach(([key, value]) => {
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

          finalOptions[key] = value;
        } else {
          logger.warn(`[CLI] Unknown option: ${key}`);
        }
      });
    } catch(e) {
      logger.error(`[CLI] ${e.message}`);
      process.exit(1);
    }

    // Validate input options
    if(!finalOptions.input && !finalOptions.directory) {
      throw new Error('You must specify either a directory (-d) or trailing file arguments.');
    }

    finalOptions.env = Environment.CLI;
    const core = new Core(finalOptions);

    if(finalOptions.input) {
      const result = await core.processFiles(finalOptions);
    } else if(finalOptions.directory) {
      const result = await core.processDirectory(finalOptions);
    }
  } catch(e) {
    console.error(`Error: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
})();
