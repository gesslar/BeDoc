import assert from "node:assert/strict"
import DataUtil from "./DataUtil.js"

export default class ValidUtil {
  /**
   * Validates a value against a type
   * @param {*} value - The value to validate
   * @param {string} type - The expected type in the form of "object",
   *                        "object[]", "object|object[]"
   * @param {object} [options] - Additional options for validation.
   */
  static type(value, type, options) {
    assert(DataUtil.type(value, type, options), `Invalid type. Expected ${type}, got ${JSON.stringify(value)}`)
  }

  /**
   * Asserts a condition
   * @param {boolean} condition - The condition to assert
   * @param {string} message - The message to display if the condition is not
   *                           met
   * @param {number} [arg] - The argument to display if the condition is not
   *                         met (optional)
   */
  static assert(condition, message, arg = null) {
    assert(DataUtil.type(condition, "boolean"), `Condition must be a boolean, got ${condition}`)
    assert(DataUtil.type(message, "string"), `Message must be a string, got ${message}`)
    assert(arg !== null && DataUtil.type(arg, "number"), `Arg must be a number, got ${arg}`)

    if(!condition)
      throw new Error(`${message}${arg ? `: ${arg}` : ""}`)
  }
}
