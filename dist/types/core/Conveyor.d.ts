export default class Conveyor {
    constructor(parse: any, print: any, logger: any, output: any);
    parse: any;
    print: any;
    logger: any;
    output: any;
    /**
     * Processes files with a concurrency limit.
     *
     * @param {Array<FileObject>} files - List of files to process.
     * @param {number} maxConcurrent - Maximum number of concurrent tasks.
     * @returns {Promise<object>} - Resolves when all files are processed.
     */
    convey(files: Array<FileObject>, maxConcurrent?: number): Promise<object>;
    #private;
}
import { FileObject } from "@gesslar/toolkit";
//# sourceMappingURL=Conveyor.d.ts.map