import Logger from "../Logger.js"
import { types } from "../include/DataTypes.js"
import ValidUtil from "./ValidUtil.js"

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

  forEach(callback) {
    this.#specs.forEach(callback)
  }
  every(callback) {
    return this.#specs.every(callback)
  }
  some(callback) {
    return this.#specs.some(callback)
  }
  filter(callback) {
    return this.#specs.filter(callback)
  }
  map(callback) {
    return this.#specs.map(callback)
  }
  reduce(callback, initialValue) {
    return this.#specs.reduce(callback, initialValue)
  }
  find(callback) {
    return this.#specs.find(callback)
  }

  match(value, options) {
    const allowEmpty = options?.allowEmpty ?? true
    const isEmpty = DataUtil.empty(value)

    // If we have a list of types, because the string was validly parsed,
    // we need to ensure that all of the types that were parsed are valid types
    // in JavaScript.
    if(this.length && !this.every(t => DataUtil.validType(t.typeName)))
      return false

    // Now, let's do some checking with the types, respecting the array flag
    // with the value
    const valueType = DataUtil.typeOf(value)
    const isArray = valueType === "array"

    // We need to ensure that we match the type and the consistency of the types
    // in an array, if it is an array and an array is allowed.
    const matchingTypeSpec = this.filter(spec => {
      const { typeName: allowedType, array: allowedArray } = spec
      if(valueType === allowedType && !isArray && !allowedArray)
        return !allowEmpty ? !isEmpty : true

      if(isArray) {
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
   * @param {Array} arr - The array to check
   * @param {string} type - The type to check for (optional, defaults to the
   *                        type of the first element)
   * @returns {boolean} Whether all elements are of the specified type
   */
  static arrayUniform = (arr, type) => arr.every((item, _index, arr) =>
    typeof item === (type || typeof arr[0]))

  /**
   * Checks if an array is unique
   * @param {Array} arr - The array of which to remove duplicates
   * @returns {Array} The unique elements of the array
   */
  static arrayUnique = arr => arr.filter((item, index, self) =>
    self.indexOf(item) === index)

  /**
   * Returns the intersection of two arrays.
   * @param {Array} arr1 - The first array.
   * @param {Array} arr2 - The second array.
   * @returns {Array} The intersection of the two arrays.
   */
  static arrayIntersection = (arr1, arr2) => arr1.filter(value =>
    arr2.includes(value))

  static arrayPad = (arr, length, value, position = 0) => {
    const diff = length - arr.length
    if(diff <= 0)
      return arr

    const padding = Array(diff).fill(value)

    if(position === 0) // prepend - default
      return padding.concat(arr)
    else if(position === -1) // append
      return arr.concat(padding)
    else // somewhere in the middle - THAT IS ILLEGAL
      throw new SyntaxError("Invalid position")
  }

  /**
   * Clones an object
   * @param {object} obj - The object to clone
   * @param {boolean} freeze - Whether to freeze the cloned object
   * @returns {object} The cloned object
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

  static allocateObject = async(source, spec, forceConversion = true) => {
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

  static mapObject = async(original, transformer, mutate = false) => {
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
   * @param {object} obj - The object to check
   * @returns {boolean} Whether the object is empty
   */
  static objectIsEmpty = obj => Object.keys(obj).length === 0

  /**
   * Creates a type spec from a string. A type spec is an array of objects
   * defining the type of a value and whether an array is expected.
   * @param {string} string - The string to parse into a type spec.
   * @param {object} options - Additional options for parsing.
   * @returns {object[]} An array of type specs.
   */
  static typeSpec = (string, options) => {
    return new TypeSpec(string, options)
  }

  static typeMatch = (typeSpec, value, delimiter) => {
    const work = DataUtil.clone({typeSpec, value, delimiter})
    let {
      typeSpec: workSpec,
      value: workValue,
      delimiter: workDelimiter
    } = work

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

  static deepFreeze(obj) {
    if(obj === null || typeof obj !== "object")
      return obj // Skip null and non-objects

    // Retrieve and freeze properties
    const propNames = Object.getOwnPropertyNames(obj)
    for(const name of propNames) {
      const value = obj[name]
      if(value && typeof value === "object") {
        DataUtil.deepFreeze(value) // Recursively freeze
      }
    }

    // Freeze the object itself
    return Object.freeze(obj)
  }

  /**
   * Validates that a schema matches the expected structure.
   * @param {object} schema - The schema to validate.
   * @param {object} definition - The expected structure.
   * @param {Array} stack - The stack trace for nested validation.
   * @param {object} logger - The logger to use.
   * @returns {boolean} - True if valid, throws an error otherwise.
   */
  static schemaCompare(schema, definition, stack = [], logger = new Logger()) {
    const breadcrumb = key => stack.length ? `@${stack.join(".")}` : key
    const tag = "[DataUtil.schemaCompare]"
    const pad = `${" ".repeat((stack.length*2))}${stack.length ? "└─ " : ""}`
    const debug = (message, key) => logger.debug(`${tag}${pad}${message}${key ? " "+breadcrumb(key) : ""}`, 2, true)
    const error = (message, key) => logger.error(`${tag}${pad}${message}${key ? " "+breadcrumb(key) : ""}`)

    const errors = []

    debug(`Keys in schema: ${Object.keys(schema).join(", ")}`)
    debug(`Keys in definition: ${Object.keys(definition).join(", ")}`)

    for(const [key, value] of Object.entries(definition)) {
      debug(`Checking key: ${key} [required = ${value.required ?? false}]`)

      if(value.required && key in schema === false) {
        error(`❌  Required key not found in schema: ${key}`, key)
        errors.push(new SyntaxError(`Missing required key: ${key} ${breadcrumb(key)}`))
        continue
      } else {
        debug(`✔️  Required key found in schema: ${key}`)
      }

      if(key in schema) {
        const expectedType = value.dataType
        const actualType = schema[key]

        if(!expectedType.match(actualType))
          errors.push(new TypeError(`Type mismatch for key: ${key}. Expected: ${expectedType}, got: ${actualType} ${breadcrumb(key)}`))

        // Recursive validation for nested objects
        if(value.contains) {
          debug(`Recursing into nested object: ${key}`)
          const nestedResult = DataUtil.schemaCompare(
            schema[key]?.contains, value.contains, [...stack, key], logger
          )

          if(nestedResult.errors.length)
            errors.push(...nestedResult.errors)
        }
      }
    }

    return {status: errors.length === 0 ? "success" : "error", errors}
  }
}
