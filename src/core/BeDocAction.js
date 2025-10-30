import {ActionBuilder} from "@gesslar/actioneer"
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
  #terms
  #actionHooks
  #hookTimeout

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
   *
   * @param {object} actionHooks - An instantiated copy of the action hooks.
   * @param actionHooks
   * @returns {this} This instance for chaining
   * @throws {Sass} If runner not set up yet
   */
  setActionHooks(actionHooks) {
    this.#actionHooks = actionHooks

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

  get actionHooks() {
    return this.#actionHooks
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

  setHookTimeout(ms) {
    this.#hookTimeout = ms

    return this
  }

  get hookTimeout() {
    return this.#hookTimeout
  }

  /**
   * Get an ActionBuilder for this action.
   * Creates a new action instance and configures it with hooks.
   *
   * @returns {ActionBuilder} Configured ActionBuilder instance.
   */
  getActionBuilder() {
    this.#debug(
      "Creating ActionBuilder for %o on %o",
      2,
      this.#action.meta?.kind || "unknown",
      this.id
    )

    const actionInstance = new this.#action()
    const actionBuilder = new ActionBuilder(
      actionInstance, {debug: this.#debug}
    )

    if(this.#actionHooks) {
      actionBuilder.withActionHooks(this.#actionHooks)
    }

    return actionBuilder
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
