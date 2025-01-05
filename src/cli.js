import { program } from "commander"
import Core from "./core/Core.js"
import Logger from "./core/Logger.js"
import ModuleUtil from "./core/util/ModuleUtil.js"
import { ConfigurationParameters } from "./core/ConfigurationParameters.js"
import { ConfigurationValidator } from "./core/ConfigurationValidator.js"

// We need our own logger instance, because we aren't the Core object.
const logger = new Logger(null);

// Main entry point
(async() => {
  try {
    // Get package info
    const packageJson = ModuleUtil.require("./package.json")

    // Setup program
    program
      .name(packageJson.name)
      .description(packageJson.description)

    // Build CLI
    for(const [name, parameter] of Object.entries(ConfigurationParameters)) {
      let arg = parameter.short ? `-${parameter.short}, --${name}` : `--${name}`
      const param = parameter.param ? parameter.param : name
      if(param)
        arg += parameter.required ? ` <${param}>` : ` [${param}]`

      const description = `${parameter.description} (${parameter.type})`
      const defaultValue = parameter.default ?? null

      if(defaultValue === null)
        program.option(arg, description)
      else
        program.option(arg, description,
          typeof defaultValue === "number"
            ? String(defaultValue)
            : defaultValue
        )
    }

    // Add version option last
    program.version(packageJson.version, "-v, --version", "Output the version number")
    program.helpOption("-h, --help", "Output usage information")
    program.parse()

    // Get options
    const options = program.opts()

    // Validate options using ConfigValidator
    const validatedConfig = await ConfigurationValidator.validate(options)
    if(validatedConfig.status === "error") {
      console.error(`The following errors were found in the configuration:\n\n${validatedConfig.error}`)
      process.exit(0)
    }

    // Create core instance with validated config
    const core = await Core.new(validatedConfig)
    await core.processFiles()
  } catch(e) {
    if(e instanceof Error) {
      if(e.stack)
        console.error(e.stack)
      else
        console.error(`Error: ${e.message}`)
    }
    process.exit(1)
  }
})()
