import {hookPoints} from "./HookManager.js"

export default class ActionManager {
  #action = null
  #hookManager = null
  #contract
  #log
  #debug

  constructor(actionDefinition, logger) {
    this.#log = logger
    this.#debug = this.#log.newDebug()

    this.#initialize(actionDefinition)
  }

  #initialize(actionDefinition) {
    const debug = this.#debug

    debug("Setting up action", 2)

    const {action, contract} = actionDefinition

    if(!action)
      throw new Error("Action is required")

    if(!contract)
      throw new Error("Contract is required")

    this.#action = action
    this.#contract = contract

    debug("Action setup complete", 2)
  }

  get action() {
    return this.#action
  }

  get hookManager() {
    return this.#hookManager
  }

  set hookManager(hookManager) {
    if(this.hookManager)
      throw new Error("Hooks already set")

    this.action.hook = hookManager.on.bind(this.action)
    this.action.HOOKS = hookPoints
    this.#hookManager = hookManager
    this.action.hooks = hookManager.hooks
  }

  get contract() {
    return this.#contract
  }

  get meta() {
    return this.#action.meta
  }

  get log() {
    return this.#log
  }

  async #setupAction() {
    const setup = this.action?.setup

    if(!setup)
      return

    await this.action.setup.call(
      this.action, {parent: this, log: this.#log}
    )
  }

  async #cleanupAction() {
    const cleanup = this.action?.cleanup

    if(!cleanup)
      return

    await this.action.cleanup.call(this.action)
  }

  async #setupHooks() {
    const setup = this.hookManager?.setup

    if(!setup)
      return

    await this.hookManager.setup.call(
      this.hookManager.hooks, {parent: this.action, log: this.#log}
    )
  }

  async #cleanupHooks() {
    const cleanup = this.hookManager?.cleanup

    if(!cleanup)
      return

    await this.hookManager.cleanup.call(this.hookManager.hooks)
  }

  async setupAction() {
    console.log("setupAction", this.meta)
    this.#debug("Setting up action for %s", 2, this.meta.action)

    await this.#setupHooks()
    await this.#setupAction()
  }

  async runAction({file,content}) {
    const func = this.action.run

    if(!func)
      throw new Error(`No \`run\` function found for action \`${this.meta.action}\``)

    const actionResult = await func.call(
      this.action, {module: file.module, content}
    )

    return actionResult
  }

  async cleanupAction() {
    console.log("Post action", this.meta)
    this.#debug("Post action", 2)
    this.#debug("Cleaning up action for %s", 2, this.meta.action)

    await this.#cleanupHooks()
    await this.#cleanupAction()
  }
}
