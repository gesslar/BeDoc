import FileUtil from "./util/FDUtil.js"
import DataUtil from "./util/DataUtil.js"
import { Hooks, HookEvents, HookTypes, HookClasses, ClassToHook } from "./include/hooks.js"

export default class HookManager {
  constructor(core) {
    this.core = core
    this.fileUtil = new FileUtil()
    this.hooks = {}
  }

  /**
   * Load hooks from a file
   *
   * @returns The type of hooks attached
   */
  load = async() => {
    const hooksFile = this.core.options.hooks
    if(!hooksFile)
      return

    const hooks = await import(hooksFile.absoluteUri)

    this.hooks = hooks
  }

  getAvailableHooks = () =>
    this.hooks ||
    DataUtil.allocate(HookTypes, _ => [])

  /**
   * Attach hooks to a target
   *
   * @param target - The target to attach hooks to
   * @returns The type of hooks attached
   */
  attachHooks = target => {
    if(!target.constructor?.name)
      throw new Error("[attachHooks] Target must have a constructor name")

    const name = target.constructor.name
    if(!HookClasses.includes(name))
      throw new Error(`[attachHooks] Invalid target type: ${name}`)

    const availableHooks = this.getAvailableHooks()
    if(!availableHooks)
      throw new Error("[attachHooks] No hooks available")

    const hookType = ClassToHook[name]
    target.hooks = target.hooks || {}

    const attachedHooks = target.hooks[hookType] || {}
    if(!DataUtil.objectIsEmpty(attachedHooks))
      throw new Error(`[attachHooks] Hooks already attached for \`${hookType}\``)

    const hooksForClass = availableHooks[hookType]
    if(!hooksForClass || DataUtil.objectIsEmpty(hooksForClass))
      throw new Error(`[attachHooks] No hooks available for \`${hookType}\``)

    attachedHooks[hookType] = hooksForClass
    target.hooks = attachedHooks
    target.hook = this.on
    target.HOOKS = Hooks

    return name
  }

  /**
   * Trigger a hook
   *
   * @param event - The type of hook to trigger
   * @param ...args - The hook arguments
   * @returns The result of the hook
   */
  async on(event, ...args) {
    if(!event)
      throw new Error("[on] Event type is required for hook invocation")
    if(!HookEvents.includes(event))
      throw new Error(`[on] Invalid event type: ${event}`)

    const thisClass = this.constructor?.name
    if(!thisClass)
      throw new Error("[on] This class must have a constructor name")

    const allHooks = this.hooks
    if(!allHooks)
      return

    const hookType = ClassToHook[thisClass]
    const hooks = allHooks[hookType]
    if(!hooks)
      return

    const hook = hooks[event]
    if(!hook)
      return

    if(hook) {
      if(typeof hook !== "function")
        throw new Error(`[on] Hook "${event}" is not a function`)

      try {
        const result = await hook(...args)
        if(result?.status === "error")
          throw result.error
        return result
      } catch(error) {
        this.logger.error(`[on] Error executing hook "${event}": ${error.message}`)
        throw error
      }
    }
  }
}
