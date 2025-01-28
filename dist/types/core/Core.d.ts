import Logger from './Logger';
import ActionManager from './ActionManager';
import { FileMap } from './util/FDUtil';

export const Environment: Readonly<{
    EXTENSION: 'extension';
    NPM: 'npm';
    ACTION: 'action';
    CLI: 'cli';
}>;

export type EnvironmentType = typeof Environment[keyof typeof Environment];

interface CoreOptions {
    debug?: boolean;
    debugLevel?: number;
    name?: string;
    [key: string]: unknown;
}

interface CoreConstructorOptions extends CoreOptions {
    hooks?: string;
    hooksTimeout?: number;
    output?: string;
    maxConcurrent?: number;
}

interface NewParams {
    options: CoreOptions;
    source: EnvironmentType;
}

interface ProcessResult {
    succeeded: Array<{ input: FileMap; output: FileMap }>;
    errored: Array<{ input: FileMap; error: Error }>;
}

export default class Core {
    static new({ options, source }: NewParams): Promise<Core>;

    constructor(options: CoreConstructorOptions);

    readonly options: CoreConstructorOptions;
    readonly logger: Logger;
    readonly packageJson: Record<string, unknown>;
    readonly debugOptions: {
        name: string | null;
        debugLevel: number;
    };
    readonly actions: Record<string, ActionManager>;

    processFiles(glob: string | string[], startTime?: [number, number]): Promise<ProcessResult>;
}
