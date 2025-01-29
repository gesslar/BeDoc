import TypeSpec from './util/TypeSpec';

interface PathConfig {
  type: 'file' | 'directory';
  mustExist: boolean;
}

interface ConfigurationParameter {
  short: string;
  param?: string;
  description: string;
  type: TypeSpec;
  required: boolean;
  default?: boolean | number | string;
  path?: PathConfig;
  exclusiveOf?: string;
}

interface ConfigurationParametersType {
  input: ConfigurationParameter;
  exclude: ConfigurationParameter;
  language: ConfigurationParameter;
  format: ConfigurationParameter;
  maxConcurrent: ConfigurationParameter;
  hooks: ConfigurationParameter;
  output: ConfigurationParameter;
  parser: ConfigurationParameter;
  printer: ConfigurationParameter;
  hookTimeout: ConfigurationParameter;
  mock: ConfigurationParameter;
  config: ConfigurationParameter;
  debug: ConfigurationParameter;
  debugLevel: ConfigurationParameter;
}

export const ConfigurationParameters: Readonly<ConfigurationParametersType>;
export const ConfigurationPriorityKeys: readonly ['exclude', 'input'];
//# sourceMappingURL=ConfigurationParameters.d.ts.map
