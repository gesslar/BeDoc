import {Data, DirectoryObject, FileObject, Sass} from "@gesslar/toolkit"
import JSON5 from "json5"
import yaml from "yaml"
import Schemer from "./Schemer.js"

const refex = /^ref:\/\/(?<file>.*)$/

/**
 * Terms handles contract terms validation and alignment.
 * It deals with the TERMS of a contract and determines if things align or not.
 * Schemer is specifically for schemas, Terms is for contract negotiation.
 */
export default class Terms {
  #debug = null
  #validator = null
  #terms = null

  constructor({validator, terms = null, debug = null}) {
    this.#validator = validator
    this.#terms = terms
    this.#debug = debug
  }

  /**
   * Creates a contract terms validator from terms
   *
   * @param {string} name - String identifier for this validation.
   * @param {object} terms - Contract terms.
   * @returns {Terms} New Terms instance with validator
   */
  newContract(name, terms) {
    if(this.#validator) {
      const valid = this.#validator(terms)

      if(!valid) {
        const error = Schemer.reportValidationErrors(
          this.#validator.errors
        )
        throw Sass.new(`Invalid contract terms:\n${error}`)
      }
    }

    const termsSchemaValidator = Schemer.from({
      "$schema": "http://json-schema.org/draft-07/schema#",
      "$id": `${name} Schema`,
      title: `${name} Schema`,
      type: "object",
      properties: terms,
    })

    return new Terms(termsSchemaValidator, terms, this.#debug)
  }

  /**
   * Validates data against this contract's terms
   *
   * @param {object} data - Data to validate
   * @returns {boolean} True if valid
   * @throws {Sass} If validation fails
   */
  validate(data) {
    if(!this.#validator)
      throw Sass.new("No contract validator available")

    const valid = this.#validator(data)

    if(!valid) {
      const error = Schemer.reportValidationErrors(
        this.#validator.errors
      )
      throw Sass.new(`Contract validation failed:\n${error}`)
    }

    return true
  }

  /**
   * Compares two Terms instances for compatibility
   *
   * @param {Terms} otherTerms - Terms to compare against
   * @returns {object} Result with status and errors
   */
  compare(otherTerms) {
    if(!(otherTerms instanceof Terms)) {
      return {
        status: "error",
        errors: [new TypeError("Argument must be a Terms instance")]
      }
    }

    return this.#schemaCompare(this.#terms, otherTerms.terms)
  }

  /**
   * Validates that a schema matches the expected structure
   *
   * @param {object} schema - The schema to validate
   * @param {object} definition - The expected structure
   * @param {Array} stack - The stack trace for nested validation
   * @returns {object} Result with status and errors
   */
  #schemaCompare(schema, definition, stack = []) {
    const debug = this.#debug
    const breadcrumb = key => (stack.length ? `@${stack.join(".")}` : key)
    const errors = []

    if(!schema || !definition) {
      return {
        status: "error",
        errors: [Sass.new("Both schema and definition are required")]
      }
    }

    debug?.("Keys in schema:%o", 3, Object.keys(schema))
    debug?.("Keys in definition:%o", 3, Object.keys(definition))

    for(const [key, value] of Object.entries(definition)) {
      debug?.("Checking key: %o [required = %o]", 3, key, value.required ?? false)

      if(value.required && key in schema === false) {
        debug?.("Required key not found in schema: %o", 2, key)
        errors.push(
          Sass.new(`Missing required key: ${key} ${breadcrumb(key)}`)
        )
        continue
      } else {
        debug?.("Required key found in schema: %o", 3, key)
      }

      if(key in schema) {
        const expectedType = value.dataType
        const actualType = schema[key]

        if(expectedType && !expectedType.match?.(actualType)) {
          errors.push(
            Sass.new(
              `Type mismatch for key: ${key}. Expected: ${expectedType}, got: ${actualType} ${breadcrumb(key)}`
            )
          )
        }

        // Recursive validation for nested objects
        if(value.contains) {
          debug?.("Recursing into nested object: %o", 3, key)
          const nestedResult = this.#schemaCompare(
            schema[key]?.contains,
            value.contains,
            [...stack, key]
          )

          if(nestedResult.errors.length) {
            errors.push(...nestedResult.errors)
          }
        }
      }
    }

    return {status: errors.length === 0 ? "success" : "error", errors}
  }

  /**
   * Parses contract data, handling file references
   *
   * @param {string|object} contractData - Contract data or reference
   * @param {DirectoryObject} directoryObject - Directory context for file resolution
   * @returns {object} Parsed contract data
   */
  static async parse(contractData, directoryObject) {
    if(Data.isBaseType(contractData, "String")) {
      const match = refex.exec(contractData)

      if(match?.groups?.file) {
        const file = new FileObject(match.groups.file, directoryObject)

        return await file.loadData()
      }

      // Try parsing as YAML/JSON
      try {
        return yaml.parse(contractData)
      } catch {
        try {
          return JSON5.parse(contractData)
        } catch {
          throw Sass.new(`Could not parse contract data as YAML or JSON: ${contractData}`)
        }
      }
    }

    if(Data.isBaseType(contractData, "Object")) {
      return contractData
    }

    throw Sass.new(`Invalid contract data type: ${typeof contractData}`)
  }

  /**
   * Get the contract terms
   *
   * @returns {object} The contract terms
   */
  get terms() {
    return this.#terms
  }

  /**
   * Get the contract validator
   *
   * @returns {(data: object) => boolean} The contract validator function
   */
  get validator() {
    return this.#validator
  }
}
