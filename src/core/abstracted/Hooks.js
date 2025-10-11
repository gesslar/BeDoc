import {FileObject, Sass, Valid} from "@gesslar/toolkit"
import {setTimeout as timeout} from "timers/promises"

/**
 * Generic base class for managing hooks with configurable event types.
 * Provides common functionality for hook registration, execution, and lifecycle management.
 * Designed to be extended by specific implementations.
 */
export default class Hooks {
  #hooksFile = null
  #hooks = null
  #actionKind = null
  #timeout = 1000 // Default 1 second timeout
  #debug = null

  /**
   * Creates a new BaseHookManager instance.
   *
   * @param {object} config - Configuration object
   * @param {string} config.actionKind - Action identifier
   * @param {FileObject} config.hooksFile - File object containing hooks with uri property
   * @param {number} [config.timeOut] - Hook execution timeout in milliseconds
   * @param {unknown} [config.hooks] - The hooks object
   * @param {import('../types.js').DebugFunction} debug - Debug function from Glog.
   */
  constructor({actionKind, hooksFile, hooks, timeOut = 1000}, debug) {
    this.#actionKind = actionKind
    this.#hooksFile = hooksFile
    this.#hooks = hooks
    this.#timeout = timeOut
    this.#debug = debug
  }

  /**
   * Gets the action identifier.
   *
   * @returns {string} Action identifier or instance
   */
  get actionKind() {
    return this.#actionKind
  }

  /**
   * Gets the hooks file object.
   *
   * @returns {FileObject} File object containing hooks
   */
  get hooksFile() {
    return this.#hooksFile
  }

  /**
   * Gets the loaded hooks object.
   *
   * @returns {object|null} Hooks object or null if not loaded
   */
  get hooks() {
    return this.#hooks
  }

  /**
   * Gets the hook execution timeout in milliseconds.
   *
   * @returns {number} Timeout in milliseconds
   */
  get timeout() {
    return this.#timeout
  }

  /**
   * Gets the setup hook function if available.
   *
   * @returns {(args: object) => unknown|null} Setup hook function or null
   */
  get setup() {
    return this.hooks?.setup || null
  }

  /**
   * Gets the cleanup hook function if available.
   *
   * @returns {(args: object) => unknown|null} Cleanup hook function or null
   */
  get cleanup() {
    return this.hooks?.cleanup || null
  }

  /**
   * Static factory method to create and initialize a hook manager.
   * Loads hooks from the specified file and returns an initialized instance.
   * Override loadHooks() in subclasses to customize hook loading logic.
   *
   * @param {object} config - Same configuration object as constructor
   * @param {string|object} config.actionKind - Action identifier or instance
   * @param {FileObject} config.hooksFile - File object containing hooks with uri property
   * @param {number} [config.timeOut] - Hook execution timeout in milliseconds
   * @param {import('../types.js').DebugFunction} debug - The debug function.
   * @returns {Promise<Hooks|null>} Initialized hook manager or null if no hooks found
   */
  static async new(config, debug) {
    debug("Creating new HookManager instance with args: %o", 2, config)

    const instance = new this(config, debug)
    const hooksFile = instance.hooksFile

    debug("Loading hooks from %o", 2, hooksFile.uri)

    debug("Checking hooks file exists: %o", 2, hooksFile.uri)
    if(!await hooksFile.exists)
      throw Sass.new(`No such hooks file, ${hooksFile.uri}`)

    try {
      const hooksImport = await hooksFile.import()

      if(!hooksImport)
        return null

      debug("Hooks file imported successfully as a module", 2)

      const actionKind = instance.actionKind
      if(!hooksImport[actionKind])
        return null

      const hooks = new hooksImport[actionKind]({debug})

      // Attach common properties to hooks
      instance.#hooks = hooks

      debug("Hooks %o loaded successfully for %o", 2, hooksFile.uri, instance.actionKind)

      return instance
    } catch(error) {
      debug("Failed to load hooks %o: %o", 1, hooksFile.uri, error.message)

      return null
    }
  }

  async callHook(kind, activityName, context) {
    const debug = this.#debug
    const hooks = this.#hooks

    if(!hooks)
      return

    const hookName = `${kind}$${activityName}`

    debug("Looking for hook: %o", 4, hookName)

    const hook = hooks[hookName]
    if(!hook)
      return

    debug("Triggering hook: %o", 4, hookName)
    Valid.type(hook, "Function", `Hook "${hookName}" is not a function`)

    const hookExecution = await hook.call(this.#hooks, context)
    const hookTimeout = this.timeout

    const expireAsync = () =>
      timeout(
        hookTimeout,
        Sass.new(`Hook ${hookName} execution exceeded timeout of ${hookTimeout}ms`)
      )

    await Promise.race([hookExecution, expireAsync()])
  }
}
