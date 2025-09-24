import {FileObject, Glog} from "@gesslar/toolkit"
import Ajv from "ajv"
import fetch from "node-fetch"
import url from "node:url"

import Logger from "../Logger.js"

const schemaUrl = "https://bedoc.gesslar.dev/schemas/v1/bedoc.action.json"
const localSchema = "dist/bedoc.action.json"

export default {
  getSchemaFile() {
    Glog(url.fileURLToPath(new url.URL("../../../", import.meta.url)),
      localSchema,
      new FileObject(localSchema, url.fileURLToPath(new URL("../../../", import.meta.url))
      ))

    return new FileObject(
      localSchema,
      url.fileURLToPath(new URL("../../../", import.meta.url))
    )
  },

  /**
   * Takes a schema and returns a validator function
   *
   * @param {object} schema The schema to compile
   * @returns {(data: unknown) => boolean} The schema validator function
   */
  getValidator(schema) {
    const ajv = new Ajv({allErrors: true, verbose: true})
    const f = ajv.compile(schema)

    return f
  },

  /**
   * Downloads and preserves a copy of the action schema within the dist/ folder.
   *
   * @returns {object} The schema validator
   */
  async fetchSchema() {
    const response = await fetch(schemaUrl)
    const schema = await response.text()
    const schemaFile = this.getSchemaFile()

    await schemaFile.write(schema)

    return await schemaFile.loadData()
  },

  /**
   * Loads a schema from file or fetches it if it is missing.
   *
   * @returns {object} The schema object
   */
  async loadSchema() {
    const schemaFile = this.getSchemaFile()

    Glog(schemaFile)

    return await schemaFile.exists
      ? await schemaFile.loadData()
      : await this.fetchSchema()
  },

  /**
   * Validates that a schema matches the expected structure.
   *
   * TODO get rid of this and all of its uses. We have a new
   *      contract system now.
   *
   * @param {object} schema - The schema to validate.
   * @param {object} definition - The expected structure.
   * @param {Array} stack - The stack trace for nested validation.
   * @param {object} logger - The logger to use.
   * @returns {boolean} - True if valid, throws an error otherwise.
   */
  schemaCompare(schema, definition, stack = [], logger = new Logger()) {
    const breadcrumb = key => (stack.length ? `@${stack.join(".")}` : key)
    const tag = "[DataUtil.schemaCompare]"
    const pad = `${" ".repeat(stack.length * 2)}${stack.length ? "└─ " : ""}`
    const debug = (message, key) =>
      logger.debug(
        `${tag}${pad}${message}${key ? " " + breadcrumb(key) : ""}`,
        2,
        true,
      )
    const error = (message, key) =>
      logger.error(`${tag}${pad}${message}${key ? " " + breadcrumb(key) : ""}`)

    const errors = []

    debug(`Keys in schema: ${Object.keys(schema).join(", ")}`)
    debug(`Keys in definition: ${Object.keys(definition).join(", ")}`)

    for(const [key, value] of Object.entries(definition)) {
      debug(`Checking key: ${key} [required = ${value.required ?? false}]`)

      if(value.required && key in schema === false) {
        error(`❌  Required key not found in schema: ${key}`, key)

        errors.push(
          new SyntaxError(`Missing required key: ${key} ${breadcrumb(key)}`),
        )

        continue
      } else {
        debug(`✔️  Required key found in schema: ${key}`)
      }

      if(key in schema) {
        const expectedType = value.dataType
        const actualType = schema[key]

        if(!expectedType.match(actualType))
          errors.push(
            new TypeError(
              `Type mismatch for key: ${key}. Expected: ${expectedType}, got: ${actualType} ${breadcrumb(key)}`,
            ),
          )

        // Recursive validation for nested objects
        if(value.contains) {
          debug(`Recursing into nested object: ${key}`)
          const nestedResult = this.schemaCompare(
            schema[key]?.contains,
            value.contains,
            [...stack, key],
            logger,
          )

          if(nestedResult.errors.length)
            errors.push(...nestedResult.errors)
        }
      }
    }

    return {status: errors.length === 0 ? "success" : "error", errors}
  },
}
