import ModuleUtil from "./util/module.js";
import Environment from "./env.js";
import { ICore } from "./types/core.js";
import { LoggerOptions, VSCodeWindow } from "./types/logger.js";

export default class Logger {
  private name: string;
  private debugMode?: boolean;
  private debugLevel?: number;
  private vscodeError?: VSCodeWindow["showErrorMessage"];
  private vscodeWarn?: VSCodeWindow["showWarningMessage"];
  private vscodeInfo?: VSCodeWindow["showInformationMessage"];

  private colors = {
    debug: "\x1b[36m", // Cyan
    info: "\x1b[32m",  // Green
    warn: "\x1b[33m",  // Yellow
    error: "\x1b[31m", // Red
    reset: "\x1b[0m",  // Reset
  } as const;

  constructor(core: ICore | null) {
    this.name = "BeDoc";
    if (core?.options.env === Environment.EXTENSION) {
      const vscode = ModuleUtil.require("vscode");
      this.vscodeError = vscode.window.showErrorMessage;
      this.vscodeWarn = vscode.window.showWarningMessage;
      this.vscodeInfo = vscode.window.showInformationMessage;
    }
  }

  setOptions(options: LoggerOptions): void {
    this.name = options.name;
    this.debugMode = options.debug;
    this.debugLevel = options.debugLevel;
  }

  private _capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private _compose(level: keyof typeof this.colors, message: string): string {
    const tag = this._capitalize(level);
    return `[${this.name}] ${this.colors[level]}${tag}${this.colors.reset}: ${message}`;
  }

  debug(message: any, level = 4, force = false): void {
    (force || this.debugMode === true) &&
      (level <= (this.debugLevel ?? 4)) &&
      console.debug(this._compose("debug", message));
  }

  warn(message: string): void {
    console.warn(this._compose("warn", message));
    this.vscodeWarn?.(JSON.stringify(message));
  }

  info(message: string): void {
    console.info(this._compose("info", message));
    this.vscodeInfo?.(JSON.stringify(message));
  }

  error(message: string): void {
    let stack: string | undefined;
    try {
      throw new Error();
    } catch (e: any) {
      stack = e.stack;
    }

    console.error(this._compose("error", message));
    this.vscodeError?.(JSON.stringify(message));
  }
}
