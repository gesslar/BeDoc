export default class ValidUtil {
  /**
   * Validates a string
   * @param str - The string to validate
   * @param nonEmpty - Whether the string must be non-empty
   * @returns boolean
   */
  string = (str: any, nonEmpty = false) => typeof str === "string" && (nonEmpty ? str.length > 0 : true);

  /**
   * Validates an array
   * @param arr - The array to validate
   * @param nonEmpty - Whether the array must be non-empty
   * @returns boolean
   */
  array = (arr: any, nonEmpty = false) => Array.isArray(arr) && (nonEmpty ? arr.length > 0 : true);

  /**
   * Validates an array of uniform type
   * @param arr - The array to validate
   * @param type - The type of the array elements
   * @param nonEmpty - Whether the array must be non-empty
   * @returns boolean
   */
  arrayUniform = (arr: any, type: string, nonEmpty = false) => Array.isArray(arr) && arr.every(item => typeof item === type) && (nonEmpty ? arr.length > 0 : true);
}
