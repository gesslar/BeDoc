import * as FDUtil from "./util/FDUtil.js"

const {readFile, writeFile, composeFilename} = FDUtil

export default class Conveyor {
  constructor(parser, printer, logger, output) {
    this.parser = parser
    this.printer = printer
    this.logger = logger
    this.output = output
  }

  /**
   * Processes files with a concurrency limit.
   * @param {Array} files - List of files to process.
   * @param {number} maxConcurrent - Maximum number of concurrent tasks.
   */
  async convey(files, maxConcurrent = 10) {
    const semaphore = Array(maxConcurrent).fill(Promise.resolve())

    for(const file of files) {
      const slot = Promise.race(semaphore) // Wait for an available slot
      semaphore.push(slot.then(() => this.#processFile(file)))
      semaphore.shift() // Remove the oldest promise
    }

    await Promise.all(semaphore) // Wait for all tasks to complete
  }

  /**
   * Processes a single file.
   * @param {object} file - FileMap object representing a file.
   */
  async #processFile(file) {
    const debug = this.logger.newDebug()
    try {
      debug(`Processing file: ${file.path}`, 2)

      // Step 1: Read file
      const fileContent = await readFile(file)
      debug(`Read file content (${fileContent.length} bytes)`, 2)

      // Step 2: Parse file
      const parseResult = await this.parser.parse(file.path, fileContent)
      if(parseResult.status === "error") {
        throw new Error(`Failed to parse ${file.path}: ${parseResult.message}`)
      }
      debug(`Parsed file successfully: ${file.path}`, 2)

      // Step 3: Print file
      const printResult = await this.printer.print(
        file.module,
        parseResult.result,
      )
      if(printResult.status === "error") {
        throw new Error(`Failed to print ${file.path}: ${printResult.message}`)
      }
      debug(`Printed file successfully: ${file.path}`, 2)

      // Step 4: Write output
      const {destFile, content} = printResult
      if(!destFile || !content) {
        throw new Error(`Invalid print result for ${file.path}`)
      }
      await this.#writeOutput(destFile, content)
      debug(`Wrote output for: ${file.path}`, 2)
    } catch(error) {
      this.logger.error(
        `Error processing file ${file.path}: ${error.message}\n${error.stack}`,
      )
    }
  }

  /**
   * Writes the output to the destination.
   * @param {string} destFile - Destination file path.
   * @param {string} content - File content.
   */
  async #writeOutput(destFile, content) {
    const destFileMap = composeFilename(this.output.path, destFile)
    await writeFile(destFileMap, content)
  }
}
