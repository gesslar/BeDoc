const path = require('path');

/**
 * The meta information for this parser.
 */
const meta = {
  // Parser information
  language: "lpc",
  languageExtension: ".c",
  // Printer information
  format: "text",
  formatExtension: ".txt",
};

class Printer {
  constructor(core) {
    this.core = core;
  }

  /**
   * @param {string} module
   * @param {Object} content
   */
  async print(module, content) {
    return {
      status: 'success',
      message: 'File printed successfully',
      destFile: `${module}${meta.formatExtension}`,
      content: JSON.stringify(content, null, 2),
    }
  }
};

/**
 * A class that represents a function and all of its documentation.
 */
class Func {
  constructor() {}

  param = [];
  return = [];
  description = [];
  example = [];
  meta = [];
};

// TODO: add pattern for optional @meta checking
const patterns = {
  commentStart: /^\s*\/\*\*(.*)$/, // Match start of a docblock
  commentEnd: /^\s*\*\/\s*$/, // Match end of a docblock
  commentContinuation: /^\s*\*\s?(?<content>.*)$/, // Match continuation of a docblock
  // function: /^\s*(?:public|protected|private)?\s*(?:nomask|varargs)?\s*(?:nomask|varargs)?\s*(?:int|float|void|string|object|mixed|mapping|array|buffer|function)\s*\*?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
  functionPattern: /^\s*(?<access>public|protected|private)?\s*(?<modifier1>nomask|varargs)?\s*(?<modifier2>nomask|varargs)?\s*(?<type>int|float|void|string|object|mixed|mapping|array|buffer|function)\s*\*?\s*(?<name>[a-zA-Z_][a-zA-Z0-9_]*)\s*\((?<arglist>.*)\)\s*\{$/,
  blankLine: /^\s*$/, // Match blank lines
  argArray: /\w+(\s*\[\s *\]\s *)?/,
  tagContent: /^\{(?<type>.*)\}\s+(?<name>\w+)\s+-\s+(?<content>.*)$/,
  returnContent: /^\{(?<type>[^}]*)\}(?:\s+-\s*(?<content>.*))?$/,
};

const tags = {
  all: new Set(["brief", "description", "param", "returns?", "example", "meta", "name"]),
  multiline: new Set(["description", "example"]),
  convert: { returns: "return" },
  normalize: tag => {
    // Convert 'returns' to 'return' if needed
    return tags.convert[tag] || tag;
  },
  isValid: tag => {
    return tags.all.has(tag) ||
      Object.keys(tags.convert).includes(tag) ||
      Object.values(tags.convert).includes(tag);
  },
};

/**
 * A class that parses LPC code and extracts documentation.
 */
class Parser {
  /**
   * @param {Object} core
   */
  constructor(core) {
    this._resetState();
    this.core = core;
    this.regex = {
      ...patterns,
      tag: new RegExp(`^\\s*\\*\\s+@(?<tag>${[...tags.all].join('|')})\\s?(?<content>.*)$`),
    },
    this.multilineTags = tags.multiline;
  }

  _resetState() {
    this.processingComment = false;
    this.processingMultiline = false;
    this.currentTag = null;
  }

  /**
   * @param {Object} content
   */
  parse(file, content) {
    this._resetState();

    try {
      const lines = content.split(/\r?\n/);
      const funcs = {};
      let func = null;
      const result = {};
      let position = 0, length = lines.length;

      for(position; position < length; position++) {
        const line = lines[position];
        const lineTrimmed = line.trim();

        // Skip empty lines unless we're processing a multiline tag, which
        // might have them for formatting reasons.
        if(!this.processingMultiline && !lineTrimmed.length)
          continue;

        // Check for start of doc comment block
        if(this.isCommentStart(lineTrimmed)) {
          // Restart with a new function
          func = this.newFunction();
        } else if(this.isCommentEnd(lineTrimmed)) {
          this._resetState();
          continue;
        } else if(this.isFunctionLine(lineTrimmed)) {
          const {success, message} = this.determineFunctionName(lineTrimmed);
          if(success)
            funcs[message] = func;
          else
            return {success: false, error: true, file, line, lineNumber: position+1, message};
          continue;
        }

        if(this.processingComment) {
          const processed = this.processLine(line, func);
          const {success, message} = processed;
          if(!success)
            return {success: false, error: true, file, line, lineNumber: position+1, message};
        }
      }

      result.funcs = funcs;

      return {success: true, result};
    } catch(e) {
      console.log(e);
      return {success: false, error: true, file, line: null, lineNumber: null, message: e.message};
    }
  }

