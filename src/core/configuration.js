
export const ConfigurationParameters = {
  input: {
    short: "i",
    param: "file",
    description: "Comma-separated glob patterns to match files",
    type: "string",
    required: true,
    subtype: {
      path: {
        type: "file",
        mustExist: true,
      }
    }
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
    subtype: {
      path: {
        type: "file",
        mustExist: true,
      }
    }
  },
  output: {
    short: "o",
    param: "dir",
    description: "Output directory",
    type: "string",
    required: false,
    subtype: {
      path: {
        type: "directory",
        mustExist: true,
      }
    }
  },
  parser: {
    short: "p",
    param: "file",
    description: "Custom parser JS file",
    type: "string",
    required: false,
    exclusiveOf: "language",
    subtype: {
      path: {
        type: "file",
        mustExist: true,
      }
    }
  },
  printer: {
    short: "P",
    param: "file",
    description: "Custom printer JS file",
    type: "string",
    required: false,
    exclusiveOf: "format",
    subtype: {
      path: {
        type: "file",
        mustExist: true,
      }
    }
  },
  mock: {
    short: "m",
    param: "dir",
    description: "Path to mock parsers and printers",
    type: "string",
    required: false,
    subtype: {
      path: {
        type: "directory",
        mustExist: true,
      }
    }
  },
  config: {
    short: "c",
    param: "file",
    description: "Use JSON config file",
    type: "string",
    required: false,
    subtype: {
      path: {
        type: "file",
        mustExist: true,
      }
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
    default: 4,
  }
};
