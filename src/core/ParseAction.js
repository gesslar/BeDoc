import {Sass} from "@gesslar/toolkit"
import BeDocAction from "./BeDocAction.js"

/**
 * Parse action manager for BeDoc parse actions.
 * Manages parser action engines that extract documentation from source files.
 */
export default class ParseAction extends BeDocAction {
  constructor({actionDefinition, variables, debug}) {
    super({actionDefinition, variables, debug})
  }

  /**
   * Setup hooks with parse-specific context.
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

    // Call setup with parse-specific context
    await setup.call(this.hooks.hooks, {
      action: this.action,
      variables: this.variables,
      actionType: "parse",
      actionName: this.meta?.name,
      inputType: this.meta?.input,
      terms: this.terms,
      hookPoints: this.constructor.HookPoints
    })
  }

  /**
   * Get parse-specific action information
   *
   * @returns {object} Action information object
   * @override
   */
  getActionInfo() {
    return {
      ...super.getActionInfo(),
      inputType: this.meta?.input,
      role: "parser"
    }
  }

  /**
   * Returns a string representation for parse actions
   *
   * @returns {string} String representation
   * @override
   */
  toString() {
    const name = this.meta?.name || "unnamed"
    const inputType = this.meta?.input || "unknown"
    const file = this.file?.module || "unknown"

    return `BeDoc Parser: ${name} (${inputType} → ${file})`
  }
}
