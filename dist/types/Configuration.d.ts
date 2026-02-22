export default class Configuration {
    validate({ options, source }: {
        options: any;
        source: any;
    }): Promise<{
        status: string;
        validated: boolean;
    }>;
    #private;
}
//# sourceMappingURL=Configuration.d.ts.map