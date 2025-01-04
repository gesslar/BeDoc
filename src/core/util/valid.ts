export default class ValidUtil {
  /**
   * Validates a string
   * @param str - The string to validate
   * @param nonEmpty - Whether the string must be non-empty
   * @returns boolean
   */
  static string = (str: unknown, nonEmpty = false): boolean => typeof str === "string" && (nonEmpty ? str.length > 0 : true);

  /**
   * Validates an array
   * @param arr - The array to validate
   * @param nonEmpty - Whether the array must be non-empty
   * @returns boolean
   */
  static array = (arr: unknown | unknown[], nonEmpty = false): boolean => Array.isArray(arr) && (nonEmpty ? arr.length > 0 : true);

  /**
   * Validates an array of uniform type
   * @param arr - The array to validate
   * @param type - The type of the array elements
   * @param nonEmpty - Whether the array must be non-empty
   * @returns boolean
   */
  static arrayUniform = (arr: unknown | unknown[], type: string, nonEmpty = false): boolean => Array.isArray(arr) && arr.every(item => typeof item === type) && (nonEmpty ? arr.length > 0 : true);

  /**
   * Validates a value against a type
   * @param value - The value to validate
   * @param type - The expected type
   * @param required - Whether the value is required
   * @returns boolean
   */
  static type = (value: unknown, type: string, required: boolean = false): boolean => {
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
  static nothing = (value: unknown): boolean => value === undefined || value === null;
}
