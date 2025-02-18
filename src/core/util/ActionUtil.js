import * as FDUtil from "./FDUtil.js"
import process from "node:process"
import JSON5 from "json5"
import YAML from "yaml"

const {readFile, fileExists, composeFilename} = FDUtil

const freeze = Object.freeze

const actionTypes = freeze(["parse", "print"])

const actionMetaRequirements = freeze({
  parse: [{action: "parse"}, "language"],
  print: [{action: "print"}, "format"],
})

/**
 * Loads an object from JSON or YAML provided a fileMap
 *
 * @param {object} fileMap - The FileObj file to load containing
 *  JSON or YAML text.
 * @returns {object} The parsed data object.
 */
function loadDataFile(fileMap) {
  const content = readFile(fileMap)

  try {
    return JSON5.parse(content)
  } catch{
    try {
      return YAML.parse(content)
    } catch{
      throw new Error("Content is neither valid JSON nor valid YAML")
    }
  }
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
  loadDataFile,
  loadPackageJson,
}
