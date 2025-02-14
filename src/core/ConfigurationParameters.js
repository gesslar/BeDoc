import * as DataUtil from "./util/DataUtil.js"

const {newTypeSpec} = DataUtil

const ConfigurationParameters = Object.freeze({
  input: {
    short: "i",
    param: "file",
    description: "Comma-separated glob patterns to match files",
    type: newTypeSpec("string|string[]"),
    required: true,
    path: {
      type: "file",
      mustExist: true,
    },
  },
  exclude: {
    short: "x",
    param: "file",
    description: "Comma-separated glob patterns to exclude files",
    type: newTypeSpec("string|string[]"),
    required: false,
  },
  language: {
    short: "l",
    param: "lang",
    description: "Language parser to use",
    type: newTypeSpec("string"),
    required: false,
    exclusiveOf: "parser",
  },
  format: {
    short: "f",
    description: "Output format",
    type: newTypeSpec("string"),
    required: false,
    exclusiveOf: "printer",
  },
  maxConcurrent: {
    short: "C",
    param: "num",
    description: "Maximum number of concurrent tasks",
    type: newTypeSpec("number"),
    required: false,
    default: 10,
  },
  hooks: {
    short: "k",
    param: "file",
    description: "Custom hooks JS file",
    type: newTypeSpec("string"),
    required: false,
    path: {
      type: "file",
      mustExist: true,
    },
  },
  output: {
    short: "o",
    param: "dir",
    description: "Output directory",
    type: newTypeSpec("string"),
    required: false,
    path: {
      type: "directory",
      mustExist: true,
    },
  },
  parser: {
    short: "p",
    param: "file",
    description: "Custom parser JS file",
    type: newTypeSpec("string"),
    required: false,
    exclusiveOf: "language",
    path: {
      type: "file",
      mustExist: true,
    },
  },
  printer: {
    short: "P",
    param: "file",
    description: "Custom printer JS file",
    type: newTypeSpec("string"),
    required: false,
    exclusiveOf: "format",
    path: {
      type: "file",
      mustExist: true,
    },
  },
  hookTimeout: {
    short: "T",
    param: "ms",
    description: "Timeout in milliseconds for hook execution",
    type: newTypeSpec("number"),
    required: false,
    default: 5000,
  },
  mock: {
    short: "m",
    param: "dir",
    description: "Path to mock parsers and printers",
    type: newTypeSpec("string"),
    required: false,
    path: {
      type: "directory",
      mustExist: true,
    },
  },
  config: {
    short: "c",
    param: "file",
    description: "Use JSON config file",
    type: newTypeSpec("string"),
    required: false,
    path: {
      type: "file",
      mustExist: true,
    },
  },
  sub: {
    short: "s",
    param: "name",
    description: "Specify a subconfiguration",
    type: newTypeSpec("string"),
    required: false,
    dependent: "config",
  },
  debug: {
    short: "d",
    description: "Enable debug mode",
    type: newTypeSpec("boolean"),
    required: false,
    default: false,
  },
  debugLevel: {
    short: "D",
    param: "level",
    description: "Debug level",
    type: newTypeSpec("number"),
    required: false,
    default: 0,
  },
})

const ConfigurationPriorityKeys = Object.freeze(["exclude", "input"])

export {ConfigurationParameters, ConfigurationPriorityKeys}
