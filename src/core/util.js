const path = require('path');

class Util {
  /**
   * Wraps text to a specified width
   * @param { string } str The text to wrap
   * @param { number } wrapAt The column at which to wrap the text
   * @param { number } indentAt The number of spaces to indent wrapped lines
   * @returns { string } The wrapped text
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

  /**
   * Resolves a path to an absolute path
   * @param {string} _path - The path to resolve
   * @returns {string} The resolved path
   */
  static resolvePath(_path = null) {
    if(!_path)
      throw new Error('Path is required');

    return path.resolve(process.cwd(), _path);
  }

  /**
   * Resolves a file to an absolute path
   * @param {string} _path - The path to resolve
   * @param {string} file - The file to resolve
   * @returns {string} The resolved path
   */
  static resolveFile(_path, file) {
    if(!file || typeof file !== 'string')
      throw new Error('File is required');

    const resolvedPath = path.resolve(_path, file);
    const pathParts = path.parse(resolvedPath);
    const modName = pathParts.name;

    return {
      name: file,
      path: resolvedPath,
      module: modName
    };
  }

  isObject(value) {
    return typeof value === 'object' && value !== null;
  }
}

module.exports = Util;
