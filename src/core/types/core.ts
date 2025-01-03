import { CoreOptions } from "./config.js";
import Logger from "../logger.js";
import FDUtil from "../util/fd.js";
import DataUtil from "../util/data.js";
import StringUtil from "../util/string.js";
import ValidUtil from "../util/valid.js";
import ModuleUtil from "../util/module.js";
import { ParseResponse, PrintResponse } from "../types.js";

export interface ICore {
  options: CoreOptions;
  logger: Logger;
  fdUtil: FDUtil;
  string: typeof StringUtil;
  valid: typeof ValidUtil;
  module: typeof ModuleUtil;
  data: typeof DataUtil;
  parser: {
    parse: (file: string, content: string) => Promise<ParseResponse>;
  };
  printer: {
    print: (module: string, content: any) => Promise<PrintResponse>;
  };
  processFiles(): Promise<{
    status: string;
    message: string;
  }>;
  outputFile(
    output: string | undefined,
    destFile: string,
    content: string
  ): Promise<{
    destFile: string | null;
    status: string;
    message: string;
  }>;
}
