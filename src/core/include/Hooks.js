import DataUtil from "../util/DataUtil.js"

const freeze = Object.freeze
const allocate = DataUtil.allocateObject

export const HookClasses = freeze(["Printer", "Parser"])
export const HookTypes = freeze(["print", "parse"])
export const HookEvents = freeze(["start", "section_load", "enter", "exit", "end"])

export const ClassToHook = freeze(allocate(HookClasses, HookTypes))
export const HookToClass = freeze(allocate(HookTypes, HookClasses))

const upperEvents = freeze(HookEvents.map(event => event.toUpperCase()))
export const PrintHooks = freeze(allocate(upperEvents, HookEvents))
export const ParseHooks = freeze(allocate(upperEvents, HookEvents))

export const Hooks = freeze(allocate(HookTypes, [PrintHooks, ParseHooks]))
