import process from "node:process"

import Discovery from "./Discovery.js"
import HookManager from "./HookManager.js"
import Logger from "./Logger.js"
import ParseManager from "./action/ParseManager.js"
import PrintManager from "./action/PrintManager.js"
import Conveyor from "./Conveyor.js"
import Configuration from "./Configuration.js"

import * as ActionUtil from "./util/ActionUtil.js"
import * as DataUtil from "./util/DataUtil.js"
import * as FDUtil from "./util/FDUtil.js"

const {loadPackageJson,actionTypes} = ActionUtil
const {schemaCompare} = DataUtil
const {getFiles} = FDUtil

export const Environment = Object.freeze({
  EXTENSION: "extension",
  NPM: "npm",
  ACTION: "action",
  CLI: "cli",
})

export default class Core {
  constructor(options) {
    this.options = options
    const {debug: debugMode, debugLevel} = options
    this.logger = new Logger({name: "BeDoc", debugMode, debugLevel})
    this.packageJson = loadPackageJson()?.bedoc ?? {}
    this.debugOptions = this.logger.options
  }

  static async new({options, source}) {
    const configuration = new Configuration()

    const validatedConfig = await configuration.validate({options, source})
    if(validatedConfig.status === "error")
      throw new AggregateError(
        validatedConfig.errors,
        "BeDoc configuration failed"
      )

    const instance = new Core({...validatedConfig, name: "BeDoc"})
    const debug = instance.logger.newDebug()

    debug("Creating new BeDoc instance with options: `%o`", 2, validatedConfig)

    const discovery = new Discovery(instance)
    const actionDefinitions = await discovery.discoverActions({
      printer: validatedConfig.printer,
      parser: validatedConfig.parser,
    })

    const filteredActions = discovery.satisfyCriteria(
      actionDefinitions, validatedConfig
    )

    debug("Filtered actions: `%o`", 2, filteredActions)

    const matches = []
    // Now let us find the ones that agree to a contract
    for(const printer of filteredActions.print) {
      for(const parser of filteredActions.parse) {
        const satisfied = schemaCompare(parser.contract, printer.contract)

        if(satisfied.status === "success")
          matches.push({parse: parser, print: printer})
      }
    }

    if(matches.length === 0) {
      const message = `No matching actions found for language: `+
        `${validatedConfig.language} and format: ${validatedConfig.format}`

      throw new Error(message)
    }

    // We only want one!
    if(matches.length > 1) {
      const message =
        `Multiple matching actions found: ` +
        `${matches.map((m) => m.print.name).join(", ")}`
      throw new Error(message)
    }

    debug("Found matching actions: `%o`", 3, matches)

    const chosenActions = matches[0]

    if(Object.values(chosenActions).some(a => !a))
      throw new Error("No found matching parser and printer")

    const contracts = Object.values(chosenActions)
      .map(a => a.contract)
      .sort(a => a.provides) // Parser first
    const satisfied = schemaCompare(...contracts)
    if(satisfied.status === "error") {
      instance.logger.error(
        `Action contract failed: ${satisfied.errors}`,
      )
      throw new AggregateError(satisfied.errors, "Action contract failed")
    } else if(satisfied.status !== "success") {
      throw new Error(
        `Action contract failed: ${satisfied.message}`,
      )
    }

    debug("Contracts satisfied between parser and printer", 2)

    // Adding to instance
    instance.actions = {}
    for(const actionDefinition of Object.values(chosenActions)) {
      const {action: actionType} = actionDefinition.action.meta

      debug("Attaching `%o` action to instance", 2, actionType)
      instance[actionType] = new ParseManager(
        chosenActions[actionType], instance.logger
      )

      if(validatedConfig.hooks) {
        const hookManager = await HookManager.new({
          action: actionType,
          hooksFile: validatedConfig.hooks,
          logger: new Logger(instance.debugOptions),
          timeout: validatedConfig.hooksTimeout,
        })

        if(hookManager)
          instance[actionType].hookManager = hookManager
      }
    }

    return instance
  }

  async processFiles(glob, startTime = process.hrtime()) {
    const debug = this.logger.newDebug()

    debug("Starting file processing with conveyor", 1)

    const {output} = this.options

    const input = await getFiles(glob)
    if(!input?.length)
      throw new Error("No input files specified")

    // Instantiate the conveyor
    const conveyor = new Conveyor(
      this.parse,
      this.print,
      this.logger,
      output,
    )

    const processStart = process.hrtime()

    // Initiate the conveyor
    const result = await conveyor.convey(input, this.options.maxConcurrent)

    debug("Conveyor complete", 1)

    const endTime = (process.hrtime(startTime)[1] / 1_000_000).toFixed(2)
    const processEnd = (process.hrtime(processStart)[1] / 1_000_000).toFixed(2)

    // Grab the results
    const totalFiles = input.length
    const errored = result.errored
    const succeeded = result.succeeded

    const message = `Processed ${totalFiles} files: ${succeeded.length} succeeded, ${errored.length} errored ` +
      `in ${processEnd}ms [total: ${endTime}ms]`

    this.logger.debug(message, 1)

    if(errored.length > 0) {
      // const failureRate = ((errored.length / totalFiles) * 100).toFixed(2)
      // const errorMessage =
      //   `Errors processing ${errored.length} files [${failureRate}%]`
      // const errorLines = errored.map(r => {
      //   const stackLine = log.lastStackLine(r.error, 0)
      //   return `\n- ${r.input.module}: ${stackLine} - ${r.error.message}`
      // }).join("")

      // this.logger(errorMessage+errorLines)
    }

    debug("File processing complete", 1)

    return result
  }
}
