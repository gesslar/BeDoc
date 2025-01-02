export default new Map([
  ["input", {
    short: "i",
    param: "file",
    description: "Comma-separated glob patterns to match files",
    type: "string",
    required: false,
  }],
  ["language", {
    short: "l",
    param: "lang",
    description: "Language parser to use",
    type: "string",
    required: true,
  }],
  ["format", {
    short: "f",
    description: "Output format",
    type: "string",
    required: true,
  }],
  ["hooks", {
    short: "k",
    param: "file",
    description: "Custom hooks JS file",
    type: "string",
    required: false,
    default: null,
    subtype: {
      path: {
        type: "file",
        mustExist: true,
      }
    }
  }],
  ["output", {
    short: "o",
    param: "dir",
    description: "Output directory",
    type: "string",
    required: false,
    default: null,
    subtype: {
      path: {
        type: "directory",
        mustExist: true,
      }
    }
  }],
  ["mock", {
    short: "m",
    param: "dir",
    description: "Path to mock parsers and printers",
    type: "string",
    required: false,
    default: null,
    subtype: {
      path: {
        type: "directory",
        mustExist: true,
      }
    }
  }],
  ["config", {
    short: "c",
    param: "file",
    description: "Use JSON config file",
    type: "string",
    required: false,
    default: null,
    subtype: {
      path: {
        type: "file",
        mustExist: true,
      }
    }
  }],
  ["debug", {
    short: "d",
    description: "Enable debug mode",
    type: "boolean",
    required: false,
    default: false,
  }],
  ["debugLevel", {
    short: "D",
    param: "level",
    description: "Debug level",
    type: "number",
    required: false,
    default: 4,
  }],
]);
