#!/usr/bin/env node

import {Data, DirectoryObject, FileObject, Glog, Sass, Tantrum, Term} from "@gesslar/toolkit"
import {program} from "commander"
import process from "node:process"
import url from "node:url"

import BeDoc from "./BeDoc.js"
import {ConfigurationParameters} from "./ConfigurationParameters.js"
import Environment from "./Environment.js"
import Schema from "./Schema.js"
import {Schemer} from "@gesslar/negotiator"

// Main entry point
void (async() => {
  try {
    const glog = new Glog()
      .withName("BeDoc")
      .withStackTrace()
      .noDisplayName()
      .withLogLevel(3)

    // Get package info
    const thisPath = new DirectoryObject(url.fileURLToPath(new url.URL("..", import.meta.url)))
    const pkgJsonFile = new FileObject("package.json", thisPath)
    const pkgJson = await pkgJsonFile.loadData()

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
    const prjPath = new DirectoryObject()
    const prjPkJsonFile = new FileObject("package.json", prjPath)
    const prjPkjJson = await prjPkJsonFile.loadData()
    const pkjBedoc = prjPkjJson?.bedoc ?? {}
    const validateBeDocSchema = await loadSchemaValidator(prjPath)

    const bedoc = await BeDoc
      .new({
        options: {
          ...optionsWithSources,
          basePath: prjPath,
          project: pkjBedoc,
        },
        source: Environment.CLI,
        glog,
        validateBeDocSchema,
      })

    if(!(bedoc instanceof BeDoc)) {
      if(Data.isPlainObject(bedoc)) {
        Term.info(bedoc.message)
        process.exit(0)
      }
    }

    const result = await bedoc.processFiles()
    const errored = result.errored
    const warned = result.warned

    if(warned?.length > 0)
      warned.forEach(w => glog.warn(w.warning))

    if(errored?.length > 0) {
      const errors = errored.map(e => e.error)
      Tantrum.new("Error processing files", errors).report(true)
    }

    process.exit(0)
  } catch(error) {
    Sass.new("Starting BeDoc", error).report(false)

    process.exit(1)
  }

  /**
   * Load the BeDoc action schema and return a validator function.
   *
   * @returns {Promise<Function>} AJV validator function
   */
  async function loadSchemaValidator(prjPath) {
    const schemaFile = new FileObject(Schema.local, prjPath)
    if(!(await schemaFile.exists))
      throw Sass.new(`Missing schema at ${schemaFile.path}`)

    return await Schemer.fromFile(schemaFile)
  }
})()
