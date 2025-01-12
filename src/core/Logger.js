import {console} from "console"
import ModuleUtil from "./util/ModuleUtil.js"
import { Environment } from "./include/Environment.js"
import StringUtil from "./util/StringUtil.js"
import { LoggerColors } from "./include/Logger.js"

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

  #compose(level, message) {
    const tag = StringUtil.capitalize(level)
    return `[${this.name}] ${LoggerColors[level]}${tag}${LoggerColors.reset}: ${message}`
  }

  debug(message, level = 4, force = false) {
    (force || this.debugMode === true) &&
      (level <= (this.debugLevel ?? 4)) &&
      console.debug(this.#compose("debug", message))
  }

  warn(message) {
    console.warn(this.#compose("warn", message))
    this.vscodeWarn?.(JSON.stringify(message))
  }

  info(message) {
    console.info(this.#compose("info", message))
    this.vscodeInfo?.(JSON.stringify(message))
  }

  error(message) {
    try {
      throw new Error()
    } catch(e) {
      if(e instanceof Error) {
        console.error(this.#compose("error", e.stack))
      }
    }

    console.error(this.#compose("error", message))
    this.vscodeError?.(JSON.stringify(message))
  }
}
