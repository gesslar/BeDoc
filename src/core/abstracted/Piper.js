/**
 * Generic Pipeline - Process items through a series of steps with concurrency control
 *
 * This abstraction handles:
 * - Concurrent processing with configurable limits
 * - Pipeline of processing steps
 * - Result categorization (success/warning/error)
 * - Setup/cleanup lifecycle hooks
 * - Error handling and reporting
 */

import {Sass, Tantrum, Util} from "@gesslar/toolkit"
import Glog from "./Glog.js"

export default class Piper {
  #debug
  // #options

  #lifeCycle = new Map([
    ["setup", new Set()],
    ["process", new Set()],
    ["teardown", new Set()]
  ])

  constructor(arg) {
    // this.#options = options
    this.#debug = arg?.debug ?? new Glog().newDebug("[PIPER]")
  }

  /**
   * Add a processing step to the pipeline
   *
   * @param {(context: object) => Promise<object>} fn - Function that processes an item: (context) => Promise<result>
   * @param {object} options - Step options (name, required, etc.)
   * @returns {Piper} The pipeline instance (for chaining)
   */
  addStep(fn, options = {}) {
    this.#lifeCycle.get("process").add({
      fn,
      name: options.name || `Step ${this.#lifeCycle.get("process").size + 1}`,
      required: !!options.required, // Default to required
      ...options
    })

    return this
  }

  /**
   * Add setup hook that runs before processing starts
   *
   * @param {() => Promise<void>} fn - Setup function: () => Promise<void>
   * @returns {Piper} The pipeline instance (for chaining)
   */
  addSetup(fn) {
    this.#lifeCycle.get("setup").add(fn)

    return this
  }

  /**
   * Add cleanup hook that runs after processing completes
   *
   * @param {() => Promise<void>} fn - Cleanup function: () => Promise<void>
   * @returns {Piper} The pipeline instance (for chaining)
   */
  addCleanup(fn) {
    this.#lifeCycle.get("teardown").add(fn)

    return this
  }

  /**
   * Process items through the pipeline with concurrency control
   *
   * @param {Array} items - Items to process
   * @param {number} maxConcurrent - Maximum concurrent items to process
   * @returns {Promise<object>} - Results object with succeeded, warned, errored arrays
   */
  async pipe(items, maxConcurrent = 10) {
    items.forEach(item => item.pipeStamp = Symbol(performance.now()))

    let itemIndex = 0
    const allResults = []

    const processWorker = async() => {
      while(true) {
        const currentIndex = itemIndex++
        if(currentIndex >= items.length)
          break

        const item = items[currentIndex]
        try {
          const result = await this.#processItem(item)
          allResults.push(result)
        } catch(error) {
          throw Sass.new("Processing pipeline item.", error)
        }
      }
    }

    const setupResult = await Util.settleAll([...this.#lifeCycle.get("setup")].map(e => e()))
    this.#processResult("Setting up the pipeline.", setupResult)

    // Start workers up to maxConcurrent limit
    const workers = []
    const workerCount = Math.min(maxConcurrent, items.length)

    for(let i = 0; i < workerCount; i++)
      workers.push(processWorker())

    // Wait for all workers to complete
    const processResult = await Util.settleAll(workers)
    this.#processResult("Processing pipeline.", processResult)

    // Run cleanup hooks
    const teardownResult = await Util.settleAll([...this.#lifeCycle.get("teardown")].map(e => e()))
    this.#processResult("Tearing down the pipeline.", teardownResult)

    return allResults
  }

  #processResult(message, settled) {
    if(settled.some(r => r.status === "rejected"))
      throw Tantrum.new(
        message,
        settled.filter(r => r.status==="rejected").map(r => r.reason)
      )
  }

  /**
   * Process a single item through all pipeline steps
   *
   * @param {object} item - The item to process
   * @returns {Promise<object>} Result object with status and data
   * @private
   */
  async #processItem(item) {
    const debug = this.#debug

    try {
      // Execute each step in sequence
      let result = item

      for(const step of this.#lifeCycle.get("process")) {
        debug("Executing step: %o", 2, step.name)

        result = await step.fn(result) ?? result
      }

      return result
    } catch(error) {
      throw Sass.new("Processing an item.", error)
    }
  }
}
