export const Environment: Readonly<{
    EXTENSION: "extension";
    NPM: "npm";
    ACTION: "action";
    CLI: "cli";
}>;
export default class Core {
    static "new"({ options, source }: {
        options: any;
        source: any;
    }): Promise<Core | {
        status: string;
        message: string;
    }>;
    constructor(options: any);
    options: any;
    logger: Logger;
    debugOptions: {
        name: any;
        debugLevel: number;
    };
    packageJson: any;
    processFiles(glob: any): Promise<{
        totalFiles: number;
        succeeded: any;
        warned: any;
        errored: any;
        duration: string;
    }>;
}
import Logger from "./Logger.js";
//# sourceMappingURL=Core.d.ts.map