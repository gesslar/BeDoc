import DataUtil from "../util/DataUtil.js"

const freeze = ob => Object.freeze(ob)
const allocate = (ob,f) => DataUtil.allocateObject(ob,f)

export const FdTypes = freeze(["file", "directory"])

const upperFdTypes = freeze(FdTypes.map(type => type.toUpperCase()))
export const FdType = freeze(await allocate(upperFdTypes, FdTypes))
