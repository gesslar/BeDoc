import { Engine } from "./engine.js";
import { BaseResponse } from "./common.js";

type PrinterMap = { [key in PrinterKey]: PrinterMeta | PrinterClass };
type PrinterKey = "meta" | Engine.PRINTER;
type PrinterValue = PrinterMeta | PrinterClass;

/**
 * Response type for print operations that produce content
 */
type ContentResponse = BaseResponse & {
  content?: string;
  destFile?: string;
};

type PrintResponse = ContentResponse & {
  file?: string;
  line?: string;
};

type PrinterMeta = {
  format: string;
  formatExtension: string;
};

type PrinterClass = {
  new(core: any): {
    print: (module: string, content: any) => Promise<PrintResponse>;
  };
};

export {
  PrinterClass,
  PrinterKey,
  PrinterMap,
  PrinterMeta,
  PrinterValue,
  PrintResponse,
};
