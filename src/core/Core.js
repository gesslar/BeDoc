import {hrtime} from "node:process"

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
    this.packageJson = loadPackageJson(options.basePath)?.bedoc ?? {}
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
    const actionDefs = await discovery.discoverActions({
      print: validConfig.printer,
      parse: validConfig.parser
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
    const {variables} = validConfig
    const managers = {print: PrintManager, parse: ParseManager}
    for(const [, actionDefinition] of Object.entries(finalActions)) {
      const {action: actionType} = actionDefinition.action.meta

      debug("Attaching %o action to instance", 2, actionType)
      instance.actions[actionType] =
        new managers[actionType] ({
          actionDefinition,
          logger: instance.logger,
          variables
        })

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

  async processFiles(glob) {
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
