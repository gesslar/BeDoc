import Logger from './Logger'
import HookManager, {HookPoints} from './HookManager'

export type MetaActionType = "print" | "parse"

export interface MetaDefinition {
  action: MetaActionType
}

export interface ParseMetaDefinition extends MetaDefinition {
  action: "parse"
  language: string
}

export interface PrintMetaDefinition extends MetaDefinition {
  action: "print"
  format: string
}

export type MetaType = ParseMetaDefinition | PrintMetaDefinition

export interface ActionDefinition {
  meta: MetaType
  setup?: (params: { parent: ActionManager; log: Logger }) => void
  run({ module, content }: { module: string; content: object }): Promise<string>
  hook?: (event: string, ...args: unknown[]) => Promise<unknown>

  HOOKS?: HookPoints
}

export interface PrintActionDefinition extends ActionDefinition {
  meta: PrintMetaDefinition
}

export interface ParseActionDefinition extends ActionDefinition {
  meta: ParseMetaDefinition
}

export default class ActionManager {
  constructor(actionDefinition: ActionDefinition, logger: Logger)
  get action(): ActionDefinition
  set hookManager(hookManager: HookManager)
  get hookManager(): HookManager
  get contract(): string
  get meta(): MetaType
  get log(): Logger
  setupAction(): Promise<void>
  runAction({ file, content }: {
    file: string
    content: string
  }): Promise<string>
  cleanupAction(): Promise<void>
  toString(): string
  #private
}

export type ActionContract = string
//# sourceMappingURL=ActionManager.d.ts.map
