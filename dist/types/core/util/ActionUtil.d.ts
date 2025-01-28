import { FileMap } from './FDUtil';

type ActionType = 'parse' | 'print';

interface ActionMeta {
    action: ActionType;
    language?: string;
    format?: string;
}

interface ActionRequirement {
    action: ActionType;
}

type ActionMetaRequirement = ActionRequirement | keyof ActionMeta;

export const actionMetaRequirements: Readonly<Record<ActionType, ActionMetaRequirement[]>>;
export const actionTypes: readonly ActionType[];

/**
 * Loads a JSON file asynchronously
 *
 * @param jsonFileObject - The JSON file to load
 * @returns The parsed JSON content
 */
export function loadJson(jsonFileObject: FileMap): Record<string, unknown>;

/**
 * Loads the package.json file asynchronously
 *
 * @param basePath - The base path to use
 * @returns The parsed package.json content
 */
export function loadPackageJson(basePath?: string | FileMap | null): Record<string, unknown>;
//# sourceMappingURL=ActionUtil.d.ts.map
