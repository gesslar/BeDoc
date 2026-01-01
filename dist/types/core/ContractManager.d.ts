export default class ContractManager {
    static newContract(actionType: any, terms: any): Promise<Contract>;
    /**
     *
     *if(typeof contractData === "string") {
     *const match = refex.exec(contractData)
     *
     *if(match)
     *contractData = readFile(resolveFilename(match[1], directoryObject))
     *
     *return yaml.parse(String(contractData))
     *}
     *
     *throw new Error(`Invalid contract data: ${JSON5.stringify(contractData)}`)
     *
     * @param contractData
     * @param directoryObject
     */
    static parse(contractData: any, directoryObject: any): Promise<any>;
    static reportValidationErrors(errors: any): any;
}
declare class Contract {
    constructor(validator: any);
    get validator(): any;
    validate(data: any): void;
    #private;
}
export {};
//# sourceMappingURL=ContractManager.d.ts.map