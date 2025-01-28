import ErrorStackParser from 'error-stack-parser';
import * as vscode from 'vscode';

interface LoggerOptions {
    name?: string;
    debugLevel?: number;
    env?: string;
}

type LogLevel = 'debug' | 'warn' | 'info' | 'error';
type DebugLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Logger class
 *
 * Log levels:
 * - debug: Debugging information
 *   - Debug levels
 *     - 0: No/critical debug information, not error level, but should be logged
 *     - 1: Basic debug information, startup, shutdown, etc
 *     - 2: Intermediate debug information, discovery
 *     - 3: Detailed debug information, parsing, processing, etc
 *     - 4: Very detailed debug information, nerd mode!
 * - warn: Warning information
 * - info: Informational information
 * - error: Error information
 */
export default class Logger {
    constructor(options?: LoggerOptions);

    readonly vscodeError?: typeof vscode.window.showErrorMessage;
    readonly vscodeWarn?: typeof vscode.window.showWarningMessage;
    readonly vscodeInfo?: typeof vscode.window.showInformationMessage;

    get name(): string;
    get debugLevel(): number;
    get options(): Required<Pick<LoggerOptions, 'name' | 'debugLevel'>>;

    setOptions(options: LoggerOptions): void;

    lastStackLine(error?: Error, stepsRemoved?: number): ErrorStackParser.StackFrame;
    extractFileFunction(level?: DebugLevel): string;

    newDebug(tag?: string): (message: string, level?: DebugLevel, ...args: unknown[]) => void;

    debug(message: string, level?: DebugLevel, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;

    #name: string | null;
    #debugLevel: number;
    #compose(level: LogLevel, message: string, debugLevel?: DebugLevel): string;
}
//# sourceMappingURL=Logger.d.ts.map
