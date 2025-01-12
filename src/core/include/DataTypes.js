const DataTypes = [
  // Primitives
  'undefined', 'boolean', 'number', 'bigint', 'string', 'symbol',

  // Object Categories from typeof
  'object', 'function',
]

const Constructors = [
  // Object Constructors
  'Object', 'Array', 'Function', 'Date', 'RegExp', 'Error',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise',
  'Int8Array', 'Uint8Array', 'Float32Array', 'Float64Array',
]

const types = [
  ...DataTypes,
  ...Constructors.map(c => c.toLowerCase())
]

const emptyableTypes = [
  "string", "array", "object"
]

export { types, emptyableTypes }
