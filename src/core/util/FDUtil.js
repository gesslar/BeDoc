import path from "path"
import fs from "fs"
import {globby} from "globby"
import mm from "micromatch"

import DataUtil from "./DataUtil.js"
import ValidUtil from "./ValidUtil.js"
import { on } from "events"

export default class FDUtil {
  data = new DataUtil()
  valid = new ValidUtil()

  constructor() {}

  /**
   * Fix slashes in a path
   *
   * @param pathName - The path to fix
   * @returns The fixed path
   */
  static fixSlashes = pathName => pathName.replace(/\\/g, "/")

  /**
   * Convert a path to a URI
   *
   * @param pathName - The path to convert
   * @returns The URI
   */
  static toUri = pathName => `file://${FDUtil.fixSlashes(pathName)}`

  /**
   * Resolves a file to an absolute path
   *
   * @param fileName - The file to resolve
   * @param directoryObject - The directory object to resolve the file in
   * @returns A file object (validated)
   * @throws {Error}
   */
  static resolveFilename =  async(fileName, directoryObject = null) => {
    if(!ValidUtil.string(fileName, true))
      throw new Error("File path is required")

    const fixedFileName = FDUtil.fixSlashes(fileName)
    const directoryNamePart = fixedFileName.split("/").slice(0, -1).join("/")
    const fileNamePart = fixedFileName.split("/").pop()
    if(!directoryObject)
      directoryObject = await FDUtil.resolveDirectory(directoryNamePart)

    const fileObject = await FDUtil.composeFilename(directoryObject, fileNamePart)
    const stat = await fs.promises.stat(fileObject.absolutePath)

    if(stat.isFile())
      return {
        ...fileObject,
        directory:directoryObject
      }

    throw new Error(`File does not exist: \`${fileObject.absolutePath}\``)
  }

  /**
   * Compose a file path from a directory and a file
   *
   * @param directoryName - The directory
   * @param fileName - The file
   * @returns A file object
   */
  static composeFilename = async(directoryNameorObject, fileName) => {
    let dirObject

    if(ValidUtil.string(directoryNameorObject)) {
      dirObject = await FDUtil.composeDirectory(directoryNameorObject)
    } else {
      if(!directoryNameorObject.isDirectory)
        throw new Error("Directory object is not a directory")

      dirObject = directoryNameorObject
    }

    const fileObject = path.resolve(dirObject.path, fileName)

    return FDUtil.mapFilename(fileObject)
  }

  /**
   * Map a file to a FileMap
   *
   * @param fileName - The file to map
   * @returns A file object
   */
  static mapFilename = fileName => {
    return {
      path: fileName,
      uri: FDUtil.toUri(fileName),
      absolutePath: path.resolve(process.cwd(), fileName),
      absoluteUri: FDUtil.toUri(path.resolve(process.cwd(), fileName)),
      name: path.basename(fileName),
      module: path.basename(fileName, path.extname(fileName)),
      extension: path.extname(fileName),
      isFile: true,
      isDirectory: false,
    }
  }

  /**
   * Map a directory to a DirMap
   *
   * @param directoryName - The directory to map
   * @returns A directory object
   */
  static mapDirectory = directoryName => {
    return {
      path: directoryName,
      uri: FDUtil.toUri(directoryName),
      absolutePath: path.resolve(process.cwd(), directoryName),
      absoluteUri: FDUtil.toUri(path.resolve(process.cwd(), directoryName)),
      name: path.basename(directoryName),
      isFile: false,
      isDirectory: true,
    }
  }

  /**
   * Retrieve all files matching a specific glob pattern.
   *
   * @param globPattern - The glob pattern(s) to search.
   * @returns An array of file objects
   * @throws {Error} Throws an error for invalid input or search failure.
   */
  static getFiles = async(globPattern) => {
    // Validate input
    if(!ValidUtil.string(globPattern, true) && !ValidUtil.array(globPattern, true))
      throw new Error("[getFiles] Invalid glob pattern: Must be a string or a non-empty array of strings.")

    const globbyArray = []
    if(ValidUtil.string(globPattern)) {
      globbyArray.push(...(globPattern
        .split("|")
        .map(g => g.trim())
        .filter(Boolean)
        .map(g => FDUtil.fixSlashes(g))))
    } else {
      globbyArray.push(...globPattern)
    }

    if(Array.isArray(globbyArray) && !ValidUtil.arrayUniform(globbyArray, "string", true) && !globbyArray.length)
      throw new Error("[getFiles] Invalid glob pattern: Array must contain only strings.")

    // Use Globby to fetch matching files
    const filesArray = await globby(globbyArray)
    const files = filesArray.map(file => FDUtil.mapFilename(file))

    // Flatten the result and remove duplicates
    return files
  }

  /**
   * Resolves a path to an absolute path
   *
   * @param directoryName - The path to resolve
   * @returns The directory object
   * @throws {Error}
   */
  static resolveDirectory = async directoryName => {
    if(!ValidUtil.string(directoryName, true))
      throw new Error("Path is required")

    const directoryObject = FDUtil.mapDirectory(directoryName)
    const stat = await fs.promises.stat(directoryObject.absolutePath)

    if(stat.isDirectory())
      return directoryObject

    throw new Error(`Path does not exist: \`${directoryObject.absolutePath}\``)
  }

  /**
   * Compose a directory map from a path
   *
   * @param directory - The directory
   * @returns A directory object
   */
  static composeDirectory = async(directory) => FDUtil.mapDirectory(directory)

  static ls = async(directory) => {
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
   *
   * @param fileObject - The file map containing the file path
   * @returns The file contents
   */
  static readFile = async(fileObject) => {
    const {absolutePath} = fileObject
    if(!absolutePath) throw new Error("No absolute path in file map")
    return await fs.promises.readFile(absolutePath, "utf8")
  }

  /**
   * Writes content to a file asynchronously.
   *
   * @param fileObject - The file map containing the file path
   * @param content - The content to write
   */
  static writeFile = async(fileObject, content) => {
    const absolutePath = fileObject.absolutePath
    if(!absolutePath) throw new Error("No absolute path in file map")
    return await fs.promises.writeFile(absolutePath, content, "utf8")
  }
}
