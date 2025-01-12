import ValidUtil from "./ValidUtil.js"
import {types} from "../include/DataTypes.js"
import util from "node:util"

class TypeSpec {
  #specs

  constructor(string, options) {
    this.#specs = []
    this.#parse(string, options)
    Object.freeze(this.#specs)
    this.specs = this.#specs
    this.length = this.#specs.length
    this.stringRepresentation = this.toString()
    Object.freeze(this)
  }

  toString() {
    return this.#specs.map(spec => {
      return `${spec.typeName}${spec.array ? "[]" : ""}`
    }).join("|")
  }

  toJSON() {
    // Serialize as a string representation or as raw data
    return {
      specs: this.#specs,
      length: this.length,
      stringRepresentation: this.toString(),
    }
  }

  forEach(callback) { this.#specs.forEach(callback) }
  every(callback) { return this.#specs.every(callback) }
  some(callback) { return this.#specs.some(callback) }
  filter(callback) { return this.#specs.filter(callback) }
  map(callback) { return this.#specs.map(callback) }
  reduce(callback, initialValue) { return this.#specs.reduce(callback, initialValue) }
  find(callback) { return this.#specs.find(callback) }

  match(value, options) {
    const allowEmpty = options?.allowEmpty ?? true
    const isEmpty = DataUtil.empty(value)

    // If we have a list of types, because the string was validly parsed,
    // we need to ensure that all of the types that were parsed are valid types
    // in JavaScript.
    if (this.length && !this.every(t => DataUtil.validType(t.typeName)))
      return false

    // Now, let's do some checking with the types, respecting the array flag
    // with the value
    const valueType = DataUtil.typeOf(value)
    const isArray = valueType === "array"

    // We need to ensure that we match the type and the consistency of the types
    // in an array, if it is an array and an array is allowed.
    const matchingTypeSpec = this.filter(spec => {
      const { typeName: allowedType, array: allowedArray } = spec
      if (valueType === allowedType && !isArray && !allowedArray)
        return !allowEmpty ? !isEmpty : true

      if (isArray) {
        if(allowedType === "array")
          if(!allowedArray)
            return true

        if(isEmpty)
          if(allowEmpty)
            return true

        return DataUtil.arrayUniform(value, allowedType)
      }
    })

    return matchingTypeSpec.length > 0
  }

  #parse(string, options) {
    const delimiter = options?.delimiter ?? "|"
    const parts = string.split(delimiter)

    this.#specs = parts.map(part => {
      const typeMatches = /(\w+)(\[\])?/.exec(part)
      if(!typeMatches || typeMatches.length !== 3)
        throw new TypeError(`Invalid type: ${part}`)
      if(!DataUtil.validType(typeMatches[1]))
        throw new TypeError(`Invalid type: ${typeMatches[1]}`)

      const [_, type, isArray] = typeMatches

      return {
        typeName: type,
        array: isArray === "[]"
      }
    })
  }
}

export default class DataUtil {
  /**
   * Checks if all elements in an array are of a specified type
   *
   * @param arr - The array to check
   * @param type - The type to check for (optional, defaults to the type of the first element)
   * @returns Whether all elements are of the specified type
   */
  static arrayUniform = (arr, type) => arr.every((item, index, arr) => typeof item === (type || typeof arr[0]))

  /**
   * Checks if an array is unique
   *
   * @param arr - The array of which to remove duplicates
   * @returns The unique elements of the array
   */
  static arrayUnique = arr => arr.filter((item, index, self) => self.indexOf(item) === index)

  /**
   *
   * @param {*[]} arr1
   * @param {*[]} arr2
   * @returns
   */
  static arrayIntersection = (arr1, arr2) => arr1.filter(value => arr2.includes(value))

  /**
   * Clones an object
   *
   * @param obj - The object to clone
   * @param freeze - Whether to freeze the cloned object
   * @returns The cloned object
   */
  static clone = (obj, freeze = false) => {
    const type = DataUtil.type

    const result = {}
    for(const [key, value] of Object.entries(obj))
      if(type(value, "object"))
        result[key] = DataUtil.clone(value)
      else
        result[key] = value

    return freeze ? Object.freeze(result) : result
  }

  static allocateObject = async (source, spec, forceConversion = true) => {
    // Function aliases
    const { type, arrayUniform } = DataUtil
    // Data
    const workSource = [], workSpec = [], result = {}

    if(!type(source, "array", {allowEmpty: false}))
      throw new Error("Source must be an array.")
    workSource.push(...source)

    if(!type(spec, "array", {allowEmpty: false}) && !type(spec, "function"))
      throw new Error("Spec must be an array or a function.")

    if(type(spec, "function")) {
      const specResult = await spec(workSource)
      if(!type(specResult, "array"))
        throw new Error("Spec resulting from function must be an array.")

      workSpec.push(...specResult)
    } else if(type(spec, "array", {allowEmpty: false}))
      workSpec.push(...spec)

    if(workSource.length !== workSpec.length)
      throw new Error("Source and spec must have the same number of elements.")

    // Objects must always be indexed by strings.
    if(forceConversion === true)
      workSource.map((element, index, arr) => arr[index] = String(element))

    // Check that all keys are strings
    if(!arrayUniform(workSource, "string"))
      throw new Error("Indices of an Object must be of type string.")

    workSource.forEach((element, index) => result[element] = workSpec[index])

    return result
  }

  static mapObject = async (original, transformer, mutate = false) => {
    ValidUtil.type(original, "object", true)
    ValidUtil.type(transformer, "function")
    ValidUtil.type(mutate, "boolean")

    const result = mutate ? original : {}

    for(const [key, value] of Object.entries(original))
      result[key] = DataUtil.type(value, "object")
        ? await DataUtil.mapObject(value, transformer, mutate)
        : result[key] = await transformer(key, value)

    return result
  }

  /**
   * Checks if an object is empty
   *
   * @param obj - The object to check
   * @returns Whether the object is empty
   */
  static objectIsEmpty = obj => Object.keys(obj).length === 0

  /**
   * Creates a type spec from a string. A type spec is an array of objects
   * defining the type of a value and whether an array is expected.
   *
   * @param {string} string The string to parse into a type spec
   * @returns {object[]} An array of type specs
   */
  static typeSpec = (string, options) => {
    return new TypeSpec(string, options)
  }

  static typeMatch = (typeSpec, value, delimiter) => {
    const work = DataUtil.clone({typeSpec, value, delimiter})
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
        return DataUtil.arrayUniform(workValue, typeName)
      else
        return typeof workValue === typeName
    })

    return result
  }

  static type = (value, type, options) => {
    const typeSpec = type instanceof TypeSpec
                     ? type
                     : DataUtil.typeSpec(type, options)
// we're comparing a typeSpec object to a File object. this will always
// return false. do fix.
    return typeSpec.match(value, options)
  }

  static validType = type => types.includes(type)

  static baseType = (value, type) => {
    if(!DataUtil.validType(type))
      return false

    const valueType = DataUtil.typeOf(value)

    switch(type.toLowerCase()) {
      case "array":
        return Array.isArray(value) // Native array check
      case "string":
        return valueType === "string"
      case "boolean":
        return valueType === "boolean"
      case "number":
        return valueType === "number" && !isNaN(value) // Excludes NaN
      case "object":
        return value !== null && valueType === "object" && !Array.isArray(value) // Excludes arrays and null
      case "function":
        return valueType === "function"
      case "symbol":
        return valueType === "symbol" // ES6 Symbol type
      case "bigint":
        return valueType === "bigint" // BigInt support
      case "null":
        return value === null // Explicit null check
      case "undefined":
        return valueType === "undefined" // Explicit undefined check
      default:
        return false // Unknown type
    }
  }

  static typeOf = value => {
    if(Array.isArray(value))
      return "array"
    else
      return typeof value
  }

  static nothing = value => value === undefined || value === null

  static empty = value => {
    if(DataUtil.nothing(value))
      return true

    switch(DataUtil.typeOf(value)) {
      case "array":
        return value.length === 0
      case "object":
        return Object.keys(value).length === 0
      case "string":
        return value.trim().length === 0
      default:
        return false
    }
  }
}
