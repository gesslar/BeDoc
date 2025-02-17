import {format} from "node:util"

import * as FDUtil from "./util/FDUtil.js"

const {readFile, writeFile, composeFilename} = FDUtil

export default class Conveyor {
  #succeeded = []
  #warned = []
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
    const fileQueue = [...files]
    const activePromises = []

    await Promise.all([
      this.parse.setupAction(),
      this.print.setupAction()
    ])

    const processNextFile = file => {
      return this.#processFile(file).then(processedResult => {
        // Store result
        if(processedResult.status === "success") {
          this.#succeeded.push({input: file, output: processedResult.file})
        } else if(processedResult.status === "warning") {
          this.#warned.push({input: file, warning: processedResult.warning})
        } else {
          this.#errored.push({input: file, error: processedResult.error})
        }

        // Start next job if queue isn't empty
        if(fileQueue.length > 0) {
          const nextFile = fileQueue.shift()
          return processNextFile(nextFile)
        }
      })
    }

    // Initial fill of the worker pool
    while(activePromises.length < maxConcurrent && fileQueue.length > 0) {
      const file = fileQueue.shift()
      activePromises.push(processNextFile(file))
    }

    // Wait for all processing to complete
    await Promise.all(activePromises)

    await Promise.all([
      this.parse.cleanupAction(),
      this.print.cleanupAction()
    ])

    return {
      succeeded: this.#succeeded,
      errored: this.#errored,
      warned: this.#warned
    }
  }

  /**
   * Processes a single file.
   *
   * @param {object} file - FileMap object representing a file.
   * @returns {Promise<object>} - Resolves when the file is processed
   */
  async #processFile(file) {
    const debug = this.logger.newDebug()
    const {parse, print} = this

    try {
      debug("Processing file: %o", 2, file.path)

      // Step 1: Read file
      const fileContent = readFile(file)
      debug("Read file content %o (%o bytes)", 2, file.path, fileContent.length)

      // Step 2: Parse file
      const parseResult = await parse.runAction({
        file,
        content: fileContent
      })
      if(parseResult.status === "error")
        return parseResult

      if(parseResult.status === "warning")
        debug("Parsed file successfully, but with warnings: %o", 2, file.path)
      else
        debug("Parsed file successfully: %o", 2, file.path)

      if(!parseResult.result) {
        const mess = format("No content found in %o. No file written.", file.path)
        return {status: "warning", file, warning: mess}
      }

      parse.contract.validate(parseResult)
      print.contract.validate(parseResult)

      // Step 3: Print file
      const printResult = await print.runAction({
        file,
        content: parseResult.result,
      })
      if(printResult.status === "error")
        return printResult

      debug("Printed file successfully: %o", 2, file.path)

      // Step 4: Write output
      const {status: printStatus, destFile, destContent} = printResult
      const isNullish = value => value == null // Checks null or undefined

      switch(printStatus) {
        case "warning":
        case "error":
          return printResult
        case "success":
          if(isNullish(destFile) || isNullish(destContent))
            return {
              status: "warning",
              warning: format("No content or destination file for %o", file.path)
            }

          break
        default:
          throw new Error(`Invalid status received from printing ${file.module}`)
      }

      if(this.output) {
        const writeResult = await this.#writeOutput(destFile, destContent)

        if(writeResult.status === "success")
          debug("Wrote output %o (%o bytes)", 2, writeResult.file.path, destContent.length)
        else
          debug("Error writing output for: `%s`", 2, file.path)

        return writeResult
      }

      debug("Output not specified. Writing skipped.", 2)

      return {status: "success"}

    } catch(error) {
      return {status: "error", file, error}
    }
  }

  /**
   * Writes the output to the destination.
   *
   * @param {string} destFile - Destination file path.
   * @param {string} destContent - File content.
   * @returns {Promise<object>} - Resolves when the file is written.
   */
  async #writeOutput(destFile, destContent) {
    const debug = this.logger.newDebug()

    const destFileMap = composeFilename(this.output.path, destFile)

    debug("Writing output to %o => %o", 2, destFile, destFileMap.absolutePath)

    try {
      writeFile(destFileMap, destContent)

      return {status: "success", file: destFileMap}
    } catch(error) {
      return {status: "error", output: destFileMap, error}
    }
  }
}
