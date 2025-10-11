import {FileObject, Sass} from "@gesslar/toolkit"
import {format} from "node:util"
import Piper from "./abstracted/Piper.js"

export default class Pipeline {
  #pipeline
  #parse
  #print
  #output
  #debug

  constructor({parse, print, output, options, debug}) {
    this.#parse = parse
    this.#print = print
    this.#output = output
    this.#debug = debug

    // Create pipeline
    this.#pipeline = new Piper({options,debug})

    // Configure the processing pipeline
    this.#setupPipeline()
  }

  #setupPipeline() {
    // Setup hooks
    this.#pipeline
      .addSetup(() => this.#parse.setupAction())
      .addSetup(() => this.#print.setupAction())

    // Cleanup hooks
    this.#pipeline
      .addCleanup(() => this.#parse.cleanupAction())
      .addCleanup(() => this.#print.cleanupAction())

    // Processing steps
    this.#pipeline
      .addStep(this.#readFile.bind(this), {
        name: "Read file"
      })
      .addStep(this.#parseFile.bind(this), {
        name: "Parse file"
      })
      .addStep(this.#validateContracts.bind(this), {
        name: "Validate contracts"
      })
      .addStep(this.#printFile.bind(this), {
        name: "Print file"
      })
      .addStep(this.#writeOutput.bind(this), {
        name: "Write output",
        required: false // Optional if no output specified
      })
  }

  async run(files, maxConcurrent = 10) {
    return await this.#pipeline.pipe(files, maxConcurrent, this)
  }

  // Pipeline step functions
  async #readFile(file) {
    try {
      this.#debug("Reading file %o", 2, file.path)
      const value = await file.read()

      return {file, value}
    } catch(error) {
      return error
    }
  }

  async #parseFile(result) {
    const {file} = result

    this.#debug("Parsing file %o", 2, file.path)

    return await this.#parse.runAction(result)
  }

  async #validateContracts(parseResult) {
    // Validate contracts

    this.#debug("Validating parse and print output for %o", 2, parseResult.file.path)

    // Optional terms validation - only if terms are loaded
    try {
      if(this.#parse.terms) {
        this.#parse.terms.validate(parseResult.value)
        this.#debug("Parse terms validation passed", 3)
      } else {
        throw Sass.new("No contract terms for parser. Boo, how we supposed to know it's good?")
      }
    } catch(error) {
      throw Sass.new("Validating parse results with itself.", error)
    }

    try {
      if(this.#print.terms) {
        this.#print.terms.validate(parseResult.value)
        this.#debug("Print terms validation passed", 3)
      } else {
        throw Sass.new("No contract terms for parser. Seriously? Who's vetting this stuff?")
      }
    } catch(error) {
      throw Sass.new("Validating parse results against printer expectation", error)
    }

    // Return the result to continue the pipeline
    return parseResult
  }

  async #printFile({file,value}) {
    this.#debug("Printing file %o", 2, file.path)

    const printResult = await this.#print.runAction({
      moduleName: file.module,
      functions: value.functions,
    })

    const {destFile, destContent} = printResult.value
    const isNullish = value => value == null

    if(isNullish(destFile) || isNullish(destContent))
      throw Sass.new(format("No content or destination file for %o", file.path))

    return {file: destFile,value: destContent}
  }

  async #writeOutput(context) {
    if(!this.#output)
      throw Sass.new("Output not specified. Writing skipped.")

    const {file: destFile,value: destContent} = context
    const outputFile = new FileObject(destFile, this.#output)
    this.#debug("Writing to %o", 2, outputFile.path)

    try {
      await outputFile.write(destContent)

      return {file: outputFile, value: destContent.length}
    } catch(error) {
      throw Sass.new(error)
    }
  }

  get parse() {
    return this.#parse
  }

  get print() {
    return this.#print
  }
}
