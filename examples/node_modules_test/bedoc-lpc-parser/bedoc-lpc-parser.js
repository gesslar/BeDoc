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
 *
 * @author gesslar
 * @version 1.0.0
 * @since 1.0.0
 */

import {ActionBuilder, ACTIVITY} from "@gesslar/actioneer"
import {Collection, Data, Util} from "@gesslar/toolkit"

const {WHILE} = ACTIVITY

/**
 * LPC Parser Class - Parses LPC files to extract function documentation.
 *
 * This parser is designed to work with LPC (LPC Programming Language) source
 * files, extracting LPCDoc comments and function signatures. It
 * identifies functions with their access modifiers, types, parameters, and
 * associated documentation.
 *
 * @class
 */
export default class LpcParser {
  /**
   * Parser metadata defining its characteristics and contract.
   *
   * @readonly
   * @type {object}
   * @property {string} kind - The type of action.
   * @property {string} input - The input file type this parser handles.
   * @property {string} terms - The contract file name.
   */
  static meta = Object.freeze({
    kind: "parser",
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
   *
   * @param {ActionBuilder} builder - The ActionBuilder instance to configure
   * @returns {ActionBuilder} The configured builder instance
   * @example
   * // LPC function pattern matched:
   * // public varargs int my_function(string arg1, object *args) {
   * @see ActionBuilder
   */

  setup = builder => builder
    .do("Extract blocks", this.#extractBlocks)
    .do("Process functions", ACTIVITY.SPLIT,
      ctx => ctx, // splitter
      ctx => ctx, // rejoiner
      new ActionBuilder()
        .do("Extract signature", this.#johnHandcock)
        .do("Extract description", this.#extractDescription)
        .do("Extract tags", WHILE, ctx => {
          return ctx.lines.length > 0
        }, this.#extractTag)
    )
    .done(this.#finally)

  async #extractBlocks(ctx) {
    ctx = Data.append(ctx, "\n")

    const result = []
    const lines = ctx.split("\n")

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

          // Set the function match as a property on the array for later
          // somethingspection.
          const func = this.#regexes.get("function").exec(lines[idIndex])
          block.function = func

          // Slurp! Slurp!
          lines.splice(0, 1)
        }
      }

      result.push(block)
    }

    return result
  }

  // Gimme k/v object that only has k where v isn't null or undefined.
  // You see that, mistermadammissus PR robot, some of us know that !=
  // against null means undefined _OR_ null. People who don't maybe need
  // to get their education checked.
  #gimme = ob =>
    Object.fromEntries(Object.entries(ob).filter(([_, v]) => v != null))

  #johnHandcock = ctx => {
    const {function: func} = ctx
    const signature = this.#gimme(func?.groups ?? {})

    return Object.assign(ctx, {signature})
  }

  /**
   * Extracts the description section from JSDoc-style comment lines.
   *
   * Processes comment lines to extract the main description text that appears
   * before any \@tag declarations. The description continues until it
   * encounters a line starting with an @ symbol (indicating a JSDoc tag).
   *
   * @param {Array<string>} curr - Array of comment lines to process
   * @returns {Promise<Array<string> | null>} Array of description lines, or null if empty
   * @private
   * @example
   * // Input comment lines:
   * // * This is the main description
   * // * of the function.
   * // * @param {string} arg - An argument
   * //
   * // Returns: ["This is the main description", "of the function."]
   */
  #extractDescription = ctx => {
    const {lines} = ctx

    const comment = this.#regexes.get("comment-line")
    const tagId = this.#regexes.get("tag-id")

    const description = []
    Object.assign(ctx, {description})

    if(!(comment.test(lines.join("\n"))))
      return ctx

    while(lines.length > 0) {
      const line = lines.shift()

      if(!comment.test(line))
        continue

      if(tagId.test(line)) {
        lines.unshift(line)
        break
      }

      const {content} = comment.exec(line)?.groups ?? {}
      description.push(content ?? "")
    }

    return ctx
  }

  /**
   * Extracts JSDoc-style tags from comment lines.
   *
   * Uses a complex regex pattern to capture multi-line tag content and stops
   * at the next tag or end of comment block.
   *
   * @param {string[]} ctx - Array of comment lines to process
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
  #extractTag = async ctx => {
    const {lines, tag: extractedTags = {}} = ctx

    const comment = this.#regexes.get("comment-line")
    const tagId = this.#regexes.get("tag-id")
    // narrower to more broader
    const patterns = ["return", "example", "tag"].map(e => this.#regexes.get(e))

    const line = lines.shift()

    // Just consume it. We don't need it.
    if(!comment.test(line))
      return ctx

    // If this isn't the start of a tag, consume it, too.
    if(!tagId.test(line))
      return ctx

    const pattern = patterns.find(e => e.test(line))

    // No supported tag pattern worked. So, consume. Man, we doing some
    // mad nom!
    if(!pattern)
      return ctx

    // First, let's grab the matches
    const {groups} = pattern.exec(line) ?? {}
    if(!groups) // something above lied to us!
      return ctx // gobble gobble

    const {tag} = groups
    if(!tag)
      return ctx

    delete groups.tag
    if(groups.content)
      groups.content = [groups.content]
    else
      groups.content = []

    while(lines.length > 0) {
      const continued = lines.shift()

      // Anything _not_ a new tag is content.
      if(tagId.test(continued)) {
        // oops! put it back before anybody notices!
        lines.unshift(continued)

        // whistle and step away!
        break
      }

      const {content} = comment.exec(continued)?.groups ?? {}

      groups.content.push(content ?? "")
    }

    const curr = extractedTags[tag] ?? []
    curr.push(groups)

    Object.assign(extractedTags, {[tag]: curr})

    return Object.assign(ctx, {tag: extractedTags})
  }

  /**
   * Final processing method called after all extraction is complete.
   *
   * @param {Array<Map>} ctx - Map of extracted data from the parsing process
   * @returns {Promise<Array<object>>} The transformation results.
   * @private
   */
  async #finally(ctx) {
    const functions = await Collection.asyncMap(ctx, async func => {
      const result = {
        name: func.function.groups.name,
        description: func.description,
        signature: func.signature,
      }

      const tags = func.tag ?? {}

      if(tags.param)
        result.param = tags.param
          .map(({type, name, content}) => ({type, name, content}))

      if(tags.return || tags.returns) {
        const ret = (tags.return ?? tags.returns)[0]
        result.return = {type: ret.type, content: ret.content}
      }

      if(tags.example || tags.examples) {
        const examples = tags.example ?? tags.examples

        result.example = examples.flatMap(({content}) => content)
      }

      return result
    })

    return {functions}
  }

