import path from "path";
import fs from "fs";
import { globby } from "globby";

import DataUtil from "./data.js";
import ValidUtil from "./valid.js";
import { FileMap, DirMap, TYPE } from "../types/fd.js";

export default class FDUtil {
  private data: DataUtil;
  private valid: ValidUtil;

  constructor() {
    this.data = new DataUtil();
    this.valid = new ValidUtil();
  }

  /**
   * Fix slashes in a path
   *
   * @param pathName - The path to fix
   * @returns The fixed path
   */
  fixSlashes = (pathName: string): string => pathName.replace(/\\/g, "/");

  /**
   * Convert a path to a URI
   *
   * @param pathName - The path to convert
   * @returns The URI
   */
  toUri = (pathName: string): string => `file://${this.fixSlashes(pathName)}`;

  /**
   * Resolves a file to an absolute path
   *
   * @param globPattern - The file to resolve
   * @returns The resolved file
   * @throws {Error}
   */
  resolveFile = async (globPattern: string | string[]): Promise<FileMap> => {
    if (!this.valid.string(globPattern, true))
      throw new Error("File is required");

    const files = await globby(globPattern);

    if (!files)
      throw new Error(`File not found: ${globPattern}`);

    if (!files.length)
      throw new Error(`File not found: ${globPattern}`);

    if (files.length > 1)
      throw new Error(`Multiple files found for: ${globPattern}`);

    const pathName = files[0];
    const extension = path.extname(pathName);
    const name = path.basename(pathName);
    const moduleName = path.basename(pathName, extension);
    const resolved = this.toUri(pathName);
    const absolutePath = path.resolve(process.cwd(), pathName);
    const absoluteUri = this.toUri(absolutePath);

    return {
      path: pathName,
      uri: resolved,
      absolutePath: absolutePath,
      absoluteUri: absoluteUri,
      name: name,
      module: moduleName,
      extension: extension,
    };
  };

  /**
   * Compose a file path from a directory and a file
   *
   * @param dir - The directory
   * @param file - The file
   * @returns The composed file path
   */
  composeFilename = async (dir: string, file: string): Promise<FileMap> => {
    const dirObject = await this.composeDir(dir);
    const fileName = path.resolve(dirObject.path, file);

    const pathName = fileName;
    const extension = path.extname(pathName);
    const name = path.basename(pathName);
    const moduleName = path.basename(pathName, extension);
    const resolved = this.toUri(pathName);
    const absolutePath = path.resolve(process.cwd(), pathName);
    const absoluteUri = this.toUri(absolutePath);

    return {
      path: `${dirObject.uri}/${name}`,
      uri: resolved,
      absolutePath: absolutePath,
      absoluteUri: absoluteUri,
      name: name,
      module: moduleName,
      extension: extension,
    };
  };

  /**
   * Retrieve all files matching a specific glob pattern.
   *
   * @param globPattern - The glob pattern(s) to search.
   * @returns Set of file paths.
   * @throws {Error} Throws an error for invalid input or search failure.
   */
  getFiles = async (globPattern: string | string[]): Promise<string[]> => {
    // Validate input
    if (!this.valid.string(globPattern, true) && !this.valid.array(globPattern, true))
      throw new Error("[getFiles] Invalid glob pattern: Must be a string or a non-empty array of strings.");

    const globbyArray: string[] = [];
    if (this.valid.string(globPattern)) {
      globbyArray.push(...(globPattern as string)
        .split("|")
        .map(g => g.trim())
        .filter(Boolean)
        .map(g => this.fixSlashes(g)));
    } else {
      globbyArray.push(...(globPattern as string[]));
    }

    if (Array.isArray(globbyArray) && !this.valid.arrayUniform(globbyArray, "string", true) && !globbyArray.length)
      throw new Error("[getFiles] Invalid glob pattern: Array must contain only strings.");

    // Use Globby to fetch matching files
    const filesArray = await globby(globbyArray);

    // Flatten the result and remove duplicates
    return filesArray.flat();
  };

  /**
   * Resolves a path to an absolute path
   *
   * @param globPattern - The path to resolve
   * @returns The resolved path
   * @throws {Error}
   */
  resolveDir = async (globPattern: string): Promise<DirMap> => {
    if (!this.valid.string(globPattern, true))
      throw new Error("Path is required");

    const dirs = await globby([globPattern], {
      onlyDirectories: true,
      expandDirectories: false
    });

    if (!dirs)
      throw new Error(`Path not found: ${globPattern}`);

    if (!dirs.length)
      throw new Error(`Path not found: ${globPattern}`);

    if (dirs.length > 1)
      throw new Error(`Multiple paths found for: ${globPattern}`);

    const pathName = dirs.values().next().value;
    if (!pathName)
      throw new Error(`Path not found: ${globPattern}`);

    const resolvedPath = this.toUri(path.resolve(process.cwd(), pathName));

    return {
      path: pathName,
      uri: resolvedPath,
    };
  };

  /**
   * Compose a directory map from a path
   *
   * @param dir - The directory
   * @returns The composed directory map
   */
  composeDir = async (dir: string): Promise<DirMap> => {
    const resolvedPath = this.toUri(dir);
    return {
      path: dir,
      uri: resolvedPath,
    };
  };

  /**
   * Reads the content of a file asynchronously.
   *
   * @param fileObject - The file map containing the file path
   * @returns The file contents
   */
  readFile = async (fileObject: FileMap): Promise<string> => {
    const absolutePath = fileObject.absolutePath;
    if (!absolutePath) throw new Error("No absolute path in file map");
    return await fs.promises.readFile(absolutePath, "utf8");
  };

  /**
   * Writes content to a file asynchronously.
   *
   * @param fileObject - The file map containing the file path
   * @param content - The content to write
   */
  writeFile = async (fileObject: FileMap, content: string): Promise<void> => {
    const absolutePath = fileObject.absolutePath;
    if (!absolutePath) throw new Error("No absolute path in file map");
    return await fs.promises.writeFile(absolutePath, content, "utf8");
  };
}
