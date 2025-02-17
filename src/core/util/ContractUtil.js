import fetch from "node-fetch"
import JSON5 from "json5"
import Ajv from "ajv"
import {fileURLToPath,URL} from "node:url"

import * as FDUtil from "./FDUtil.js"

const {composeFilename,fileExists,readFile,writeFile} = FDUtil

const schemaUrl = "https://bedoc.gesslar.dev/schemas/v1/bedoc.action.json"
const localSchema = "./dist/bedoc.action.json"

/**
 * Takes a schema and returns a validator function
 *
 * @param {object} schema The schema to compile
 * @returns {Function} The schema validator function
 */
function getValidator(schema) {
  const ajv = new Ajv({allErrors: true, verbose: true})
  const f = ajv.compile(schema)

  return f
}

/**
 * Downloads and preserves a copy of the action schema
 * within the dist/ folder.
 *
 * @returns {object} The schema validator
 */
async function fetchSchema() {
  const response = await fetch(schemaUrl)
  const schema = await response.text()

  const output = composeFilename(fileURLToPath(new URL("../../../", import.meta.url)), localSchema)
  writeFile(output, schema)

  return JSON5.parse(schema)
}

/**
 * Loads a schema from file or fetches it if it is missing.
 *
 * @returns {object} The schema object
 */
async function loadSchema() {
  const schemaFile = composeFilename(fileURLToPath(new URL("../../../", import.meta.url)), localSchema)

  if(fileExists(schemaFile)) {
    const schema = readFile(schemaFile)

    return JSON5.parse(schema)
  }

  return await fetchSchema()
}

export {
  fetchSchema,
  getValidator,
  loadSchema,
}
