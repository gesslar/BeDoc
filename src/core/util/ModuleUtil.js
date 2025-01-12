import { createRequire } from "module"
import FDUtil from "./FDUtil.js"

export default class ModuleUtil {
  /**
   * Requires a module synchronously
   * @param fileObject - The file to require
   * @returns The required module
   */
  static require(fileObject) {
    return createRequire(import.meta.url)(fileObject.absolutePath)
  }

  static loadJson = async jsonFileObject => {
    // Read the file
    const jsonContent = await FDUtil.readFile(jsonFileObject)
    const json = JSON.parse(jsonContent)
    return json
  }

  static loadPackageJson = async() => {
    const packageJsonFileObject = await FDUtil.resolveFilename("./package.json")
    const jsonContent = await FDUtil.readFile(packageJsonFileObject)
    const json = JSON.parse(jsonContent)
    return json
  }
}
