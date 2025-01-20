import {allocateObject, isArrayUniform, isType, validType} from "#util"
import fs from "fs"
import {globby} from "globby"
import path from "node:path"
import process from "node:process"
import {fileURLToPath, pathToFileURL} from "node:url"

const freeze = ob => Object.freeze(ob)
const fdTypes = freeze(["file", "directory"])
const upperFdTypes = freeze(fdTypes.map(type => type.toUpperCase()))
const fdType = freeze(await allocateObject(upperFdTypes, fdTypes))

/**
 * Fix slashes in a path
 * @param {string} pathName - The path to fix
 * @returns {string} The fixed path
 */
function fixSlashes(pathName) {
  return pathName.replace(/\\/g, "/")
}

/**
 * Convert a path to a URI
 * @param {string} pathName - The path to convert
 * @returns {string} The URI
 * @throws {Error} If the path is not a valid file path
 */
function pathToUri(pathName) {
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
function uriToPath(pathName) {
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
function resolveFilename(fileName, directoryObject = null) {
  validType(fileName, "string", {allowEmpty: false}, 1)

  fileName = uriToPath(fileName)
  const fixedFileName = fixSlashes(fileName)
  const directoryNamePart = fixedFileName.split("/").slice(0, -1).join("/")
  const fileNamePart = fixedFileName.split("/").pop()
  if(!directoryObject)
    directoryObject = resolveDirectory(directoryNamePart)

  const fileObject = composeFilename(directoryObject, fileNamePart)
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
function composeFilename(directoryNameorObject, fileName) {
  let dirObject

  if(isType(directoryNameorObject, "string|string[]")) {
    dirObject = composeDirectory(directoryNameorObject)
  } else {
    if(!directoryNameorObject.isDirectory)
      throw new Error("Directory object is not a directory")

    dirObject = directoryNameorObject
  }

  fileName = path.resolve(dirObject.path, fileName)

  return mapFilename(fileName)
}

/**
 * Map a file to a FileMap
 * @param {string} fileName - The file to map
 * @returns {object} A file object
 */
function mapFilename(fileName) {
  return {
    path: fileName,
    uri: pathToUri(fileName),
    absolutePath: path.resolve(process.cwd(), fileName),
    absoluteUri: pathToUri(path.resolve(process.cwd(), fileName)),
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
function mapDirectory(directoryName) {
  return {
    path: directoryName,
    uri: pathToUri(directoryName),
    absolutePath: path.resolve(process.cwd(), directoryName),
    absoluteUri: pathToUri(path.resolve(process.cwd(), directoryName)),
    name: path.basename(directoryName),
    separator: path.sep,
    isFile: false,
    isDirectory: true,
  }
}

/**
 * Deconstruct a filename into parts
 * @param {string} fileName - The filename to deconstruct
 * @returns {object} The filename parts
 */
function deconstructFilenameToParts(fileName) {
  const {basename, dirname, extname} = path.parse(fileName)

  return {basename, dirname, extname}
}

/**
 * Retrieve all files matching a specific glob pattern.
 * @param {string|string[]} globPattern - The glob pattern(s) to search.
 * @returns {Promise<object[]>} An array of file objects
 * @throws {Error} Throws an error for invalid input or search failure.
 */
async function getFiles(globPattern) {
  // Validate input
  validType(globPattern, "string|string[]", {allowEmpty: false})

  const globbyArray = (
    isType(globPattern, "array")
      ? globPattern
      : globPattern
        .split("|")
        .map(g => g.trim())
        .filter(Boolean)
  )
    .map(g => fixSlashes(g))

  if(Array.isArray(globbyArray) && isArrayUniform(globbyArray, "string", true) && !globbyArray.length)
    throw new Error("[getFiles] Invalid glob pattern: Array must contain only strings.")

  // Use Globby to fetch matching files
  const filesArray = await globby(globbyArray)
  const files = filesArray.map(file => mapFilename(file))

  // Flatten the result and remove duplicates
  return files
}

/**
 * Resolves a path to an absolute path
 * @param {string} directoryName - The path to resolve
 * @returns {object} The directory object
 * @throws {Error}
 */
function resolveDirectory(directoryName) {
  validType(directoryName, "string", true)

  const directoryObject = mapDirectory(directoryName)
  fs.opendirSync(directoryObject.absolutePath).closeSync()

  return directoryObject
}

/**
 * Compose a directory map from a path
 * @param {string} directory - The directory
 * @returns {object} A directory object
 */
function composeDirectory(directory) {
  return mapDirectory(directory)
}

/**
 * Lists the contents of a directory.
 * @param {string} directory - The directory to list.
 * @returns {Promise<{files: object[], directories: object[]}>} The files and
 * directories in the directory.
 */
async function ls(directory) {
  const found = await fs.promises.readdir(directory, {withFileTypes: true})
  const results = await Promise.all(found.map(async dirent => {
    const fullPath = path.join(directory, dirent.name)
    const stat = await fs.promises.stat(fullPath)
    return {dirent, stat, fullPath}
  }))

  const files = results
    .filter(({stat}) => stat.isFile())
    .map(({fullPath}) => mapFilename(fullPath))

  const directories = results
    .filter(({stat}) => stat.isDirectory())
    .map(({fullPath}) => mapDirectory(fullPath))

  return {files, directories}
}

/**
 * Reads the content of a file synchronously.
 * @param {object} fileObject - The file map containing the file path
 * @returns {Promise<string>} The file contents
 */
function readFile(fileObject) {
  const {absolutePath} = fileObject
  if(!absolutePath)
    throw new Error("No absolute path in file map")

  const content = fs.readFileSync(absolutePath, "utf8")
  return content
}

/**
 * Writes content to a file synchronously.
 * @param {object} fileObject - The file map containing the file path
 * @param {string} content - The content to write
 * @returns {Promise<void>}
 */
function writeFile(fileObject, content) {
  const absolutePath = fileObject.absolutePath
  if(!absolutePath) throw new Error("No absolute path in file map")
  return fs.writeFileSync(absolutePath, content, "utf8")
}

export {
  // Constants
  fdType,
  fdTypes,
  // Functions
  composeDirectory,
  composeFilename,
  deconstructFilenameToParts,
  fixSlashes,
  getFiles,
  ls,
  mapDirectory,
  mapFilename,
  pathToUri,
  readFile,
  resolveDirectory,
  resolveFilename,
  uriToPath,
  writeFile,
}
