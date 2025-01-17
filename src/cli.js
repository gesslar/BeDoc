#!/usr/bin/env node

import {program} from "commander"
import console from "node:console"
import process from "node:process"
import {Configuration} from "./core/Configuration.js"
import {ConfigurationParameters} from "./core/ConfigurationParameters.js"
import Core from "./core/Core.js"
import ModuleUtil from "./core/util/ModuleUtil.js"
import { Environment } from "./core/include/Environment.js"

// Main entry point
(async() => {
  try {
    // Get package info
    const packageJson = await ModuleUtil.loadPackageJson()

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
      const defaultValue = parameter.default

      program.option(arg, description, defaultValue)
    }

    // Add version option last
    program.version(packageJson.version, "-v, --version", "Output the version number")
    program.helpOption("-h, --help", "Output usage information")
    program.parse()

    // Get options
    const options = program.opts()

    const sources = program._optionValueSources
    const optionsWithSources = {}
    for(const [key, value] of Object.entries(options)) {
      const element = {
        value,
        source: sources[key]
      }
      optionsWithSources[key] = element
    }

    // Validate options using ConfigValidator
    const configuration = new Configuration()
    const validatedConfig = await configuration.validate(optionsWithSources)
    if(validatedConfig.status === "error") {
      console.error(`The following errors were found in the configuration:\n\n${validatedConfig.error}`)
      process.exit(0)
    }

    // Set environment to CLI
    validatedConfig.env = Environment.CLI

    // Create core instance with validated config
    Core.new(validatedConfig).then(core => core.processFiles())
  } catch(e) {
    if(e instanceof Error) {
      if(e instanceof AggregateError) {
        for(const error of e.errors) {
          console.error(`Error: ${error.message}`)
        }
      } else if(e.stack) {
        console.error(e.stack)
      } else {
        console.error(`Error: ${e.message}`)
      }
    } else {
      console.error(`Error: ${e}`)
    }
    process.exit(1)
  }
})()
