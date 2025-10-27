import {FileObject, Sass} from "@gesslar/toolkit"
import {format} from "node:util"
import {Piper} from "@gesslar/actioneer"

export default class Pipeline {
  #pipeline
  #parse
  #print
  #output
  #debug
  #hooks

  constructor({parse, print, output, options, debug}) {
    this.#parse = parse
    this.#print = print
    this.#output = output
    this.#debug = debug
    this.#hooks = options?.hooks

    // Create pipeline
    this.#pipeline = new Piper({options,debug})

    // Configure the processing pipeline
    this.#setupPipeline()
  }

  #setupPipeline() {
    // Setup hooks
    this.#pipeline
      .addSetup(() => (this.#parse.setupAction({hooks: {file: this.#hooks,kind: "parse"}})))
      .addSetup(() => (this.#print.setupAction({hooks: {file: this.#hooks,kind: "print"}})))

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
      const content = await file.read()

      return {file, content}
    } catch(error) {
      throw Sass.new(`Reading file ${file?.path}`, error)
    }
  }

  async #parseFile(read) {
    try {
      const {file} = read

      this.#debug("Parsing file %o", 2, file.path)

      const functions = await this.#parse.runAction(read)
      const result = {file,...functions}

      return result
    } catch(error) {
      throw Sass.new(`Parsing file ${read?.file?.path}`, error)
    }
  }

  async #validateContracts(parseResult) {
    // Validate contracts

    this.#debug("Validating parse and print output for %o", 2, parseResult.file.path)

    // Optional contract validation - only if contracts are loaded
    try {
      if(this.#parse.contract) {
        this.#parse.contract.validate(parseResult)
        this.#debug("Parse contract validation passed", 3)
      } else {
        throw Sass.new("No contract for parser. Boo, how we supposed to know it's good?")
      }
    } catch(error) {
      throw Sass.new("Validating parse results with itself.", error)
    }

    try {
      if(this.#print.contract) {
        this.#print.contract.validate(parseResult)
        this.#debug("Print contract validation passed", 3)
      } else {
        throw Sass.new("No contract for printer. Seriously? Who's vetting this stuff?")
      }
    } catch(error) {
      throw Sass.new("Validating parse results against printer expectation", error)
    }

    // Return the result to continue the pipeline
    return parseResult
  }

  async #printFile({file,functions}) {
    try {
      this.#debug("Printing file %o", 2, file.path)

      const printResult = await this.#print.runAction({
        moduleName: file.module,
        functions: functions,
      })

      const {destFile, destContent} = printResult
      const isNullish = value => value == null

      if(isNullish(destFile) || isNullish(destContent))
        throw Sass.new(format("No content or destination file for %o", file.path))

      return {file: destFile,value: destContent}
    } catch(error) {
      throw Sass.new(`Printing file ${file?.path}`, error)
    }
  }

  async #writeOutput(context) {
    try {
      if(!this.#output)
        throw Sass.new("Output not specified. Writing skipped.")

      const {file: destFile,value: destContent} = context
      const outputFile = new FileObject(destFile, this.#output)

      if(destContent.length < 1) {
        this.#debug("No content to write to %o", 2, outputFile.path)

        return {file: outputFile, bytes: destContent.length}
      }

      try {
        this.#debug("Writing to %o", 2, outputFile.path)
        await outputFile.write(destContent)

        return {file: outputFile, bytes: destContent.length}
      } catch(error) {
        throw Sass.new(`Writing to ${outputFile.path}`, error)
      }
    } catch(error) {
      throw Sass.new(`Writing output.`, error)
    }
  }

  get parse() {
    return this.#parse
  }

  get print() {
    return this.#print
  }
}
