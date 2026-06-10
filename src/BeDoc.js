import {Contract} from "@gesslar/negotiator"
import {Data, Sass, Tantrum} from "@gesslar/toolkit"
import {hrtime} from "node:process"

import Configuration from "./Configuration.js"
import Conveyor from "./Conveyor.js"
import Discovery from "./Discovery.js"

/**
 * @import {DirectoryObject, FileObject, Glog} from "@gesslar/toolkit"
 */

export default class BeDoc {
  #glog
  #options
  #actionDefs
  #validCrit
  #validSchemas
  #contract
  #actions
  #validateBeDocSchema
  #hooks
  #basePath
  #cli

  constructor({basePath, glog, cliOutput}) {
    this.#glog = glog
    this.#basePath = basePath
    this.#cli = cliOutput
  }

  /**
   * Resolve and validate configuration from all sources (CLI, environment,
   * package.json, config file). This runs independently of any BeDoc instance
   * so the resulting config object can be built first and shared with other
   * consumers (e.g. CLIOutput) before a BeDoc instance exists.
   *
   * @param {object} args
   * @param {object} args.options - The raw options (with sources) to resolve
   * @param {string} args.source - The environment BeDoc is running in
   * @returns {Promise<object>} The validated configuration object
   */
  static async resolveConfig({options, source}) {
    const config = new Configuration()

    return await config.validate({options, source})
  }

  /**
   * Create a new instance of BeDoc.
   *
   * Configuration may be supplied pre-resolved (via {@link resolveConfig}) when
   * a caller needs the config object before the instance exists — e.g. the CLI
   * resolves it first to share with CLIOutput. Otherwise pass raw `options` and
   * `source` and BeDoc resolves them itself, so any environment can construct a
   * BeDoc in a single call.
   *
   * @param {object} args
   * @param {object} [args.config] - Pre-validated configuration (see resolveConfig)
   * @param {object} [args.options] - Raw options to resolve, if config is absent
   * @param {string} [args.source] - The environment BeDoc is running in
   * @param {DirectoryObject} [args.basePath] - The project base path
   * @param {Glog} args.glog - The Glog logger instance
   * @param {Function} args.validateBeDocSchema - The action schema validator
   * @param {object} args.cliOutput - The CLI output instance
   * @returns {Promise<BeDoc>} A new instance of BeDoc
   */
  static async new({
    config, options, source, basePath, glog, validateBeDocSchema, cliOutput
  }) {
    const resolved = config ?? await BeDoc.resolveConfig({options, source})
    const base = basePath ?? resolved.basePath ?? options?.basePath

    const bedoc = new this({basePath: base, glog, cliOutput})

    bedoc.#configure({config: resolved, glog, validateBeDocSchema})

    const discovered = await bedoc.#discover()

    if(!discovered) {
      return {
        status: "fail",
        message: "No matching actions specified or discovered.",
      }
    }

    return await (await bedoc.#negotiate())
      .#validateActions()
      .#setupHooks()
  }

  /**
   * Apply validated configuration to this instance.
   *
   * @param {object} config - The validated configuration object
   * @param {Glog} glog - The Glog logger instance
   * @param {Function} validateBeDocSchema - The action schema validator
   */
  #configure({config, glog, validateBeDocSchema}) {
    this.#glog = glog
    this.#validateBeDocSchema = validateBeDocSchema

    if(config.debug && config.debugLevel > 0)
      glog.withLogLevel(config.debugLevel)
    else
      glog.withLogLevel(0)

    if(config.status === "error")
      throw Tantrum.new("BeDoc configuration failed", config.errors)

    glog.debug("Creating new BeDoc instance with options: `%o`", 4, config)

    this.#options = config
  }

  /**
   * Discover and filter actions that match the configuration criteria.
   *
   * @returns {Promise<boolean>} Whether matching actions were found
   */
  async #discover() {
    const glog = this.#glog
    const options = this.#options

    const discovery = new Discovery({options, glog})

