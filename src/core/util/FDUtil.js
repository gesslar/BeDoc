import fs from "fs"
import { globby } from "globby"
import console from "node:console"
import path from "node:path"
import process from "node:process"
import { fileURLToPath, pathToFileURL } from "node:url"
import DataUtil from "./DataUtil.js"
import ValidUtil from "./ValidUtil.js"

export default class FDUtil {
  data = new DataUtil()
  valid = new ValidUtil()

  constructor() {}

  /**
   * Fix slashes in a path
   * @param {string} pathName - The path to fix
   * @returns {string} The fixed path
   */
  static fixSlashes(pathName) {
    return pathName.replace(/\\/g, "/")
  }

  /**
   * Convert a path to a URI
   * @param {string} pathName - The path to convert
   * @returns {string} The URI
   * @throws {Error} If the path is not a valid file path
   */
  static pathToUri(pathName) {
    try {
      return pathToFileURL(pathName).href
    } catch(e) {
      void e // stfu linter
      return pathName
    }
  }

  /**
   * Convert a URI to a path
   * @param {string} pathName - The URI to convert
   * @returns {string} The path
   * @throws {Error} If the URI is not a valid file URL
   */
  static uriToPath(pathName) {
    try {
      return fileURLToPath(pathName)
    } catch(e) {
      void e // did you hear me?? i said stfu!
      return pathName
    }
  }

  /**
   * Resolves a file to an absolute path
   * @param {string} fileName - The file to resolve
   * @param {object} [directoryObject] - The directory object to resolve the
   *                                     file in
   * @returns {object} A file object (validated)
   * @throws {Error}
   */
  static resolveFilename(fileName, directoryObject = null) {
    ValidUtil.type(fileName, "string", {allowEmpty: false})

    fileName = FDUtil.uriToPath(fileName)
    const fixedFileName = FDUtil.fixSlashes(fileName)
    const directoryNamePart = fixedFileName.split("/").slice(0, -1).join("/")
    const fileNamePart = fixedFileName.split("/").pop()
    if(!directoryObject)
      directoryObject = FDUtil.resolveDirectory(directoryNamePart)

    const fileObject = FDUtil.composeFilename(directoryObject, fileNamePart)
    fs.opendirSync(directoryObject.absolutePath).closeSync()

    return {
      ...fileObject,
      directory: directoryObject
    }
  }

  /**
   * Compose a file path from a directory and a file
   * @param {string|object} directoryNameorObject - The directory
   * @param {string} fileName - The file
   * @returns {object} A file object
   */
  static composeFilename(directoryNameorObject, fileName) {
    let dirObject

    if(DataUtil.type(directoryNameorObject, "string|string[]")) {
      dirObject = FDUtil.composeDirectory(directoryNameorObject)
    } else {
      if(!directoryNameorObject.isDirectory)
        throw new Error("Directory object is not a directory")

      dirObject = directoryNameorObject
    }

    fileName = path.resolve(dirObject.path, fileName)

    return FDUtil.mapFilename(fileName)
  }

  /**
   * Map a file to a FileMap
   * @param {string} fileName - The file to map
   * @returns {object} A file object
   */
  static mapFilename(fileName) {
    return {
      path: fileName,
      uri: FDUtil.pathToUri(fileName),
      absolutePath: path.resolve(process.cwd(), fileName),
      absoluteUri: FDUtil.pathToUri(path.resolve(process.cwd(), fileName)),
      name: path.basename(fileName),
      module: path.basename(fileName, path.extname(fileName)),
      extension: path.extname(fileName),
      isFile: true,
      isDirectory: false,
    }
  }

  /**
   * Map a directory to a DirMap
   * @param {string} directoryName - The directory to map
   * @returns {object} A directory object
   */
  static mapDirectory(directoryName) {
    return {
      path: directoryName,
      uri: FDUtil.pathToUri(directoryName),
      absolutePath: path.resolve(process.cwd(), directoryName),
      absoluteUri: FDUtil.pathToUri(path.resolve(process.cwd(), directoryName)),
      name: path.basename(directoryName),
      separator: path.sep,
      isFile: false,
      isDirectory: true,
    }
  }

  static deconstructFilenameToParts(fileName) {
    const { basename, dirname, extname } = path.parse(fileName)

    return { basename, dirname, extname }
  }

  /**
   * Retrieve all files matching a specific glob pattern.
   * @param {string|string[]} globPattern - The glob pattern(s) to search.
   * @returns {Promise<object[]>} An array of file objects
   * @throws {Error} Throws an error for invalid input or search failure.
   */
  static async getFiles(globPattern) {
    // Validate input
    ValidUtil.type(globPattern, "string|string[]", {allowEmpty: false})

    const globbyArray = (
      DataUtil.type(globPattern, "array")
        ? globPattern
        : globPattern
          .split("|")
          .map(g => g.trim())
          .filter(Boolean)
    )
      .map(g => FDUtil.fixSlashes(g))

    if(Array.isArray(globbyArray) && DataUtil.arrayUniform(globbyArray, "string", true) && !globbyArray.length)
      throw new Error("[getFiles] Invalid glob pattern: Array must contain only strings.")

    // Use Globby to fetch matching files
    const filesArray = await globby(globbyArray)
    const files = filesArray.map(file => FDUtil.mapFilename(file))

    // Flatten the result and remove duplicates
    return files
  }

  /**
   * Resolves a path to an absolute path
   * @param {string} directoryName - The path to resolve
   * @returns {object} The directory object
   * @throws {Error}
   */
  static resolveDirectory(directoryName) {
    ValidUtil.type(directoryName, "string", true)

    const directoryObject = FDUtil.mapDirectory(directoryName)
    fs.opendirSync(directoryObject.absolutePath).closeSync()

    return directoryObject
  }

  /**
   * Compose a directory map from a path
   * @param {string} directory - The directory
   * @returns {object} A directory object
   */
  static composeDirectory(directory) {
    return FDUtil.mapDirectory(directory)
  }

  /**
   * Lists the contents of a directory.
   * @param {string} directory - The directory to list.
   * @returns {Promise<{files: object[], directories: object[]}>} The files and
   * directories in the directory.
   */
  static async ls(directory) {
    const found = await fs.promises.readdir(directory, {withFileTypes: true})
    const results = await Promise.all(found.map(async dirent => {
      const fullPath = path.join(directory, dirent.name)
      const stat = await fs.promises.stat(fullPath)
      return { dirent, stat, fullPath }
    }))

    const files = results
      .filter(({stat}) => stat.isFile())
      .map(({fullPath}) => FDUtil.mapFilename(fullPath))

    const directories = results
      .filter(({stat}) => stat.isDirectory())
      .map(({fullPath}) => FDUtil.mapDirectory(fullPath))

    return {files, directories}
  }

  /**
   * Reads the content of a file asynchronously.
   * @param {object} fileObject - The file map containing the file path
   * @returns {Promise<string>} The file contents
   */
  static async readFile(fileObject) {
    const {absolutePath} = fileObject
    if(!absolutePath)
      throw new Error("No absolute path in file map")

    const content = await fs.promises.readFile(absolutePath, "utf8")
    return content
  }

  /**
   * Writes content to a file asynchronously.
   * @param {object} fileObject - The file map containing the file path
   * @param {string} content - The content to write
   * @returns {Promise<void>}
   */
  static async writeFile(fileObject, content) {
    const absolutePath = fileObject.absolutePath
    if(!absolutePath) throw new Error("No absolute path in file map")
    return await fs.promises.writeFile(absolutePath, content, "utf8")
  }
}
