import { EnvironmentType } from './Core';

interface ConfigurationOption {
    value: unknown;
    source: string;
}

interface ConfigurationOptions {
    [key: string]: ConfigurationOption;
}

interface ValidateParams {
    options: ConfigurationOptions;
    source: EnvironmentType;
}

interface ValidationResult {
    status: 'success';
    validated: boolean;
    [key: string]: unknown;
}

export default class Configuration {
    validate({ options, source }: ValidateParams): Promise<ValidationResult>;
    #private;
}
//# sourceMappingURL=Configuration.d.ts.map
