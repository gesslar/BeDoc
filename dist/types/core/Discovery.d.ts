import Core from './Core';
import { FileMap } from './util/FDUtil';
import ActionManager from './ActionManager';

interface DiscoveryOptions {
    print?: FileMap;
    parse?: FileMap;
}

interface ActionDefinition {
    file: FileMap;
    action: {
        meta: {
            action: string;
            [key: string]: unknown;
        };
    };
    contract: Record<string, unknown>;
}

interface ActionMap {
    print: ActionDefinition[];
    parse: ActionDefinition[];
    [key: string]: ActionDefinition[];
}

interface ValidCriteria {
    parse: ActionDefinition[];
    print: ActionDefinition[];
}

export default class Discovery {
    constructor(core: Core);
    readonly core: Core;

    /**
     * Discover actions from local or global node_modules
     *
     * @param specific Configuration options for action discovery
     * @returns A map of discovered modules
     */
    discoverActions(specific?: DiscoveryOptions): Promise<ActionMap>;

    /**
     * Check which actions satisfy the configuration criteria
     */
    satisfyCriteria(actions: ActionMap, validatedConfig: Record<string, unknown>): ValidCriteria;

    #loadModule(module: FileMap): Promise<{
        file: FileMap;
        actions: ActionManager[];
        contracts: string[];
    }>;

    #getModuleExports(dirMap: FileMap): FileMap[];

    #loadActionsAndContracts(
        moduleFiles: FileMap[],
        specific: {
            print?: FileMap;
            parse?: FileMap;
        }
    ): Promise<ActionMap>;

    #validMeta(
        actionType: string,
        toValidate: {
            action: ActionDefinition['action'];
            contract: ActionDefinition['contract'];
        }
    ): boolean;
}
//# sourceMappingURL=Discovery.d.ts.map
