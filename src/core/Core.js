import {FileObject, FS, Sass, Contract, Schemer, Terms} from "@gesslar/toolkit"
import {hrtime} from "node:process"

import ActionHooks from "./abstracted/Hooks.js"
import BeDocSchema from "./BeDocSchema.js"
import Discovery from "./Discovery.js"
import ParseAction from "./ParseAction.js"
import Pipeline from "./Pipeline.js"
import PrintAction from "./PrintAction.js"
import Configuration from "./abstracted/Configuration.js"
import Glog from "./abstracted/Glog.js"

export const ENVIRONMENT = Object.freeze({
  EXTENSION: "extension",
  NPM: "npm",
  ACTION: "action",
  CLI: "cli",
})

export default class Core {
  #debug

  constructor(options) {
    this.options = options
    this.#debug = options?.debug || Glog.newDebug()

    // this.logger = new Glog({name: "BeDoc", debugMode, debugLevel})
    this.packageJson = options.project
  }

  get debug() {
    return this.#debug
  }

  static async new({options, source, debug}) {
    // Validate configuration
    const validConfig = await Core.#validateConfiguration({options, source})

    const debugLevel = Number(validConfig.debugLevel)
    debug.parent.withLogLevel(debugLevel)

    debug("Creating new BeDoc instance with options: %o", 3, validConfig)
    const core = new Core({...validConfig, name: "BeDoc", debug})

    // Discover available actions
    const discovered = await Core.#discoverActions(core, validConfig)

    // Load terms for all discovered actions
    await Core.#loadActionTerms(discovered, debug)

    // Find compatible parser/printer pairs
    const compatibleActions = await Core.#findCompatibleActions(
      discovered, debug
    )

    // Select final actions (ensure exactly one of each)
    const finalActions = Core.#selectFinalActions(compatibleActions)

    // Instantiate actions and set up hooks
    await Core.#instantiateActions(core, finalActions, validConfig, debug)

    return core
  }

  /**
   * Validates the configuration options
   *
   * @param {object} config - Configuration object
   * @param {object} config.options - CLI or programmatic options
   * @param {string} config.source - Configuration source
   * @returns {Promise<object>} Validated configuration
   * @throws {AggregateError} If configuration validation fails
   */
  static async #validateConfiguration({options, source}) {
    const config = new Configuration()
    const validConfig = await config.validate({options, source})

    if(validConfig.status === "error")
      throw new AggregateError(validConfig.errors, "BeDoc configuration failed")

    return validConfig
  }

  /**
   * Discovers available parse and print actions
   *
   * @param {Core} core - Core instance
   * @param {object} validConfig - Validated configuration
   * @returns {Promise<object>} Discovered actions object
   */
  static async #discoverActions(core, validConfig) {
    const discovery = new Discovery(core)

    return await discovery.discoverActions({
      print: validConfig.printer,
      parse: validConfig.parser
    })
  }

  /**
   * Loads terms for all discovered actions
   *
   * @param {object} discovered - Discovered actions object
   * @param {import('./types.js').DebugFunction} debug - Debug function
   * @returns {Promise<void>}
   */
  static async #loadActionTerms(discovered, debug) {
    const actionSchema = await BeDocSchema.load(debug)
    const termsValidator = Schemer.getValidator(actionSchema)

    for(const [_, actionDef] of Object.entries(discovered)) {
      for(const action of actionDef) {
        debug("Configuring terms for %o", 2, action.file.module)

        const {terms, contract} = await Core.#loadTerms(
          action.action.meta.terms,
          action.file,
          termsValidator,
          debug
        )

        action.terms = terms
        action.contract = contract
        debug("Terms added to %o", 2, action.file.module)
      }
    }
  }

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
   * @param {Core} core - Core instance to attach actions to
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
        const hooks = await ActionHooks.new({
          actionKind: kind,
          hooksFile: validConfig.hooks,
          hookTimeout: validConfig.hookTimeout
        }, debug)

        if(hooks)
          core.actions[kind].setHooks(hooks)
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
  static async #loadTerms(terms, file, validator, debug) {
    try {
      // Parse the terms data (handles ref:// and other formats)
      const parsedTerms = await Terms.parse(terms, file?.directory)

      // Create Terms instance
      const termsInstance = new Terms(parsedTerms)

      // Create Contract from the parsed terms with validation
      const contract = Contract.fromTerms(
        file?.module ?? "Action Terms",
        parsedTerms,
        validator,
        debug
      )

      return {terms: termsInstance, contract}
    } catch(error) {
      throw Sass.new(`Failed to load terms`, error)
    }
  }

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
