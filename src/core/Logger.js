/*
  For formatting console info, see:
  https://nodejs.org/docs/latest-v22.x/api/util.html#utilformatformat-args

  * %s: String will be used to convert all values except BigInt, Object and -0.
        BigInt values will be represented with an n and Objects that have no
        user defined toString function are inspected using util.inspect() with
        options { depth: 0, colors: false, compact: 3 }.
  * %d: Number will be used to convert all values except BigInt and Symbol.
  * %i: parseInt(value, 10) is used for all values except BigInt and Symbol.
  * %f: parseFloat(value) is used for all values expect Symbol.
  * %j: JSON. Replaced with the string '[Circular]' if the argument contains
        circular references.
  * %o: Object. A string representation of an object with generic JavaScript
        object formatting. Similar to util.inspect() with options { showHidden:
        true, showProxy: true }. This will show the full object including non-
        enumerable properties and proxies.
  * %O: Object. A string representation of an object with generic JavaScript
        object formatting. Similar to util.inspect() without options. This will
        show the full object not including non-enumerable properties and
        proxies.
  * %%: single percent sign ('%'). This does not consume an argument.

*/

import ErrorStackParser from "error-stack-parser"
import console from "node:console"
import {Environment} from "./Core.js"
import {FileObject, Util} from "@gesslar/toolkit"

export const loggerColours = {
  debug: [
    "\x1b[38;5;19m", // Debug level 0: Dark blue
    "\x1b[38;5;27m", // Debug level 1: Medium blue
    "\x1b[38;5;33m", // Debug level 2: Light blue
    "\x1b[38;5;39m", // Debug level 3: Teal
    "\x1b[38;5;44m", // Debug level 4: Blue-tinted cyan
  ],
  info: "\x1b[38;5;36m",    // Medium Spring Green
  warn: "\x1b[38;5;214m",   // Orange1
  error: "\x1b[38;5;196m",  // Red1
  reset: "\x1b[0m", // Reset
}

/**
 * Logger class
 *
 * Log levels:
 * - debug: Debugging information
 *   - Debug levels
 *     - 0: No/critical debug information, not error level, but, should be
 *          logged
 *     - 1: Basic debug information, startup, shutdown, etc
 *     - 2: Intermediate debug information, discovery, starting to get more
 *         detailed
 *     - 3: Detailed debug information, parsing, processing, etc
 *     - 4: Very detailed debug information, nerd mode!
 * - warn: Warning information
 * - info: Informational information
 * - error: Error information
 */

export default class Logger {
  #name = null
  #debugLevel = 0

  constructor(options) {
    this.#name = "BeDoc"
    if(options) {
      this.setOptions(options)
      if(options.env === Environment.EXTENSION) {
        const vscode = import("vscode")

        this.vscodeError = vscode.window.showErrorMessage
        this.vscodeWarn = vscode.window.showWarningMessage
        this.vscodeInfo = vscode.window.showInformationMessage
      }
    }
  }

  get name() {
    return this.#name
  }

  get debugLevel() {
    return this.#debugLevel
  }

  get options() {
    return {
      name: this.#name,
      debugLevel: this.#debugLevel,
    }
  }

  setOptions(options) {
    this.#name = options.name ?? this.#name
    this.#debugLevel = options.debugLevel
  }

  #compose(level, message, debugLevel = 0) {
    const tag = Util.capitalize(level)

    if(level === "debug")
      return `[${this.#name}] ${loggerColours[level][debugLevel]}${tag}${loggerColours.reset}: ${message}`

    return `[${this.#name}] ${loggerColours[level]}${tag}${loggerColours.reset}: ${message}`
  }

  lastStackLine(error = new Error(), stepsRemoved = 3) {
    const stack = ErrorStackParser.parse(error)

    return stack[stepsRemoved]
  }

  extractFileFunction(level = 0) {
    const frame = this.lastStackLine()
    const {
      functionName: func,
      fileName: file,
      lineNumber: line,
      columnNumber: col,
    } = frame

    const tempFile = new FileObject(file)
    const {module, uri} = tempFile

    let functionName = func ?? "anonymous"

    if(functionName.startsWith("#"))
      functionName = `${module}.${functionName}`

    const methodName = /\[as \w+\]$/.test(functionName)
      ? /\[as (\w+)\]/.exec(functionName)[1]
      : null

    if(methodName) {
      functionName = functionName.replace(/\[as \w+\]$/, "")
      functionName = `${functionName}{${methodName}}`
    }

    if(/^async /.test(functionName))
      functionName = functionName.replace(/^async /, "(async)")

    let result = functionName

    if(level >= 2)
      result = `${result}:${line}:${col}`

    if(level >= 3)
      result = `${uri} ${result}`

    return result
  }

  newDebug(tag) {
    return function(message, level, ...arg) {
      tag = this.extractFileFunction(this.#debugLevel)
      this.debug(`[${tag}] ${message}`, level, ...arg)
    }.bind(this)
  }

  debug(message, level = 0, ...arg) {
    if(level <= (this.debugLevel ?? 4))
      console.debug(this.#compose("debug", message, level), ...arg)
  }

  warn(message, ...arg) {
    console.warn(this.#compose("warn", message), ...arg)
    this.vscodeWarn?.(JSON.stringify(message))
  }

  info(message, ...arg) {
    console.info(this.#compose("info", message), ...arg)
    this.vscodeInfo?.(JSON.stringify(message))
  }

  error(message, ...arg) {
    console.error(this.#compose("error", message), ...arg)
    this.vscodeError?.(JSON.stringify(message))
  }
}
