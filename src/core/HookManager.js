import {setTimeout as timeoutPromise} from "timers/promises"
import * as DataUtil from "./util/DataUtil.js"
import * as ValidUtil from "./util/ValidUtil.js"

const {isEmpty, isType, allocateObject} = DataUtil
const {assert} = ValidUtil

const freeze = Object.freeze

const hookEvents = freeze(["start", "section_load", "enter", "exit", "end"])
export const HookPoints = freeze(
  await allocateObject(
    hookEvents.map(event => event.toUpperCase()),
    hookEvents,
  ),
)

export default class HookManager {
  #hooksFile = null
  #log = null
  #hooks = null
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

  get setup() {
    return this.hooks?.setup || null
  }

  get cleanup() {
    return this.hooks?.cleanup || null
  }

  static async new(arg) {
    const instance = new HookManager(arg)
    const debug = instance.log.newDebug()

    debug("Creating new HookManager instance with args: `%o`", 2, arg)

    const hooksFile = instance.hooksFile

    debug("Loading hooks from `%s", 2, hooksFile.absoluteUri)

    debug("Checking hooks file exists: %j", 2, hooksFile)
    const hooksFileContent = await import(hooksFile.absoluteUri)

    debug("Hooks file loaded successfully", 2)

    if(!hooksFileContent)
      throw new Error(`Hooks file is empty: ${hooksFile.absoluteUri}`)

    const hooks = hooksFileContent.default || hooksFileContent.Hooks

    if(!hooks)
      throw new Error(`\`${hooksFile.absoluteUri}\` contains no hooks.`)

    const hooksObj = hooks[instance.action]
    if(isEmpty(hooksObj))
      return null

    debug("Hooks found for action: `%s`", 2, instance.action)

    if(!hooksObj)
      return null

    hooksObj.log = instance.log
    instance.#hooks = hooksObj

    debug("Hooks loaded successfully for `%s`", 2, instance.action)

    return instance
  }

  /**
   * Trigger a hook
   *
   * @param {string} event - The type of hook to trigger
   * @param {...any} args - The hook arguments
   * @returns {Promise<any>} The result of the hook
   */
  async on(event, ...args) {
    const debug = this.log.newDebug()

    debug("Triggering hook for event `%s`", 4, event)

    if(!event)
      throw new Error("Event type is required for hook invocation")

    if(!hookEvents.includes(event))
      throw new Error(`[HookManager.on] Invalid event type: ${event}`)

    const hook = this.hooks[event]

    if(hook) {
      assert(
        isType(hook, "function"),
        `[HookManager.on] Hook "${event}" is not a function`,
        1,
      )

      const hookExecution = await hook.call(this.hooks, ...args)
      const hookTimeout = this.parent.timeout
      const expireAsync = () =>
        timeoutPromise(
          hookTimeout,
          new Error(`Hook execution exceeded timeout of ${hookTimeout}ms`),
        )
      const result = await Promise.race([hookExecution, expireAsync()])

      if(result?.status === "error")
        throw result.error

      debug("Hook executed successfully for event: `%s`", 4, event)

      return result
    }
  }
}
