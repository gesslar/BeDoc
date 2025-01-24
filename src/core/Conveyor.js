import * as FDUtil from "./util/FDUtil.js"

const {readFile, writeFile, composeFilename} = FDUtil

export default class Conveyor {
  #succeeded = []
  #errored = []

  constructor(parser, printer, logger, output) {
    this.parser = parser
    this.printer = printer
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

    for(const file of files) {
      const slot = Promise.race(semaphore) // Wait for an available slot
      semaphore.push(slot.then(async() => {
        const result = await this.#processFile(file)

        if(result.status === "success")
          this.#succeeded.push({input: file, output: result.file})
        else
          this.#errored.push({input: file, error: result.error})
      }))
      semaphore.shift() // Remove the oldest promise
    }

    // Wait for all tasks to complete
    await Promise.all(semaphore)

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

    try {
      debug("Processing file: `%s`", 2, file.path)

      // Step 1: Read file
      const fileContent = await readFile(file)
      debug("Read file content `%s` (%d bytes)", 2, file.path, fileContent.length)

      // Step 2: Parse file
      const parseResult = await this.parser.parse(file, fileContent)
      if(parseResult.status === "error")
        return parseResult

      debug("Parsed file successfully: `%s`", 2, file.path)

      // Step 3: Print file
      const printResult = await this.printer.print(
        file,
        parseResult.result,
      )
      if(printResult.status === "error")
        return printResult

      debug("Printed file successfully: `%s`", 2, file.path)

      // Step 4: Write output
      const {destFile, content} = printResult
      if(!destFile || !content)
        return {status: "error", message: "Invalid print result"}

      const writeResult = await this.#writeOutput(destFile, content)

      if(writeResult.status === "success")
        debug("Wrote output for: `%s` (%d bytes)", 2, file.path, content.length)

      return writeResult
    } catch(error) {
      const mess = `Error processing file ${file.path}: ${error.message}\n${error.stack}`
      this.logger.error(mess)
      return {status: "error", error}
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
