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

const {loadPackageJson} = ActionUtil
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
    const config = new Configuration()

    const validConfig = await config.validate({options, source})
    if(validConfig.status === "error")
      throw new AggregateError(validConfig.errors,"BeDoc configuration failed")

    const instance = new Core({...validConfig, name: "BeDoc"})
    const debug = instance.logger.newDebug()

    debug("Creating new BeDoc instance with options: `%o`", 2, validConfig)

    const discovery = new Discovery(instance)
    const {printer: validPrint, parser: validParse} = validConfig

    const actionDefs = await discovery.discoverActions({
      print: validPrint,
      parse: validParse
    })

    const validCrit = discovery.satisfyCriteria(actionDefs, validConfig)

    debug("Actions that met criteria: `%o`", 2, validCrit)

    if(Object.values(validCrit).some(arr => arr.length === 0))
      throw new Error("No found matching parser and printer")

    const validSchemas = {print: [], parse: []}
    let printers = validCrit.print.length
    while(printers--) {
      const printer = validCrit.print[printers]
      const printerSchema = printer.contract
      const satisfied = []
      for(const parser of validCrit.parse) {
        const parserSchema = parser.contract
        const result = schemaCompare(parserSchema, printerSchema)
        if(result.status === "success")
          satisfied.push(parser)
      }

      if(satisfied.length > 0) {
        validSchemas.print.push(printer)
        validSchemas.parse.push(...satisfied)
      }
    }

    const finalActions = {}
    for(const [key, value] of Object.entries(validSchemas)) {
      if(value.length === 0)
        throw new Error(`No matching ${key} found`)

      if(value.length > 1)
        throw new Error(`Multiple matching ${key} found`)

      finalActions[key] = validSchemas[key][0]
    }

    debug("Contracts satisfied between parser and printer", 2)

    // Adding to instance
    instance.actions = {}
    const managers = {print: PrintManager, parse: ParseManager}
    for(const [, value] of Object.entries(finalActions)) {
      const {action: actionType} = value.action.meta

      debug("Attaching `%o` action to instance", 2, actionType)
      instance.actions[actionType] = new managers[actionType](
        value, instance.logger
      )

      if(validConfig.hooks) {
        const hookManager = await HookManager.new({
          action: actionType,
          hooksFile: validConfig.hooks,
          logger: new Logger(instance.debugOptions),
          timeout: validConfig.hooksTimeout,
        })

        if(hookManager)
          instance.actions[actionType].hookManager = hookManager
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
      this.actions.parse,
      this.actions.print,
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
