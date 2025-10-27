import BeDocAction from "./BeDocAction.js"

/**
 * Print action manager for BeDoc print actions.
 *
 * Manages printer action engines that generate output from parsed
 * documentation.
 *
 * Hooks are handled automatically by ActionRunner via the before$/after$
 * pattern.
 */
export default class PrintAction extends BeDocAction {
  constructor(config) {
    super(config)
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
