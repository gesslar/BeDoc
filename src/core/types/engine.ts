import { ParserClass, ParserMeta, ParserMap }from "./parse.js";
import { PrinterClass, PrinterMeta, PrinterMap }from "./print.js";

type EngineExports = {
  meta: ParserMeta | PrinterMeta;
  Parser?: ParserClass;
  Printer?: PrinterClass;
};

const enum Engine {
  PARSER = "parser",
  PRINTER = "printer",
}

const EngineClass = {
  Parser: "Parser",
  Printer: "Printer",
} as const;

type Discovered = {
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

type DiscoveredEngines = DiscoveredParser | DiscoveredPrinter;

type ModuleSource = {
  path: string;
  absoluteUri: string;
};

export {
  Engine,
  EngineExports,
  EngineClass,
  Discovered,
  DiscoveredEngines,
  DiscoveredParser,
  DiscoveredPrinter,
  ModuleSource,
};
