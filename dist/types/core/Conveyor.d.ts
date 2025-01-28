import ActionManager from './ActionManager';
import Logger from './Logger';
import { FileMap } from './util/FDUtil';

interface ProcessResult {
    status: 'success' | 'error' | 'warning';
    file?: FileMap;
    error?: Error;
    warning?: string;
    result?: string;
    destFile?: string;
    content?: string;
}

interface ConveyResult {
    succeeded: Array<{ input: FileMap; output: FileMap }>;
    errored: Array<{ input: FileMap; error: Error }>;
}

export default class Conveyor {
    constructor(
        parse: ActionManager,
        print: ActionManager,
        logger: Logger,
        output: FileMap
    );

    readonly parse: ActionManager;
    readonly print: ActionManager;
    readonly logger: Logger;
    readonly output: FileMap;

    /**
     * Processes files with a concurrency limit.
     *
     * @param files - List of files to process.
     * @param maxConcurrent - Maximum number of concurrent tasks.
     * @returns Resolves when all files are processed.
     */
    convey(files: FileMap[], maxConcurrent?: number): Promise<ConveyResult>;

    #succeeded: Array<{ input: FileMap; output: FileMap }>;
    #errored: Array<{ input: FileMap; error: Error }>;
    #processFile(file: FileMap): Promise<ProcessResult>;
    #writeOutput(destFile: string, content: string): Promise<ProcessResult>;
}
//# sourceMappingURL=Conveyor.d.ts.map
