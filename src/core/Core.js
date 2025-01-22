import Discovery from "./Discovery.js"
import {HooksManager} from "./HooksManager.js"
import Logger from "./Logger.js"
import ParseManager from "./action/ParseManager.js"
import PrintManager from "./action/PrintManager.js"
import Conveyor from "./Conveyor.js"

import * as ActionUtil from "./util/ActionUtil.js"
import * as DataUtil from "./util/DataUtil.js"

const {loadPackageJson} = ActionUtil
const {schemaCompare} = DataUtil

const Environment = {
  EXTENSION: "extension",
  ACTION: "action",
  CLI: "cli",
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
    for(const search of [{parse: "language", print: "format"}]) {
      for(const [actionType, criterion] of Object.entries(search)) {
        filteredActions[actionType] = actionDefinitions[actionType].filter(
          (a) => a.action.meta[criterion] === options[criterion],
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
      const message =
        `Multiple matching actions found: ` +
        `${matches.map((m) => m.print.name).join(", ")}`
      throw new Error(message)
    }

    const chosenActions = matches[0]

    if(Object.values(chosenActions).some((a) => !a))
      throw new Error("No found matching parser and printer")

    const satisfied = schemaCompare(
      chosenActions.parse.contract,
      chosenActions.print.contract,
    )

    if(satisfied.status === "error") {
      instance.logger.error(
        `[Core.new] action contract failed: ${satisfied.errors}`,
      )
      throw new AggregateError(satisfied.errors, "Action contract failed")
    } else if(satisfied.status !== "success") {
      throw new Error(
        `[Core.new] Action contract failed: ${satisfied.message}`,
      )
    }

    debug("Contracts satisfied between parser and printer", 2)

    // Adding to instance
    instance.parser = new ParseManager(chosenActions.parse, instance.logger)
    debug(
      `Attaching parse action to instance: \`${chosenActions.parse.module}\``,
      2,
    )
    instance.printer = new PrintManager(chosenActions.print, instance.logger)
    debug(
      `Attaching print action to instance: \`${chosenActions.print.module}\``,
      2,
    )

    // Setup and attach hooks
    for(const target of [
      {manager: instance.parser, action: "parse"},
      {manager: instance.printer, action: "print"},
    ]) {
      if(options.hooks) {
        const {manager, action} = target
        const hooks = await HooksManager.new({
          action: action,
          hooksFile: options.hooks,
          logger: new Logger(instance.debugOptions),
          timeout: options.hooksTimeout,
        })

        if(hooks) manager.hooks = hooks
        else instance.logger.warn(`No hooks found for action: \`${action}\``)
      }
    }

    return instance
  }

  async processFiles() {
    const debug = this.logger.newDebug()
    debug("Starting file processing with conveyor", 1)

    const {input, output} = this.options

    if(!input) throw new Error("No input files specified")

    // Instantiate the conveyor
    const conveyor = new Conveyor(
      this.parser,
      this.printer,
      this.logger,
      output,
    )

    // Initiate the conveyor
    await conveyor.convey(input, this.options.maxConcurrent)

    debug("File processing completed successfully", 1)
  }
}

export {Core, Environment}
