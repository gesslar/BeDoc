import {ActionBuilder, ActionRunner, ACTIVITY} from "@gesslar/actioneer"
import {DirectoryObject, FileObject, Sass} from "@gesslar/toolkit"

/**
 * @import {Glog} from "@gesslar/toolkit"
 * @import {Contract} from "@gesslar/negotiator"
 */

const {IF} = ACTIVITY

export default class Conveyor {
  #parser
  #formatter

  /** @type {Glog} */
  #glog

  /** @type {DirectoryObject} */
  #output

  /** @type {Contract} */
  #contract

  constructor({parser, formatter, glog, contract, output}) {
    this.#parser = parser
    this.#formatter = formatter
    this.#glog = glog
    this.#output = output
    this.#contract = contract
  }

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
    const glog = this.#glog

    const builder = new ActionBuilder(this)
    const runner = new ActionRunner(builder)
      .addSetup(async() => {
        if(!await this.#output.exists) {
          glog.info(`Directory '${this.#output.path}' does not exist. Creating.`)

          await this.#output.assureExists({recursive: true})
        }
      })

    const contexts = files.map(file => ({file}))
    const settled = await runner.pipe(contexts, maxConcurrent)

    return this.#categorize(settled, files)
  }

  // -- Pipeline activities --------------------------------------------------

  #readFile = async ctx => {
    const glog = this.#glog
    const content = await ctx.file.read()

    glog.debug("Read file content %o (%o bytes)", 2, ctx.file.path, content.length)

    return {...ctx, content}
  }

  #parseFile = async ctx => {
    try {
      const {content} = ctx
      const builder = new ActionBuilder(new this.#parser())
      const runner = new ActionRunner(builder)
      const result = await runner.run(content)

      this.#glog.debug("%o", 4, result)

      return Object.assign(ctx, {...result})
    } catch(error) {
      return {...ctx, status: "error", error}
    }
  }

  #validateContracts = ctx => {
    if(ctx.error)
      return ctx

    try {
      this.#contract.validate(ctx)
    } catch(err) {
      if(err) {
        throw Sass.new(`Parser validation for ${ctx.file.path}`, err)
      }
    }

    return ctx
  }

  #formatFile = async ctx => {
    const {functions} = ctx
    const builder = new ActionBuilder(new this.#formatter())
    const runner = new ActionRunner(builder)
    const formatResult = await runner.run(functions)

    return Object.assign(ctx, {formatResult})
  }

  #shouldWrite = ctx => {
    const result = this.#output != null && ctx?.formatResult

    if(result)
      return result

    Object.assign(ctx, {status: "warning", warning: `No output content for ${ctx.file.path}`})

    return false
  }

  #writeOutput = async ctx => {
    const glog = this.#glog
    const {file, formatResult} = ctx
    const destExtension = this.#formatter.meta.extension ?? "txt"
    const outputFile = new FileObject(`${file.module}.${destExtension}`, this.#output)

    await outputFile.write(formatResult)

    glog.debug("Wrote output %o (%o bytes)", 2, outputFile.path, formatResult.length)

    return {...ctx, status: "success", outputFile}
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
          succeeded.push({input: file, output: val.outputFile})
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
