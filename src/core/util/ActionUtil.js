import * as FDUtil from "./FDUtil.js"

const {readFile, resolveFilename} = FDUtil

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
  const json = JSON.parse(jsonContent)
  return json
}

/**
 * Loads the package.json file asynchronously
 *
 * @param {string|object} basePath - The base path to use
 * @returns {object} The parsed package.json content
 */
function loadPackageJson(basePath = null) {
  const packageJsonFileObject = resolveFilename("./package.json", basePath)
  const jsonContent = readFile(packageJsonFileObject)
  const json = JSON.parse(jsonContent)
  return json
}

export {
  // Constants
  actionMetaRequirements,
  actionTypes,
  // Functions
  loadJson,
  loadPackageJson,
}
