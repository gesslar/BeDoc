const path = require('path');
const fs = require('fs');

class Util {
  /**
   * Wraps text to a specified width
   * @param {string} str - The text to wrap
   * @param {number} wrapAt - The column at which to wrap the text
   * @param {number} indentAt - The number of spaces to indent wrapped lines
   * @returns {string} The wrapped text
   */
  static wrap(str, wrapAt = 80, indentAt = 0) {
    const sections = str.split('\n').map(section => {
      let parts = section.split(' ');
      let inCodeBlock = false;
      let isStartOfLine = true;  // Start of each section is start of line

      // Preserve leading space if it existed
      if(section[0] === ' ') {
        parts = ['', ...parts];
      }

      let running = 0;

      parts = parts.map(part => {
        // Only check for code block if we're at start of line
        if(isStartOfLine && /^```(?:\w+)?$/.test(part)) {
          inCodeBlock = !inCodeBlock;
          running += (part.length + 1);
          isStartOfLine = false;
          return part;
        }

        if(part[0] === '\n') {
          running = 0;
          isStartOfLine = true;  // Next part will be at start of line
          return part;
        }

        running += (part.length + 1);
        isStartOfLine = false;   // No longer at start of line

        if(!inCodeBlock && running >= wrapAt) {
          running = part.length + indentAt;
          isStartOfLine = true;  // After newline, next part will be at start
          return '\n' + ' '.repeat(indentAt) + part;
        }

        return part;
      });

      return parts.join(' ')
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n');
    });

    return sections.join('\n');
  }

  static fixSlashes(path) {
    return path.replace(/\\/g, '/');
  }

  /**
   * Resolves a path to an absolute path
   * @param {string} _path - The path to resolve
   * @returns {string} The resolved path
   * @throws {Error}
   */
  static async resolvePath(_path = null) {
    if(!_path)
      throw new Error('Path is required');

    const {globby} = await import('globby');
    const files = await globby([_path], {
      onlyDirectories: true,
      expandDirectories: false
    });

    if(!files.length)
      throw new Error(`Path not found: ${_path}`);

    if(files.length > 1)
      throw new Error(`Multiple paths found for: ${_path}`);

    const file = files.values().next().value;
    const resolvedPath = Util.fixSlashes(path.resolve(process.cwd(), file));

    return resolvedPath;
  }

  /**
   * Resolves a file to an absolute path
   * @param {string} _path - The path to resolve
   * @param {string} file - The file to resolve
   * @returns {Map<string, string>} The resolved file
   * @throws {Error}
   */
  static async resolveFile(file) {
    if(!file || typeof file !== 'string')
      throw new Error('File is required');

    const results = await Util.getFiles(file);
    if(!results.size)
      throw new Error(`File not found: ${file}`);

    if(results.size > 1)
      throw new Error(`Multiple files found for: ${file}`);

    const result = new Map();
    const match = results.values().next().value;

    result.set("path", Util.fixSlashes(path.resolve(match)));
    result.set("name", path.basename(result.get("path")));
    const extension = path.parse(result.get("path")).ext;
    result.set("module", path.basename(result.get("path"), extension));

    return result;
  }

  /**
   * Capitalizes the first letter of a string
   * @param {string} str - The string to capitalize
   * @returns {string} The capitalized string
   */
  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Uncapitalizes the first letter of a string
   * @param {string} str - The string to uncapitalize
   * @returns {string} The uncapitalized string
   */
  static uncapitalize(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Checks if all elements in an array are of a specified type
   * @param {Array} arr - The array to check
   * @param {string} type - The type to check for
   * @returns {boolean} Whether all elements are of the specified type
   */
  static uniformArray(arr, type) {
    return arr.every(item => typeof item === type);
  }

  /**
   * Retrieve all files matching a specific glob pattern.
   * @param {string|string[]} glob - The glob pattern(s) to search.
   * @returns {Promise<Set<string>>} Set of file paths.
   * @throws {Error} Throws an error for invalid input or search failure.
   */
  static async getFiles(glob) {
    // Validate input
    if(typeof glob !== 'string' && (!Array.isArray(glob) || !glob.length))
      throw new Error('[getFiles] Invalid glob pattern: Must be a string or a non-empty array of strings.');

    const globbyArray = [];
    if(typeof glob === 'string')
      globbyArray.push(...glob
        .split('|')
        .map(g => g.trim())
        .filter(Boolean)
        .map(g => Util.fixSlashes(g)));
    else
      globbyArray.push(...glob.map(g => Util.fixSlashes(g)));

    if(Array.isArray(globbyArray) && !Util.uniformArray(globbyArray, 'string') && !globbyArray.length)
      throw new Error('[getFiles] Invalid glob pattern: Array must contain only strings.');

    // Use Globby to fetch matching files
    const {globby} = await import('globby');
    const filesArray = await globby(globbyArray);

    // Flatten the result and remove duplicates
    const files = new Set(filesArray.flat());

    return files;
  }

  /**
   * Reads the content of a file asynchronously.
   * @param {string} filePath
   * @returns {Promise<string>}
   * @throws {Error}
   */
  static async readFile(filePath) {
    try {
      const resolved = await Util.resolveFile(filePath);
      const content = await fs.promises.readFile(resolved.get("path"), 'utf8');
      return content;
    } catch(error) {
      throw new Error(`[readFile] Failed to read file: ${filePath}, ${error.message}`);
    }
  }

  static fixSlashes(path) {
    return path.replace(/\\/g, '/');
  }

  static newFile(filePath) {
    return new (class File {
      constructor(init) {
        this.isSetup = false;
        Object.assign(this, init);
      }

      static async new(filePath) {
        const resolvedFile = await Util.resolveFile(filePath);
        const content = await Util.readFile(resolvedFile.get("path"));

        const init = {
          ...Object.fromEntries(resolvedFile),
          content,
          ...(path.parse(content.get("path"))),
        };

        const instance = new File(init);
        instance.isSetup = true;
        return instance;
      }

      async read() {
        return await Util.readFile(this.path);
      }

      async write(content) {
        return await Util.writeFile(this.path, content);
      }
    })(filePath);
  }

  static clone(obj, freeze = false) {
    const clone = JSON.parse(JSON.stringify(obj));

    if(freeze)
      Object.freeze(clone);

    return clone;
  }

  static isMap(value) {
    return value instanceof Map;
  }

  static mapToObject(map) {
    const result = {};
    map.forEach((value, key) => {
      result[key] = Util.isMap(value) ? Util.mapToObject(value) : value;
    });

    return result;
  }

  static objectToMap(obj) {
    return new Map(Object.entries(obj));
  }

  static serializeMap(map, indent = 0) {
    return JSON.stringify(Util.mapToObject(map), null, indent);
  }

  static unserializeMap(str) {
    return Util.objectToMap(JSON.parse(str));
  }

}

module.exports = Util;
