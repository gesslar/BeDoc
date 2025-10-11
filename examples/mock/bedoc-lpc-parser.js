
/**
 * @file LPC Parser - A parser for extracting documentation from LPC (LPC
 * Programming Language) files.
 *
 * This parser specifically handles LPC function documentation comments and
 * extracts structured information including descriptions, parameters, return
 * types, and examples.
 *
 * The parser uses a contract-based approach defined in lpc-parser.yaml and
 * integrates with the BeDoc documentation system through ActionBuilder.
 * @author gesslar
 * @version 1.0.0
 * @since 1.0.0
 */

import {Collection, Data, Util} from "@gesslar/toolkit"
import {ACTIVITY} from "../../src/core/abstracted/ActionBuilder.js"

/** @typedef {import("../../src/core/abstracted/ActionBuilder.js").default} ActionBuilder */

/**
 * LPC Parser Class - Parses LPC files to extract function documentation.
 *
 * This parser is designed to work with LPC (LPC Programming Language) source
 * files, extracting JSDoc-style comments and function signatures. It
 * identifies functions with their access modifiers, types, parameters, and
 * associated documentation.
 * @class
 */
export default class {
  /**
   * Parser metadata defining its characteristics and contract.
   * @type {object}
   * @readonly
   * @property {string} kind - The type of parser ("parse")
   * @property {string} input - The input file type this parser handles ("lpc")
   * @property {object} contract - References the YAML contract file that defines the output schema
   * @property {string} contract.file - The contract file name ("lpc-parser.yaml")
   */
  static meta = Object.freeze({
    kind: "parse",
    input: "lpc",
    terms: "ref://./bedoc-lpc-parser.yaml"
  })

  /**
   * Configures the parser using ActionBuilder's fluent API.
   *
   * This method sets up the parsing structure and extraction methods for LPC
   * documentation.
   *
   * It defines:
   * - Comment block structure (JSDoc-style comments)
   * - Function signature patterns with LPC-specific modifiers
   * - Extraction methods for descriptions, tags, and return values
   * @param {ActionBuilder} builder - The ActionBuilder instance to configure
   * @returns {ActionBuilder} The configured builder instance
   * @example
   * // LPC function pattern matched:
   * // public varargs int my_function(string arg1, object *args) {
   * @see ActionBuilder
   */

