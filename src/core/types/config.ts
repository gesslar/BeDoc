import { FileMap, DirMap }from "./fd.js";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default?: any;
  exclusiveOf?: string;
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
  input?: FileMap[];
  language: string;
  format: string;
  output?: DirMap;
  hooks?: FileMap;
  parser?: FileMap;
  printer?: FileMap;
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

/**
 * The type for options that are comma-separated lists of glob patterns.
 */
export type InputOptions = {
  [key: string]: string | string[] ;
};
