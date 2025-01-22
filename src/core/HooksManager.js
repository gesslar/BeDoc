import {setTimeout as timeoutPromise} from "timers/promises"

import * as DataUtil from "./util/DataUtil.js"
import * as ValidUtil from "./util/ValidUtil.js"

const {isEmpty, isType, allocateObject} = DataUtil
const {assert} = ValidUtil

const freeze = Object.freeze

const hookEvents = freeze(["start", "section_load", "enter", "exit", "end"])
const hookPoints = freeze(
  await allocateObject(
    hookEvents.map((event) => event.toUpperCase()),
    hookEvents,
  ),
)

class HooksManager {
  #hooksFile = null
  #log = null
  #hooks = {}
  #action = null
  #timeout = 1

  constructor({action, hooksFile, logger, timeOut: timeout}) {
    this.#action = action
    this.#hooksFile = hooksFile
    this.#log = logger
    this.#timeout = timeout
  }

  get action() {
    return this.#action
  }

  get hooksFile() {
    return this.#hooksFile
  }

  get hooks() {
    return this.#hooks
  }

  get log() {
    return this.#log
  }

  get timeout() {
    return this.#timeout
  }

  static async new(arg) {
    const instance = new HooksManager(arg)
    const debug = instance.log.newDebug()
    const hooksFile = instance.hooksFile

    debug(`Loading hooks from \`${hooksFile.absoluteUri}\``, 2)

    const hooksFileContent = await import(hooksFile.absoluteUri)

    debug("Hooks file loaded successfully", 2)

    if(!hooksFileContent)
      throw new Error(`Hooks file is empty: ${hooksFile.absoluteUri}`)

    const hooks = hooksFileContent.default || hooksFileContent.Hooks

    if(!hooks)
      throw new Error(`\`${hooksFile.absoluteUri}\` contains no hooks.`)

    const hooksObj = hooks[instance.action]
    if(isEmpty(hooksObj)) {
      instance.log.warn(`No hooks found for action: \`${instance.action}\``)
      return null
    }

    debug(`Hooks found for action: \`${instance.action}\``, 2)

    if(!hooksObj) return null

    instance.#hooks = hooksObj

    debug(`Hooks loaded successfully for ${instance.action}`, 1)

    return instance
  }

  /**
   * Trigger a hook
   * @param {string} event - The type of hook to trigger
   * @param {...any} args - The hook arguments
   * @returns {Promise<any>} The result of the hook
   */

  async on(event, ...args) {
    const debug = this.log.newDebug()

    debug(`Triggering hook for event: ${event}`, 3)

    if(!event) throw new Error("Event type is required for hook invocation")

    if(!hookEvents.includes(event))
      throw new Error(`[HookManager.on] Invalid event type: ${event}`)

    const hook = this.hooks[event]

    if(hook) {
      assert(
        isType(hook, "function"),
        `[HookManager.on] Hook "${event}" is not a function`,
        1,
      )
      const hookExecution = await hook(...args)
      const hookTimeout = this.parent.timeout
      const expireAsync = () =>
        timeoutPromise(
          hookTimeout,
          new Error(`Hook execution exceeded timeout of ${hookTimeout}ms`),
        )
      const result = await Promise.race([hookExecution, expireAsync()])

      if(result?.status === "error") throw result.error

      debug(`Hook executed successfully for event: ${event}`, 3)

      return result
    }
  }
}

export {
  // Class
  HooksManager,
  // Constants
  hookPoints,
}
