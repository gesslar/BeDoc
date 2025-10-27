import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"
import {Contract, FileObject, Sass, Terms} from "@gesslar/toolkit"

/**
 * BeDoc-specific action base class that manages actions with lifecycle hooks.
 *
 * Adds BeDoc-specific functionality like contract terms management and hook
 * points.
 */
export default class BeDocAction {
  #action
  #contract
  #debug
  #file
  #hookVariables
  #id
  #runner
  #terms

  constructor({actionDefinition,hookVariables,debug}) {
    this.#debug = debug
    this.#hookVariables = hookVariables || {}
    this.#id = Symbol(performance.now())

    const {action, file} = actionDefinition
    this.#action = action
    this.#contract = actionDefinition.contract
    this.#file = file
    this.#terms = actionDefinition.terms
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
   * Sets hooks for the ActionRunner.
   * Delegates to ActionRunner's setHooks method.
   *
   * @param {string} hooksFile - Path to hooks file
   * @param {string} className - Name of the hooks class to instantiate
   * @returns {this} This instance for chaining
   * @throws {Sass} If runner not set up yet
   */
  setHooks(hooksFile, className) {
    if(!this.#runner)
      throw Sass.new(
        "Cannot set hooks before action is set up. Call setupAction() first."
      )

    // Delegate to ActionRunner's setHooks method
    this.#runner.setHooks(hooksFile.path, className)

    return this
  }

  /**
   * Gets the action metadata.
   *
   * @returns {object?} Action metadata object
   */
  get meta() {
    return this.#action?.meta
  }

  /**
   * Gets the hookVariables passed to the action.
   *
   * @returns {object} hookVariables object
   */
  get hookVariables() {
    return this.#hookVariables
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
   * Get the terms for this action
   *
   * @returns {Terms?} Terms instance or null if not loaded
   */
  get terms() {
    return this.#terms
  }

  /**
   * Get the contract for this action
   *
   * @returns {Contract?} Contract instance or null if not loaded
   */
  get contract() {
    return this.#contract
  }

  /**
   * Set the terms for this action
   *
   * @param {Terms} terms - Terms instance
   * @throws {Sass} If terms is invalid
   */
  set terms(terms) {
    this.#terms = terms
  }

  /**
   * Set the contract for this action
   *
   * @param {Contract} contract - Contract instance
   * @throws {Sass} If contract is invalid
   */
  set contract(contract) {
    this.#contract = contract
  }

  /**
   * Setup the action by creating the ActionRunner.
   * This is the main public method to initialize the action for use.
   *
   * @param {object} root0 - Options object
   * @param {object} [root0.hooks] - Hooks configuration object
   * @returns {Promise<this>} Promise of this instance.
   * @throws {Sass} If action setup fails
   */
  async setupAction({hooks} = {}) {
    this.#debug(
      "Setting up action for %o on %o",
      2,
      this.#action.meta?.kind || "unknown",
      this.id
    )

    await this.#setupAction({hooks})

    return this
  }

  /**
   * Setup the action instance and create the runner.
   * Uses ActionBuilder to build the action wrapper, then creates ActionRunner.
   *
   * @param {object} root0 - Options object containing hooks configuration
   * @param {object} [root0.hooks] - Hooks configuration object
   * @param {string} [root0.hooks.kind] - The kind of hooks to use
   * @param {FileObject} [root0.hooks.file] - The file object for hooks
   * @returns {Promise<void>}
   * @throws {Sass} If action setup method is not a function
   * @private
   */
  async #setupAction({hooks: {kind=null,file=null}} = {}) {
    try {
      // Instantiate the action class
      const actionInstance = new this.#action()

      // Use ActionBuilder to build the action wrapper
      // ActionBuilder.build() returns an ActionWrapper
      const actionWrapper = new ActionBuilder(
        actionInstance,
        {debug: this.#debug}
      ).build()

      // Create ActionRunner with the wrapped action
      // ActionRunner extends Piper and handles execution
      this.#runner = new ActionRunner(actionWrapper, {debug: this.#debug})
      this.setHooks(file.path,kind)

    } catch(error) {
      throw Sass.new("Setting up action", error)
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
   * Cleanup the action.
   * ActionRunner (via Piper) handles its own lifecycle through
   * addSetup/addCleanup hooks.
   *
   * @returns {Promise<this>} Promise of this instance.
   */
  async cleanupAction() {
    this.#debug(
      "Cleaning up action for %o on %o",
      2,
      this.#action.meta?.kind || "unknown",
      this.id
    )

    // ActionRunner's cleanup happens automatically via its Piper lifecycle
    // Subclasses can override this for additional BeDoc-specific cleanup

    return this
  }

  /**
   * Get BeDoc-specific action information
   *
   * @returns {object} Action information object
   */
  getActionInfo() {
    return {
      id: this.id,
      name: this.meta?.name,
      kind: this.meta?.kind,
      version: this.meta?.version,
      author: this.meta?.author,
      file: this.file?.path,
      hasTerms: !!this.#terms,
      hasHooks: !!this.hooks
    }
  }

  /**
   * Returns a string representation with BeDoc-specific info
   *
   * @returns {string} String representation
   * @override
   */
  toString() {
    const kind = this.meta?.kind || "unknown"
    const name = this.meta?.name || "unnamed"
    const file = this.file?.module || "unknown"

    return `BeDoc ${kind}: ${name} (${file})`
  }
}
