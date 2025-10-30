#!/usr/bin/env node

import {Glog,DirectoryObject, FileObject, Sass, Tantrum, Util,Term} from "@gesslar/toolkit"
import {program} from "commander"
import process from "node:process"
import url from "node:url"

import {ActionBuilder,ActionRunner} from "@gesslar/actioneer"
import BeDoc from "./core/BeDoc.js"
import ConfigParams from "./core/ConfigParams.js"
import Initialise from "./core/Initialise.js"

// Main entry point
void (async() => {
  const nerd = true

  let pipeResult, cost

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
    for(const [name, parameter] of Object.entries(ConfigParams.parameters)) {
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

    const optionsWithSources = Object.keys(options).reduce((acc,curr) => {
      // acc[curr] = {value: options[curr], source: sources[curr]}
      acc[curr] = {value: options[curr], source: sources[curr]}

      return acc
    }, {})

    const overallResult = await Util.time(async() => {
      const config = await (new Initialise(optionsWithSources)).validate()
      const bedoc = new ActionBuilder(new BeDoc())
      const runner = new ActionRunner(bedoc)

      return await runner.run(config)
    })

    void({cost,result: pipeResult} = overallResult)

    Glog(JSON.stringify(Object.keys(pipeResult)))

    // const errors = pipeResult.filter(e => !e.ok).map(e => e.error)

    // if(errors.length > 0)
    //   throw Tantrum.new("Errors in pipeline.", errors)

    report()

    return process.exit(0)
  } catch(error) {
    if(error instanceof Sass || error instanceof Tantrum)
      error.report(nerd)
    else
      Sass.new("Error instantiating BeDoc", error).report(nerd)

    report()

    return process.exit(1)
  }

  function report() {
    Glog(JSON.stringify(pipeResult))

    return
    // const errors = pipeResult.filter(e => e.error)
    // const processed = pipeResult.filter(e => e.ok)
    // const bytes = processed.reduce((acc,curr) => acc + curr.value.bytes, 0)

    // Term.status(
    //   `\n${processed.length.toLocaleString()} files processed\n`+
    //   `${bytes.toLocaleString()} bytes written\n`+
    //   `${errors.length.toLocaleString()} errors encountered\n`+
    //   `Duration ${cost.toLocaleString()} ms`
    // )
  }
})()
