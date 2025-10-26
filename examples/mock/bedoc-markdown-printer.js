import { ACTIVITY } from "@gesslar/actioneer"
import { Data, Term } from "@gesslar/toolkit"

const {UNTIL} = ACTIVITY

/** @typedef {import("@gesslar/actioneer").ActionBuilder} ActionBuilder */

export default class {
  static meta = Object.freeze({
    kind: "print",
    output: "markdown",
    terms: "ref://./bedoc-markdown-printer.yaml"
  })

  setup = ab => ab
    .do("Prepare functions", this.#prepare)
    .do("Render function", UNTIL, this.#hasMoreFunctions, this.#renderFunction)
    .do("Finalize output", this.#finalise)

  async #prepare({moduleName,functions}) {
    const ordered = Data.typeOf(functions) === "Array"
      ? [...functions].sort((a, b) => {
        if(!a?.name || !b?.name)
          return 0

        return a.name.localeCompare(b.name)
      })
      : []

    return {
      moduleName,
      remaining: ordered,
      rendered: []
    }
  }

  /**
   * Predicate to check if there are more functions to render
   * @param {object} curr - Current context
   * @returns {boolean} True if more functions remain
   * @private
   */
  #hasMoreFunctions = curr => curr.remaining.length > 0

  async #renderFunction(curr) {
    const {remaining,rendered} = curr
    const next = remaining.shift()

    if(!next)
      return curr

    const lines = []

    if(next.name)
      lines.push(`## ${next.name}`)

    if(next.description)
      lines.push("", next.description.join("\n").trim())

    if(Array.isArray(next.param) && next.param.length > 0) {
      const paramLines = next.param.map(param => {
        const descriptor = []

        if(param.name)
          descriptor.push(`**${param.name}**`)

        if(param.type)
          descriptor.push(`*${Array.isArray(param.type) ? param.type.join(" | ") : param.type}*`)

        const prefix = descriptor.length ? `${descriptor.join(" ")}:` : "-"
        const body = Array.isArray(param.content)
          ? param.content.map(c => c?.trim()).filter(Boolean).join(" ")
          : ""

        return `${prefix} ${body}`.trim()
      }).filter(Boolean)

      if(paramLines.length) {
        lines.push("", "### Parameters", "")
        lines.push(...paramLines.map(line => `- ${line}`))
      }
    }

    if(next.return) {
      const returnContent = Array.isArray(next.return.content)
        ? next.return.content.map(c => c?.trim()).filter(Boolean).join(" ")
        : ""
      const returnLine = next.return.type
        ? `**${Array.isArray(next.return.type) ? next.return.type.join(" | ") : next.return.type}** ${returnContent}`.trim()
        : returnContent

      if(returnLine) {
        lines.push("", "### Returns", "")
        lines.push(returnLine)
      }
    }

    const result = lines.join("\n").trim()

    rendered.push(Data.appendString(result, "\n"))

    return curr
  }

  async #finalise(curr) {
    const {moduleName, rendered} = curr

    if(!rendered.length)
      Term.warn(`No functions to print for module: \`${moduleName}\``)

    return {
      destFile: `${moduleName}.md`,
      destContent: rendered.join("\n")
    }
  }
}
