#!/usr/bin/env node

import {DirectoryObject, FileObject, Sass, Tantrum} from "@gesslar/toolkit"
import {program} from "commander"
import process from "node:process"
import url from "node:url"

import {ActionRunner} from "@gesslar/actioneer"
import ConfigParams from "./core/ConfigParams.js"
import BeDoc from "./core/BeDoc.js"
import {ActionBuilder} from "../Actioneer/src/index.js"

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

    // Common configuration to pass to all actions from
    // forefromhere
    // const common = {
    //   config: setup.config,
    //   glog: setup.glog,
    //   project: setup.allOptions.project,
    //   debug: setup.glog.newDebug()
    // }

    // const bedoc = new BeDoc({})
    // const runners = bedoc.actions.map(action => new ActionRunner(action))

    const bedoc = new ActionBuilder(new BeDoc()).build()
    const runner = new ActionRunner(bedoc)
    const result = await runner.run(optionsWithSources)

    // let content = optionsWithSources
    // let glog = {}
    // let config = {}

    // for(const runner of runners) {
    //   const result = await runner.run({content,config,glog})

    //   void({content,config,glog} = result.value)
    // }

    console.log(JSON.stringify(result, null, 2))

    process.exit(0)

    // const runner = new ActionRunner()
    // bedoc.actions.forEach(runner.addStep)
    // const result = await runner.run(optionsWithSources)

    // // Discovery before we do the BeDoc
    // const disco = new ActionBuilder(new Discovery(common))
    //   .build()
    // const discoRunner = new ActionRunner(disco,common)
    // const discoResult = await discoRunner.run({})

    // setup.debug("%o", 1, discoResult.value)

    // process.exit(0)

    // const pipe = setup.config.include
    // const bedoc = new ActionBuilder(new BeDoc(common))
    //   .build()
    // const bedocRunner = new ActionRunner(bedoc, common)
    // const bedocResult = await bedocRunner.pipe(pipe)

    // console.log(JSON.stringify(bedocResult, null, 2))

    // const bedoc = await BeDoc
    //   .new({
    //     options: {
    //       ...optionsWithSources,
    //       basePath: {value: prjPath, source: "cli"},
    //       project: pkjBedoc,
    //     },
    //     source: ENVIRONMENT.CLI,
    //     glog
    //   })

    // if(!(bedoc instanceof BeDoc)) {
    //   if(Data.isPlainObject(bedoc)) {
    //     Term[bedoc.status](bedoc.message)
    //     process.exit(0)
    //   }
    // }

    // const filesToProcess = bedoc.options.include.map(f => f.path)
    // await bedoc.processFiles(filesToProcess)

    process.exit(0)
  } catch(error) {
    if(error instanceof Sass || error instanceof Tantrum)
      error.report(nerd)
    else
      Sass.new("Error instantiating BeDoc", error).report(nerd)

    process.exit(1)
  }
})()
