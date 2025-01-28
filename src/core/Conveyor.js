import {format} from "node:util"

import * as FDUtil from "./util/FDUtil.js"

const {readFile, writeFile, composeFilename} = FDUtil

export default class Conveyor {
  #succeeded = []
  #errored = []

  constructor(parse, print, logger, output) {
    this.parse = parse
    this.print = print
    this.logger = logger
    this.output = output
  }

  /**
   * Processes files with a concurrency limit.
   *
   * @param {Array} files - List of files to process.
   * @param {number} maxConcurrent - Maximum number of concurrent tasks.
   * @returns {Promise<object>} - Resolves when all files are processed.
   */
  async convey(files, maxConcurrent = 10) {
    const semaphore = Array(maxConcurrent).fill(Promise.resolve())

    // Set up the actions
    await this.parse.setupAction()
    await this.print.setupAction()

    for(const file of files) {
      const slot = Promise.race(semaphore) // Wait for an available slot
      semaphore.push(slot.then(async() => {
        const result = await this.#processFile(file)
        if(result.status === "success" || result.status === "warning")
          this.#succeeded.push({input: file, output: result.file})
        else {
          this.#errored.push({input: file, error: result.error})
        }
      }))
      semaphore.shift() // Remove the oldest promise
    }

    // Wait for all tasks to complete
    await Promise.all(semaphore)

    // Clean up actions
    await this.parse.cleanupAction()
    await this.print.cleanupAction()

    return {succeeded: this.#succeeded, errored: this.#errored}
  }

  /**
   * Processes a single file.
   *
   * @param {object} file - FileMap object representing a file.
   * @returns {Promise<object>} - Resolves when the file is processed
   */
  async #processFile(file) {
    const debug = this.logger.newDebug()
    const warn = (...arg) => this.logger.warn(...arg)
    const {parse, print} = this

    try {
      debug("Processing file: `%s`", 2, file.path)

      // Step 1: Read file
      const fileContent = await readFile(file)
      debug("Read file content `%s` (%d bytes)", 2, file.path, fileContent.length)

      // Step 2: Parse file
      const parseResult = await parse.runAction({
        file,
        content: fileContent
      })
      if(parseResult.status === "error")
        return parseResult

      debug("Parsed file successfully: `%s`", 2, file.path)

      // Step 3: Print file
      const printResult = await print.runAction({
        file,
        content: parseResult.result,
      })
      if(printResult.status === "error")
        return printResult

      debug("Printed file successfully: `%s`", 2, file.path)

      // Step 4: Write output
      const {status: printStatus, destFile, content} = printResult
      const isNullish = (value) => value == null // Checks null or undefined

      if(printStatus !== "success" || isNullish(destFile) || isNullish(content)) {
        return {status: "error", file, error: new Error("Invalid print result")}
      } else if(!destFile || !content) {
        const mess = format("No content or destination file for %s", file.path)
        warn(mess)
        return {status: "warning", file, warning: mess}
      }

      const writeResult = await this.#writeOutput(destFile, content)

      if(writeResult.status === "success")
        debug("Wrote output for: `%s` (%d bytes)", 2, file.path, content.length)

      return writeResult
    } catch(error) {
      return {status: "error", file, error}
    }
  }

  /**
   * Writes the output to the destination.
   *
   * @param {string} destFile - Destination file path.
   * @param {string} content - File content.
   * @returns {Promise<object>} - Resolves when the file is written.
   */
  async #writeOutput(destFile, content) {
    const destFileMap = composeFilename(this.output.path, destFile)
    try {
      writeFile(destFileMap, content)

      return {status: "success", file: destFileMap}
    } catch(error) {
      return {status: "error", output: destFileMap, error}
    }
  }
}
