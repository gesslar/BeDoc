import DataUtil from "../util/DataUtil.js"

const freeze = Object.freeze
const allocate = DataUtil.allocateObject

export const HookClasses = freeze(["Printer", "Parser"])
export const HookTypes = freeze(["print", "parse"])
export const HookEvents = freeze(["start", "section_load", "enter", "exit", "end"])

export const ClassToHook = freeze(await allocate(HookClasses, HookTypes))
export const HookToClass = freeze(await allocate(HookTypes, HookClasses))

const upperEvents = freeze(HookEvents.map(event => event.toUpperCase()))
export const PrintHooks = freeze(await allocate(upperEvents, HookEvents))
export const ParseHooks = freeze(await allocate(upperEvents, HookEvents))

export const Hooks = freeze(await allocate(HookTypes, [PrintHooks, ParseHooks]))
