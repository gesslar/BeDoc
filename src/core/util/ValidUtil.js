export default class ValidUtil {
  /**
   * Validates a string
   *
   * @param str - The string to validate
   * @param nonEmpty - Whether the string must be non-empty
   * @returns boolean
   */
  static string = (str, nonEmpty = false) => typeof str === "string" && (nonEmpty ? str.length > 0 : true)

  /**
   * Validates a value if it is a function
   *
   * @param f - The value to check if is a function
   * @returns boolean
   */
  static func = f => typeof f === "function"

  /**
   * Validates an array
   *
   * @param arr - The array to validate
   * @param nonEmpty - Whether the array must be non-empty
   * @returns boolean
   */
  static array = (arr, nonEmpty = false) => Array.isArray(arr) && (nonEmpty ? arr.length > 0 : true)

  /**
   * Validates an array of uniform type
   *
   * @param arr - The array to validate
   * @param type - The type of the array elements
   * @param nonEmpty - Whether the array must be non-empty
   * @returns boolean
   */
  static arrayUniform = (arr, type, nonEmpty = false) => ValidUtil.array(arr, nonEmpty) && arr.every(item => typeof item === type) && (nonEmpty ? arr.length > 0 : true)

  /**
   * Validates a value against a type
   *
   * @param value - The value to validate
   * @param type - The expected type
   * @param required - Whether the value is required
   * @returns boolean
   */
  static type = (value, type, required = false) => {
    if(!required && ValidUtil.nothing(value))
      return true

    switch(type) {
    case "array":
      return ValidUtil.array(value)
    case "string":
      return ValidUtil.string(value)
    case "boolean":
      return typeof value === "boolean"
    case "number":
      return typeof value === "number"
    case "object":
      return typeof value === "object"
    case "function":
      return ValidUtil.func(value)
    default:
      return false
    }
  }

  /**
   * Validates a value against nothing
   *
   * @param value - The value to validate
   * @returns boolean
   */
  static nothing = value => value === undefined || value === null

  static valid = (value, type, arg = null, required = false) => {
    ValidUtil.assert(ValidUtil.type(value, type, required), `Value must be of type ${type}. Got ${value}`, arg)
  }

  /**
   * Asserts a condition
   *
   * @param condition - The condition to assert
   * @param message - The message to display if the condition is not met
   * @param arg - The argument to display if the condition is not met (optional)
   */
  static assert = (condition, message, arg = null) => {
    if(!ValidUtil.type(condition, "boolean", true))
      throw new Error(`Condition must be a boolean. Got ${condition} (Arg: 1)`)

    if(!ValidUtil.type(message, "string", true))
      throw new Error(`Message must be a string. Got ${message} (Arg: 2)`)

    if(!ValidUtil.type(arg, "number", true))
      throw new Error(`Arg must be a number. Got ${arg} (Arg: 3)`)

    if(!condition)
      throw new Error(`${message}${arg ? `: ${arg}` : ""}`)
  }
}
