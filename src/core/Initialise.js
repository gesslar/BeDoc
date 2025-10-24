import {Collection, DirectoryObject, FileObject, Glog, Tantrum, Util} from "@gesslar/toolkit"
import Configuration from "./abstracted/Configuration.js"

import ENV from "./Env.js"

export default class Initialise {
  #config
  #debug
  #project

  constructor({debug, config, project}) {
    this.#config = config
    this.#debug = debug
    this.#project = project
  }

  setup = ab => ab
    .do("Initialise project files", this.#initialiseProjectFiles)
    .do("Validate Configuration", this.#validateConfiguration)
    .do("Set up logging", this.#setupLogging)
    .do("Debug message the configuration", this.#printConfiguration)

  async #initialiseProjectFiles(context) {
    const {value} = context

    // Create core instance with validated config
    const prjPath = new DirectoryObject(process.cwd())
    const prjPkJsonFile = new FileObject("package.json", prjPath)
    const prjPkjJson = await prjPkJsonFile.loadData()
    const pkjBedoc = prjPkjJson?.bedoc ?? {}

    Object.assign(value, {
      basePath: {value: prjPath, source: "cli"},
      project: pkjBedoc,
    })

    return context
  }

  async #validateConfiguration(context) {
    const config = new Configuration()
    const validConfig = await config.validate({
      options: context.value,
      source: ENV.CLI
    })

    if(validConfig.status === "error") {
      Tantrum
        .new("Validating configuration.", validConfig.errors)
        .report(true)

      process.exit(1)
    }

    Object.assign(context, {value: validConfig})

    return context
  }

  async #setupLogging(context) {
    const {value} = context

    const glog = new Glog({env: ENV.CLI})
      .withLogLevel(value.debugLevel ?? 0)
      .withName("BEDOC")
      .withStackTrace(value.nerd)

    const debug = glog.newDebug()

    Object.assign(context.value, {logging: {glog,debug}})

    return context
  }

  async #printConfiguration(context) {
    const sansLogging = Collection.cloneObject(context.value)

    delete sansLogging.logging

    const config = JSON.stringify(sansLogging)

    context.value.logging.debug("Configuration complete.", 3, config)

    return context
  }
}
