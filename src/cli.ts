import fs from "fs";
import { program } from "commander";
import Core from "./core/core.js";
import Logger from "./core/logger.js";
import FDUtil from "./core/util/fd.js";
import Environment from "./core/env.js";
import ModuleUtil from "./core/util/module.js";
import { ConfigurationParameters } from "./core/configuration.js";
import { CoreOptions } from "./core/types.js";

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
(async () => {
  try {
    const packageJson = ModuleUtil.require("package.json");

    program
      .name(packageJson.name)
      .description(packageJson.description);

    // Build CLI
    for (const [name, parameter] of Object.entries(ConfigurationParameters)) {
      let arg = parameter.short ? `-${parameter.short}, --${name}` : `--${name}`;
      const param = parameter.param ? parameter.param : name;
      if (param)
        arg += parameter.required ? ` <${param}>` : ` [${param}]`;

      const description = `${parameter.description} (${parameter.type})`;
      const defaultValue = parameter.default ?? null;

      if (defaultValue === null)
        program.option(arg, description);
      else
        program.option(arg, description,
          typeof defaultValue === "number"
            ? String(defaultValue)
            : defaultValue
        );
    }

    program.version(packageJson.version, "-v, --version", "Output version");
    program.parse();
    const options = program.opts();

    // Set logger options
    const { debug: debugMode, debugLevel } = options;
    logger.setOptions({ debug: debugMode, debugLevel, name: packageJson.name });
    const debug = (message: string, ...args: any[]) => logger.debug(message, ...args);

    debug(`[CLI] Options passed: ${JSON.stringify(options, null, 2)}`, options.debugLevel);

    let finalConfig: Partial<CoreOptions> = {};
    if (options.config) {
      debug(`[CLI] Config file: ${options.config}`, options.debugLevel);
      const resolvedConfigFile = await fdUtil.resolveFile(options.config);
      options.config = resolvedConfigFile.path;

      if (!fs.existsSync(options.config ?? ""))
        throw new Error(`Config file does not exist: ${options.config}`);

      const config = ModuleUtil.require(options.config);
      finalConfig = { ...options, ...config };
      logger.setOptions({ name: packageJson.name, debugLevel: finalConfig.debugLevel, debug: finalConfig.debug });
      debug(`[CLI] Loaded configuration from ${options.config}`, 2);
    }

    // Log all options
    debug(`[CLI] Final Options: ${JSON.stringify(finalConfig, null, 2)}`, options.debugLevel);

    for (const [key, value] of Object.entries(finalConfig)) {
      let resolvedValue: string | string[] | undefined;

      if (key in ConfigurationParameters) {
        const parameter = ConfigurationParameters[key as keyof typeof ConfigurationParameters];
        const [_, type, array] = /^(\w+)(\[\])?$/.exec(parameter?.type ?? "") || [];

        debug(`[CLI] Parameter: ${key} = ${value}`, options.debugLevel);

        if (array) {
          if (!Array.isArray(value)) throw new Error(`${key} must be an array`);
          if (value.some(item => typeof item !== type)) throw new Error(`${key} must be an array of ${type}`);
        } else {
          if (typeof value !== type) throw new Error(`${key} must be a ${type}`);
        }

        if (parameter?.subtype?.path) {
          if (key === "input")
            resolvedValue = Array.isArray(value) ? value : [value as string];
          else
            resolvedValue = value as string;

          const pathType = parameter.subtype.path.type;
          if (pathType !== "directory" && pathType !== "file")
            throw new Error(`Invalid path type: ${pathType}`);

          const resolveFunction = pathType === "directory" ? fdUtil.resolveDir : fdUtil.resolveFile;
          const mustExist = parameter.subtype.path.mustExist;

          if (Array.isArray(resolvedValue)) {
            debug(`[CLI] Resolving ${pathType}s for ${key} = ${JSON.stringify(resolvedValue, null, 2)}`, options.debugLevel);

            const resolvedFiles: string[] = [];
            for (const file of resolvedValue) {
              debug(`[CLI] Resolving ${pathType}: ${file}`, options.debugLevel);
              const resolvedFile = await resolveFunction(file);
              debug(`[CLI] Resolved ${pathType}: ${resolvedFile}`, options.debugLevel);
              resolvedFiles.push(resolvedFile.path);
            }

            debug(`[CLI] Resolved paths for ${key} = ${JSON.stringify(resolvedFiles, null, 2)}`, options.debugLevel);
            if (key in ConfigurationParameters) {
              (finalConfig as any)[key] = resolvedFiles;
            }
          } else {
            debug(`[CLI] Resolving ${pathType} for ${key} = ${resolvedValue}`, options.debugLevel);
            const resolvedFile = await resolveFunction(resolvedValue);
            debug(`[CLI] Resolved ${pathType} for ${key} = ${resolvedFile.uri}`, options.debugLevel);
            if (key in ConfigurationParameters) {
              (finalConfig as any)[key] = resolvedFile.path;
            }
          }

          if (mustExist) {
            const missingPaths = Array.isArray(resolvedValue)
              ? resolvedValue.filter(item => !fs.existsSync(item))
              : (!fs.existsSync(resolvedValue) ? [resolvedValue] : []);

            if (missingPaths.length > 0) throw new Error(`${key} path(s) do not exist: ${missingPaths.join(", ")}`);
          }
        } else {
          resolvedValue = value as string;
          if (key in ConfigurationParameters) {
            (finalConfig as any)[key] = resolvedValue;
          }
        }
      } else {
        logger.warn(`[CLI] Unknown option: ${key}`);
      }
    }

    debug(`[CLI] Final configuration (resolved): ${JSON.stringify(finalConfig, null, 2)}`, finalConfig.debugLevel, finalConfig.debug);
    // Validate input options
    if (!finalConfig.input) {
      throw new Error("You must specify input files.");
    }

    finalConfig.env = Environment.CLI;
    const core = await Core.new(finalConfig as CoreOptions);
    await core.processFiles();
  } catch (e: any) {
    logger.error(`Error: ${e?.message}`);
    logger.error(e?.stack);
    process.exit(1);
  }
})();
