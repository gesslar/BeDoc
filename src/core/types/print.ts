import { Engine } from "./engine.js";

type PrinterMap = { [key in PrinterKey]: PrinterMeta | PrinterClass };
type PrinterKey = "meta" | Engine.PRINTER;
type PrinterValue = PrinterMeta | PrinterClass;

type PrintResponse = {
  status: "success" | "error";
  destFile?: string;
  content?: string;
  file?: string;
  line?: string;
  message?: string;
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
