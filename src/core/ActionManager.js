import {hookPoints} from "#core"

class ActionManager {
  #action = null
  #meta = {}
  #hooks = null
  #contract
  #module
  #log
  #debug

  constructor(actionDefinition, logger) {
    this.#log = logger
    this.#debug = this.#log.newDebug()

    this.#setupAction(actionDefinition)
  }

  #setupAction(actionDefinition) {
    const debug = this.#debug

    debug("Setting up action", 2)

    const {action, contract, module, meta} = actionDefinition

    if(!action)
      throw new Error("Action is required")

    if(!contract)
      throw new Error("Contract is required")

    if(!module)
      throw new Error("Module is required")

    this.#module = module
    this.#action = action
    this.#contract = contract
    this.#meta = meta

    debug("Action setup complete", 2)
  }

  get action() {
    return this.#action
  }

  get hooks() {
    return this.#hooks
  }

  set hooks(hookManager) {
    if(this.hooks)
      throw new Error("Hooks already set")

    this.action.hook = hookManager.on.bind(this.action)
    this.action.HOOKS = hookPoints
    this.action.hooks = hookManager.hooks
    this.#hooks = hookManager
  }

  get contract() {
    return this.#contract
  }

  get module() {
    return this.#module
  }

  get meta() {
    return this.#meta
  }

  get log() {
    return this.#log
  }
}

export {
  ActionManager,
}
