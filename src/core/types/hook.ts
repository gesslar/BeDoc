import { ParsedContent, ParserMeta }from "./parse.js";
import { PrinterMeta }from "./print.js";
import { Status }from "./common.js";
/**
 * Class names for hookable types.
 * These match the actual class names in parsers/printers.
 */
enum HOOK_TYPE {
  PRINT = "Printer",
  PARSE = "Parser",
}

/**
 * Maps class names to their corresponding hook property names.
 * This is used to convert from class names (Printer/Parser) to
 * the property names used in hook objects (print/parse).
 */
enum CLASS_TO_HOOK_MAP {
  Printer = "print",
  Parser = "parse",
}

/**
 * Available hook points for printers.
 */
enum PRINT_HOOKS {
  START = "start",
  SECTION_LOAD = "load",
  ENTER = "enter",
  EXIT = "exit",
  END = "end",
}

/**
 * Available hook points for parsers.
 * Currently matches PRINT_HOOKS but may diverge in the future.
 */
enum PARSE_HOOKS {
  START = "start",
  SECTION_LOAD = "load",
  ENTER = "enter",
  EXIT = "exit",
  END = "end",
}

// Base response type for hooks
type HookResponse = {
  status: Status;
  error?: Error;
  [key: string]: unknown;
};

// Section type for documentation sections
type DocSection = {
  type?: string;
  name?: string;
  content?: string[];
  [key: string]: unknown;
};

type HookStart = {
  module: string;
  content: ParsedContent;
};

type HookEnd = {
  module: string;
  content: ParsedContent;
  output: string[];
};

type HookLoad = {
  section: DocSection;
  meta: PrinterMeta | ParserMeta;
};

type HookEnter = {
  name: string;
  section: DocSection;
  meta: PrinterMeta | ParserMeta;
};

type HookExit = {
  name: string;
  section: DocSection;
  meta: PrinterMeta | ParserMeta;
};

type HookPoints = HookStart | HookEnd | HookLoad | HookEnter | HookExit;

type Hook = (args: HookPoints) => Promise<HookResponse | void>;
type Hooks = { [K in CLASS_TO_HOOK_MAP]?: Hook };

type Hookable = {
  constructor: { name: string };
  hooks?: Hooks;
  hook?: (event: HOOK_TYPE, args: HookPoints) => Promise<void>;
  HOOKS?: typeof PRINT_HOOKS | typeof PARSE_HOOKS;
};

export {
  HOOK_TYPE,
  CLASS_TO_HOOK_MAP,
  PRINT_HOOKS,
  PARSE_HOOKS,
  Hook,
  Hooks,
  HookPoints,
  HookResponse,
  DocSection,
  Hookable,
};