  setup = builder => builder
    // Get all of the blocks from the text
    .act("functions", ACTIVITY.ONCE, this.#extractBlocks)
    // Because the previous activity results in an array, we can now run
    // all of the blocks through the extraction process in parallel!
    .parallel(parallel => {
      // Extraction methods for each block
      parallel
        .act("description", ACTIVITY.ONCE, this.#extractDescription,
          {after: curr => {
            curr.description = curr.description.map(d => {
              d.groups.content = d.groups.content.toUpperCase()

              return d
            })
          }}
        )
        .act("tag", ACTIVITY.MANY, this.#extractTag)
        .act("return", ACTIVITY.ONCE, this.#extractReturn)

      return parallel
    })
    // Wrap it OOP!
    .act("finally", ACTIVITY.ONCE, this.#finally)

  async #extractBlocks(curr) {
    curr.value = Data.appendString(curr.value, "\n")

    const result = []
    const lines = curr.value.split("\n")

    while(lines.length) {
      const block = {}

      // Find the block start index
      const startIndex = lines.findIndex(line => this.#regexes.get("block-start").exec(line))
      // Find the block end index
      const endIndex = lines.findIndex(line => this.#regexes.get("block-stop").exec(line))

      // Hmmmmm! I guess we done here?
      if(startIndex < 0 || endIndex <= startIndex)
        break

      // The block is the stuff in between the start and the end
      block.lines = lines.slice(startIndex+1, endIndex)

      // Ok, yeet out the stuff we don't need anymore; the block's size + the
      // begin and end. I added +1 cos I don't know how math works, I guess,
      // but now it is properly gobbling up the */
      lines.splice(0, endIndex+1)

      // Find the function
      const idIndex = lines.findIndex(line => this.#regexes.get("function").test(line))
      // Find the next block
      const nextBlockIndex = lines.findIndex(line => this.#regexes.get("block-start").test(line))

      if(idIndex > -1) {
        // they can't be equal, they're different patterns
        if(nextBlockIndex !== -1 && idIndex > nextBlockIndex) {
          // but if the found function ID is later than the next block ID,
          // that means we don't have one for this block. EJECT! EJECT! EJECT!
          lines.splice(0, nextBlockIndex)
        } else {
          // Whew! Safe.
          const func = this.#regexes.get("function").exec(lines[idIndex])

          // Set the function match as a property on the array for later
          // somethingspection.
          block.function = func

          // Slurp! Slurp!
          lines.splice(0, 1)
        }
      }

      result.push(block)
    }

    curr.value = result

    return true
  }

  /**
   * Extracts the description section from JSDoc-style comment lines.
   *
   * Processes comment lines to extract the main description text that appears
   * before any \@tag declarations. The description continues until it
   * encounters a line starting with an @ symbol (indicating a JSDoc tag).
   * @param {Array<string>} curr - Array of comment lines to process
   * @returns {Promise<Array<string> | null>} Array of description lines, or null if empty
   * @private
   * @async
   * @example
   * // Input comment lines:
   * // * This is the main description
   * // * of the function.
   * // * @param {string} arg - An argument
   * //
   * // Returns: ["This is the main description", "of the function."]
   */
  #extractDescription = async curr => {
    curr.description = this.#matchUntil(
      curr.lines, // Array of remaining comment lines to process
      this.#regexes.get("description-start"), // Pattern to match comment lines and extract content
      this.#regexes.get("description-stop") // Stop pattern when encountering JSDoc tags (@param, @returns, etc.)
    )

    return true
  }

  /**
   * Extracts JSDoc-style tags from comment lines.
   *
   * Uses a complex regex pattern to capture multi-line tag content and stops
   * at the next tag or end of comment block.
   * @param {string[]} curr - Array of comment lines to process
   * @returns {Promise<Array<string> | null>} Array of extracted tag strings, or null if none found
   * @private
   * @async
   * @example
   * // Input comment lines:
   * // * @param {string} name - The user's name
   * // * @param {number} age - The user's age
   * //
   * // Returns: [
   * //   "@param {string} name - The user's name",
   * //   "@param {number} age - The user's age",
   * // ]
   */
  #extractTag = async curr => {
    const result = {}
    const text = curr.lines.join("\n")
    const tagTest = this.#regexes.get("tag")

    if(!tagTest.test(text))
      return false

    const tagMatch = this.#matchUntil(
      curr.lines,
      this.#regexes.get("tag"),
      this.#regexes.get("tag-stop"),
      this.#regexes.get("tag-except")
    )

    if(!tagMatch)
      return false

    const match = tagMatch.shift()
    const {tag,type,name,rest,content} = match.groups

    result[tag] = {name,type,rest,content: [content]}

    // If we had more than one entry, it's because we have more than one
    // line, and the rest is just content.
    if(tagMatch.length) {
      const contents = tagMatch.map(match => match.groups.content)

      result[tag].content.push(...contents)
    }

    if(!curr.tag)
      curr.tag = []

    curr.tag.push(result)

    return true
  }

  /**
   * Extracts \@return or \@returns JSDoc tags from comment lines.
   *
   * Specifically handles return value documentation with type information and
   * descriptions.
   *
   * Supports both \@return and \@returns variations, extracting the return type
   * from curly braces and optional description text.
   * @param {string[]} curr - Array of comment lines to process
   * @returns {Promise<Array<object> | null>} Array of return info objects with type and content, or null if none found
   * @private
   * @async
   * @example
   * // Input comment line:
   * // * @returns {string} The formatted username
   * //
   * // Returns: [{
   * //   type: "string",
   * //   content: "The formatted username"
   * // }]
   * @todo Fix the regex pattern and improve multi-line return handling (marked as FIXXXX)
   */
  #extractReturn = async curr => {
    const result = {}
    const text = curr.lines.join("\n")
    const tagTest = this.#regexes.get("return")

    if(!tagTest.test(text))
      return {result: null}

    const tagMatch = this.#matchUntil(
      curr.lines,
      this.#regexes.get("return"),
      this.#regexes.get("tag-stop")
    )

    if(!tagMatch)
      return false

    const match = tagMatch.shift()
    const tag = "return"
    const {type,content} = match.groups

    result[tag] = {type,content: [content]}

    // If we had more than one entry, it's because we have more than one
    // line, and the rest is just content.
    if(tagMatch.length) {
      const contents = tagMatch.map(match => match.groups.content)

      result[tag].content.push(...contents)
    }

    if(!curr.tag)
      curr.tag = []

    curr.tag.push(result)

    return true
  }

  /**
   * Final processing method called after all extraction is complete.
   * @param {Array<Map>} curr - Map of extracted data from the parsing process
   * @returns {Promise<Array<object>>} The transformation results.
   * @private
   */
  async #finally(curr) {
    const result = await Collection.asyncMap(curr.value, async item => {
      const result = {}

      result.name = item.function.groups.name

      result.description = item
        .description
        .map(d => d.groups.content)
        .join("\n")

      const tags = item.tag || []

      if(tags.length > 0) {
        const combined = Collection.flattenObjectArray(tags)

        if(combined.param) {
          result.param = combined.param.map(p => {
            const {type,name,rest,content} = p

            return {type,name,rest,content}
          })
        }

        if(combined.return) {
          const {type,content} = combined.return[0]

          result.return = {type,content}
        }
      }

      return result
    })

    curr.value = {functions: result}

    return true
  }

