import {ActionBuilder, ActionHooks} from "@gesslar/actioneer"

import Discovery from "./Discovery.js"
import Negotiator from "./Negotiator.js"
import ParseAction from "./ParseAction.js"
import Pipeline from "./Pipeline.js"
import PrintAction from "./PrintAction.js"

/**
 * BeDoc is the main orchestrator class for the BeDoc system.
 * It manages initialization, discovery, negotiation, instantiation, and execution of actions
 * using a pipeline pattern. Actions are managed via Actioneer and custom managers.
 *
 * @class
 */
export default class BeDoc {
  /**
   * Metadata for the BeDoc class.
   *
   * @type {{name: string}}
   * @readonly
   */
  static meta = Object.freeze({
    name: "BeDoc"
  })

  #glog = null
  #debug = null

  /**
   * Sets up the action pipeline for BeDoc.
   * Chains initialization, discovery, negotiation, instantiation, and execution steps.
   *
   * @param {ActionBuilder} ab - The action builder instance.
   * @returns {ActionBuilder} The configured action builder.
   */
  setup = ab => ab
    .do("Initialise some things", this.#initialiser)
    .do("Discover BeDoc actions", this.#discoverActions)
    .do("Negotiate terms and conditions for BeDoc actions", this.#negotiateTerms)
    .do("Instantiate the actions, eh?", this.#instantiateActions)
    .do("Setup the hooks if we need to", this.#hooker)
    .do("Run everything through Piper", this.#doItUp)

  async #initialiser(context) {
    this.#glog = context.glog
    this.#debug = context.glog.newDebug("BeDoc")

    this.#debug("Initialising BeDoc", 1)

    return context
  }

  /**
   * Discovers available actions for BeDoc using the Discovery action.
   *
   * @private
   * @returns {ActionBuilder} ActionBuilder for Discovery action.
   */
  #discoverActions() {
    return new ActionBuilder(new Discovery({debug: this.#glog.newDebug("Discovery")}))
  }

  /**
   * Negotiates terms and conditions for BeDoc actions using the Negotiator action.
   *
   * @private
   * @returns {ActionBuilder} ActionBuilder for Negotiator action.
   */
  #negotiateTerms() {
    return new ActionBuilder(new Negotiator(), {
      debug: this.#glog.newDebug
    })
  }

  /**
   * Instantiates action managers (print and parse) and sets up hooks.
   *
   * @private
   * @param {object} context - The context object containing config, content, and glog.
   * @returns {Promise<object>} The updated context object with instantiated actions.
   */
  async #instantiateActions(context) {
    this.#debug("Instantiating actions", 2)
    const {config,content} = context
    const {hookVariables} = config

    const newActions = {}
    const actions = (({parse, print}) => ({parse, print}))(content)

    if(Object.values(actions).some(action => action === undefined))
      return context

    const managers = {print: PrintAction, parse: ParseAction}

    for(const [, actionDefinition] of Object.entries(actions)) {
      const {kind} = actionDefinition.action.meta

      newActions[kind] = new managers[kind]({
        actionDefinition,
        hookVariables,
        debug: this.#glog.newDebug(managers[kind].constructor.name)
      })
    }

    context.actions = newActions

    return context
  }

  async #hooker(context) {
    this.#debug("Setting up hooks", 2)
    const {config,actions} = context
    const {hooks: hooksFile} = config

    if(!hooksFile)
      return context

    const hooksModule = await hooksFile.import()

    // If a module exports default
    if(hooksModule.default) {
      const {kind} = hooksModule.default.meta

      if(!kind)
        return context

      const action = actions[kind]
      if(!action)
        return context

      const hooksObject = new hooksModule.default({
        debug: this.#glog.newDebug(hooksModule.default.constructor.name)
      })
      action.setHooksObject(hooksObject)

      return context
    }

    // Not a default, we get to figure this one out!
    for(const [kind,action] of Object.entries(actions)) {
      if(hooksModule[kind]) {
        const hooksObject = new hooksModule[kind]({
          debug: this.#glog.newDebug(hooksModule[kind].constructor.name)
        })
        const actionHooks = new ActionHooks({
          hooksObject,
          hookTimeout: context.config.hookTimeout
        }, this.#debug)

        action.setActionHooks(actionHooks)
      }
    }

    return context
  }

  /**
   * Executes the pipeline if both print and parse actions are present.
   *
   * @private
   * @param {object} context - The context object containing config, glog, and actions.
   * @returns {Promise<object>} The result of the pipeline run or the original value.
   */
  async #doItUp(context) {
    this.#debug("Commencing actually doing it of the up", 2)

    const {config: options,actions} = context
    const numActions = Object.keys(actions ?? {}).length

    if(numActions !== 2)
      return context

    const {print,parse} = actions
    const {include: files, output, maxConcurrent} = options

    const pipeline = new Pipeline({
      parse,
      print,
      output,
      options,
      debug: this.#glog.newDebug("Pipeline")
    })

    return await pipeline.run(files, maxConcurrent)
  }
}
