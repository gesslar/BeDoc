export default class Conveyor {
    constructor({ parse, print, glog, contract, output }: {
        parse: any;
        print: any;
        glog: any;
        contract: any;
        output: any;
    });
    /**
     * Defines the per-file processing pipeline.
     *
     * @param {ActionBuilder} builder - The Actioneer builder instance.
     */
    setup(builder: ActionBuilder): void;
    /**
     * Processes files through the parse→print pipeline with concurrency.
     *
     * @param {Array<FileObject>} files - List of files to process.
     * @param {number} maxConcurrent - Maximum number of concurrent tasks.
     * @returns {Promise<object>} - Resolves with {succeeded, errored, warned}.
     */
    convey(files: Array<FileObject>, maxConcurrent?: number): Promise<object>;
    #private;
}
import { ActionBuilder } from "@gesslar/actioneer";
import { FileObject } from "@gesslar/toolkit";
//# sourceMappingURL=Conveyor.d.ts.map