import console from "console"
import ErrorStackParser from "error-stack-parser"
import {Environment} from "#core"
import {resolveFilename,capitalize} from "#util"

const loggerColours = {
  debug: [
    "\x1b[38;5;19m",  // Debug level 0: Dark blue
    "\x1b[38;5;27m",  // Debug level 1: Medium blue
    "\x1b[38;5;33m",  // Debug level 2: Light blue
    "\x1b[38;5;39m",  // Debug level 3: Teal
    "\x1b[38;5;51m",  // Debug level 4: Bright cyan
  ],
  info: "\x1b[32m",   // Green
  warn: "\x1b[33m",   // Yellow
  error: "\x1b[31m",  // Red
  reset: "\x1b[0m",   // Reset
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

class Logger {
  #name = null
  #debugMode = false
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

  get debugMode() {
    return this.#debugMode
  }

  get debugLevel() {
    return this.#debugLevel
  }

  get options() {
    return {
      name: this.#name,
      debugMode: this.#debugMode,
      debugLevel: this.#debugLevel
    }
  }

  setOptions(options) {
    this.#name = options.name ?? this.#name
    this.#debugMode = options.debugMode
    this.#debugLevel = options.debugLevel
  }

  #compose(level, message, debugLevel = 0) {
    const tag = capitalize(level)

    if(level === "debug")
      return `[${this.#name}] ${loggerColours[level][debugLevel]}${tag}${loggerColours.reset}: ${message}`
    return `[${this.#name}] ${loggerColours[level]}${tag}${loggerColours.reset}: ${message}`
  }

  lastStackLine(stepsRemoved = 3) {
    const stack = ErrorStackParser.parse(new Error())
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

    const {module, absoluteUri} = resolveFilename(file)

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
      result = `${absoluteUri} ${result}`

    return result
  }

  newDebug(tag) {
    return (function(message, level, ...arg) {
      tag = this.extractFileFunction(this.#debugLevel)
      this.debug(`[${tag}] ${message}`, level, ...arg)
    }).bind(this)
  }

  debug(message, level = 0, ...arg) {
    if(this.debugMode === true && level <= (this.debugLevel ?? 4))
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
    // try {
    //   throw new Error()
    // } catch(e) {
    //   if(e instanceof Error) {
    //     console.error(this.#compose("error", e.stack))
    //   }
    // }

    console.error(this.#compose("error", message), ...arg)
    this.vscodeError?.(JSON.stringify(message))
  }
}

export {
  Logger,
}
