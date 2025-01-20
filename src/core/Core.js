import process from "node:process"
import {Discovery,HooksManager,Logger} from "#core"
import {ParseManager,PrintManager} from "#action"
import {schemaCompare,composeFilename,readFile,writeFile,loadPackageJson} from "#util"

const Environment = {
  EXTENSION: "extension",
  ACTION: "action",
  CLI: "cli"
}

class Core {
  constructor(options) {
    this.options = options
    const {debug: debugMode, debugLevel} = options
    this.logger = new Logger({name: "BeDoc", debugMode, debugLevel})
    this.packageJson = loadPackageJson()?.bedoc ?? {}
    this.debugOptions = this.logger.options
  }

  static async new(options) {
    const instance = new Core({...options, name: "BeDoc"})
    const debug = instance.logger.newDebug()

    debug("Initializing Core instance", 1)
    debug("Core passed options", 3, options)

    const discovery = new Discovery(instance)
    const actionDefinitions = await discovery.discoverActions()

    const filteredActions = {
      parse: [],
      print: [],
    }
    for(const search of [{parse: "language",print: "format"}]) {
      for(const [actionType, criterion] of Object.entries(search)) {
        filteredActions[actionType] = actionDefinitions[actionType].filter(
          a => a.action.meta[criterion] === options[criterion]
        )
      }
    }

    const matches = []
    // Now let us find the ones that agree to a contract
    for(const printer of filteredActions.print) {
      for(const parser of filteredActions.parse) {
        const satisfied = schemaCompare(parser.contract, printer.contract)
        if(satisfied.status === "success") {
          matches.push({parse: parser, print: printer})
        }
      }
    }

    // We only want one!
    if(matches.length > 1) {
      const message = `Multiple matching actions found: `+
        `${matches.map(m => m.print.name).join(", ")}`
      throw new Error(message)
    }

    const chosenActions = matches[0]

    if(Object.values(chosenActions).some(a => !a))
      throw new Error("No found matching parser and printer")

    const satisfied = schemaCompare(
      chosenActions.parse.contract,
      chosenActions.print.contract
    )

    if(satisfied.status === "error") {
      instance.logger.error(`[Core.new] action contract failed: ${satisfied.errors}`)
      throw new AggregateError(satisfied.errors, "Action contract failed")
    } else if(satisfied.status !== "success") {
      throw new Error(`[Core.new] Action contract failed: ${satisfied.message}`)
    }

    debug("Contracts satisfied between parser and printer", 2)

    // Adding to instance
    instance.parser = new ParseManager(chosenActions.parse, instance.logger)
    debug(`Attaching parse action to instance: \`${chosenActions.parse.module}\``, 2)
    instance.printer = new PrintManager(chosenActions.print, instance.logger)
    debug(`Attaching print action to instance: \`${chosenActions.print.module}\``, 2)

    // Setup and attach hooks
    for(const target of [
      {manager: instance.parser, action: "parse"},
      {manager: instance.printer, action: "print"}
    ]) {
      if(options.hooks) {
        const {manager,action} = target
        const hooks = await HooksManager.new({
          action: action,
          hooksFile: options.hooks,
          logger: new Logger(instance.debugOptions),
          timeout: options.hooksTimeout
        })

        if(hooks)
          manager.hooks = hooks
        else
          instance.logger.warn(`No hooks found for action: \`${action}\``)
      }
    }

    return instance
  }

  async processFiles() {
    const debug = this.logger.newDebug()
    debug("Starting file processing", 1)

    const {input, output} = this.options

    debug("Processing input files", 2, input)

    if(!input)
      throw new Error("No input files specified")

    for(const fileMap of input) {
      debug(`Processing file \`${fileMap.path}\``, 2)

      const fileContent = readFile(fileMap)
      debug(`Read file content \`${fileMap.path}\` (${fileContent.length} bytes)`, 2)

      const parseResult = await this.parser.parse(fileMap.path, fileContent)

      switch(parseResult.status) {
        case "fatal error": {
          const {error} = parseResult
          throw error
        }
        case "error": {
          const {line,lineNumber,message} = parseResult
          throw new Error(`Failed to parse ${fileMap.path}: ${message} at ${lineNumber}\nLine: ${line}\nMessage: ${message}`)
        }

        case "warning": {
          const {line,lineNumber,message} = parseResult
          this.logger.warn(`${fileMap.path}: ${message} at ${lineNumber}\nLine: ${line}\nMessage: ${message}`)
          break
        }
      }

      debug(`File parsed successfully: \`${fileMap.path}\``, 2)
      debug(`Parse result for \`${fileMap.path}\`:`, 4, parseResult.result)

      const printResult = await this.printer.print(
        fileMap.module,
        parseResult.result
      )

      if(printResult.status === "error")
        throw new Error(`[processFiles] Failed to print ${fileMap.path}: ${printResult.message}`)

      debug(`File printed successfully: ${fileMap.path}`, 2)
      debug(`Print result for ${fileMap.path}:`, 4, printResult)

      const {destFile, content} = printResult

      this.#outputFile(output, destFile, content)
    }

    debug("File processing completed successfully", 1)
  }

  #outputFile(output, destFile, content) {
    const debug = this.logger.newDebug()

    debug(`Preparing to write output to ${destFile}.`, 3, output)

    if(this.options.env === Environment.CLI && !output) {
      process.stdout.write(content + "\n")
      debug("Output written to stdout", 2)
    } else if(output && destFile) {
      const destFileMap = composeFilename(output.path, destFile)
      writeFile(destFileMap, content)
      debug(`Output written to file: ${destFileMap.path}`, 2)
    } else {
      throw new Error("Output path and destination file required")
    }
  }
}

export {
  Core,
  Environment,
}
