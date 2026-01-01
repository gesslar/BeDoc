export namespace loggerColours {
    let debug: string[];
    let info: string;
    let warn: string;
    let error: string;
    let reset: string;
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
    constructor(options: any);
    vscodeError: any;
    vscodeWarn: any;
    vscodeInfo: any;
    get name(): any;
    get debugLevel(): number;
    get options(): {
        name: any;
        debugLevel: number;
    };
    setOptions(options: any): void;
    lastStackLine(error?: Error, stepsRemoved?: number): any;
    extractFileFunction(level?: number): any;
    newDebug(tag: any): any;
    debug(message: any, level?: number, ...arg: any[]): void;
    warn(message: any, ...arg: any[]): void;
    info(message: any, ...arg: any[]): void;
    error(message: any, ...arg: any[]): void;
    #private;
}
//# sourceMappingURL=Logger.d.ts.map