import { FileMap } from './FDUtil';

export default class ModuleUtil {
    /**
     * Requires a module synchronously
     *
     * @param {FileMap} fileObject - The file to require
     * @returns {unknown} The required module
     */
    static require(fileObject: FileMap): unknown;

    /**
     * Loads a JSON file asynchronously
     *
     * @param {FileMap} jsonFileObject - The JSON file to load
     * @returns {Promise<Record<string, unknown>>} The parsed JSON content
     */
    static loadJson(jsonFileObject: FileMap): Promise<Record<string, unknown>>;

    /**
     * Loads the package.json file asynchronously
     *
     * @returns {Promise<Record<string, unknown>>} The parsed package.json content
     */
    static loadPackageJson(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=ModuleUtil.d.ts.map
