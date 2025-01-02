import ModuleUtil from "./util/module.js";
import Environment from "./env.js";

class Logger {
  /**
   * @param {Object} core
   */
  constructor(core) {
    const {name} = ModuleUtil.require("package.json");

    console.log(`name: ${name}`);
    console.log(`core:`, core);
    console.log(`core classname: ${core?.constructor.name}`);

    this.core = core;
    this.name = name;
    this.debugMode = core?.options?.debug;
    this.debugLevel = core?.options?.debugLevel;

    if(core?.env === Environment.EXTENSION) {
      const vscode = require("vscode");
      this.vscodeError = vscode.window.showErrorMessage.bind(vscode.window);
      this.vscodeWarn = vscode.window.showWarningMessage.bind(vscode.window);
      this.vscodeInfo = vscode.window.showInformationMessage.bind(vscode.window);
    }
  }

  colors = {
    debug: "\x1b[48;5;129m",
    info:  "\x1b[48;5;039m",
    warn:  "\x1b[48;5;208m",
    error: "\x1b[48;5;124m",
    reset: "\x1b[0m"
  }

  setOptions(options) {
    this.debugMode = options.debug;
    this.debugLevel = options.debugLevel;
    this.name = options.name;
  }

  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  _compose(level, message) {
    const tag = this._capitalize(level);

    return `[${this.name}] ${this.colors[level]}${tag}${this.colors.reset}: ${message}`;
  }

  /**
   * @param {any} message
   */
  debug(message, level = 4, force = false) {
    (force || this.debugMode === true) && level <= this.debugLevel && console.debug(this._compose("debug", message));
  }

  warn(message) {
    console.warn(this._compose("warn", message));
    this.vscodeWarn && this.vscodeWarn(JSON.stringify(message));
  }

  /**
   * @param {string} message
   */
  info(message) {
    console.info(this._compose("info", message));
    this.vscodeInfo && this.vscodeInfo(JSON.stringify(message));
  }

  /**
   * @param {string} message
   */
  error(message) {
    let stack;
    try {
      throw new Error();
    } catch(e) {
      stack = e.stack;
    }

    // console.log(stack);

    console.error(this._compose("error", message));
    this.vscodeError && this.vscodeError(JSON.stringify(message));
  }
}

export default Logger;
