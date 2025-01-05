import ValidUtil from "./valid.js";

export default class DataUtil {
  /**
   * Checks if all elements in an array are of a specified type
   *
   * @param arr - The array to check
   * @param type - The type to check for
   * @returns Whether all elements are of the specified type
   */
  static uniformArray = (arr, type) => arr.every(item => typeof item === type);

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

  static allocate = (source, spec, forceConversion = true) => {
    const specType = typeof spec;
    const workSource = [], workSpec = [], result = {};

    if(!ValidUtil.array(source))
      throw new Error("Source must be an array.");
    workSource.push(...source);

    if(!ValidUtil.array(spec) && !ValidUtil.func(spec))
      throw new Error("Spec must be an array or a function.");

    if(ValidUtil.func(spec)) {
      const specResult = spec(workSource);
      if(!ValidUtil.array(specResult))
        throw new Error("Spec resulting from function must be an array.");

      workSpec.push(...specResult);
    } else if(ValidUtil.array(spec))
      workSpec.push(...spec);

    if(workSource.length !== workSpec.length)
      throw new Error("Source and spec must have the same number of elements.");

    // Objects must always be indexed by strings.
    if(forceConversion === true) {
      workSource.map((element, index, arr) => {
        if(!ValidUtil.string(element))
          arr[index] = String(element);
      });
    }

    // Check that all keys are strings
    if(!ValidUtil.arrayUniform(workSource, "string"))
      throw new Error("Indices of an Object must be of type string.");

    workSource.forEach((element, index, arr) => result[element] = workSpec[index]);

    return result;
  }

  /**
   * Checks if an object is empty
   *
   * @param obj - The object to check
   * @returns Whether the object is empty
   */
  static objectIsEmpty = obj => Object.keys(obj).length === 0;
}
