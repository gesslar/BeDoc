export type PathSubtype = {
  type: "file" | "directory";
  mustExist: boolean;
};

export type ConfigParameter = {
  short?: string;
  param?: string;
  description: string;
  type: string;
  required: boolean;
  default?: any;
  subtype?: {
    path?: PathSubtype;
  };
};

/**
 * The strict type for core options after validation.
 * This type is used internally by the Core class.
 */
export type CoreOptions = {
  env: string;
  mock?: string;
  input?: string | string[];
  language: string;
  format: string;
  output?: string;
  hooks?: string;
  debug?: boolean;
  debugLevel?: number;
};

/**
 * The type for user-provided options before validation.
 * This type allows unknown keys but will be validated and
 * converted to CoreOptions.
 */
export type UserOptions = Partial<CoreOptions> & {
  [key: string]: unknown;
};
