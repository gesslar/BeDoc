import { CoreOptions }from "./config.js";
import Logger from "../logger.js";
import FDUtil from "../util/fd.js";
import DataUtil from "../util/data.js";
import StringUtil from "../util/string.js";
import ValidUtil from "../util/valid.js";
import ModuleUtil from "../util/module.js";
import { ParseResponse, PrintResponse }from "../types.js";
import { DirMap }from "./fd.js";
import { BaseResponse }from "./common.js";

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
    print: (module: string, content: ParseResponse["result"]) => Promise<PrintResponse>;
  };
  processFiles(): Promise<BaseResponse>;
  outputFile(
    output: DirMap | undefined,
    destFile: string,
    content: string
  ): Promise<{
    destFile: string | null;
    status: string;
    message: string;
  }>;
}
