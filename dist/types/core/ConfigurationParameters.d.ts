export const ConfigurationParameters: Readonly<{
    input: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
        path: {
            type: string;
            mustExist: boolean;
        };
    };
    exclude: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
    };
    language: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
        exclusiveOf: string;
    };
    format: {
        short: string;
        description: string;
        type: object[];
        required: boolean;
        exclusiveOf: string;
    };
    maxConcurrent: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
        default: number;
    };
    hooks: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
        path: {
            type: string;
            mustExist: boolean;
        };
    };
    output: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
        path: {
            type: string;
            mustExist: boolean;
        };
    };
    parser: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
        exclusiveOf: string;
        path: {
            type: string;
            mustExist: boolean;
        };
    };
    printer: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
        exclusiveOf: string;
        path: {
            type: string;
            mustExist: boolean;
        };
    };
    hookTimeout: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
        default: number;
    };
    mock: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
        path: {
            type: string;
            mustExist: boolean;
        };
    };
    config: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
        path: {
            type: string;
            mustExist: boolean;
        };
    };
    sub: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
        dependent: string;
    };
    debug: {
        short: string;
        description: string;
        type: object[];
        required: boolean;
        default: boolean;
    };
    debugLevel: {
        short: string;
        param: string;
        description: string;
        type: object[];
        required: boolean;
        default: number;
    };
}>;
export const ConfigurationPriorityKeys: readonly string[];
//# sourceMappingURL=ConfigurationParameters.d.ts.map