import ModuleUtil from "./util/module.js";
import Environment from "./env.js";

type LoggerOptions = {
  debug?: boolean;
  debugLevel?: number;
  name: string;
};

type VSCodeWindow = {
  showErrorMessage: (message: string) => void;
  showWarningMessage: (message: string) => void;
  showInformationMessage: (message: string) => void;
};

export default class Logger {
  private core: any;
  private name!: string;
  private debugMode?: boolean;
  private debugLevel?: number;
  private vscodeError?: (message: string) => void;
  private vscodeWarn?: (message: string) => void;
  private vscodeInfo?: (message: string) => void;

  constructor(core: any) {
    ModuleUtil.require("package.json").then((pkg) => {
      const { name } = pkg;

      this.core = core;
      this.name = name;
      this.debugMode = core?.options?.debug;
      this.debugLevel = core?.options?.debugLevel;

      if (core?.env === Environment.EXTENSION) {
        this.initVSCode();
      }

      console.log(`name: ${name}`);
      console.log(`core:`, core);
      console.log(`core classname: ${core?.constructor.name}`);
    });
  }

  private async initVSCode(): Promise<void> {
    const vscode = await import("vscode") as { window: VSCodeWindow };
    this.vscodeError = vscode.window.showErrorMessage.bind(vscode.window);
    this.vscodeWarn = vscode.window.showWarningMessage.bind(vscode.window);
    this.vscodeInfo = vscode.window.showInformationMessage.bind(vscode.window);
  }

  private colors = {
    debug: "\x1b[48;5;129m",
    info: "\x1b[48;5;039m",
    warn: "\x1b[48;5;208m",
    error: "\x1b[48;5;124m",
    reset: "\x1b[0m"
  } as const;

  setOptions(options: LoggerOptions): void {
    this.debugMode = options.debug;
    this.debugLevel = options.debugLevel;
    this.name = options.name;
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
