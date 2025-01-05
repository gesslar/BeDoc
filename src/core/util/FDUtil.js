import path from "path"
import fs from "fs"
import {globby} from "globby"
import mm from "micromatch"

import DataUtil from "./DataUtil.js"
import ValidUtil from "./ValidUtil.js"
import micromatch from "micromatch"
import { dir } from "console"

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
   * @param globPattern - The file to resolve
   * @returns The resolved file
   * @throws {Error}
   */
  static resolveFile = async globPattern => {
    if(!ValidUtil.string(globPattern, true))
      throw new Error(`Expected string or array of strings, got: ${typeof globPattern}\n${JSON.stringify(globPattern)}`);6

    const files = await globby(globPattern)

    if(!files)
      throw new Error(`File not found: ${globPattern}`)

    if(!files.length)
      throw new Error(`File not found: ${globPattern}`)

    if(files.length > 1)
      throw new Error(`Multiple files found for: ${globPattern}`)

    const pathName = files[0]
    return FDUtil.mapFile(pathName)
  }

  /**
   * Compose a file path from a directory and a file
   *
   * @param dir - The directory
   * @param file - The file
   * @returns The composed file path
   */
  static composeFilename = async(dir, file) => {
    const dirObject = await FDUtil.composeDirectory(dir)
    const fileName = path.resolve(dirObject.path, file)

    return FDUtil.mapFile(fileName)
  }

  /**
   * Map a file to a FileMap
   *
   * @param fileName - The file to map
   * @returns The mapped file
   */
  static mapFile = fileName => {
    return {
      path: fileName,
      uri: FDUtil.toUri(fileName),
      absolutePath: path.resolve(process.cwd(), fileName),
      absoluteUri: FDUtil.toUri(path.resolve(process.cwd(), fileName)),
      name: path.basename(fileName),
      module: path.basename(fileName, path.extname(fileName)),
      extension: path.extname(fileName),
    }
  }

  /**
   * Map a directory to a DirMap
   *
   * @param directoryName - The directory to map
   * @returns The mapped directory
   */
  static mapDirectory = directoryName => {
    return {
      path: directoryName,
      uri: FDUtil.toUri(directoryName),
      absolutePath: path.resolve(process.cwd(), directoryName),
      absoluteUri: FDUtil.toUri(path.resolve(process.cwd(), directoryName)),
      name: path.basename(directoryName),
    }
  }

  /**
   * Retrieve all files matching a specific glob pattern.
   *
   * @param globPattern - The glob pattern(s) to search.
   * @returns Set of file paths.
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
    const files = filesArray.map(file => FDUtil.mapFile(file))

    // Flatten the result and remove duplicates
    return files
  }

  /**
   * Resolves a path to an absolute path
   *
   * @param directoryName - The path to resolve
   * @returns The resolved directory path
   * @throws {Error}
   */
  static resolveDirectory = async directoryName => {
    if(!ValidUtil.string(directoryName, true))
      throw new Error("Path is required")

    const mappedDirectory = FDUtil.mapDirectory(directoryName)
    const stat = await fs.promises.stat(mappedDirectory.absolutePath)

    if(stat.isDirectory())
      return mappedDirectory
  }

  /**
   * Compose a directory map from a path
   *
   * @param dir - The directory
   * @returns The composed directory map
   */
  static composeDirectory = async(dir) => FDUtil.mapDirectory(dir)

  /**
   * Reads the content of a file asynchronously.
   *
   * @param fileObject - The file map containing the file path
   * @returns The file contents
   */
  static readFile = async(fileObject) => {
    const absolutePath = fileObject.absolutePath
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
