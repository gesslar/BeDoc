import DataUtil from "../util/DataUtil.js"

const freeze = Object.freeze
const allocate = DataUtil.allocateObject

export const FdTypes = freeze(["file", "directory"])

const upperFdTypes = freeze(FdTypes.map(type => type.toUpperCase()))
export const FdType = freeze(allocate(upperFdTypes, FdTypes))
