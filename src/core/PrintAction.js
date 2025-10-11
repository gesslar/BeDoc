import {Sass} from "@gesslar/toolkit"
import BeDocAction from "./BeDocAction.js"

/**
 * Print action manager for BeDoc print actions.
 * Manages printer action engines that generate output from parsed documentation.
 */
export default class PrintAction extends BeDocAction {
  constructor({actionDefinition, variables, debug}) {
    super({actionDefinition, variables, debug})
  }

  /**
   * Setup hooks with print-specific context.
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

    // Call setup with print-specific context
    await setup.call(this.hooks.hooks, {
      action: this.action,
      variables: this.variables,
      actionType: "print",
      actionName: this.meta?.name,
      outputType: this.meta?.output,
      terms: this.terms,
      hookPoints: this.constructor.HookPoints
    })
  }

  /**
   * Get print-specific action information
   *
   * @returns {object} Action information object
   * @override
   */
  getActionInfo() {
    return {
      ...super.getActionInfo(),
      outputType: this.meta?.output,
      role: "printer"
    }
  }

  /**
   * Returns a string representation for print actions
   *
   * @returns {string} String representation
   * @override
   */
  toString() {
    const name = this.meta?.name || "unnamed"
    const outputType = this.meta?.output || "unknown"
    const file = this.file?.module || "unknown"

    return `BeDoc Printer: ${name} (${outputType} ← ${file})`
  }
}
