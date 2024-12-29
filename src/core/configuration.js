const ConfigurationParameters = new Map([
  ["language", {
    short: "l",
    param: "lang",
    description: "Language parser to use",
    type: "string",
    required: true,
  }],
  ["format", {
    short: "f",
    param: "format",
    description: "Output format",
    type: "string",
    required: true,
  }],
  ["input", {
    short: "i",
    param: "file",
    description: "Input file",
    type: "string[]",
    required: false,
    subtype: {
      path: {
        mustExist: true,
      }
    }
  }],
  ["directory", {
    short: "d",
    param: "dir",
    description: "Directory to process",
    type: "string",
    required: true,
    subtype: {
      path: {
        mustExist: true,
      }
    }
  }],
  ["extension", {
    short: "e",
    param: "ext",
    description: "File extension to filter by",
    type: "string",
    required: false,
    default: null,
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
        mustExist: true,
      }
    }
  }],
  ["mock", {
    short: "m",
    param: "path",
    description: "Path to mock parsers and printers",
    type: "string",
    required: false,
    default: null,
    subtype: {
      path: {
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
        mustExist: true,
      }
    }
  }],
  ["debug", {
    short: "debug",
    param: null,
    description: "Enable debug mode",
    type: "boolean",
    required: false,
    default: false,
  }],
]);

module.exports = ConfigurationParameters;
