import {ActionBuilder} from "@gesslar/actioneer"
import {Contract, FS, Sass} from "@gesslar/toolkit"
import {hrtime} from "node:process"

import BeDocSchema from "./BeDocSchema.js"
import ParseAction from "./ParseAction.js"
import Pipeline from "./Pipeline.js"
import PrintAction from "./PrintAction.js"
import Initialise from "./Initialise.js"
import Discovery from "./Discovery.js"

export default class BeDoc {
  static meta = Object.freeze({
    name: "BeDoc"
  })

  #debug
  #config
  #project
  #schemer = BeDocSchema
  #actions

  constructor({glog,config,project}) {
    this.#config = config
    this.#debug = glog?.newDebug()
    this.#project = project

    const common = {glog,config,project}

    this.#actions = [
      (new ActionBuilder(new Initialise(common))).build(),
      (new ActionBuilder(new Discovery(common))).build(),
    ]
  }

  get actions() {
    return this.#actions
  }

  // setup = ab => {
  //   const initialise = new ActionBuilder(new Initialise({}))
  // }
  // static async new({options, source, glog}) {
  //   // Load terms for all discovered actions
  //   await BeDoc.#loadActionTerms(discovered, debug)

  //   // Find compatible parser/printer pairs
  //   const compatibleActions = await BeDoc.#findCompatibleActions(
  //     discovered, debug
  //   )

  //   // Select final actions (ensure exactly one of each)
  //   const finalActions = BeDoc.#selectFinalActions(compatibleActions)

  //   // Instantiate actions and set up hooks
  //   await BeDoc.#instantiateActions(core, finalActions, validConfig, debug)

  //   return core
  // }

  /**
   * Discovers available parse and print actions
   *
   * @param {unknown} context
   * @returns {Promise<object>} Discovered actions object
   */
  // async #discoverActions(context) {
  //   const discovery = new Discovery(this.#config, this.#debug)

  //   context.discoveredActions = await discovery.discoverActions({
  //     print: this.#config.printer,
  //     parse: this.#config.parser
  //   })

  //   return context
  // }

  /**
   * Loads terms for all discovered actions
   *
   * @param {unknown} context
   * @returns {Promise<void>}
   */
  // async #loadActionTerms(context) {
  //   const debug = context.debug
  //   const actionSchema = await BeDocSchema.load(debug)
  //   const termsValidator = Schemer.getValidator(actionSchema)

  //   for(const [_, actionDef] of Object.entries(context.discoverActions)) {
  //     for(const action of actionDef) {
  //       debug("Configuring terms for %o", 2, action.file.module)

  //       const {terms, contract} = await this.#loadTerms(
  //         action.action.meta.terms,
  //         action.file,
  //         termsValidator,
  //         debug
  //       )

  //       action.terms = terms
  //       action.contract = contract
  //       debug("Terms added to %o", 2, action.file.module)
  //     }
  //   }
  // }

  /**
   * Finds compatible parser/printer pairs based on contract compatibility
   *
   * @param {object} discovered - Discovered actions with terms loaded
   * @param {import('./types.js').DebugFunction} debug - Debug function
   * @returns {Promise<object>} Compatible actions object with print and parse arrays
   */
  static async #findCompatibleActions(discovered, debug) {
    const compatibleActions = {print: [], parse: []}

    for(const printer of discovered.print) {
      debug("Checking %o", 3, printer.file.module)

      const satisfied = []

      for(const parser of discovered.parse) {
        debug("Checking %o", 3, parser.file.module)

        try {
          // Try to create a contract between printer (provider) and parser (consumer)
          new Contract(printer.terms, parser.terms, {debug})

          debug("Parser %o compatible with printer %o", 3, parser.file.module, printer.file.module)
          satisfied.push(parser)
        } catch(error) {
          debug("Parser %o incompatible with printer %o: %o", 3, parser.file.module, printer.file.module, error.message)
        }
      }

      if(satisfied.length > 0) {
        compatibleActions.print.push(printer)
        compatibleActions.parse.push(...satisfied)
        debug("Added %o with %o compatible parsers", 2, printer.file.module, satisfied.length)
      } else {
        debug("Printer %o has no compatible parsers", 1, printer.file.module)
      }
    }

    return compatibleActions
  }

  /**
   * Selects final actions, ensuring exactly one parser and one printer
   *
   * @param {object} compatibleActions - Compatible actions object
   * @returns {object} Final actions object with print and parse keys
   * @throws {Error} If no matching actions found or multiple matches exist
   */
  static #selectFinalActions(compatibleActions) {
    const finalActions = {}

    for(const [key, value] of Object.entries(compatibleActions)) {
      if(value.length === 0)
        throw Sass.new(`No matching ${key} found`)

      if(value.length > 1)
        throw Sass.new(`Multiple matching ${key} found`)

      finalActions[key] = compatibleActions[key][0]
    }

    return finalActions
  }

  /**
   * Instantiates action managers and sets up hooks
   *
   * @param {BeDoc} core - Core instance to attach actions to
   * @param {object} finalActions - Selected final actions
   * @param {object} validConfig - Validated configuration
   * @param {import('./types.js').DebugFunction} debug - Debug function
   * @returns {Promise<void>}
   */
  static async #instantiateActions(core, finalActions, validConfig, debug) {
    core.actions = {}
    const {variables} = validConfig
    const managers = {print: PrintAction, parse: ParseAction}

    for(const [, actionDefinition] of Object.entries(finalActions)) {
      const {kind} = actionDefinition.action.meta

      debug("Attaching %o action to instance", 2, kind)
      core.actions[kind] = new managers[kind]({
        actionDefinition,
        variables,
        debug
      })

      debug("Setting up hooks for action %o", 2, kind)
      if(validConfig.hooks) {
        // Use actioneer's setHooks method: setHooks(filepath, className)
        // The className matches the action kind (parse/print)
        core.actions[kind].setHooks(validConfig.hooks.path, kind)
      }
    }
  }

  /**
   * Loads and creates both terms and contract for an action
   *
   * @param {object} terms - Raw terms data from action metadata
   * @param {FileObject} file - File context for resolution (contains directory and module name)
   * @param {(data: unknown) => unknown} validator - Schema validator for terms
   * @param {import('./types.js').DebugFunction} debug - Debug function
   * @returns {object} Object with {terms: Terms, contract: Contract}
   */

  async processFiles(glob) {
    const debug = this.#debug

    debug("Starting file processing", 1)

    const {output} = this.options

    const input = await FS.getFiles(glob)

    if(!input?.length)
      throw new Error("No input files specified")

    // Instantiate the pipeline pipeline
    const pipeline = new Pipeline({
      parse: this.actions.parse,
      print: this.actions.print,
      output,
      debug
    })

    const processStart = hrtime.bigint()

    // Initiate the pipeline
    const processResult = await pipeline.run(input, this.options.maxConcurrent)
    const processEnd = hrtime.bigint()

    const result = {
      totalFiles: input.length,
      process: processResult,
      duration: ((Number(processEnd - processStart)) / 1_000_000).toFixed(2)
    }

    debug("File processing complete", 1)

    return result
  }
}
