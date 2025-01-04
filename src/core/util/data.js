export default class DataUtil {
  /**
   * Checks if all elements in an array are of a specified type
   *
   * @param arr - The array to check
   * @param type - The type to check for
   * @returns Whether all elements are of the specified type
   */
  static uniformArray = (arr, type) =>
    arr.every(item => typeof item === type);

  /**
   * Clones an object
   *
   * @param obj - The object to clone
   * @param freeze - Whether to freeze the cloned object
   * @returns The cloned object
   */
  static clone = (obj, freeze = false) => {
    const clone = JSON.parse(JSON.stringify(obj));

    if(freeze) {
      Object.freeze(clone);
    }

    return clone;
  };

  /**
   * Checks if a value is a Map
   *
   * @param value - The value to check
   * @returns Whether the value is a Map
   */
  static isMap = value => value instanceof Map;
}
