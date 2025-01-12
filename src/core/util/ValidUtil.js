// Hi there agin
//hi there
import DataUtil from "./DataUtil.js"
import assert from "node:assert/strict"

export default class ValidUtil {
  /**
   * Validates a value against a type
   *
   * @param {*} value The value to validate
   * @param {string} type The expected type in the form of "object",
   *                      "object[]", "object|object[]"
   * @param {boolean} [noEmptyValue=false] Whether the value is required to be
   *                                       non-empty
   * @returns {boolean} True if valid, false otherwise
   */
  static type = (value, type, options) => {
    assert(DataUtil.type(value, type, options), `Invalid type: ${type}, got ${JSON.stringify(value)}`)
  }

  /**
   * Asserts a condition
   *
   * @param condition - The condition to assert
   * @param message - The message to display if the condition is not met
   * @param arg - The argument to display if the condition is not met (optional)
   */
  static assert = (condition, message, arg = null) => {
    assert(DataUtil.type(condition, "boolean"), `Condition must be a boolean, got ${condition}`)
    assert(DataUtil.type(message, "string"), `Message must be a string, got ${message}`)
    assert(arg !== null && DataUtil.type(arg, "number"), `Arg must be a number, got ${arg}`)

    if(!condition)
      throw new Error(`${message}${arg ? `: ${arg}` : ""}`)
  }
}
