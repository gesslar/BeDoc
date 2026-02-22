/**
 * @import {Glog} from "@gesslar/toolkit"
 */
export default class Discovery {
    /**
     * Constructor for Discovery.
     *
     * @param {object} arg - Constructor argument
     * @param {object} arg.options - BeDoc options
     * @param {Glog} arg.glog - Glog instance
     */
    constructor({ options, glog }: {
        options: object;
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
    });
    /**
     * Discover actions from local or global node_modules
     *
     * @param {object} [specific] Configuration options for action discovery
     * @param {FileObject} [specific.print] Print-related configuration options
     * @param {FileObject} [specific.parse] Parse-related configuration options
     * @param {Function} validateBeDocSchema - The validator function for BeDoc's action schema
     * @returns {Promise<object>} A map of discovered modules
     */
    discoverActions(specific?: {
        print?: FileObject;
        parse?: FileObject;
    }, validateBeDocSchema: Function): Promise<object>;
    satisfyCriteria(actions: any, validatedConfig: any): {
        parse: any[];
        print: any[];
    };
    #private;
}
import { FileObject } from "@gesslar/toolkit";
//# sourceMappingURL=Discovery.d.ts.map