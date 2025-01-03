enum HOOK_TYPE {
  PRINT = "Printer",
  PARSE = "Parser",
}

enum HOOK_UP {
  Printer = "print",
  Parser = "parse",
}

enum PRINT_HOOKS {
  START = "start",
  SECTION_LOAD = "load",
  ENTER = "enter",
  EXIT = "exit",
  END = "end",
}

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
  HOOK_UP,
  PRINT_HOOKS,
  PARSE_HOOKS,
  Hook,
  Hooks,
};
