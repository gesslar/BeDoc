import {Data} from "@gesslar/toolkit"

const ConfigurationParameters = Data.deepFreezeObject({
  input: {
    short: "i",
    param: "file",
    description: "Comma-separated glob patterns to match files",
    type: Data.newTypeSpec("string|string[]"),
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
    type: Data.newTypeSpec("string|string[]"),
    required: false,
  },
  language: {
    short: "l",
    param: "lang",
    description: "Language parser to use",
    type: Data.newTypeSpec("string"),
    required: false,
    exclusiveOf: "parser",
  },
  format: {
    short: "f",
    description: "Output format",
    type: Data.newTypeSpec("string"),
    required: false,
    exclusiveOf: "formatter",
  },
  maxConcurrent: {
    short: "C",
    param: "num",
    description: "Maximum number of concurrent tasks",
    type: Data.newTypeSpec("number"),
    required: false,
    default: 10,
  },
  hooks: {
    short: "k",
    param: "file",
    description: "Custom hooks JS file",
    type: Data.newTypeSpec("string"),
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
    type: Data.newTypeSpec("string"),
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
    type: Data.newTypeSpec("string"),
    required: false,
    exclusiveOf: "language",
    path: {
      type: "file",
      mustExist: true,
    },
  },
  formatter: {
    short: "P",
    param: "file",
    description: "Custom formatter JS file",
    type: Data.newTypeSpec("string"),
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
    type: Data.newTypeSpec("number"),
    required: false,
    default: 5000,
  },
  mock: {
    short: "m",
    param: "dir",
    description: "Path to mock parsers and formatters",
    type: Data.newTypeSpec("string"),
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
    type: Data.newTypeSpec("string"),
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
    type: Data.newTypeSpec("string"),
    required: false,
    dependent: "config",
  },
  debug: {
    short: "d",
    description: "Enable debug mode",
    type: Data.newTypeSpec("boolean"),
    required: false,
    default: false,
  },
  debugLevel: {
    short: "D",
    param: "level",
    description: "Debug level",
    type: Data.newTypeSpec("number"),
    required: false,
    default: 0,
  },
})

const ConfigurationPriorityKeys = Data.deepFreezeObject(["exclude", "input"])

export {
  ConfigurationParameters,
  ConfigurationPriorityKeys
}
