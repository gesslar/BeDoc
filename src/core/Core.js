import {DirectoryObject, FS, Sass} from "@gesslar/toolkit"
import {hrtime} from "node:process"

import Hooks from "./ActionHooks.js"
import BeDocSchema from "./BeDocSchema.js"
import Discovery from "./Discovery.js"
import ParseAction from "./ParseAction.js"
import Pipeline from "./Pipeline.js"
import PrintAction from "./PrintAction.js"
import Configuration from "./abstracted/Configuration.js"
import Glog from "./abstracted/Glog.js"
import Schemer from "./abstracted/Schemer.js"
import Terms from "./abstracted/Terms.js"

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

  static async new({options, source, debug}) {
    const config = new Configuration()
    const validConfig = await config.validate({options, source})

    if(validConfig.status === "error")
      throw new AggregateError(validConfig.errors,"BeDoc configuration failed")

    const core = new Core({...validConfig, name: "BeDoc", debug})

    debug("Creating new BeDoc instance with options: %o", 3, validConfig)

    const discovery = new Discovery(core, options, debug)
    const actionDefs = await discovery.discoverActions({
      print: validConfig.printer,
      parse: validConfig.parser
    })

    const validatedActions = discovery.satisfyCriteria(actionDefs, validConfig)

    debug("Actions that met criteria: %o", 3, validatedActions)
    Glog(validatedActions.print.length)
    Glog(Array.isArray(validatedActions.print))
    Glog(validatedActions.print)

    Glog(validatedActions.parse.length)
    Glog(Array.isArray(validatedActions.parse))
    Glog(validatedActions.parse)

    if(Object.values(validatedActions).some(arr => arr.length === 0)) {
      return {
        status: "warn",
        message: "No matching actions specified or discovered."
      }
    }

    // Contract negotiation
    const compatibleActions = {print: [], parse: []}
    const actionSchema = await BeDocSchema.loadSchema(debug)
    const termsValidator = Schemer.getValidator(actionSchema)

    // Load up all of the printers' terms
    for(const [,actionType] of Object.entries(validatedActions)) {
      for(const action of actionType) {
        debug("Configuring terms for %o", 2, action.file.module)

        const actionTerms = await Core.#loadTerms(
          action.action.meta.terms,
          action.file.directory,
          termsValidator,
          debug
        )

        action.terms = actionTerms
        debug("Terms added to %o", 2, action.file.module)
      }
    }

    // Now validate compatibility
    for(const printer of validatedActions.print) {
      debug("Checking %o", 3, printer.file.module)

      const satisfied = []

      for(const parser of validatedActions.parse) {
        debug("Checking %o", 3, parser.file.module)

        const compatibility = printer.terms.compare(parser.terms)

        if(compatibility.status === "success") {
          debug("Parser %o compatible with printer %o", 3, parser.file.module, printer.file.module)
          satisfied.push(parser)
        } else {
          debug("Parser %o incompatible: %o errors", 3, parser.action.file.module, compatibility.errors.length)
          debug("Terms compatibility errors: %o", 4, compatibility.errors.map(e => e.message).join(", "))
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

    const finalActions = {}

    for(const [key, value] of Object.entries(compatibleActions)) {
      if(value.length === 0)
        throw Sass.new(`No matching ${key} found`)

      if(value.length > 1)
        throw Sass.new(`Multiple matching ${key} found`)

      finalActions[key] = compatibleActions[key][0]
    }

    // Adding to instance
    core.actions = {}
    const {variables} = validConfig
    const managers = {print: PrintAction, parse: ParseAction}

    for(const [, actionDefinition] of Object.entries(finalActions)) {
      const {kind} = actionDefinition.action.meta

      debug("Attaching %o action to instance", 2, kind)
      core.actions[kind] = new managers[kind] ({
        actionDefinition,
        variables,
        debug
      })

      debug("Setting up hooks for action %o", 2, kind)
      if(validConfig.hooks) {
        const hooks = await Hooks.new({
          actionKind: kind,
          hooksFile: validConfig.hooks,
        }, debug)

        if(hooks)
          core.actions[kind].setHooks(hooks)
      }
    }

    return core
  }

  /**
   * Loads and validates terms for an action
   *
   * @param {object} terms - Raw terms data from action metadata
   * @param {DirectoryObject} directory - Directory context for file resolution
   * @param {(data: unknown) => unknown} validator - Schema validator for terms
   * @param {import('./types.js').DebugFunction} debug - Debug function
   * @returns {Terms} Validated Terms instance
   */
  static async #loadTerms(terms, directory, validator, debug) {
    try {
      // Parse the terms data (handles ref:// and other formats)
      const parsedTerms = await Terms.parse(terms,directory)

      // Create Terms instance with parsed data and validation
      const termsInstance = new Terms({
        terms: parsedTerms,
        validator,
        debug
      })

      return termsInstance
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
    const processResult = await pipeline.run(
      input, this.options.maxConcurrent
    )

    debug("Conveyor complete", 1)

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
