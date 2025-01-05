/**
 * The meta information for this parser.
 */
const meta = Object.freeze({
  language: "lpc",
  languageExtension: ".c",
})

// TODO: add pattern for optional @meta checking
const patterns = {
  commentStart: /^\s*\/\*\*(.*)$/, // Match start of a docblock
  commentEnd: /^\s*\*\/\s*$/, // Match end of a docblock
  commentContinuation: /^\s*\*\s?(?<content>.*)$/, // Match continuation of a docblock
  functionPattern: /^\s*(?<access>public|protected|private)?\s*(?<modifier1>nomask|varargs)?\s*(?<modifier2>nomask|varargs)?\s*(?<type>int|float|void|string|object|mixed|mapping|array|buffer|function)\s*\*?\s*(?<name>[a-zA-Z_][a-zA-Z0-9_]*)\s*\((?<arglist>.*)\)\s*\{$/,
  blankLine: /^\s*$/, // Match blank lines
  argArray: /\w+(\s*\[\s *\]\s *)?/,
  tagContent: /^\{(?<type>.*)\}\s+(?<name>\w+)\s+-\s+(?<content>.*)$/,
  returnContent: /^\{(?<type>[^}]*)\}(?:\s+-\s*(?<content>.*))?$/,
}

const tags = {
  all: ["brief", "description", "param", "returns?", "example", "meta", "name"],
  singletons: ["name", "return", "description", "example", "meta"],
  convert: { returns: "return" },
  normalize: tag => {
    // Convert 'returns' to 'return' if needed
    return tags.convert[tag] || tag
  },
  isValid: tag => {
    return tags.all.includes(tag) ||
      Object.keys(tags.convert).includes(tag) ||
      Object.values(tags.convert).includes(tag)
  },
}

/**
 * A class that parses LPC code and extracts documentation.
 */
class Parser {
  /**
   * @param {Object} core
   */
  constructor(core) {
    this._resetState()
    this.core = core
    this.regex = {
      ...patterns,
      tag: new RegExp(`^\\s*\\*\\s+@(?<tag>${[...tags.all].join("|")})\\s?(?<content>.*)$`),
    }
  }

  _resetState() {
    this.processingComment = false
    this.processingMultiline = false
    this.currentTag = null
  }

  _getStack() {
    let stack
    try {
      throw new Error()
    } catch(e) {
      stack = e.stack
    }
    // we don't need the first two lines of the stack, cos they'll just be the
    // error message and the file name
    return stack.split("\n")//.slice(2);
  }

  /**
   * @param {Object} content
   */
  parse(file, content) {
    this._resetState()
    const result = {
      file,
      raw: content,
      funcs: [],
    }

    try {
      const lines = content.split(/\r?\n/)
      const funcs = []
      let func = null
      let position = 0, length = lines.length

      for(position; position < length; position++) {
        const line = lines[position]
        const lineTrimmed = line.trim()

        // Skip empty lines unless we're processing a comment
        if(!this.processingComment && !lineTrimmed.length)
          continue

        // Check for start of doc comment block
        if(this.isCommentStart(lineTrimmed)) {
          // Restart with a new function
          func = this.newFunction()
        } else if(this.isCommentEnd(lineTrimmed)) {
          this._resetState()
          continue
        } else if(this.isFunctionLine(lineTrimmed)) {
          const { status, message: functionName } = this.determineFunctionName(lineTrimmed)
          if(status === "success") {
            funcs.push({ ...func, name: functionName })
          } else
            return { status: "error", file, line, lineNumber: position + 1, message: functionName }
          continue
        }

        if(this.processingComment) {
          const processed = this.processLine({ line, func, file, position })
          const { status, message } = processed
          if(status === "error")
            return { status: "error", file, line, lineNumber: position + 1, message }
        }
      }

      result.funcs = funcs

      return { status: "success", result }
    } catch(e) {
      return { status: "error", file, line: null, lineNumber: null, message: e.message }
    }
  }

  /**
   * @param {string} line
   */
  isCommentStart(line) {
    // Only consider it a new doc block start if we're not already in a comment
    return !this.processingComment && this.regex.commentStart.test(line)
  }

  /**
   * @param {string} line
   */
  isCommentEnd(line) {
    return this.processingComment && this.regex.commentEnd.test(line)
  }

  /**
   * @param {string} line
   */
  newFunction() {
    this._resetState()
    this.processingComment = true
    return {}
  }

  /**
   * @param {string} message - The message to log
   * @param {string} func - The function name that generated the message
   * @param {string} file - The file name that generated the message
   * @param {number} position - The line number in the source file
   * @param {string} line - The line of code in the source file
   * @returns {string} - The formatted message
   */
  generateMessage(message, func, file, position, line) {
    return `[${__filename}:${func}] ${message}: ${file}:${position + 1} - ${line}`
  }

