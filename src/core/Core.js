import {FS, Glog} from "@gesslar/toolkit"
import {hrtime} from "node:process"

import ParseManager from "./action/ParseManager.js"
import PrintManager from "./action/PrintManager.js"
import Configuration from "./Configuration.js"
import Conveyor from "./Conveyor.js"
import Discovery from "./Discovery.js"
import HookManager from "./HookManager.js"
import Logger from "./Logger.js"
import ContractUtil from "./util/ContractUtil.js"

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
    this.debugOptions = this.logger.options
    this.packageJson = options.project
  }

  static async new({options, source}) {
    const config = new Configuration()

    Glog(options)

    const validConfig = await config.validate({options, source})

    if(validConfig.status === "error")
      throw new AggregateError(validConfig.errors,"BeDoc configuration failed")

    const core = new Core({...validConfig, name: "BeDoc"})
    const debug = core.logger.newDebug()

    debug("Creating new BeDoc instance with options: `%o`", 3, validConfig)

    const discovery = new Discovery(core)
    const actionDefs = await discovery.discoverActions({
      print: validConfig.printer,
      parse: validConfig.parser
    })

    const validCrit = discovery.satisfyCriteria(actionDefs, validConfig)

    debug("Actions that met criteria: `%o`", 3, validCrit)

    if(Object.values(validCrit).some(arr => arr.length === 0)) {
      return {
        status: "fail",
        message: "No matching actions specified or discovered."
      }
    }

    const validSchemas = {print: [], parse: []}
    let printers = validCrit.print.length

    while(printers--) {
      const printer = validCrit.print[printers]
      const printerSchema = printer.contract
      const satisfied = []

      for(const parser of validCrit.parse) {
        const parserSchema = parser.contract
        const result = ContractUtil.schemaCompare(
          parserSchema,
          printerSchema
        )

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
    core.actions = {}
    const {variables} = validConfig
    const managers = {print: PrintManager, parse: ParseManager}

    for(const [, actionDefinition] of Object.entries(finalActions)) {
      const {action: actionType} = actionDefinition.action.meta

      debug("Attaching %o action to instance", 2, actionType)
      core.actions[actionType] =
        new managers[actionType] ({
          actionDefinition,
          logger: core.logger,
          variables
        })

      if(validConfig.hooks) {
        const hookManager = await HookManager.new({
          action: actionType,
          hooksFile: validConfig.hooks,
          logger: new Logger(core.debugOptions),
          timeout: validConfig.hooksTimeout,
        })

        if(hookManager)
          core.actions[actionType].hookManager = hookManager
      }
    }

    return core
  }

  async processFiles(glob) {
    const debug = this.logger.newDebug()

    debug("Starting file processing with conveyor", 1)

    const {output} = this.options

    const input = await FS.getFiles(glob)

    if(!input?.length)
      throw new Error("No input files specified")

    // Instantiate the conveyor
    const conveyor = new Conveyor(
      this.actions.parse,
      this.actions.print,
      this.logger,
      output,
    )

    const processStart = hrtime.bigint()

    // Initiate the conveyor
    const processResult = await conveyor.convey(
      input, this.options.maxConcurrent
    )

    debug("Conveyor complete", 1)

    const processEnd = hrtime.bigint()

    const result = {
      totalFiles: input.length,
      succeeded: processResult.succeeded,
      warned: processResult.warned,
      errored: processResult.errored,
      duration: ((Number(processEnd - processStart)) / 1_000_000).toFixed(2)
    }

    debug("File processing complete", 1)

    return result
  }
}
