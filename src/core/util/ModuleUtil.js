import {createRequire} from "module"
import FDUtil from "./FDUtil.js"
import JSON5 from "json5"

export default class ModuleUtil {
  /**
   * Requires a module synchronously
   *
   * @param {object} fileObject - The file to require
   * @returns {object} The required module
   */
  static require(fileObject) {
    return createRequire(import.meta.url)(fileObject.absolutePath)
  }

  /**
   * Loads a JSON file asynchronously
   *
   * @param {object} jsonFileObject - The JSON file to load
   * @returns {Promise<object>} The parsed JSON content
   */
  static async loadJson(jsonFileObject) {
    // Read the file
    const jsonContent = await FDUtil.readFile(jsonFileObject)
    const json = JSON5.parse(jsonContent)
    return json
  }

  /**
   * Loads the package.json file asynchronously
   *
   * @returns {Promise<object>} The parsed package.json content
   */
  static async loadPackageJson() {
    const packageJsonFileObject = FDUtil.resolveFilename("./package.json")
    const jsonContent = await FDUtil.readFile(packageJsonFileObject)
    const json = JSON5.parse(jsonContent)
    return json
  }
}
