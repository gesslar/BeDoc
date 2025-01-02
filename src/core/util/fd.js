import path from "path";
import fs from "fs";
import { globby }from "globby";

import DataUtil from "./data.js";
import ValidUtil from "./valid.js";

export default class FDUtil {
  constructor() {
    this.data = new DataUtil();
    this.valid = new ValidUtil();
  }

  /**
   * Fix slashes in a path
   * @param {string} pathName - The path to fix
   * @returns {string} The fixed path
   */
  fixSlashes = pathName => pathName.replace(/\\/g, "/");

  /**
   * Convert a path to a URI
   * @param {string} pathName - The path to convert
   * @returns {string} The URI
   */
  toUri = pathName => `file://${this.fixSlashes(pathName)}`;

  /**
   * Resolves a file to an absolute path
   * @param {string} globPattern - The file to resolve
   * @returns {Promise<Map<string, string>>} The resolved file
   * @throws {Error}
   */
  resolveFile = async globPattern => {
    console.debug(`[resolveFile] Resolving glob pattern: ${globPattern}`);
    if(!this.valid.string(globPattern, true))
      throw new Error("File is required");

    const files = await globby([globPattern]);

    console.debug(`[resolveFile] Files: ${files}`);

    if(!files.length)
      throw new Error(`File not found: ${globPattern}`);

    if(files.size > 1)
      throw new Error(`Multiple files found for: ${globPattern}`);

    const pathName = files[0];
    const extension = path.extname(pathName);
    const name = path.basename(pathName);
    const moduleName = path.basename(pathName, extension);
    const resolved = this.toUri(pathName);
    const absolutePath = path.resolve(process.cwd(), pathName);
    const absoluteUri = this.toUri(absolutePath);

    const result = new Map([
      ["path", pathName],
      ["uri", resolved],
      ["absolutePath", absolutePath],
      ["absoluteUri", absoluteUri],
      ["name", name],
      ["module", moduleName],
      ["extension", extension],
    ]);
    console.debug("[resolveFile] Result", result);
    return result;
  }

  /**
   * Compose a file path from a directory and a file
   * @param {string} dir - The directory
   * @param {string} file - The file
   * @returns {Promise<Map<string, string>>} The composed file path
   */
  composeFile = async(dir, file) => {
    const dirMap = await this.composeDir(dir);
    console.debug(`[composeFile] dirMap`, dirMap);
    const fileName = path.resolve(dirMap.get("path"), file);

    console.debug(`[composeFile] fileName: ${fileName}`);

    const pathName = fileName;
    const extension = path.extname(pathName);
    const name = path.basename(pathName);
    const moduleName = path.basename(pathName, extension);
    const resolved = this.toUri(pathName);
    const absolutePath = path.resolve(process.cwd(), pathName);
    const absoluteUri = this.toUri(absolutePath);

    const result = new Map([
      ["path", `${dirMap.get("uri")}/${name}`],
      ["uri", resolved],
      ["absolutePath", absolutePath],
      ["absoluteUri", absoluteUri],
      ["name", name],
      ["module", moduleName],
      ["extension", extension],
    ]);

    console.debug("[composeFile] Result", result);
    return result;
  }
  /**
   * Retrieve all files matching a specific glob pattern.
   * @param {string|string[]} globPattern - The glob pattern(s) to search.
   * @returns {Promise<Set<string>>} Set of file paths.
   * @throws {Error} Throws an error for invalid input or search failure.
   */
  getFiles = async globPattern => {
    console.debug(`[getFiles] globPattern: ${globPattern}`);

    // Validate input
    if(!this.valid.string(globPattern, true) && !this.valid.array(globPattern, true))
      throw new Error("[getFiles] Invalid glob pattern: Must be a string or a non-empty array of strings.");

    const globbyArray = [];
    if(this.valid.string(globPattern))
      globbyArray.push(...globPattern
        .split("|")
        .map(g => g.trim())
        .filter(Boolean)
        .map(g => this.fixSlashes(g)));
    else
      globbyArray.push(...globPattern);

    console.debug(`[getFiles] globbyArray: ${globbyArray}`);

    if(Array.isArray(globbyArray) && !this.valid.arrayUniform(globbyArray, "string", true) && !globbyArray.length)
      throw new Error("[getFiles] Invalid glob pattern: Array must contain only strings.");

    // Use Globby to fetch matching files
    const filesArray = await globby(globbyArray);
    console.debug(`[getFiles] filesArray: ${filesArray}`);

    // Flatten the result and remove duplicates
    const files = new Set(filesArray.flat());

    return files;
  }

  /**
   * Resolves a path to an absolute path
   * @param {string} globPattern - The path to resolve
   * @returns {Promise<Map<string, string>>} The resolved path
   * @throws {Error}
   */
  resolveDir = async globPattern => {
    if(!this.valid.string(globPattern, true))
      throw new Error("Path is required");

    console.debug(`[resolveDir] globPattern: ${globPattern}`);

    const dirs = await globby([globPattern], {
      onlyDirectories: true,
      expandDirectories: false
    });

    console.debug(`[resolveDir] dirs: ${dirs}`);

    if(!dirs.length)
      throw new Error(`Path not found: ${globPattern}`);

    if(dirs.length > 1)
      throw new Error(`Multiple paths found for: ${globPattern}`);

    const pathName = dirs.values().next().value;
    const resolvedPath = this.toUri(path.resolve(process.cwd(), pathName));

    const result = new Map([
      ["path", pathName],
      ["uri", resolvedPath],
    ]);

    console.debug("[resolveDir] Result", result);

    return result;
  }

  /**
   * Compose a directory map from a path
   * @param {string} dir - The directory
   * @returns {Promise<Map<string, string>>} The composed directory map
   */
  composeDir = async dir =>
    new Map([
      ["path", dir],
      ["uri", this.toUri(dir)],
    ]);

  /**
   * Reads the content of a file asynchronously.
   * @param {string} filePath
   * @returns {Promise<undefined>}
   */
  readFile = async fileMap => {
    const absolutePath = fileMap.get("absolutePath");
    console.debug(`[readFile] absolutePath: ${absolutePath}`);
    return await fs.promises.readFile(absolutePath, "utf8");
  }

  /**
   * Writes content to a file asynchronously.
   * @param {string} filePath
   * @param {string} content
   * @returns {Promise<void>}
   */
  writeFile = async(fileMap, content) => {
    const absolutePath = fileMap.get("absolutePath");
    console.debug(`[writeFile] absolutePath: ${absolutePath}`);
    return await fs.promises.writeFile(absolutePath, content, "utf8");
  }
};
