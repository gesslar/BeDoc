#!/usr/bin/env node

import {Data, DirectoryObject, FileObject, Glog, Term} from "@gesslar/toolkit"
import {program} from "commander"
import console from "node:console"
import process from "node:process"
import url from "node:url"

import {ConfigurationParameters} from "./core/ConfigurationParameters.js"
import BeDoc, {Environment} from "./core/Core.js"

// Main entry point
void (async() => {
  try {
    // Get package info
    const thisPath = new DirectoryObject(url.fileURLToPath(new url.URL("..", import.meta.url)))
    const pkgJsonFile = new FileObject("package.json", thisPath)
    const pkgJson = await pkgJsonFile.loadData()

    Glog.setLogLevel(5).setLogPrefix("[BEDOC]")

    // Setup program
    program
      .name(pkgJson.name)
      .description(pkgJson.description)

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
      pkgJson.version,
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
    const prjPath = new DirectoryObject(process.cwd())
    const prjPkJsonFile = new FileObject("package.json", prjPath)
    const prjPkjJson = await prjPkJsonFile.loadData()
    const pkjBedoc = prjPkjJson?.bedoc ?? {}

    const bedoc = await BeDoc
      .new({
        options: {
          ...optionsWithSources,
          basePath: {value: prjPath, source: "cli"},
          project: pkjBedoc,
        },
        source: Environment.CLI
      })

    if(!(bedoc instanceof BeDoc)) {
      if(Data.isPlainObject(bedoc)) {
        Term.info(bedoc.message)
        process.exit(0)
      }
    }

    const filesToProcess = bedoc.options.input.map(f => f.path)
    const result = await bedoc.processFiles(filesToProcess)
    const errored = result.errored
    const warned = result.warned

    if(warned.length > 0)
      warned.forEach(w => bedoc.logger.warn(w.warning))

    if(errored.length > 0)
      throw new AggregateError(errored.map(e => e.error), "Error processing files")

    process.exit(0)
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