    this.#actionDefs = await discovery.discoverActions({
      parser: options.parser,
      formatter: options.formatter,
    }, this.#validateBeDocSchema)

    this.#validCrit = discovery.satisfyCriteria(this.#actionDefs, options)

    glog.debug("Actions that met criteria %o", 4, this.#validCrit)

    return !Object.values(this.#validCrit).some(arr => arr.length === 0)
  }

  /**
   * Negotiate contracts between discovered parsers and formatters.
   *
   * @returns {Promise<BeDoc>} This object for chaining.
   */
  async #negotiate() {
    const glog = this.#glog
    const validSchemas = {parser: [], formatter: []}

    let formatters = this.#validCrit.formatter.length

    while(formatters--) {
      const formatter = this.#validCrit.formatter[formatters]
      const {terms: consumes} = formatter
      const satisfied = []

      for(const parser of this.#validCrit.parser) {
        try {
          const {terms: provides} = parser

          const contract = await Contract.negotiate(provides, consumes)

          satisfied.push({...parser, contract})
        } catch(err) {
          glog.error(err)

          glog.debug("%o action incompatible with %o action", 3,
            parser.action.default.meta.input,
            formatter.action.default.meta.format
          )
        }
      }

      if(satisfied.length > 0) {
        validSchemas.formatter.push(formatter)
        validSchemas.parser.push(...satisfied)
      }
    }

    this.#validSchemas = validSchemas

    return this
  }

  /**
   * Validate that exactly one action per type was negotiated, then
   * instantiate the action classes.
   *
   * @returns {BeDoc} This object for chaining.
   */
  #validateActions() {
    const glog = this.#glog

    const schemas = {}

    for(const [key, value] of Object.entries(this.#validSchemas)) {
      if(value.length === 0)
        throw Sass.new(`No matching '${key}' action found`)

      if(value.length > 1)
        throw Sass.new(`Multiple matching '${key}' actions found`)

      schemas[key] = value[0]
    }

    this.#validSchemas = schemas
    this.#contract = schemas.parser.contract

    glog.debug("Contracts satisfied between parser and formatter", 2)

    const actions = {}

    for(const [, {action}] of Object.entries(this.#validSchemas)) {
      const {kind} = action.default.meta

      glog.debug("Assigning %o action", 2, kind)

      actions[kind] = action.default
    }

    this.#actions = actions

    return this
  }

  async #setupHooks() {
    /** @type {Glog} */
    const glog = this.#glog

    if(!this.#options.hooks)
      return this

    /** @type {FileObject} */
    const hooksFile = this.#options.hooks

    if(!hooksFile)
      return this

    if(!await hooksFile.exists) {
      glog.warn(`File not found: ${hooksFile.path}`)

      return this
    }

    const loaded = await hooksFile.import()
    if(!loaded)
      return this

    const hooks = {}
    if(loaded.Parse && Data.isType(loaded.Parse, "Function"))
      hooks.Parse = loaded.Parse

    if(loaded.Format && Data.isType(loaded.Format, "Function"))
      hooks.Format = loaded.Format

    if(Data.isEmpty(hooks)) {
      glog.warn(`No hooks found in ${hooksFile.path}`)

      return this
    }

    this.#hooks = hooks

    return this
  }

  async processFiles() {
    const glog = this.#glog

    glog.debug("Starting file processing with conveyor", 1)

    const {input, output, maxConcurrent} = this.#options

    if(!input?.length)
      throw Sass.new("No input files specified")

    const conveyor = new Conveyor({
      parser: this.#actions.parser,
      formatter: this.#actions.formatter,
      contract: this.#contract,
      hooks: this.#hooks,
      glog,
      output,
      basePath: this.#basePath,
      cli: this.#cli
    })

    const processStart = hrtime.bigint()
    const processResult = await conveyor.convey(input, maxConcurrent)
    const processEnd = hrtime.bigint()

    glog.debug("Conveyor complete", 1)

    const result = {
      totalFiles: input.length,
      succeeded: processResult.succeeded,
      warned: processResult.warned,
      errored: processResult.errored,
      duration: ((Number(processEnd - processStart)) / 1_000_000).toFixed(2),
    }

    glog.debug("File processing complete", 1)

    return result
  }
}
