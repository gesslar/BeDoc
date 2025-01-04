import { program }from "commander";
import Core from "./core/core";
import Logger from "./core/logger";
import ModuleUtil from "./core/util/module";
import { ConfigurationParameters }from "./core/configuration";
import { ConfigValidator }from "./core/validation";

// We need our own logger instance, because we aren't the Core object.
const logger = new Logger(null);

// Main entry point
(async() => {
  try {
    // Get package info
    const packageJson = ModuleUtil.require("./package.json");

    // Setup program
    program
      .name(packageJson.name)
      .description(packageJson.description)

    // Build CLI
    for(const [name, parameter]of Object.entries(ConfigurationParameters)) {
      let arg = parameter.short ? `-${parameter.short}, --${name}` : `--${name}`;
      const param = parameter.param ? parameter.param : name;
      if(param)
        arg += parameter.required ? ` <${param}>` : ` [${param}]`;

      const description = `${parameter.description} (${parameter.type})`;
      const defaultValue = parameter.default ?? null;

      if(defaultValue === null)
        program.option(arg, description);
      else
        program.option(arg, description,
          typeof defaultValue === "number"
            ? String(defaultValue)
            : defaultValue
        );
    }

    // Add version option last
    program.version(packageJson.version, "-v, --version", "Output the version number");
    program.helpOption("-h, --help", "Output usage information");
    program.parse();

    // Get options
    const options = program.opts();

    // Validate options using ConfigValidator
    const validatedConfig = await ConfigValidator.validate(options);

    // Create core instance with validated config
    const core = await Core.new(validatedConfig);
    await core.processFiles();
  } catch(e) {
    if(e instanceof Error) {
      logger.error(`Error: ${e.message}`);
      if(e.stack)
        logger.error(e.stack);
    }
    process.exit(1);
  }
})();
