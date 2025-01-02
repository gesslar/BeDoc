module.exports = class DataUtil {

  /**
  * Checks if all elements in an array are of a specified type
  * @param {Array} arr - The array to check
  * @param {string} type - The type to check for
  * @returns {boolean} Whether all elements are of the specified type
  */
  uniformArray = (arr, type) => arr.every(item => typeof item === type);
  clone = (obj, freeze = false) => {
    const clone = JSON.parse(JSON.stringify(obj));

    if(freeze)
      Object.freeze(clone);

    return clone;
  }

  isMap = value => value instanceof Map;
}