  /**
   * @param {string} line
   */
  isCommentStart(line) {
    // Only consider it a new doc block start if we're not already in a comment
    return !this.processingComment && this.regex.commentStart.test(line);
  }

  /**
   * @param {string} line
   */
  isCommentEnd(line) {
    return this.processingComment && this.regex.commentEnd.test(line);
  }

  /**
   * @param {string} line
   */
  newFunction() {
    this._resetState();
    this.processingComment = true;
    return new Func();
  }

  /**
   * @param {string} line
   * @param {Func} func
   */
  processLine(line, func) {
    const lineTrimmed = line.trim();

    if(!func)
      return {success: false, message: 'No function context'};

    /*
    // TO COME BACK TO
    // Match @meta tag
    const metaMatch = lineTrimmed.match(patterns.tags.meta);
    if(metaMatch) {
      func.meta = metaMatch[1];
      return;
    }
    */

    const tagMatches = this.regex.tag.exec(line);
    if(tagMatches) {
      // We found a new tag while processing a multiline tag, so we need to
      // reset the state. If we encounter a new multiline tag, it will be
      // set to the new tag.
      this.processingMultiline = false;

      const {tag, content} = tagMatches.groups;
      func[tag] = func[tag] || [];

      this.currentTag = tag;

      if(tags.multiline.has(tag)) {
        this.processingMultiline = true;
        // Multiline tags may include information on the same line as the tag,
        // but it also might not.
        if(content)
          func[tag].push(content);
      } else {
        if(tag === 'return') {
          const tagContentMatches = this.regex.returnContent.exec(content);
          if(tagContentMatches) {
            const {type, content} = tagContentMatches.groups;
            if(!type)
              return {success: false, message: `Missing return type`};
            func[tag].push({type, content});
          } else
            return {success: false, message: `Failed to parse return tag`};
        } else {
          const tagContentMatches = this.regex.tagContent.exec(content);
          if(tagContentMatches) {
            const {type, name, content} = tagContentMatches.groups;
            if(!type)
              return {success: false, message: `Missing tag type`};
            if(!name)
              return {success: false, message: `Missing tag name`};
            func[tag].push({type, name, content});
          } else {
            func[tag].push(content);
          }
        }
      }
      return {success: true, message: 'Processed tag'};
    }

    // Process multiline content(for tags like @example)
    if(this.currentTag) {
      const currentTag = this.currentTag;

      func[currentTag] = func[currentTag] || [];

      const tagMatch = this.regex.commentContinuation.exec(lineTrimmed);
      if(tagMatch && tagMatch.groups?.content) {
        func[currentTag].push(tagMatch.groups.content);
      } else {
        func[currentTag].push("");
      }
      return {success: true, message: 'Processed tag continuation'};
    }

    // If not a special tag, treat as description
    const descMatch = this.regex.commentContinuation.exec(lineTrimmed);
    if(descMatch && descMatch.groups?.content) {
      func.description.push(descMatch.groups.content);
      return {success: true, message: 'Processed description'};
    } else {
      func.description.push("");
      return {success: true, message: 'Processed description'};
    }
  }

  /**
   * @param {string} line
   */
  isFunctionLine(line) {
    return !this.processingComment && this.regex.functionPattern.test(line);
  }

  /**
   * @param {string} line
   * @param {Func} func
   */
  determineFunctionName(line) {
    const match = this.regex.functionPattern.exec(line);

    if(match) {
      const access = match.groups?.access || "public";
      const modifiers = [match.groups?.modifier1, match.groups?.modifier2].filter(modifier => modifier !== undefined);
      const type = match.groups?.type;
      const name = match.groups?.name;

      if(!name)
        return {success: false, message: `Failed to extract function name from line: ${line}`};

      return {success: true, message: name};
    } else {
      return {success: false, message: `Failed to finalize function: ${JSON.stringify(match)}, line: ${line}`};
    }
  }
};

module.exports = { meta, Parser, Printer };
