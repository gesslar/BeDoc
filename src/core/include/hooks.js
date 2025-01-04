export const CLASS_TO_HOOK = Object.freeze({
  Printer: "print",
  Parser: "parse",
});

export const HOOK_TO_CLASS = Object.freeze({
  print: "Printer",
  parse: "Parser",
});

export const PRINT_HOOKS = Object.freeze({
  START: "start",
  SECTION_LOAD: "load",
  ENTER: "enter",
  EXIT: "exit",
  END: "end",
});

export const PARSE_HOOKS = Object.freeze({
  START: "start",
  SECTION_LOAD: "load",
  ENTER: "enter",
  EXIT: "exit",
  END: "end",
});
