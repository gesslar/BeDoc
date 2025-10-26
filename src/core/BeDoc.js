import {ActionRunner,ActionBuilder} from "@gesslar/actioneer"

import Initialise from "./Initialise.js"
import Discovery from "./Discovery.js"
import Negotiator from "./Negotiator.js"
import Pipeline from "./Pipeline.js"
import PrintAction from "./PrintAction.js"
import ParseAction from "./ParseAction.js"

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

  /**
   * Sets up the action pipeline for BeDoc.
   * Chains initialization, discovery, negotiation, instantiation, and execution steps.
   *
   * @param {ActionBuilder} ab - The action builder instance.
   * @returns {ActionBuilder} The configured action builder.
   */
  setup = ab => ab
    .do("Initialise BeDoc from configuration", this.#initialiseBeDoc)
    .do("Discover BeDoc actions", this.#discoverActions)
    .do("Negotiate terms and conditions for BeDoc actions", this.#negotiateTerms)
    .do("Instantiate the actions, eh?", this.#instantiateActions)
    .do("Run everything through Piper", this.#doItUp)

  /**
   * Executes the pipeline if both print and parse actions are present.
   *
   * @private
   * @param {object} value - The context object containing config, glog, and actions.
   * @returns {Promise<object>} The result of the pipeline run or the original value.
   */
  async #doItUp(value) {
    const {config: options,glog,actions} = value
    const numActions = Object.keys(actions ?? {}).length

    if(numActions !== 2)
      return value

    const {print,parse} = actions
    const {include: files, output, maxConcurrent} = options
    const debug = glog.newDebug("BeDoc")
    const pipeline = new Pipeline({parse,print,output,options,debug})

    return await pipeline.run(files, maxConcurrent)
  }

  /**
   * Initializes BeDoc from configuration using the Initialise action.
   *
   * @private
   * @param {object} value - The context object.
   * @returns {Promise<object>} The updated context object.
   */
  async #initialiseBeDoc(value) {
    const action = (new ActionBuilder(new Initialise())).build()
    const runner = new ActionRunner(action)
    value = await runner.run(value)

    return value
  }

  /**
   * Discovers available actions for BeDoc using the Discovery action.
   *
   * @private
   * @param {object} value - The context object.
   * @returns {Promise<object>} The updated context object.
   */
  async #discoverActions(value) {
    const action = (new ActionBuilder(new Discovery())).build()
    const runner = new ActionRunner(action)
    value = await runner.run(value)

    return value
  }

  /**
   * Negotiates terms and conditions for BeDoc actions using the Negotiator action.
   *
   * @private
   * @param {object} value - The context object.
   * @returns {Promise<object>} The updated context object.
   */
  async #negotiateTerms(value) {
    const action = (new ActionBuilder(new Negotiator())).build()
    const runner = new ActionRunner(action)
    value = await runner.run(value)

    return value
  }

  /**
   * Instantiates action managers (print and parse) and sets up hooks.
   *
   * @private
   * @param {object} value - The context object containing config, content, and glog.
   * @returns {Promise<object>} The updated context object with instantiated actions.
   */
  async #instantiateActions(value) {
    const {config,content,glog} = value
    const {variables} = config

    const newActions = {}
    const actions = (({parse, print}) => ({parse, print}))(content)

    if(Object.values(actions).some(action => action === undefined))
      return value

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
}
