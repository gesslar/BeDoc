import FileUtil from "./util/FDUtil.js"
import DataUtil from "./util/DataUtil.js"
import StringUtil from "./util/StringUtil.js"
import { Hooks, HookEvents, HookTypes, HookClasses, ClassToHook } from "./include/Hooks.js"
import {setTimeout} from "timers/promises"

export default class HookManager {
  constructor(core) {
    this.core = core
    this.fileUtil = new FileUtil()
    this.hooks = {}
    this.logger = core.logger
    this.debug = this.logger.newDebug()

    this.debug("Initialized HookManager", 2)
  }

  /**
   * Load hooks from a file
   * @returns {Promise<void>} The type of hooks attached
   */
  async load() {
    const debug = this.debug
    debug("Starting to load hooks file", 2)

    const hooksFile = this.core.options.hooks
    if(!hooksFile) {
      debug("No hooks file specified, exiting", 3)
      return
    }

    debug(`Loading hooks from \`${hooksFile.absoluteUri}\``, 3)
    this.hooks = await import(hooksFile.absoluteUri)
    debug("Hooks file loaded successfully", 2)
  }

  /**
   * Retrieves available hooks
   * @returns {Promise<object>} The available hooks
   */
  async getAvailableHooks() {
    this.debug("Retrieving available hooks", 3)
    return this.hooks || await DataUtil.allocateObject(HookTypes, () => [])
  }

  /**
   * Attach hooks to a target
   * @param {object} target - The target to attach hooks to
   * @returns {Promise<string>} The type of hooks attached
   */
  async attachHooks(target) {
    const debug = this.debug

    debug(`Attaching hooks to \`${target.constructor?.name}\``, 2)

    if(!target.constructor?.name)
      throw new Error("Target must have a constructor name")

    const name = target.constructor.name
    if(!HookClasses.includes(name))
      throw new Error(`[HookManager.attachHooks] Invalid target type: ${name}`)

    const availableHooks = await this.getAvailableHooks()
    if(!availableHooks) {
      debug("No hooks available", 2)
      return
    }

    const hookType = ClassToHook[name]
    target.hooks = target.hooks || {}

    const attachedHooks = target.hooks[hookType] || {}
    if(!DataUtil.objectIsEmpty(attachedHooks))
      throw new Error(`[HookManager.attachHooks] Hooks already attached for \`${hookType}\``)

    const hooksForClass = availableHooks[hookType]
    if(!hooksForClass || DataUtil.objectIsEmpty(hooksForClass)) {
      debug(`No hooks available for \`${hookType}\``, 2)
      return
    }

    attachedHooks[hookType] = hooksForClass
    target.hooks = attachedHooks
    target.hook = this.on
    target.HOOKS = Hooks

    // Let's inject some utilities
    target.string = StringUtil

    debug(`Successfully attached hooks for ${hookType}`, 2)
    return name
  }

  /**
   * Trigger a hook
   * @param {string} event - The type of hook to trigger
   * @param {...any} args - The hook arguments
   * @returns {Promise<any>} The result of the hook
   */

  //TODO: #24 Add timeouts to hook calls @gesslar

  async on(event, ...args) {
    const debug = this.logger.newDebug()

    debug(`Triggering hook for event: ${event}`, 3)

    if(!event)
      throw new Error("Event type is required for hook invocation")

    if(!HookEvents.includes(event))
      throw new Error(`[HookManager.on] Invalid event type: ${event}`)

    const thisClass = this.constructor?.name
    if(!thisClass)
      throw new Error("This class must have a constructor name")

    const allHooks = this.hooks
    if(!allHooks) {
      debug("No hooks available to trigger", 3)
      return
    }

    const hookType = ClassToHook[thisClass]
    const hooks = allHooks[hookType]
    if(!hooks) {
      debug(`No hooks found for type: ${hookType}`, 3)
      return
    }

    const hook = hooks[event]
    if(!hook) {
      debug(`No specific hook found for event: ${event}`, 3)
      return
    }

    if(typeof hook !== "function")
      throw new Error(`[HookManager.on] Hook "${event}" is not a function`)

    const hookTimeout = this.core.options["hook-timeout"]
    const hookExecution = hook(...args)
    const result = await Promise.race([
      hookExecution,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Hook "${event}" timed out after ${hookTimeout}ms`)), hookTimeout)
      )
    ])

    if(result?.status === "error")
      throw result.error

    debug(`Hook executed successfully for event: ${event}`, 3)

    return result
  }
}