  /**
   * Utility method to match lines until a stop condition is met.
   *
   * Processes lines from the input array, applying a pattern to extract
   * content until it encounters a line matching the stop pattern. The stop
   * line is returned to the array for further processing.
   * @param {string[]} lines - Array of lines to process (modified in-place)
   * @param {RegExp} pattern - Regular expression to match and extract content from each line
   * @param {RegExp} stopPattern - Regular expression that indicates when to stop processing
   * @param {RegExp[]} except - Array of regular expressions to exclude certain lines from processing
   * @returns {Array} Array of regex match results for processed lines
   * @private
   * @example
   * const lines = ["* Description line 1", "* Description line 2", "* @param arg"]
   * const result = this.#matchUntil(
   *   lines,
   *   /^\s*\*\s?(?<content>.*)$/,
   *   /^\s*\*\s*@/
   * )
   * // result contains matches for the first two lines
   * // lines now contains ["* @param arg"]
   */
  #matchUntil = (lines, pattern, stopPattern, except=[]) => {
    const result = []
    const exceptions = []

    for(;;) {
      const line = lines.shift()

      if(!line)
        break

      const excepted = except.length > 0
        ? except.some(e => e.test(line))
        : false

      if(excepted) {
        exceptions.push(line)
        continue
      }

      const matches = pattern.exec(line)

      if(!matches)
        break

      result.push(matches)

      // Peek ahead
      if(lines.length > 0 && stopPattern.test(lines[0]))
        break
    }

    if(exceptions.length)
      lines.unshift(...exceptions)

    return result.length > 0 ? result : null
  }

  // HERE BE DRAGONS! YOU DONE BEEN WARNED, FUGGAH!
  #regexes = new Map([
    ["block-start", /^\s*\/\*\*.*$/],
    ["block-stop", /^\s*\*\/\s*$/],
    ["description-start", /^\s*\*\s?(?<content>.*)$/],
    ["description-stop", /^\s*\*\s*@/],
    ["tag", Util.regexify(
      `
  ^\\s*\\*(\\s@(?!returns?)
    (?<tag>\\w+)\\s*
    \\{(?<type>\\w+(?:\\|\\w+)*(?:\\*)?)\\}\\s+
    (?<name>(\\w+(\\.\\w?)*=?\\w*\\s*(?<rest>\\.{3})?|\\[\\w+=?.*]))(?:\\s+-)?\\s+|\\s)
    (?<content>[\\s\\S]+?)
  $
    `
    )],
    ["tag-except", [/^\s*\*\s+@returns?/]],
    ["tag-stop", /^\s*\*(?:\/|\s*@)/],
    ["return", /^\s*\*\s*@returns?\s+\{(?<type>[^}]*)\}(?:\s+(?:-\s+)?(?<content>.*))?$/],
    ["function", /^\s*(?<access>public|protected|private)?\s*(?<modifier1>nomask|varargs)?\s*(?<modifier2>nomask|varargs)?\s*(?<type>(int|float|void|string|object|mixed|mapping|array|buffer|function)\s*\*?)\s*(?<name>[a-zA-Z_][a-zA-Z0-9_]*)\s*\((?<parms>.*)\)\s*\{?.*$/]
  ])
}
