import {ActionBuilder, ActionRunner, ACTIVITY} from "@gesslar/actioneer"
import {DirectoryObject, FileObject, Notify, Sass} from "@gesslar/toolkit"

/**
 * @import {CLIOutput} from "./CLIOutput.js"
 * @import {Contract} from "@gesslar/negotiator"
 */

const {IF} = ACTIVITY

export default class Conveyor {
  #parser
  #formatter
  /** An instance of CLIOutput @type {CLIOutput} */
  #cli

  /** @type {DirectoryObject} */
  #output

  /** @type {Contract} */
  #contract

  #hooks
  #basePath

  constructor({
    basePath,
    parser,
    formatter,
    hooks,
    contract,
    output,
    cli
  }) {
    this.#basePath = basePath
    this.#parser = parser
    this.#formatter = formatter
    this.#hooks = hooks
    this.#contract = contract
    this.#output = output
    this.#cli = cli
  }

  /**
   * Emits a pipeline stage transition for a file.
   *
   * @param {FileObject} file - The file the stage pertains to.
   * @param {string} stage - The stage name (read|parse|validate|format|write).
   * @param {string} state - The new state (active|done|warning|error).
   */
  #emitStage = (file, stage, state) =>
    Notify.emit("update-data", {file, message: {kind: "stage", stage, state}})

  /**
   * Defines the per-file processing pipeline.
   *
   * @param {ActionBuilder} builder - The Actioneer builder instance.
   */
  setup(builder) {
    builder
      .do("read", this.#readFile)
      .do("parse", this.#parseFile)
      .do("validate", this.#validateContracts)
      .do("format", this.#formatFile)
      .do("write", IF, this.#shouldWrite, this.#writeOutput)
  }

  /**
   * Processes files through the parser→formatter pipeline with concurrency.
   *
   * @param {Array<FileObject>} files - List of files to process.
   * @param {number} [maxConcurrent] - Maximum number of files to process at a time.
   * @returns {Promise<object>} - Resolves with {succeeded, errored, warned}.
   */
  async convey(files, maxConcurrent = 10) {
    const builder = new ActionBuilder(this)
    const runner = new ActionRunner(builder)
      .addSetup(async() => {
        if(this.#output && !await this.#output.exists)
          await this.#output.assureExists({recursive: true})
      })

    const destExtension = this.#formatter.meta.extension ?? "txt"
    const contexts = files.map(file => ({
      file,
      output: new FileObject(`${file.module}.${destExtension}`, this.#output)
    }))

    Notify.emit("conveyor-start", contexts)

    const settled = await runner.pipe(contexts, maxConcurrent)

    return this.#categorize(settled, files)
  }

  // -- Pipeline activities --------------------------------------------------

  #readFile = async ctx => {
    this.#emitStage(ctx.file, "read", "active")

    const content = await ctx.file.read()

    Notify.emit("update-data", {file: ctx.file, message: {kind: "input-size", value: content.length}})
    this.#emitStage(ctx.file, "read", "done")

    return {...ctx, content}
  }

  #parseFile = async ctx => {
    if(ctx.error)
      return ctx

    try {
      this.#emitStage(ctx.file, "parse", "active")

      const {content} = ctx
      const builder = new ActionBuilder(new this.#parser())

      if(this.#hooks?.Parse)
        builder.withHooks(new this.#hooks.Parse())

      const runner = new ActionRunner(builder)
      const result = await runner.run(content)

      this.#emitStage(ctx.file, "parse", "done")

      return Object.assign(ctx, {...result})
    } catch(error) {
      this.#emitStage(ctx.file, "parse", "error")

      return {...ctx, status: "error", error: Sass.new(`Parsing file ${ctx.file}`, error)}
    }
  }

  #validateContracts = ctx => {
    if(ctx.error)
      return ctx

    try {
      this.#emitStage(ctx.file, "validate", "active")

      this.#contract.validate(ctx)

      this.#emitStage(ctx.file, "validate", "done")
    } catch(err) {
      if(err) {
        this.#emitStage(ctx.file, "validate", "error")

        throw Sass.new(`Parser validation for ${ctx.file.path}`, err)
      }
    }

    return ctx
  }

  #formatFile = async ctx => {
    if(ctx.error)
      return ctx

    this.#emitStage(ctx.file, "format", "active")

    const {functions} = ctx
    const builder = new ActionBuilder(new this.#formatter())

    if(this.#hooks?.Format)
      builder.withHooks(new this.#hooks.Format())

    const runner = new ActionRunner(builder)
    const formatResult = await runner.run(functions)

    this.#emitStage(ctx.file, "format", "done")

    return Object.assign(ctx, {formatResult})
  }

  #shouldWrite = ctx => {
    if(ctx.error)
      return ctx

    const result = this.#output != null && ctx?.formatResult

    if(result)
      return result

    Object.assign(ctx, {status: "warning", warning: `No output content for ${ctx.file.path}`})

    Notify.emit("update-data", {file: ctx.file, message: {kind: "output-size", value: 0}})
    this.#emitStage(ctx.file, "write", "warning")

    return false
  }

  #writeOutput = async ctx => {
    if(ctx.error)
      return ctx

    this.#emitStage(ctx.file, "write", "active")

    const {formatResult: content, output} = ctx

    await output.write(content)

    Notify.emit("update-data", {file: ctx.file, message: {kind: "output-size", value: content.length}})
    this.#emitStage(ctx.file, "write", "done")

    return {...ctx, status: "success", output}
  }

  // -- Result categorization ------------------------------------------------

  #categorize(settled, files) {
    const succeeded = []
    const warned = []
    const errored = []

    for(let i = 0; i < settled.length; i++) {
      const entry = settled[i]
      const file = files[i]

      if(entry.status === "rejected") {
        errored.push({input: file, error: entry.reason})
        continue
      }

      const val = entry.value

      switch(val?.status) {
        case "success":
          succeeded.push({input: file, output: val.output})
          break
        case "warning":
          warned.push({input: file, warning: val.warning})
          break
        case "error":
          errored.push({input: file, error: val.error})
          break
        default:
          errored.push({input: file, error: new Error(`Unknown status: ${val?.status}`)})
      }
    }

    return {succeeded, errored, warned}
  }
}
