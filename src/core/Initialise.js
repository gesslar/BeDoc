import {DirectoryObject, FileObject, Glog, Tantrum} from "@gesslar/toolkit"
import Configuration from "./abstracted/Configuration.js"

import ENV from "./Env.js"

export default class Initialise {
  #debug

  setup = ab => ab
    .do("Initialise project files", this.#initialiseProjectFiles)
    .do("Validate Configuration", this.#validateConfiguration)
    .do("Set up logging", this.#setupLogging)
    .do("Debug message the configuration", this.#printConfiguration)

  async #initialiseProjectFiles({value}) {
    const {content} = value
    // Create core instance with validated config
    const prjPath = new DirectoryObject(process.cwd())
    const prjPkJsonFile = new FileObject("package.json", prjPath)
    const prjPkjJson = await prjPkJsonFile.loadData()
    const pkjBedoc = prjPkjJson?.bedoc ?? {}

    Object.assign(content, {
      basePath: {value: prjPath, source: "cli"},
      project: pkjBedoc,
    })

    return {value}
  }

  async #validateConfiguration({value}) {
    const {content} = value

    const config = new Configuration()
    const validConfig = await config.validate({
      options: content,
      source: ENV.CLI
    })

    if(validConfig.status === "error") {
      Tantrum
        .new("Validating configuration.", validConfig.errors)
        .report(true)

      process.exit(1)
    }

    Object.assign(content, validConfig)

    return {value}
  }

  async #setupLogging({value}) {
    const {content} = value

    const glog = new Glog({env: ENV.CLI})
      .withLogLevel(content.debugLevel ?? 0)
      .withName("BEDOC")
      .withStackTrace(content.nerd)

    value.glog = glog

    this.#debug = glog.newDebug("Initialise")

    this.#debug("Logging initialised.", 2)

    return {value}
  }

  async #printConfiguration({value}) {
    this.#debug("Configuration complete.", 3, value.content)

    return {value}
  }
}
