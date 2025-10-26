#!/usr/bin/env node

import {DirectoryObject, FileObject, Sass, Tantrum, Util,Term} from "@gesslar/toolkit"
import {program} from "commander"
import process from "node:process"
import url from "node:url"

import {ActionRunner} from "@gesslar/actioneer"
import {ActionBuilder} from "../Actioneer/src/index.js"
import BeDoc from "./core/BeDoc.js"
import ConfigParams from "./core/ConfigParams.js"

// Main entry point
void (async() => {
  const nerd = true

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

    const {cost,result} = await Util.time(async() => {
      const bedoc = new ActionBuilder(new BeDoc()).build()
      const runner = new ActionRunner(bedoc)

      return await runner.run(optionsWithSources)
    })

    const bytes = result.reduce((acc,curr) => acc + curr.bytes, 0)

    Term.status(`${result.length.toLocaleString()} files processed, `+
    `${bytes.toLocaleString()} bytes written ` +
    `in ${cost.toLocaleString()} ms`)

    process.exit(0)
  } catch(error) {
    if(error instanceof Sass || error instanceof Tantrum)
      error.report(nerd)
    else
      Sass.new("Error instantiating BeDoc", error).report(nerd)

    process.exit(1)
  }
})()
