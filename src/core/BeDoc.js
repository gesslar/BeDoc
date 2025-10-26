import {ActionRunner,ActionBuilder} from "@gesslar/actioneer"

import Initialise from "./Initialise.js"
import Discovery from "./Discovery.js"
import Negotiator from "./Negotiator.js"
import Pipeline from "./Pipeline.js"
import PrintAction from "./PrintAction.js"
import ParseAction from "./ParseAction.js"

export default class BeDoc {
  static meta = Object.freeze({
    name: "BeDoc"
  })

  setup = ab => ab
    .do("Initialise BeDoc from configuration", this.#initialiseBeDoc)
    .do("Discover BeDoc actions", this.#discoverActions)
    .do("Negotiate terms and conditions for BeDoc actions", this.#negotiateTerms)
    .do("Instantiate the actions, eh?", this.#instantiateActions)
    .do("Run everything through Piper", this.#doItUp)

  async #doItUp(value) {
    const {config: options,glog,actions} = value
    const {print,parse} = actions
    const {include: files, output, maxConcurrent} = options
    const debug = glog.newDebug("BeDoc")
    const pipeline = new Pipeline({parse,print,output,options,debug})

    return await pipeline.run(files, maxConcurrent)
  }

  async #initialiseBeDoc(value) {
    const action = (new ActionBuilder(new Initialise())).build()
    const runner = new ActionRunner(action)
    value = await runner.run(value)

    return value
  }

  async #discoverActions(value) {
    const action = (new ActionBuilder(new Discovery())).build()
    const runner = new ActionRunner(action)
    value = await runner.run(value)

    return value
  }

  async #negotiateTerms(value) {
    const action = (new ActionBuilder(new Negotiator())).build()
    const runner = new ActionRunner(action)
    value = await runner.run(value)

    return value
  }

  /**
   * Instantiates action managers and sets up hooks
   *
   * @param {BeDoc} core - Core instance to attach actions to
   * @param {object} finalActions - Selected final actions
   * @param {object} validConfig - Validated configuration
   * @param {import('./types.js').DebugFunction} debug - Debug function
   * @param value
   * @returns {Promise<void>}
   */
  // async #instantiateActions(core, finalActions, validConfig, debug) {
  async #instantiateActions(value) {
    const {config,content,glog} = value
    const {variables} = config

    const newActions = {}
    const actions = (({parse, print}) => ({parse, print}))(content)
    const managers = {print: PrintAction, parse: ParseAction}

    for(const [, actionDefinition] of Object.entries(actions)) {
      const {kind} = actionDefinition.action.meta

      // debug("Attaching %o action to instance", 2, kind)
      newActions[kind] = new managers[kind]({
        actionDefinition,
        variables,
        debug: glog.newDebug()
      })

      // debug("Setting up hooks for action %o", 2, kind)
      // if(validConfig.hooks) {
      //   // Use actioneer's setHooks method: setHooks(filepath, className)
      //   // The className matches the action kind (parse/print)
      //   core.actions[kind].setHooks(validConfig.hooks.path, kind)
      // }
    }

    value.actions = newActions

    return value
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

  // async processFiles(glob) {
  //   const debug = this.#debug

  //   debug("Starting file processing", 1)

  //   const {output} = this.options

  //   const input = await FS.getFiles(glob)

  //   if(!input?.length)
  //     throw new Error("No input files specified")

  //   // Instantiate the pipeline pipeline
  //   const pipeline = new Pipeline({
  //     parse: this.actions.parse,
  //     print: this.actions.print,
  //     output,
  //     debug
  //   })

  //   const processStart = hrtime.bigint()

  //   // Initiate the pipeline
  //   const processResult = await pipeline.run(input, this.options.maxConcurrent)
  //   const processEnd = hrtime.bigint()

  //   const result = {
  //     totalFiles: input.length,
  //     process: processResult,
  //     duration: ((Number(processEnd - processStart)) / 1_000_000).toFixed(2)
  //   }

  //   debug("File processing complete", 1)

  //   return result
  // }
}
