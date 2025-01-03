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

type Hook = (...args: any[]) => Promise<any>;
type Hooks = { [key: string]: Hook };

export {
  HOOK_TYPE,
  CLASS_TO_HOOK_MAP,
  PRINT_HOOKS,
  PARSE_HOOKS,
  Hook,
  Hooks,
};
