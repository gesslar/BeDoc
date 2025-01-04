export default class ValidUtil {
  /**
   * Validates a string
   * @param str - The string to validate
   * @param nonEmpty - Whether the string must be non-empty
   * @returns boolean
   */
  static string = (str, nonEmpty = false) => typeof str === "string" && (nonEmpty ? str.length > 0 : true);

  /**
   *
   * @param f - The value to check if is a function
   * @returns boolean
   */
  static func = f => typeof f === "function";

  /**
   * Validates an array
   * @param arr - The array to validate
   * @param nonEmpty - Whether the array must be non-empty
   * @returns boolean
   */
  static array = (arr, nonEmpty = false) => Array.isArray(arr) && (nonEmpty ? arr.length > 0 : true);

  /**
   * Validates an array of uniform type
   * @param arr - The array to validate
   * @param type - The type of the array elements
   * @param nonEmpty - Whether the array must be non-empty
   * @returns boolean
   */
  static arrayUniform = (arr, type, nonEmpty = false) => ValidUtil.array(arr, nonEmpty) && arr.every(item => typeof item === type) && (nonEmpty ? arr.length > 0 : true);

  /**
   * Validates a value against a type
   * @param value - The value to validate
   * @param type - The expected type
   * @param required - Whether the value is required
   * @returns boolean
   */
  static type = (value, type, required = false) => {
    if(!required && ValidUtil.nothing(value))
      return true ;

    switch(type) {
    case"array":
      return ValidUtil.array(value) ;
    case"string":
      return ValidUtil.string(value) ;
    case"boolean":
      return typeof value === "boolean" ;
    case"number":
      return typeof value === "number" ;
    default:
      return false ;
    }
  }

  /**
   * Validates a value against nothing
   * @param value - The value to validate
   * @returns boolean
   */
  static nothing = value => value === undefined || value === null;
}