  // HERE BE DRAGONS! YOU DONE BEEN WARNED, FUGGAH!
  #regexes = new Map([
    ["block-start", /^\s*\/\*\*.*$/],
    ["block-stop", /^\s*\*\/\s*$/],
    ["comment-line", /^\s\*((?:\s)(?<content>[\s\S]+))?/],
    ["tag-id", /^\s\*\s@[a-zA-Z]/],
    ["tag", Util.regexify(`
      ^\\s*\\*(\\s
      @(?<tag>\\w+)\\s*
      \\{(?<type>\\w+(?:\\|\\w+)*(?:\\*)?)\\}\\s+
      (?<name>(\\w+(\\.\\w?)*=?\\w*\\s*(?<rest>\\.{3})?|\\[\\w+=?.*]))(?:\\s+-)?\\s+|\\s)
      (?<content>[\\s\\S]+?)
      $
    `
    )],
    ["tag-except", [/^\s*\*\s+@returns?/, /^\s*\*\s+@example\s[\s\S]\n$/]],
    ["tag-stop", /^\s*\*(?:\/|\s*@)/],
    ["return", /^\s*\*\s*@(?<tag>returns?)\s+\{(?<type>[^}]*)\}(?:\s+(?:-\s+)?(?<content>.*))?/],
    ["example", /^\s\* @(?<tag>examples?)((?:\s)(?<content>[\s\S]+))?/],
    ["function", Util.regexify(`
      ^\\s*
      (?<access>public|protected|private)?
      \\s*
      (?<modifier1>nomask|varargs)?
      \\s*
      (?<modifier2>nomask|varargs)?
      \\s*
      (?<type>(int|float|void|string|object|mixed|mapping|array|buffer|function))\\s*\\*?
      \\s*
      (?<name>[a-zA-Z_][a-zA-Z0-9_]*)
      \\s*
      \\((?<parms>.*)\\)
      \\s*
      \\{?.*
      `
    )]
  ])
}
