/**
 * @file LPC Parser - A parser for extracting documentation from LPC (LPC
 * Programming Language) files.
 *
 * This parser specifically handles LPC function documentation and
 * extracts structured information including descriptions, parameters, return
 * types, and examples.
 *
 * The parser uses a contract-based approach defined in lpc-parser.yaml and
 * integrates with the BeDoc documentation system through ActionBuilder.
 * @author gesslar
 * @version 1.0.0
 * @since 1.0.0
 */

import { ActionBuilder, ActionRunner, ACTIVITY } from "@gesslar/actioneer"
import { Collection, Data, Util } from "@gesslar/toolkit"

const {WHILE} = ACTIVITY

/** @typedef {import("@gesslar/actioneer").ActionBuilder} ActionBuilder */

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

  setup = ab => ab
    // Get all of the blocks from the text
    .do("Extract function blocks", this.#extractBlocks)
    // Because the previous activity results in an array, we can now run
    // all of the blocks through the extraction process in parallel!
    .do("Process blocks", this.#parallelExtraction)
    // Finalize results
    .do("Finalize", this.#finally)

  #parallelExtraction = async value => {
    const builder = new ActionBuilder(this)
      .do("Extract description", this.#extractDescription)
      .do("Extract tags", WHILE, this.#hasMoreTags, this.#extractTag)
      .do("Extract return", this.#extractReturn)
      .build()

    const runner = new ActionRunner(builder)
    const result = await runner.pipe(value.blocks)

    return result
  }

  async #extractBlocks(value) {
    const {content} = value
    const result = []
    const lines = Data.appendString(content, "\n").split("\n")

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

    Object.assign(value, {
      blocks: result,
      file: value.file
    })

    return value
  }

  /**
   * Extracts the description section from JSDoc-style comment lines.
   *
   * Processes comment lines to extract the main description text that appears
   * before any \@tag declarations. The description continues until it
   * encounters a line starting with an @ symbol (indicating a JSDoc tag).
   * @param {object} value - The block object containing comment lines to process
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
  #extractDescription = async value => {
    const {lines} = value

    const description = this.#matchUntil(
    lines, // Array of remaining comment lines to process
      this.#regexes.get("description-start"), // Pattern to match comment lines and extract content
      this.#regexes.get("description-stop") // Stop pattern when encountering JSDoc tags (@param, @returns, etc.)
    )

    Object.assign(value, {description})

    return value
  }

  /**
   * Predicate to check if there are more tags to extract
   * @param {object} value - Current context
   * @returns {boolean} True if more tags exist
   * @private
   */
  #hasMoreTags = async value => {
    const text = value.lines.join("\n")
    const tagTest = this.#regexes.get("tag")
    const returnExcepted = this.#regexes.get("tag-except")
    return tagTest.test(text) && !returnExcepted.some(re => re.test(text))
  }

  /**
   * Extracts JSDoc-style tags from comment lines.
   *
   * Uses a complex regex pattern to capture multi-line tag content and stops
   * at the next tag or end of comment block.
   * @param {object} value - The block object containing comment lines to process
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
  #extractTag = async (value) => {
    const {lines,tag=[]} = value
    const result = {}
    const text = lines.join("\n")
    const tagTest = this.#regexes.get("tag")

    if(!tagTest.test(text))
      return value

    const tagMatch = this.#matchUntil(
      lines,
      this.#regexes.get("tag"),
      this.#regexes.get("tag-stop"),
      this.#regexes.get("tag-except")
    )

    if(tagMatch.length === 0)
      return value

    const match = tagMatch.shift()
    const {tag: matchedTag,type,name,rest,content} = match?.groups ?? {}

    result[matchedTag] = {name,type,rest,content: [content]}

    // If we had more than one entry, it's because we have more than one
    // line, and the rest is just content.
    if(tagMatch.length) {
      const contents = tagMatch.map(match => match.groups.content)

      result[matchedTag].content.push(...contents)
    }

    tag.push(result)

    Object.assign(value, {tag})

    return value
  }

  /**
   * Extracts \@return or \@returns JSDoc tags from comment lines.
   *
   * Specifically handles return value documentation with type information and
   * descriptions.
   *
   * Supports both \@return and \@returns variations, extracting the return type
   * from curly braces and optional description text.
   * @param {object} value - The block object containing comment lines to process
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
  #extractReturn = async value => {
    const {lines,tag=[]} = value
    const result = {}
    const text = lines.join("\n")
    const tagTest = this.#regexes.get("return")

    if(!tagTest.test(text))
      return value

    const tagMatch = this.#matchUntil(
      lines,
      this.#regexes.get("return"),
      this.#regexes.get("tag-stop")
    )

    if(!tagMatch)
      return value

    const match = tagMatch.shift()
    const tagToMatch = "return"
    const {type,content} = match.groups

    result[tagToMatch] = {type,content: [content]}

    // If we had more than one entry, it's because we have more than one
    // line, and the rest is just content.
    if(tagMatch.length) {
      const contents = tagMatch.map(match => match.groups.content)

      result[tag].content.push(...contents)
    }

    tag.push(result)

    Object.assign(value, {tag})

    return value
  }

  /**
   * Final processing method called after all extraction is complete.
   * @param {Array<Map>} value - Map of extracted data from the parsing process
   * @returns {Promise<Array<object>>} The transformation results.
   * @private
   */
  async #finally(value) {
    const result = await Collection.asyncMap(value, async item => {
      const result = {}
      result.name = item.function?.groups?.name // TODO get rid of ?

      result.description = item
        .description
        .map(d => d.groups.content)

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

    // Just take the file from the first one
    return {functions: result}
  }

  // #hasMoreBlocks = (value) => value.lines.length > 0

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

    return result
  }

  // HERE BE DRAGONS! YOU DONE BEEN WARNED, FUGGAH!
  /**
   * Regular expressions used for parsing LPC documentation blocks and function signatures.
   *
   * This map contains patterns for:
   * - Block start/end detection
   * - Description and tag extraction
   * - Function signature parsing
   * - JSDoc tag and return type identification
   *
   * Keys:
   * - "block-start": Start of a JSDoc block comment
   * - "block-stop": End of a JSDoc block comment
   * - "description-start": Start of a description line
   * - "description-stop": Start of a tag line
   * - "tag": Pattern for JSDoc tags (excluding \@returns)
   * - "tag-except": Patterns to exclude certain tags (e.g., \@returns)
   * - "tag-stop": Pattern to stop tag extraction
   * - "return": Pattern for \@return/\@returns tags
   * - "function": Pattern for LPC function signatures
   * @type {Map<string, RegExp | RegExp[]>}
   * @private
   */
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
