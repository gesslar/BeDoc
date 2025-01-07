import ValidUtil from "./ValidUtil.js"

export default class DataUtil {
  /**
   * Checks if all elements in an array are of a specified type
   *
   * @param arr - The array to check
   * @param type - The type to check for
   * @returns Whether all elements are of the specified type
   */
  static uniformArray = (arr, type) => arr.every(item => typeof item === type)

  /**
   * Checks if an array is unique
   *
   * @param arr - The array of which to remove duplicates
   * @returns The unique elements of the array
   */
  static arrayUnique = arr => arr.filter((item, index, self) => self.indexOf(item) === index)

  /**
   * Clones an object
   *
   * @param obj - The object to clone
   * @param freeze - Whether to freeze the cloned object
   * @returns The cloned object
   */
  static clone = (obj, freeze = false) => {
    const clone = JSON.parse(JSON.stringify(obj))

    return freeze ? Object.freeze(clone) : clone
  }

  static allocate = (source, spec, forceConversion = true) => {
    const workSource = [], workSpec = [], result = {}

    if(!ValidUtil.array(source))
      throw new Error("Source must be an array.")
    workSource.push(...source)

    if(!ValidUtil.array(spec) && !ValidUtil.func(spec))
      throw new Error("Spec must be an array or a function.")

    if(ValidUtil.func(spec)) {
      const specResult = spec(workSource)
      if(!ValidUtil.array(specResult))
        throw new Error("Spec resulting from function must be an array.")

      workSpec.push(...specResult)
    } else if(ValidUtil.array(spec))
      workSpec.push(...spec)

    if(workSource.length !== workSpec.length)
      throw new Error("Source and spec must have the same number of elements.")

    // Objects must always be indexed by strings.
    if(forceConversion === true) {
      workSource.map((element, index, arr) => {
        if(!ValidUtil.string(element))
          arr[index] = String(element)
      })
    }

    // Check that all keys are strings
    if(!ValidUtil.arrayUniform(workSource, "string"))
      throw new Error("Indices of an Object must be of type string.")

    workSource.forEach((element, index, arr) => result[element] = workSpec[index])

    return result
  }

  /**
   * Checks if an object is empty
   *
   * @param obj - The object to check
   * @returns Whether the object is empty
   */
  static objectIsEmpty = obj => Object.keys(obj).length === 0

  static typeSpec = element => {
    const parts = element.split("|")

    const result = []
    parts.forEach(part => {
      const typeMatches = /(\w+)(\[\])?/.exec(part)
      if(!typeMatches || typeMatches.length !== 3)
        throw new Error(`Invalid type: ${part}`)

      const [_, type, isArray] = typeMatches

      result.push({
        typeName: type,
        array: isArray === "[]"
      })
    })

    return result.length === 1 ? result[0] : result
  }

  static typeMatch = (typeSpec, value, delimiter) => {
    const original = { typeSpec, value, delimiter }
    const work = DataUtil.clone(original)
    let { typeSpec: workSpec, value: workValue, delimiter: workDelimiter } = work

    // Ensure that we have a typeSpec
    if(typeof workSpec === "string")
      workSpec = DataUtil.typeSpec(workSpec)

    // Ensure that the typeSpec is an array
    workSpec = Array.isArray(workSpec) ? workSpec : [workSpec]

    // If we received a delimiter, we need to split the value into an array
    if(workDelimiter)
      if(typeof workValue === "string")
        workValue = workValue.split(workDelimiter)
      else
        throw new Error("Value must be a string when using a delimiter.")

    const result = workSpec.some(({typeName, array}) => {
      if(array)
        return ValidUtil.arrayUniform(workValue, typeName)
      else
        return typeof workValue === typeName
    })

    return result
  }

  static typeSpecToString = typeSpec => {
    const { typeName, isArray } = typeSpec
    return `${typeName}${isArray ? "[]" : ""}`
  }
}
