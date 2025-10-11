import {Data,Util,Valid} from "@gesslar/toolkit"
import Ajv from "ajv"

export default class Schemer {
  static async fromFile(file, options={}) {
    Valid.type(file, "FileObject")
    Valid.assert(Data.isPlainObject(options), "Options must be a plain object.")

    const schemaData = await file.loadData()
    const validator = new Ajv(options).compile(schemaData)

    return new this(validator)
  }

  static async from(schemaData={},options={}) {
    Valid.assert(Data.isPlainObject(schemaData), "Options must be a plain object.")
    Valid.assert(Data.isPlainObject(options), "Options must be a plain object.")

    const validator = new Ajv(options).compile(schemaData)

    return new this(validator)
  }

  /**
   * Creates a validator function from a schema object
   *
   * @param {object} schema - The schema to compile
   * @param {object} [options] - AJV options
   * @returns {(data: unknown) => boolean} The schema validator function
   */
  static getValidator(schema, options = {allErrors: true, verbose: true}) {
    const ajv = new Ajv(options)

    return ajv.compile(schema)
  }

  static reportValidationErrors(errors) {
    return errors.reduce((acc, error) => {
      let msg = `- "${error.instancePath || "(root)"}" ${error.message}`

      if(error.params) {
        const details = []

        if(error.params.type)
          details.push(`  ➜ Expected type: ${error.params.type}`)

        if(error.params.missingProperty)
          details.push(`  ➜ Missing required field: ${error.params.missingProperty}`)

        if(error.params.allowedValues) {
          details.push(`  ➜ Allowed values: "${error.params.allowedValues.join('", "')}"`)
          details.push(`  ➜ Received value: "${error.data}"`)
          const closestMatch =
            Util.findClosestMatch(error.data, error.params.allowedValues)

          if(closestMatch)
            details.push(`  ➜ Did you mean: "${closestMatch}"?`)
        }

        if(error.params.pattern)
          details.push(`  ➜ Expected pattern: ${error.params.pattern}`)

        if(error.params.format)
          details.push(`  ➜ Expected format: ${error.params.format}`)

        if(error.params.additionalProperty)
          details.push(`  ➜ Unexpected property: ${error.params.additionalProperty}`)

        if(details.length)
          msg += `\n${details.join("\n")}`
      }

      return acc ? `${acc}\n${msg}` : msg
    }, "")
  }
}
