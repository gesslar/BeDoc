export default class Discovery {
    constructor(core: any);
    core: any;
    /**
     * Discover actions from local or global node_modules
     *
     * @param {object} [specific] Configuration options for action discovery
     * @param {object} [specific.print] Print-related configuration options
     * @param {object} [specific.parse] Parse-related configuration options
     * @returns {Promise<object>} A map of discovered modules
     */
    discoverActions(specific?: {
        print?: object;
        parse?: object;
    }): Promise<object>;
    satisfyCriteria(actions: any, validatedConfig: any): {
        parse: any[];
        print: any[];
    };
    #private;
}
//# sourceMappingURL=Discovery.d.ts.map