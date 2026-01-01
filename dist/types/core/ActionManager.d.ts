export default class ActionManager {
    constructor({ actionDefinition, logger, variables }: {
        actionDefinition: any;
        logger: any;
        variables: any;
    });
    get action(): any;
    set hookManager(hookManager: any);
    get hookManager(): any;
    get contract(): any;
    get meta(): any;
    get log(): any;
    get variables(): any;
    setupAction(): Promise<void>;
    runAction({ file, content }: {
        file: any;
        content: any;
    }): Promise<any>;
    cleanupAction(): Promise<void>;
    toString(): string;
    #private;
}
//# sourceMappingURL=ActionManager.d.ts.map