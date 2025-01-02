import fs from "fs";
import { program }from "commander";
import Core from "./core/core.js";
import Logger from "./core/logger.js";
import FDUtil from "./core/util/fd.js";
import Environment from "./core/env.js";
import ModuleUtil from "./core/util/module.js";
import ConfigurationParameters from "./core/configuration.js";

// We need our own logger instance, because we aren't the Core object.
const logger = new Logger(null);
const fdUtil = new FDUtil();

// Debugging levels
// 0 - No debug
// 1 - Minimal/Operational
// 2 - A bit extra
// 3 - Verbose
// 4 - Geek mode

// Main entry point
(async() => {
  try {
    const packageJson = await ModuleUtil.require("package.json");

    program
      .name(packageJson.name)
      .description(packageJson.description)

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

    program.version(packageJson.version, "-v, --version", "Output version");
    program.parse();
    const options = program.opts();

    // Set logger options
    const {debug: debugMode, debugLevel} = options;
    logger.setOptions({debugMode, debugLevel, name: packageJson.name});

    const debug = (...args) => logger.debug(...args);

    debug(`[CLI] Options passed: ${JSON.stringify(options, null, 2)}`, options.debugLevel);

    let finalConfig = {};
    if(options.config) {
      debug(`[CLI] Config file: ${options.config}`, options.debugLevel);
      const resolvedConfigFile = await fdUtil.resolveFile(options.config, logger);
      options.config = resolvedConfigFile.get("path");


      if(!fs.existsSync(resolvedConfigFile.get("path")))
        throw new Error(`Config file does not exist: ${resolvedConfigFile.get("path")}`);

      const config = await ModuleUtil.require(resolvedConfigFile.get("path"));
      console.log(`[CLI] Loaded configuration from ${resolvedConfigFile.get("path")}`, config);
      finalConfig = { ...options, ...config };
      console.log(`[CLI] Loaded configuration from ${resolvedConfigFile.get("path")}`, finalConfig);
      logger.setOptions({name: packageJson.name, debugLevel: finalConfig.debugLevel, debug: finalConfig.debug});
      debug(`[CLI] Loaded configuration from ${resolvedConfigFile.get("path")}`, 2);
    }

    // Log all options
    debug(`[CLI] Final Options: ${JSON.stringify(finalConfig, null, 2)}`, options.debugLevel);

    for(const [key, value]of Object.entries(finalConfig)) {
      if(ConfigurationParameters.has(key)) {
        const parameter = ConfigurationParameters.get(key);
        const [_, type, array] = /^(\w+)(\[\])?$/.exec(parameter.type);

        debug(`[CLI] Parameter: ${key} = ${value}`, options.debugLevel);

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

          const resolveFunction = pathType === "directory" ? fdUtil.resolveDir : fdUtil.resolveFile;
          const mustExist = parameter.subtype.path.mustExist;

          if(Array.isArray(value)) {
            debug(`[CLI] Resolving ${pathType}s for ${key} = ${JSON.stringify(value, null, 2)}`, options.debugLevel);

            const resolvedFiles = [];
            for(const file of value) {
              debug(`[CLI] Resolving ${pathType}: ${file}`, options.debugLevel);
              const resolvedFile = await resolveFunction(file);
              debug(`[CLI] Resolved ${pathType}: ${resolvedFile}`, options.debugLevel);
              resolvedFiles.push(resolvedFile);
            }

            debug(`[CLI] Resolved paths for ${key} = ${JSON.stringify(resolvedFiles, null, 2)}`, options.debugLevel);
            finalConfig[key] = resolvedFiles;
          } else {
            debug(`[CLI] Resolving ${pathType} for ${key} = ${value}`, options.debugLevel);
            const resolvedFile = await resolveFunction(value);
            debug(`[CLI] Resolved ${pathType} for ${key} = ${resolvedFile.get("uri")}`, options.debugLevel);
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
        warn(`[CLI] Unknown option: ${key}`);
      }
    }

    debug(`[CLI] Final configuration (resolved): ${JSON.stringify(finalConfig, null, 2)}`, finalConfig.debugLevel, finalConfig.debug);
    // Validate input options
    if(!finalConfig.input && !finalConfig.directory) {
      throw new Error("You must specify either a directory (-d) or trailing file arguments.");
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
