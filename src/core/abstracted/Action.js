import {Data, FileObject, Sass} from "@gesslar/toolkit"
import ActionBuilder from "./ActionBuilder.js"
import ActionRunner from "./ActionRunner.js"
import Hooks from "./Hooks.js"

/**
 * Generic base class for managing actions with lifecycle hooks.
 * Provides common functionality for action setup, execution, and cleanup.
 * Designed to be extended by specific implementations.
 */
export default class Action {
  #action = null
  #hooks = null
  #file = null
  #variables = null
  #runner = null
  #id = null
  #debug

  /**
   * Creates a new Action instance.
   *
   * @param {object} config - Configuration object
   * @param {object} config.actionDefinition - Action definition containing action class and file info
   * @param {object} [config.variables] - Variables to pass to action during setup
   * @param {(message: string, level?: number, ...args: Array<unknown>) => void} config.debug - The logger's debug function
   */
  constructor({actionDefinition, variables, debug}) {
    this.#id = Symbol(performance.now())
    this.#variables = variables || {}
    this.#debug = debug

    const {action,file} = actionDefinition
    this.#action = action
    this.#file = file
  }
  /**
   * Gets the unique identifier for this action manager instance.
   *
   * @returns {symbol} Unique symbol identifier
   */
  get id() {
    return this.#id
  }

  /**
   * Gets the action class constructor.
   *
   * @returns {new () => object} Action class constructor
   */
  get action() {
    return this.#action
  }

  /**
   * Gets the current hook manager instance.
   *
   * @returns {Hooks|null} Hook manager instance or null if not set
   */
  get hooks() {
    return this.#hooks
  }

  /**
   * Sets the hook manager and attaches hooks to the action.
   *
   * @param {Hooks} hooks - Hook manager instance with hooks and on method.
   * @returns {Promise<this>} Promise of this instance.
   * @throws {Sass} If hook manager is already set.
   */
  setHooks(hooks) {
    if(this.#hooks)
      throw Sass.new("Hook manager already set")

    this.#hooks = hooks

    return this
  }

  // async callHook(kind, activity, action, context) {
  //   const hooks = this.#hooks

  // }

  /**
   * Gets the action metadata.
   *
   * @returns {object|undefined} Action metadata object
   */
  get meta() {
    return this.#action?.meta
  }

  /**
   * Gets the variables passed to the action.
   *
   * @returns {object} Variables object
   */
  get variables() {
    return this.#variables
  }

  /**
   * Gets the action runner instance.
   *
   * @returns {ActionRunner?} ActionRunner instance or null if not set up
   */
  get runner() {
    return this.#runner
  }

  /**
   * Gets the file information object.
   *
   * @returns {FileObject?} File information object
   */
  get file() {
    return this.#file
  }

  /**
   * Setup the action by creating and configuring the runner.
   * This is the main public method to initialize the action for use.
   *
   * @returns {Promise<this>} Promise of this instance.
   * @throws {Sass} If action setup fails
   */
  async setupAction() {
    this.#debug("Setting up action for %o on %o", 2, this.#action.meta?.kind || "unknown", this.id)

    await this.#setupHooks()
    await this.#setupAction()

    return this
  }

  /**
   * Setup the action instance and create the runner.
   * Creates a new action instance, calls its setup method with an
   * ActionBuilder, and creates an ActionRunner from the result.
   *
   * Can be overridden in subclasses to customize action setup.
   *
   * @returns {Promise<void>}
   * @throws {Sass} If action setup method is not a function
   * @protected
   */
  async #setupAction() {
    const actionInstance = new this.#action()
    const setup = actionInstance?.setup

    // Setup is required for actions.
    if(Data.typeOf(setup) === "Function") {
      const builder = new ActionBuilder(actionInstance)
      const configuredBuilder = setup(builder)
      const buildResult = configuredBuilder.build()
      const runner = new ActionRunner({
        action: buildResult.action,
        build: buildResult.build
      }, this.#hooks)

      this.#runner = runner
    } else {
      throw Sass.new("Action setup must be a function.")
    }
  }

  /**
   * Run the action with the provided input.
   * The action must be set up via setupAction() before calling this method.
   *
   * @param {unknown} context - Input data to pass to the action runner
   * @returns {Promise<unknown>} Result from the action execution
   * @throws {Sass} If action is not set up
   */
  async runAction(context) {
    if(!this.#runner)
      throw Sass.new("Action not set up. Call setupAction() first.")

    return await this.#runner.run(context)
  }

  /**
   * Cleanup the action and hooks.
   * This should be called when the action is no longer needed to free
   * resources.
   *
   * Calls cleanupHooks() and cleanupActionInstance() which can be overridden.
   *
   * @returns {Promise<this>} Promise of this instance.
   */
  async cleanupAction() {
    this.#debug("Cleaning up action for %o on %o", 2, this.#action.meta?.kind || "unknown", this.id)

    await this.#cleanupHooks()
    await this.#cleanupAction()

    return this
  }

  /**
   * Setup hooks if hook manager is present.
   * Calls the hook manager's setup function with action context.
   * Override in subclasses to customize hook setup.
   *
   * @returns {Promise<void>}
   * @throws {Sass} If hook setup is not a function
   * @private
   */
  async #setupHooks() {
    const setup = this.#hooks?.setup
    const type = Data.typeOf(setup)

    // No hooks attached.
    if(type === "Null" || type === "Undefined")
      return

    if(type !== "Function")
      throw Sass.new("Hook setup must be a function.")

    await setup.call(
      this.hooks.hooks, {
        action: this.#action,
        variables: this.#variables,
      }
    )
  }

  /**
   * Cleanup hooks if hook manager is present.
   * Calls the hook manager's cleanup function.
   * Override in subclasses to customize hook cleanup.
   *
   * @returns {Promise<void>}
   * @protected
   */
  async #cleanupHooks() {
    const cleanup = this.hooks?.cleanup

    if(!cleanup)
      return

    await cleanup.call(this.hooks.hooks)
  }

  /**
   * Cleanup the action instance.
   * Calls the action's cleanup method if it exists.
   * Override in subclasses to add custom cleanup logic.
   *
   * @returns {Promise<void>}
   * @protected
   */
  async #cleanupAction() {
    const cleanup = this.#action?.cleanup

    if(!cleanup)
      return

    await cleanup.call(this.#action)
  }

  /**
   * Returns a string representation of this action manager.
   *
   * @returns {string} String representation with module and action info
   */
  toString() {
    return `${this.#file?.module || "UNDEFINED"} (${this.meta?.action || "UNDEFINED"})`
  }

}
