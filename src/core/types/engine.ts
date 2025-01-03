import { ParserClass, ParserMeta, ParserMap } from "./parse.js";
import { PrinterClass, PrinterMeta, PrinterMap } from "./print.js";

type EngineExports = {
  meta: ParserMeta | PrinterMeta;
  Parser?: ParserClass;
  Printer?: PrinterClass;
};

const enum Engine {
  PARSER = "parser",
  PRINTER = "printer",
}

type DiscoveredMap = {
  parser: { [key: string]: DiscoveredParser };
  printer: { [key: string]: DiscoveredPrinter };
};

type DiscoveredParser = {
  meta: ParserMeta;
  parser: ParserClass;
};

type DiscoveredPrinter = {
  meta: PrinterMeta;
  printer: PrinterClass;
};

export {
  Engine,
  EngineExports,
  DiscoveredMap,
  DiscoveredParser,
  DiscoveredPrinter,
};
