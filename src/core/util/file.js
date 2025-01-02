const path = require('path');
const fs = require('fs');

const DataUtil = require('./data');

class FileUtil {
  constructor() {
    this.dataUtil = new DataUtil();
  }

  /**
   * Fix slashes in a path
   * @param {string} path - The path to fix
   * @returns {string} The fixed path
   */
  fixSlashes(path) {
    return path.replace(/\\/g, '/');
  }

  /**
   * Resolves a file to an absolute path
   * @param {string} _path - The path to resolve
   * @param {string} file - The file to resolve
   * @returns {Promise<Map<string, string>>} The resolved file
   * @throws {Error}
   */
  async resolveFile(file) {
    if(!file || typeof file !== 'string')
      throw new Error('File is required');

    const results = await this.getFiles(file);
    if(!results.size)
      throw new Error(`File not found: ${file}`);

    if(results.size > 1)
      throw new Error(`Multiple files found for: ${file}`);

    const result = new Map();
    const match = results.values().next().value;

    result.set("path", this.fixSlashes(path.resolve(match)));
    result.set("name", path.basename(result.get("path")));
    const extension = path.parse(result.get("path")).ext;
    result.set("module", path.basename(result.get("path"), extension));

    return result;
  }

  /**
   * Retrieve all files matching a specific glob pattern.
   * @param {string|string[]} glob - The glob pattern(s) to search.
   * @returns {Promise<Set<string>>} Set of file paths.
   * @throws {Error} Throws an error for invalid input or search failure.
   */
  async getFiles(glob) {
    // Validate input
    if(typeof glob !== 'string' && (!Array.isArray(glob) || !glob.length))
      throw new Error('[getFiles] Invalid glob pattern: Must be a string or a non-empty array of strings.');

    const globbyArray = [];
    if(typeof glob === 'string')
      globbyArray.push(...glob
        .split('|')
        .map(g => g.trim())
        .filter(Boolean)
        .map(g => this.fixSlashes(g)));
    else
      globbyArray.push(...glob.map(g => this.fixSlashes(g)));

    if(Array.isArray(globbyArray) && !this.dataUtil.uniformArray(globbyArray, 'string') && !globbyArray.length)
      throw new Error('[getFiles] Invalid glob pattern: Array must contain only strings.');

    // Use Globby to fetch matching files
    const { globby } = await import('globby');
    const filesArray = await globby(globbyArray);

    // Flatten the result and remove duplicates
    const files = new Set(filesArray.flat());

    return files;
  }

  /**
   * Resolves a path to an absolute path
   * @param {string} _path - The path to resolve
   * @returns {Promise<Map<string, string>>} The resolved path
   * @throws {Error}
   */
  async resolvePath(_path = null) {
    if(!_path)
      throw new Error('Path is required');

    const { globby } = await import('globby');
    const files = await globby([_path], {
      onlyDirectories: true,
      expandDirectories: false
    });

    if(!files.length)
      throw new Error(`Path not found: ${_path}`);

    if(files.length > 1)
      throw new Error(`Multiple paths found for: ${_path}`);

    const file = files.values().next().value;
    console.log(this);
    const resolvedPath = this.fixSlashes(path.resolve(process.cwd(), file));

    return resolvedPath;
  }

  /**
 * Reads the content of a file asynchronously.
  * @param {string} filePath
  * @returns {Promise<string>}
  * @throws {Error}
  */
  async readFile(filePath) {
    try {
      const resolved = this.resolveFile(filePath);
      const content = await fs.promises.readFile(resolved.get("path"), 'utf8');
      return content;
    } catch(error) {
      throw new Error(`[readFile] Failed to read file: ${filePath}, ${error.message}`);
    }
  }
};

module.exports = FileUtil;
