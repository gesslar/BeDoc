
export const ConfigurationParameters = {
  input: {
    short: "i",
    param: "file",
    description: "Comma-separated glob patterns to match files",
    type: "string|string[]",
    required: true,
    path: {
      type: "file",
      mustExist: true,
    }
  },
  exclude: {
    short: "x",
    param: "file",
    description: "Comma-separated glob patterns to exclude files",
    type: "string|string[]",
    required: false,
  },
  language: {
    short: "l",
    param: "lang",
    description: "Language parser to use",
    type: "string",
    required: false,
    exclusiveOf: "parser",
  },
  format: {
    short: "f",
    description: "Output format",
    type: "string",
    required: false,
    exclusiveOf: "printer",
  },
  hooks: {
    short: "k",
    param: "file",
    description: "Custom hooks JS file",
    type: "string",
    required: false,
    path: {
      type: "file",
      mustExist: true,
    }
  },
  output: {
    short: "o",
    param: "dir",
    description: "Output directory",
    type: "string",
    required: false,
    path: {
      type: "directory",
      mustExist: true,
    }
  },
  parser: {
    short: "p",
    param: "file",
    description: "Custom parser JS file",
    type: "string",
    required: false,
    exclusiveOf: "language",
    path: {
      type: "file",
      mustExist: true,
    }
  },
  printer: {
    short: "P",
    param: "file",
    description: "Custom printer JS file",
    type: "string",
    required: false,
    exclusiveOf: "format",
    path: {
      type: "file",
      mustExist: true,
    }
  },
  mock: {
    short: "m",
    param: "dir",
    description: "Path to mock parsers and printers",
    type: "string",
    required: false,
    path: {
      type: "directory",
      mustExist: true,
    }
  },
  config: {
    short: "c",
    param: "file",
    description: "Use JSON config file",
    type: "string",
    required: false,
    path: {
      type: "file",
      mustExist: true,
    }
  },
  debug: {
    short: "d",
    description: "Enable debug mode",
    type: "boolean",
    required: false,
    default: false,
  },
  debugLevel: {
    short: "D",
    param: "level",
    description: "Debug level",
    type: "number",
    required: false,
    default: 0,
  }
}

export const ConfigurationPriorityKeys = Object.freeze([
  "exclude",
  "input",
])
