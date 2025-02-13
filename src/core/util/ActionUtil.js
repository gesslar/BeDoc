import * as FDUtil from "./FDUtil.js"
import process from "node:process"
import JSON5 from "json5"

const {readFile, fileExists, composeFilename} = FDUtil

const freeze = Object.freeze

const actionTypes = freeze(["parse", "print"])

const actionMetaRequirements = freeze({
  parse: [{action: "parse"}, "language"],
  print: [{action: "print"}, "format"],
})

/**
 * Loads a JSON file asynchronously
 *
 * @param {object} jsonFileObject - The JSON file to load
 * @returns {object} The parsed JSON content
 */
function loadJson(jsonFileObject) {
  // Read the file
  const jsonContent = readFile(jsonFileObject)
  const json = JSON5.parse(jsonContent)
  return json
}

/**
 * Loads the package.json file asynchronously
 *
 * @param {string|object|null} basePath - The base path to use
 * @returns {object?} The parsed package.json content or null if the file does
 *                    not exist
 */
function loadPackageJson(basePath = process.cwd()) {
  const packageJsonFileObject = composeFilename(basePath, "./package.json")
  if(fileExists(packageJsonFileObject)) {
    const jsonContent = readFile(packageJsonFileObject)
    const json = JSON5.parse(jsonContent)
    return json
  } else
    return null
}

export {
  // Constants
  actionMetaRequirements,
  actionTypes,
  // Functions
  loadJson,
  loadPackageJson,
}
