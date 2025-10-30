import {DirectoryObject, FileObject, Glog, Tantrum} from "@gesslar/toolkit"
import Configuration from "./Configuration.js"

import ENV from "./Env.js"

export default class Initialise {
  #options

  constructor(options) {
    this.#options = options
  }

  async validate() {
    const projectFiles = await this.#initialiseProjectFiles(this.#options)
    const validated = await this.#validateConfiguration(projectFiles)
    const final = await this.#setupLogging(validated)

    return final
  }

  async #initialiseProjectFiles(context) {
    const config = context

    // Create core instance with validated config
    const prjPath = new DirectoryObject(process.cwd())
    const prjPkJsonFile = new FileObject("package.json", prjPath)
    const prjPkjJson = await prjPkJsonFile.loadData()
    const pkjBedoc = prjPkjJson?.bedoc ?? {}

    // We need the config in both config AND content, because while config
    // houses the actual config, content is what will be passed along the
    // pipeline through Discovery, etc.
    Object.assign(config, {
      basePath: {value: prjPath, source: "cli"},
      project: pkjBedoc,
    })

    context = {config, content: config}

    return context
  }

  async #validateConfiguration(context) {
    const {content} = context

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

    return context
  }

  async #setupLogging(context) {
    const {content} = context

    const glog = new Glog({env: ENV.CLI})
      .withLogLevel(content.debugLevel ?? 0)
      .withName("BEDOC")
      .withStackTrace(content.nerd)

    context.glog = glog

    return context
  }
}
