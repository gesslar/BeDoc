import Logger from './Logger';
import { FileMap } from './util/FDUtil';

type HookEvent = 'start' | 'section_load' | 'enter' | 'exit' | 'end';

interface HookResult {
    status?: 'success' | 'error';
    error?: Error;
    [key: string]: unknown;
}

interface HooksDefinition {
    setup?: () => Promise<void>;
    cleanup?: () => Promise<void>;
    start?: (...args: unknown[]) => Promise<HookResult>;
    section_load?: (...args: unknown[]) => Promise<HookResult>;
    enter?: (...args: unknown[]) => Promise<HookResult>;
    exit?: (...args: unknown[]) => Promise<HookResult>;
    end?: (...args: unknown[]) => Promise<HookResult>;
    log?: Logger;
}

interface HookManagerConstructorParams {
    action: string;
    hooksFile: FileMap;
    logger: Logger;
    timeOut: number;
}

export const hookPoints: Readonly<Record<Uppercase<HookEvent>, HookEvent>>;

export default class HookManager {
    static new(arg: HookManagerConstructorParams): Promise<HookManager | null>;

    constructor({ action, hooksFile, logger, timeOut: timeout }: HookManagerConstructorParams);

    get action(): string;
    get hooksFile(): FileMap | null;
    get hooks(): HooksDefinition | null;
    get log(): Logger;
    get timeout(): number;
    get setup(): (() => Promise<void>) | null;
    get cleanup(): (() => Promise<void>) | null;

    /**
     * Trigger a hook
     *
     * @param event - The type of hook to trigger
     * @param args - The hook arguments
     * @returns The result of the hook
     */
    on(event: HookEvent, ...args: unknown[]): Promise<HookResult | undefined>;

    HOOKS?: HookPoints
    #hooksFile: FileMap | null;
    #log: Logger | null;
    #hooks: HooksDefinition | null;
    #action: string | null;
    #timeout: number;
}
//# sourceMappingURL=HookManager.d.ts.map
