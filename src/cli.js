#!/usr/bin/env node

import {program} from "commander"
import console from "node:console"
import process from "node:process"

import BeDoc, {Environment} from "./core/Core.js"
import {ConfigurationParameters} from "./core/ConfigurationParameters.js"

import * as ActionUtil from "./core/util/ActionUtil.js"
import * as FDUtil from "./core/util/FDUtil.js"

const {loadPackageJson} = ActionUtil
const {resolveDirectory} = FDUtil

// Main entry point
;(async() => {
  try {
    // Get package info
    const basePath = resolveDirectory(process.cwd())
    const packageJson = loadPackageJson(basePath)

    // Setup program
    program.name(packageJson.name).description(packageJson.description)

    // Build CLI
    for(const [name, parameter] of Object.entries(ConfigurationParameters)) {
      let arg = parameter.short
        ? `-${parameter.short}, --${name}`
        : `--${name}`

      const param = parameter.param ? parameter.param : name

      if(param)
        arg += parameter.required ? ` <${param}>` : ` [${param}]`

      const description = `${parameter.description} (${parameter.type})`
      const defaultValue = parameter.default

      program.option(arg, description, defaultValue)
    }

    // Add version option last
    program.version(
      packageJson.version,
      "-v, --version",
      "Output the version number",
    )
    program.helpOption("-h, --help", "Output usage information")
    program.parse()

    // Get options
    const options = program.opts()

    const sources = program._optionValueSources
    const optionsWithSources = {}
    for(const [key, value] of Object.entries(options)) {
      const element = {
        value,
        source: sources[key],
      }
      optionsWithSources[key] = element
    }

    // Create core instance with validated config
    const bedoc = await BeDoc
      .new({
        options: {
          ...optionsWithSources,
          basePath: {value: basePath, source: "cli"},
          packageJson: {value: packageJson, source: "cli"},
        },
        source: Environment.CLI
      })

    const filesToProcess = bedoc.options.input.map(f => f.absolutePath)
    const result = await bedoc.processFiles(filesToProcess)
    const errored = result.errored
    const warned = result.warned

    if(warned.length > 0)
      warned.forEach(w => bedoc.logger.warn(w.warning))

    if(errored.length > 0)
      throw new AggregateError(errored.map(e => e.error), "Error processing files")
  } catch(error) {
    if(error instanceof Error) {
      if(error instanceof AggregateError) {
        error.errors.forEach(e => console.error(e))
      } else {
        console.error(error.message, error.stack)
      }
    } else {
      console.error("Error: %o", error)
    }

    process.exit(1)
  }
})()