  /**
   * @param {string} line
   * @param {Object} func
   */
  processLine({ line, func, file, position }) {
    const lineTrimmed = line.trim()
    const msg = this.generateMessage

    if(!func)
      return { status: "error", message: msg("No function context", "processLine", file, position, line) }

    const tagMatches = this.regex.tag.exec(line)
    if(tagMatches) {
      const { tag, content } = tagMatches.groups
      if(!tags.isValid(tag))
        return { status: "error", message: msg(`Invalid tag: ${tag}`, "processLine", file, position, line) }

      const singleton = tags.singletons.includes(tag)
      if(singleton) {
        if(func[tag])
          return { status: "error", message: msg(`Singleton tag already exists: ${tag}`, "processLine", file, position, line) }
        func[tag] = null
      } else {
        func[tag] = func[tag] || []
      }

      this.currentTag = tag
      this.section = null

      if(tag === "return") {
        this.section = { tag, name: null }
        const tagContentMatches = this.regex.returnContent.exec(content)
        if(tagContentMatches) {
          const { type, content } = tagContentMatches.groups
          if(!type)
            return { status: "error", message: msg(`Missing return type: ${tag}`, "processLine", file, position, line) }
          if(!content) {
            this.core.logger.warn(msg(`Missing return content: ${tag}`, "processLine", file, position, line))
            singleton ? func[tag] = { type, content: [] } : func[tag].push({ type, content: [] })
          } else {
            singleton ? func[tag] = { type, content: [content] } : func[tag].push({ type, content: [content] })
          }
        } else
          return { status: "error", message: msg("Failed to parse return tag", "processLine", file, position, line) }
      } else {
        const tagContentMatches = this.regex.tagContent.exec(content)
        if(tagContentMatches) {
          const { type, name, content } = tagContentMatches.groups
          if(!type)
            return { status: "error", message: msg("Missing tag type", "processLine", file, position, line) }
          if(!name)
            return { status: "error", message: msg("Missing tag name", "processLine", file, position, line) }
          this.section = { tag, name }
          singleton ? func[tag] = { type, name, content: [content] } : func[tag].push({ type, name, content: [content] })
        } else {
          // This is probably a singleton
          if(tags.singletons.includes(tag)) {
            this.section = { tag, name: null }
            func[tag] = []
          } else {
            return { status: "error", message: msg("Failed to parse tag", "processLine", file, position, line) }
          }
        }
      }
      return { status: "success", message: "Processed tag" }
    }

    // Process multiline content
    if(this.currentTag) {
      if(this.section?.name) {
        const currentTag = this.currentTag
        const { tag, name } = this.section

        const index = name ? func[tag].findIndex(item => item.name === name) : null
        const tagMatch = this.regex.commentContinuation.exec(lineTrimmed)

        if(tagMatch && tagMatch.groups?.content) {
          if(index > -1) {
            func[currentTag][index].content.push(tagMatch.groups.content)
          } else {
            func[currentTag].content.push(tagMatch.groups.content)
          }
        } else {
          if(index)
            func[currentTag][index].content.push("")
          else
            func[currentTag].content.push("")
        }
      } else {
        const { tag } = this.section
        const commentMatch = this.regex.commentContinuation.exec(lineTrimmed)
        if(commentMatch && commentMatch.groups?.content) {
          if(func[tag].content)
            func[tag].content.push(commentMatch.groups.content)
          else
            func[tag].push(commentMatch.groups.content)
        } else {
          if(func[tag].content)
            func[tag].content.push("")
          else
            func[tag].push("")
        }
      }
      return { status: "success", message: "Processed tag continuation" }
    }

    // If not a special tag, treat as description
    const descMatch = this.regex.commentContinuation.exec(lineTrimmed)
    if(descMatch && descMatch.groups?.content) {
      func.description = func.description || []
      func.description.push(descMatch.groups.content)
      return { status: "success", message: "Processed description" }
    } else {
      func.description = func.description || []
      func.description.push("")
      return { status: "success", message: "Processed description" }
    }
  }

  /**
   * @param {string} line
   */
  isFunctionLine(line) {
    return !this.processingComment && this.regex.functionPattern.test(line)
  }

  /**
   * @param {string} line
   * @param {Object} func
   */
  determineFunctionName(line) {
    const match = this.regex.functionPattern.exec(line)

    if(match) {
      const access = match.groups?.access || "public"
      const modifiers = [match.groups?.modifier1, match.groups?.modifier2].filter(modifier => modifier !== undefined)
      const type = match.groups?.type
      const name = match.groups?.name

      if(!name)
        return { status: "error", message: `Failed to extract function name from line: ${line}` }

      return { status: "success", message: name }
    } else {
      return { status: "error", message: `Failed to finalize function: ${JSON.stringify(match)}, line: ${line}` }
    }
  }
};

export { meta, Parser }
