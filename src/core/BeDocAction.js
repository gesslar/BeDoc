import {Sass} from "@gesslar/toolkit"
import Action from "./abstracted/Action.js"
import Terms from "./abstracted/Terms.js"

// BeDoc-specific hook points
export const HookPoints = Object.freeze({
  SETUP: "setup",
  CLEANUP: "cleanup",
  BEFORE_PARSE: "before_parse",
  AFTER_PARSE: "after_parse",
  BEFORE_PRINT: "before_print",
  AFTER_PRINT: "after_print",
  BEFORE_WRITE: "before_write",
  AFTER_WRITE: "after_write",
  ERROR: "error"
})

/**
 * BeDoc-specific action base class that extends the generic Action class.
 * Adds BeDoc-specific functionality like contract terms management and hook points.
 */
export default class BeDocAction extends Action {
  #terms = null

  constructor({actionDefinition, variables, debug}) {
    super({actionDefinition, variables, debug})

    this.#terms = actionDefinition.terms
  }

  /**
   * Get the terms for this action
   *
   * @returns {Terms|null} Terms instance or null if not loaded
   */
  get terms() {
    return this.#terms
  }

  /**
   * Set the terms for this action
   *
   * @param {Terms} terms - Terms instance
   * @throws {Sass} If terms is not a Terms instance
   */
  set terms(terms) {
    if(terms && !(terms instanceof Terms)) {
      throw Sass.new("Terms must be a Terms instance")
    }

    this.#terms = terms
  }

  /**
   * Attach hooks to the action instance with BeDoc-specific hook points.
   *
   * @param {import('./abstracted/Hooks.js').default} hookManager - Hook manager instance
   * @protected
   * @override
   */
  attachHooksToAction(hookManager) {
    // Call parent method for basic hook attachment
    super.attachHooksToAction?.(hookManager)

    // Add BeDoc-specific hook points
    this.action.hook = hookManager.on?.bind(hookManager)
    this.action.HOOKS = HookPoints
    this.action.hooks = hookManager.hooks
  }

  /**
   * Setup hooks with BeDoc-specific context.
   *
   * @returns {Promise<void>}
   * @protected
   * @override
   */
  async setupHooks() {
    const setup = this.hooks?.setup

    if(!setup)
      return

    if(typeof setup !== "function") {
      throw Sass.new("Hook setup must be a function.")
    }

    // Call setup with BeDoc-specific context
    await setup.call(this.hooks.hooks, {
      action: this.action,
      variables: this.variables,
      actionType: this.meta?.kind,
      actionName: this.meta?.name,
      terms: this.#terms,
      hookPoints: HookPoints
    })
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
