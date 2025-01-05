import ModuleUtil from "./util/ModuleUtil.js"
import { Environment } from "./include/environment.js"
import StringUtil from "./util/StringUtil.js"
import { LoggerColors } from "./include/logger.js"

export default class Logger {
  constructor(core) {
    this.name = "BeDoc"
    if(core?.options.env === Environment.EXTENSION) {
      const vscode = ModuleUtil.require("vscode")
      this.vscodeError = vscode.window.showErrorMessage
      this.vscodeWarn = vscode.window.showWarningMessage
      this.vscodeInfo = vscode.window.showInformationMessage
    }
  }

  setOptions(options) {
    this.name = options.name
    this.debugMode = options.debug
    this.debugLevel = options.debugLevel
  }

  _compose(level, message) {
    const tag = StringUtil.capitalize(level)
    return `[${this.name}] ${LoggerColors[level]}${tag}${LoggerColors.reset}: ${message}`
  }

  debug(message, level = 4, force = false) {
    (force || this.debugMode === true) &&
      (level <= (this.debugLevel ?? 4)) &&
      console.debug(this._compose("debug", message))
  }

  warn(message) {
    console.warn(this._compose("warn", message))
    this.vscodeWarn?.(JSON.stringify(message))
  }

  info(message) {
    console.info(this._compose("info", message))
    this.vscodeInfo?.(JSON.stringify(message))
  }

  error(message) {
    let stack
    try {
      throw new Error()
    } catch(e) {
      if(e instanceof Error) {
        stack = e.stack
      }
    }

    console.error(this._compose("error", message))
    this.vscodeError?.(JSON.stringify(message))
  }
}
