const Environment = require("./env")
const packageJson = require("../../package.json");
const { InvalidOptionArgumentError } = require("commander");

class Logger {
  /**
   * @param {Object} core
   */
  constructor(core) {
    this.core = core ;
    this.name = packageJson.name;

    if(core.env === Environment.EXTENSION) {
      const vscode = require('vscode');
      this.vscodeError = vscode.window.showErrorMessage.bind(vscode.window);
      this.vscodeWarn = vscode.window.showWarningMessage.bind(vscode.window);
      this.vscodeInfo = vscode.window.showInformationMessage.bind(vscode.window);
    }

  }

  colors = {
    debug: `\x1b[48;5;129m`,
    info:  `\x1b[48;5;039m`,
    warn:  `\x1b[48;5;208m`,
    error: `\x1b[48;5;124m`,
    reset: `\x1b[0m`
  }

  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  _compose(level, message) {
    // try{ throw new Error(); } catch(e) { console.log(e.stack); }

    const tag = this._capitalize(level);

    return `[${this.name}] ${this.colors[level]}${tag}${this.colors.reset}: ${message}`;
  }

  /**
   * @param {any} message
   */
  debug(message) {
    this.core.options.debug && console.debug(this._compose("debug", message));
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
    try{ throw new Error(); } catch(e) { stack = e.stack; }

    // console.log(stack);

    console.error(this._compose("error", message));
    this.vscodeError && this.vscodeError(JSON.stringify(message));
  }
}

module.exports = Logger;
