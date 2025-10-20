import { Data, Sass } from "@gesslar/toolkit"
import {ACTIVITY} from "../../src/core/abstracted/ActionBuilder.js"

/** @typedef {import("../../src/core/abstracted/ActionBuilder.js").default} ActionBuilder */

export default class {
  static meta = Object.freeze({
    kind: "print",
    output: "markdown",
    terms: "ref://./bedoc-markdown-printer.yaml"
  })

  setup = builder => builder
    .act("prepare", ACTIVITY.ONCE, this.#prepare)
    .act("render", ACTIVITY.MANY, this.#renderFunction)
    .act("final", ACTIVITY.ONCE, this.#finalise)

  async #prepare(curr) {
    const {moduleName = "module", functions = []} = curr ?? {}
    const ordered = Data.typeOf(functions) === "Array"
      ? [...functions].sort((a, b) => {
        if(!a?.name || !b?.name)
          return 0

        return a.name.localeCompare(b.name)
      })
      : []

    curr.value = {
      moduleName,
      remaining: ordered,
      rendered: []
    }

    return true
  }

  async #renderFunction(curr) {
    const next = curr.value.remaining.shift()

    if(!next)
      return false

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

    curr.value.rendered.push(Data.appendString(result, "\n"))

    return curr.value.remaining.length > 0
  }

  async #finalise(curr) {
    const {moduleName, rendered} = curr.value

    if(!rendered.length)
      throw new Sass(`No functions to print for module: \`${moduleName}\``)

    curr.value = {
      destFile: `${moduleName}.md`,
      destContent: rendered.join("\n\n")
    }

    return true
  }
}
