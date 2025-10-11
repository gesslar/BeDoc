import c from "@gesslar/colours"
import {Data, Term, Util} from "@gesslar/toolkit"

// ErrorStackParser will be dynamically imported when needed

/**
 * Enhanced Global logging utility that combines simple logging with advanced Glog features.
 *
 * Can be used in multiple ways:
 * 1. Simple function call: Glog(data)
 * 2. With levels: Glog(2, "debug message")
 * 3. Configured instance: new Glog(options)
 * 4. Fluent setup: Glog.create().withName("App").withColors()
 * 5. Traditional logger: logger.debug("message", level)
 */

// Enhanced color system using @gesslar/colours
export const loggerColours = {
  debug: [
    "{F019}", // Debug level 0: Dark blue
    "{F027}", // Debug level 1: Medium blue
    "{F033}", // Debug level 2: Light blue
    "{F039}", // Debug level 3: Teal
    "{F044}", // Debug level 4: Blue-tinted cyan
  ],
  info: "{F036}",    // Medium Spring Green
  warn: "{F214}",    // Orange1
  error: "{F196}",   // Red1
  reset: "{/}",      // Reset
}

// Set up convenient aliases for common log colors
c.alias.set("debug", "{F033}")
c.alias.set("info", "{F036}")
c.alias.set("warn", "{F214}")
c.alias.set("error", "{F196}")
c.alias.set("success", "{F046}")
c.alias.set("muted", "{F244}")
c.alias.set("bold", "{<B}")
c.alias.set("dim", "{<D}")

class Glog {
  // Static properties (for global usage)
  static logLevel = 0
  static logPrefix = ""
  static colors = null
  static stackTrace = false
  static name = ""

  // Instance properties (for configured loggers)
  #logLevel = 0
  #logPrefix = ""
  #colors = null
  #stackTrace = false
  #name = ""
  #vscodeError = null
  #vscodeWarn = null
  #vscodeInfo = null

  constructor(options = {}) {
    this.setOptions(options)

    // VSCode integration if specified
    if(options.env === "extension") {
      try {
        const vscode = require("vscode")

        this.#vscodeError = vscode.window.showErrorMessage
        this.#vscodeWarn = vscode.window.showWarningMessage
        this.#vscodeInfo = vscode.window.showInformationMessage
      } catch {
        // VSCode not available, ignore
      }
    }
  }

  // === CONFIGURATION METHODS ===

  setOptions(options) {
    this.#name = options.name ?? this.#name
    this.#logLevel = options.debugLevel ?? options.logLevel ?? this.#logLevel
    this.#logPrefix = options.prefix ?? this.#logPrefix
    this.#colors = options.colors ?? this.#colors
    this.#stackTrace = options.stackTrace ?? this.#stackTrace

    return this
  }

  // === STATIC CONFIGURATION (for global usage) ===

  static setLogPrefix(prefix) {
    this.logPrefix = prefix

    return this
  }

  static setLogLevel(level) {
    this.logLevel = Data.clamp(level, 0, 5)

    return this
  }

  static withName(name) {
    this.name = name

    return this
  }

  static withColors(colors = loggerColours) {
    this.colors = colors

    return this
  }

  static withStackTrace(enabled = true) {
    this.stackTrace = enabled

    return this
  }

  // === FLUENT INSTANCE CREATION ===

  static create(options = {}) {
    return new Glog(options)
  }

  withName(name) {
    this.#name = name

    return this
  }

  withLogLevel(level) {
    this.#logLevel = level

    return this
  }

  withPrefix(prefix) {
    this.#logPrefix = prefix

    return this
  }

  withColors(colors = loggerColours) {
    this.#colors = colors

    return this
  }

  withStackTrace(enabled = true) {
    this.#stackTrace = enabled

    return this
  }

  // === UTILITY METHODS ===

  get name() {
    return this.#name
  }

  get debugLevel() {
    return this.#logLevel
  }

  get options() {
    return {
      name: this.#name,
      debugLevel: this.#logLevel,
      prefix: this.#logPrefix,
      colors: this.#colors,
      stackTrace: this.#stackTrace
    }
  }

  #compose(level, message, debugLevel = 0) {
    const colors = this.#colors || Glog.colors || loggerColours
    const name = this.#name || Glog.name || "Log"
    const tag = Util.capitalize(level)

    if(!colors) {
      return `[${name}] ${tag}: ${message}`
    }

    if(level === "debug") {
      const colorCode = colors[level][debugLevel] || colors[level][0]

      return c`[${name}] ${colorCode}${tag}{/}: ${message}`
    }

