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
  [key: string]: unknown;
};
