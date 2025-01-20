import {isEmpty,typeOf,isValidType,isArrayUniform} from "#util"

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
    const empty = isEmpty(value)

    // If we have a list of types, because the string was validly parsed,
    // we need to ensure that all of the types that were parsed are valid types
    // in JavaScript.
    if(this.length && !this.every(t => isValidType(t.typeName)))
      return false

    // Now, let's do some checking with the types, respecting the array flag
    // with the value
    const valueType = typeOf(value)
    const isArray = valueType === "array"

    // We need to ensure that we match the type and the consistency of the types
    // in an array, if it is an array and an array is allowed.
    const matchingTypeSpec = this.filter(spec => {
      const {typeName: allowedType, array: allowedArray} = spec
      if(valueType === allowedType && !isArray && !allowedArray)
        return !allowEmpty ? !empty : true

      if(isArray) {
        if(allowedType === "array")
          if(!allowedArray)
            return true

        if(empty)
          if(allowEmpty)
            return true

        return isArrayUniform(value, allowedType)
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
      if(!isValidType(typeMatches[1]))
        throw new TypeError(`Invalid type: ${typeMatches[1]}`)
      const [_, type, isArray] = typeMatches

      return {
        typeName: type,
        array: isArray === "[]"
      }
    })
  }
}

export {
  TypeSpec,
}
