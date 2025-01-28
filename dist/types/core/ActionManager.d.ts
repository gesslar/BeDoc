import Logger from './Logger';
import HookManager from './HookManager';

export interface ActionDefinition {
    action: string;
    contract: Record<string, unknown>;
    meta: Record<string, unknown>;
}

export default class ActionManager {
    constructor(actionDefinition: ActionDefinition, logger: Logger);
    get action(): ActionDefinition;
    set hookManager(hookManager: HookManager);
    get hookManager(): HookManager;
    get contract(): Record<string, unknown>;
    get meta(): Record<string, unknown>;
    get log(): Logger;
    setupAction(): Promise<void>;
    runAction({ file, content }: {
        file: string;
        content: string;
    }): Promise<string>;
    cleanupAction(): Promise<void>;
    toString(): string;
    #private;
}
//# sourceMappingURL=ActionManager.d.ts.map