    return c`[${name}] ${colors[level]}${tag}{/}: ${message}`
  }

  // Stack trace functionality - simplified for now
  extractFileFunction() {
    // Simple fallback - just return a basic tag
    return "caller"
  }

  newDebug(tag) {
    return function(message, level, ...arg) {
      if(this.#stackTrace || Glog.stackTrace) {
        tag = this.extractFileFunction()
      }

      this.debug(`[${tag}] ${message}`, level, ...arg)
    }.bind(this)
  }

  // === LOGGING METHODS ===

  #log(...args) {
    let level, rest

    if(args.length === 0) {
      [level = 0, rest = [""]] = []
    } else if(args.length === 1) {
      [rest, level = 0] = [args, 0]
    } else {
      [level, ...rest] = typeof args[0] === "number" ? args : [0, ...args]
    }

    const currentLevel = this.#logLevel || Glog.logLevel

    if(level > currentLevel)
      return

    const prefix = this.#logPrefix || Glog.logPrefix

    prefix && Term.log(prefix, ...rest) || Term.log(...rest)
  }

  // Traditional logger methods
  debug(message, level = 0, ...arg) {
    const currentLevel = this.#logLevel || Glog.logLevel

    if(level <= currentLevel) {
      Term.debug(this.#compose("debug", message, level), ...arg)
    }
  }

  info(message, ...arg) {
    Term.info(this.#compose("info", message), ...arg)
    this.#vscodeInfo?.(JSON.stringify(message))
  }

  warn(message, ...arg) {
    Term.warn(this.#compose("warn", message), ...arg)
    this.#vscodeWarn?.(JSON.stringify(message))
  }

  error(message, ...arg) {
    Term.error(this.#compose("error", message), ...arg)
    this.#vscodeError?.(JSON.stringify(message))
  }

  // Core execute method for simple usage
  static execute(...args) {
    // Use static properties for global calls
    let level, rest

    if(args.length === 0) {
      [level = 0, rest = [""]] = []
    } else if(args.length === 1) {
      [rest, level = 0] = [args, 0]
    } else {
      [level, ...rest] = typeof args[0] === "number" ? args : [0, ...args]
    }

    if(level > this.logLevel)
      return

    if(this.logPrefix) {
      Term.log(this.logPrefix, ...rest)
    } else {
      Term.log(...rest)
    }
  }

  // Instance execute for configured loggers
  execute(...args) {
    this.#log(...args)
  }

  // === ENHANCED METHODS WITH @gesslar/colours ===

  /**
   * Log a colorized message using template literals
   *
   * @param {Array<string>} strings - Template strings
   * @param {...unknown} values - Template values
   * @example logger.colorize`{success}Operation completed{/} in {bold}${time}ms{/}`
   */
  colorize(strings, ...values) {
    const message = c(strings, ...values)
    const name = this.#name || Glog.name || "Log"

    Term.log(`[${name}] ${message}`)
  }

  /**
   * Static version of colorize for global usage
   *
   * @param {Array<string>} strings - Template strings
   * @param {...unknown} values - Template values
   */
  static colorize(strings, ...values) {
    const message = c(strings, ...values)
    const name = this.name || "Log"

    Term.log(`[${name}] ${message}`)
  }

  /**
   * Log a success message with green color
   *
   * @param {string} message - Success message
   * @param {...unknown} args - Additional arguments
   */
  success(message, ...args) {
    Term.log(c`[${this.#name || Glog.name || "Log"}] {success}Success{/}: ${message}`, ...args)
  }

  /**
   * Static success method
   *
   * @param {string} message - Success message to log
   * @param {...unknown} args - Additional arguments to log
   */
  static success(message, ...args) {
    Term.log(c`[${this.name || "Log"}] {success}Success{/}: ${message}`, ...args)
  }

  /**
   * Set a color alias for convenient usage
   *
   * @param {string} alias - Alias name
   * @param {string} colorCode - Color code (e.g., "{F196}" or "{<B}")
   * @returns {Glog} The Glog class for chaining.
   */
  static setAlias(alias, colorCode) {
    c.alias.set(alias, colorCode)

    return this
  }

  /**
   * Get access to the colours template function for instance usage
   *
   * @returns {import('@gesslar/colours')} The colours template function from \@gesslar/colours
   */
  get colours() {
    return c
  }
}

// Wrap in proxy for dual usage
export default new Proxy(Glog, {
  apply(target, thisArg, argumentsList) {
    return target.execute(...argumentsList)
  },
  construct(target, argumentsList) {
    return new target(...argumentsList)
  },
  get(target, prop, receiver) {
    if(prop === "execute") {
      return undefined
    }

    return Reflect.get(target, prop, receiver)
  }
})
