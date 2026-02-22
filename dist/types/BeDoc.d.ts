/**
 * @import {Glog} from "@gesslar/toolkit"
 */
export default class BeDoc {
    /**
     * Create a new instance of Core.
     *
     * @param {object} args
     * @param {object} args.options - The options passed into BeDoc
     * @param {string} args.source - The environment BeDoc is running in
     * @param {Glog} args.glog - The Glog logger instance
     * @returns {Promise<BeDoc>} A new instance of Core
     */
    static "new"({ options, source, glog, validateBeDocSchema }: {
        options: object;
        source: string;
        glog: {
            new (options?: {
                name?: string;
                debugLevel?: number;
                logLevel?: number;
                prefix?: string;
                colours?: object;
                symbols?: object;
                stackTrace?: boolean;
                tagsAsStrings?: boolean;
                displayName?: boolean;
                env?: string;
            }): {
                setOptions(options: {
                    name?: string;
                    debugLevel?: number;
                    logLevel?: number;
                    prefix?: string;
                    colours?: object;
                    symbols?: object;
                    stackTrace?: boolean;
                    tagsAsStrings?: boolean;
                    displayName?: boolean;
                }): /*elided*/ any;
                withName(name: string): /*elided*/ any;
                withLogLevel(level: number): /*elided*/ any;
                withPrefix(prefix: string): /*elided*/ any;
                withColours(colours?: object): /*elided*/ any;
                withStackTrace(enabled?: boolean): /*elided*/ any;
                withTagsAsStrings(enabled?: boolean): /*elided*/ any;
                withSymbols(symbols?: object): /*elided*/ any;
                noDisplayName(): /*elided*/ any;
                use(prefix: string): object;
                get name(): string;
                get debugLevel(): number;
                get options(): object;
                newDebug(tag: string): Function;
                debug(message: string, level?: number, ...arg: unknown[]): void;
                info(message: string, ...arg: unknown[]): void;
                warn(message: string, ...arg: unknown[]): void;
                error(message: string, ...arg: unknown[]): void;
                execute(...args: unknown[]): void;
                colourize(strings: Array<string>, ...values: unknown[]): void;
                success(message: string, ...args: unknown[]): void;
                group(...args: unknown[]): void;
                groupEnd(): void;
                groupDebug(message: string, level?: number): void;
                groupInfo(message: string): void;
                groupSuccess(message: string): void;
                table(data: object | any[], labelOrOptions?: string | object, options?: {
                    properties?: Array<string>;
                    showHeader?: boolean;
                    quotedStrings?: boolean;
                }): void;
                get colours(): any;
                get raw(): object;
                "__#private@#private": any;
            };
            logLevel: number;
            logPrefix: string;
            colours: any;
            stackTrace: boolean;
            name: string;
            tagsAsStrings: boolean;
            symbols: any;
            setLogPrefix(prefix: string): /*elided*/ any;
            setLogLevel(level: number): /*elided*/ any;
            withName(name: string): /*elided*/ any;
            withColours(colours?: object): /*elided*/ any;
            withStackTrace(enabled?: boolean): /*elided*/ any;
            withTagsAsStrings(enabled?: boolean): /*elided*/ any;
            withSymbols(symbols?: object): /*elided*/ any;
            use(prefix: string): object;
            create(options?: object): {
                setOptions(options: {
                    name?: string;
                    debugLevel?: number;
                    logLevel?: number;
                    prefix?: string;
                    colours?: object;
                    symbols?: object;
                    stackTrace?: boolean;
                    tagsAsStrings?: boolean;
                    displayName?: boolean;
                }): /*elided*/ any;
                withName(name: string): /*elided*/ any;
                withLogLevel(level: number): /*elided*/ any;
                withPrefix(prefix: string): /*elided*/ any;
                withColours(colours?: object): /*elided*/ any;
                withStackTrace(enabled?: boolean): /*elided*/ any;
                withTagsAsStrings(enabled?: boolean): /*elided*/ any;
                withSymbols(symbols?: object): /*elided*/ any;
                noDisplayName(): /*elided*/ any;
                use(prefix: string): object;
                get name(): string;
                get debugLevel(): number;
                get options(): object;
                newDebug(tag: string): Function;
                debug(message: string, level?: number, ...arg: unknown[]): void;
                info(message: string, ...arg: unknown[]): void;
                warn(message: string, ...arg: unknown[]): void;
                error(message: string, ...arg: unknown[]): void;
                execute(...args: unknown[]): void;
                colourize(strings: Array<string>, ...values: unknown[]): void;
                success(message: string, ...args: unknown[]): void;
                group(...args: unknown[]): void;
                groupEnd(): void;
                groupDebug(message: string, level?: number): void;
                groupInfo(message: string): void;
                groupSuccess(message: string): void;
                table(data: object | any[], labelOrOptions?: string | object, options?: {
                    properties?: Array<string>;
                    showHeader?: boolean;
                    quotedStrings?: boolean;
                }): void;
                get colours(): any;
                get raw(): object;
                "__#private@#private": any;
            };
            execute(...args: unknown[]): void;
            colourize(strings: Array<string>, ...values: unknown[]): void;
            success(message: string, ...args: unknown[]): void;
            group(...args: unknown[]): void;
            groupEnd(): void;
            groupDebug(message: string, level?: number): void;
            groupInfo(message: string): void;
            groupSuccess(message: string): void;
            table(data: object | any[], labelOrOptions?: string | object, options?: {
                properties?: Array<string>;
                showHeader?: boolean;
                quotedStrings?: boolean;
            }): void;
            setAlias(alias: string, colourCode: string): {
                setOptions(options: {
                    name?: string;
                    debugLevel?: number;
                    logLevel?: number;
                    prefix?: string;
                    colours?: object;
                    symbols?: object;
                    stackTrace?: boolean;
                    tagsAsStrings?: boolean;
                    displayName?: boolean;
                }): /*elided*/ any;
                withName(name: string): /*elided*/ any;
                withLogLevel(level: number): /*elided*/ any;
                withPrefix(prefix: string): /*elided*/ any;
                withColours(colours?: object): /*elided*/ any;
                withStackTrace(enabled?: boolean): /*elided*/ any;
                withTagsAsStrings(enabled?: boolean): /*elided*/ any;
                withSymbols(symbols?: object): /*elided*/ any;
                noDisplayName(): /*elided*/ any;
                use(prefix: string): object;
                get name(): string;
                get debugLevel(): number;
                get options(): object;
                newDebug(tag: string): Function;
                debug(message: string, level?: number, ...arg: unknown[]): void;
                info(message: string, ...arg: unknown[]): void;
                warn(message: string, ...arg: unknown[]): void;
                error(message: string, ...arg: unknown[]): void;
                execute(...args: unknown[]): void;
                colourize(strings: Array<string>, ...values: unknown[]): void;
                success(message: string, ...args: unknown[]): void;
                group(...args: unknown[]): void;
                groupEnd(): void;
                groupDebug(message: string, level?: number): void;
                groupInfo(message: string): void;
                groupSuccess(message: string): void;
                table(data: object | any[], labelOrOptions?: string | object, options?: {
                    properties?: Array<string>;
                    showHeader?: boolean;
                    quotedStrings?: boolean;
                }): void;
                get colours(): any;
                get raw(): object;
                "__#private@#private": any;
            };
            get raw(): object;
        };
    }): Promise<BeDoc>;
    constructor(glog: any);
    processFiles(): Promise<{
        totalFiles: any;
        succeeded: any;
        warned: any;
        errored: any;
        duration: string;
    }>;
    #private;
}
//# sourceMappingURL=BeDoc.d.ts.map