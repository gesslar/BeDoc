export const HookPoints: any;
export default class HookManager {
    static "new"(arg: any): Promise<HookManager>;
    constructor({ action, hooksFile, logger, timeOut: timeout }: {
        action: any;
        hooksFile: any;
        logger: any;
        timeOut: any;
    });
    get action(): any;
    get hooksFile(): any;
    get hooks(): any;
    get log(): any;
    get timeout(): number;
    get setup(): any;
    get cleanup(): any;
    /**
     * Trigger a hook
     *
     * @param {string} event - The type of hook to trigger
     * @param {object} args - The hook arguments as an object
     * @returns {Promise<unknown>} The result of the hook
     */
    on(event: string, args: object): Promise<unknown>;
    #private;
}
//# sourceMappingURL=HookManager.d.ts.map