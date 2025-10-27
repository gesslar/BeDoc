import BeDocAction from "./BeDocAction.js"

/**
 * Parse action manager for BeDoc parse actions.
 *
 * Manages parser action engines that extract documentation from source files.
 *
 * Hooks are handled automatically by ActionRunner via the before$/after$
 * pattern.
 */
export default class ParseAction extends BeDocAction {
  constructor(config) {
    super(config)
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
