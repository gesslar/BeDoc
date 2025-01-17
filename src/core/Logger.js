import console from "console"
import ErrorStackParser from "error-stack-parser"
import { Environment } from "./include/Environment.js"
import { LoggerColors } from "./include/Logger.js"
import FDUtil from "./util/FDUtil.js"
import ModuleUtil from "./util/ModuleUtil.js"
import StringUtil from "./util/StringUtil.js"

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
  #debugMode = false
  #debugLevel = 0

  constructor(options) {
    this.#name = "BeDoc"
    if(options) {
      this.setOptions(options)
      if(options.env === Environment.EXTENSION) {
        const vscode = ModuleUtil.require("vscode")
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

  setOptions(options) {
    this.#name = options.name ?? this.#name
    this.#debugMode = options.debugMode
    this.#debugLevel = options.debugLevel
  }

  #compose(level, message, debugLevel = 0) {
    const tag = StringUtil.capitalize(level)

    if(level === "debug")
      return `[${this.#name}] ${LoggerColors[level][debugLevel]}${tag}${LoggerColors.reset}: ${message}`
    return `[${this.#name}] ${LoggerColors[level]}${tag}${LoggerColors.reset}: ${message}`
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

    const {module, absoluteUri} = FDUtil.resolveFilename(file)

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
