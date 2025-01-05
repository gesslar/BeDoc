import path from "path"
import fs from "fs"
import {globby} from "globby"
import mm from "micromatch"

import DataUtil from "./DataUtil.js"
import ValidUtil from "./ValidUtil.js"
import micromatch from "micromatch"

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
  static resolveFile = async(globPattern) => {
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
  static composeFile = async(dir, file) => {
    const dirObject = await FDUtil.composeDirectory(dir)
    const fileName = path.resolve(dirObject.path, file)

    return FDUtil.mapFile(fileName)
  }

  /**
   * Map a file to a FileMap
   *
   * @param file - The file to map
   * @returns The mapped file
   */
  static mapFile = file => {
    return {
      path: file,
      uri: FDUtil.toUri(file),
      absolutePath: path.resolve(process.cwd(), file),
      absoluteUri: FDUtil.toUri(path.resolve(process.cwd(), file)),
      name: path.basename(file),
      module: path.basename(file, path.extname(file)),
      extension: path.extname(file),
    }
  }

  /**
   * Map a directory to a DirMap
   *
   * @param dir - The directory to map
   * @returns The mapped directory
   */
  static mapDirectory = dir => {
    return {
      path: dir,
      uri: FDUtil.toUri(dir),
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
   * @param pattern - The path to resolve
   * @returns The resolved directory path
   * @throws {Error}
   */
  static resolveDirectory = async(pattern) => {
    if(!ValidUtil.string(pattern, true))
      throw new Error("Path is required")

    const dirs = await globby([pattern], {
      onlyDirectories: true,
      expandDirectories: false,

    })

    if(!dirs)
      throw new Error(`Path not found: ${pattern}`)

    if(!dirs.length)
      throw new Error(`Path not found: ${pattern}`)

    if(dirs.length > 1)
      throw new Error(`Multiple paths found for: ${pattern}`)

    const pathName = dirs.values().next().value
    if(!pathName)
      throw new Error(`Path not found: ${pattern}`)

    return FDUtil.mapDirectory(pathName)
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
