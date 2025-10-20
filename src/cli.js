#!/usr/bin/env node

import {Data, DirectoryObject, FileObject, Sass, Tantrum, Term} from "@gesslar/toolkit"
import {program} from "commander"
import process from "node:process"
import url from "node:url"

import {ConfigurationParameters} from "./core/abstracted/ConfigurationParameters.js"
import BeDoc, {ENVIRONMENT} from "./core/Core.js"
import Glog from "./core/abstracted/Glog.js"

// Main entry point
void (async() => {
  try {
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

    const debug = Glog.create({env: ENVIRONMENT.CLI})
      .withLogLevel(5)
      .withPrefix("[BEDOC]")
      .withStackTrace(true)
      .newDebug()

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
        source: ENVIRONMENT.CLI,
        debug
      })

    if(!(bedoc instanceof BeDoc)) {
      if(Data.isPlainObject(bedoc)) {
        Term[bedoc.status](bedoc.message)
        process.exit(0)
      }
    }

    const filesToProcess = bedoc.options.include.map(f => f.path)
    await bedoc.processFiles(filesToProcess)

    process.exit(0)
  } catch(error) {
    if(error instanceof Sass || error instanceof Tantrum)
      error.report(true)
    else
      Term.error(error)

    process.exit(1)
  }
})()
