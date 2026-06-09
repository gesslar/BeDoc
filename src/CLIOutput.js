import c from "@gesslar/colours"
import {FileSystem as FS, Notify, Term} from "@gesslar/toolkit"
import process from "node:process"
import {stripVTControlCharacters} from "node:util"

/**
 * Glyph sets for the framed output blocks. The `unicode` set is used when the
 * terminal can render box-drawing/geometric characters; `ascii` is the plain
 * fallback. In the ascii set the status markers are shape-distinct (not just
 * colour-distinct) so they remain legible when colour is also unavailable.
 */
const GLYPHS = {
  unicode: {
    upper: "╭▸", upperDone: "╭─", mid: "│", lower: "╰▸", lowerDone: "╰─",
    pending: "□", active: "▸", success: "■", warning: "■", error: "■",
  },
  ascii: {
    upper: ",>", upperDone: ",-", mid: "|", lower: "`>", lowerDone: "`-",
    pending: ".", active: ">", success: "#", warning: "!", error: "x",
  },
}

/**
 * Rough check for whether the terminal can render Unicode glyphs. Mirrors the
 * common heuristic: everything outside the raw Linux kernel console is assumed
 * capable on POSIX; on Windows, only modern terminals are.
 *
 * @returns {boolean} True if Unicode glyphs are safe to emit.
 */
function supportsUnicode() {
  if(process.platform === "win32")
    return Boolean(process.env.WT_SESSION || process.env.TERM_PROGRAM)

  return process.env.TERM !== "linux"
}

/**
 * Handles CLI output for the BeDoc pipeline, rendering progress and status
 * for each file as it moves through the read → parse → validate → format →
 * write stages.
 *
 * Listens to a {@link Notify} instance and tracks per-file state in an
 * internal map so that output can be updated in-place as each stage completes.
 *
 * Each file is drawn as a framed block: an Input line (top border), one line
 * per pipeline stage, and an Output line (bottom border). Colour is emitted
 * only when {@link Term.hasColor} is true (honouring NO_COLOR/FORCE_COLOR), and
 * the glyph set degrades to ASCII when Unicode is unsupported.
 */
export default class CLIOutput  {
  /** Pipeline stages, in order, matching the Conveyor activity names. */
  #stages = ["read", "parse", "validate", "format", "write"]

  /** The active glyph set (unicode or ascii). */
  #g = supportsUnicode() ? GLYPHS.unicode : GLYPHS.ascii

  #basePath

  /** When true, only Input/Output lines are drawn (no per-stage lines). */
  #terse

  /**
   * Tracks per-file state keyed by file path/identifier.
   *
   * @type {Map<string, object>}
   */
  #files = new Map()

  constructor({basePath, terse = false}) {
    this.#basePath = basePath
    this.#terse = terse

    Notify.on("conveyor-start", this.#conveyorStart)
    Notify.on("update-data", this.#updateData)

    c.alias.set("border", "{F033}")
    c.alias.set("fileName", "{<B}")
    c.alias.set("fileSize", "{F070}")

    c.alias.set("success", "{F064}")
    c.alias.set("pending", "{F033}")
    c.alias.set("warning", "{F178}")
    c.alias.set("error", "{F124}")
  }

  /**
   * Seeds the tracking map when the conveyor announces its work set.
   *
   * @param {Array<object>} ctx - One entry per file, each {file, output}.
   */
  #conveyorStart = ctx => {
    ctx.forEach(e => this.#files.set(e.file, {
      output: e.output,
      stages: Object.fromEntries(this.#stages.map(s => [s, "pending"])),
      size: {
        input: undefined, // undefined = pending, null = err, 0 = warning, number = success
        output: undefined, // undefined = pending, null = err, 0 = warning, number = success
      }
    }))
  }

  /**
   * Applies a single update for a file and re-renders. Messages are either a
   * size update ({kind: "input-size"|"output-size", value}) or a stage
   * transition ({kind: "stage", stage, state}).
   *
   * @param {object} update - The update payload.
   * @param {object} update.file - The file the update pertains to.
   * @param {object} update.message - The update message (see above).
   */
  #updateData = ({file, message}) => {
    const item = this.#files.get(file)

    if(!item)
      return

    switch(message.kind) {
      case "input-size":
        item.size.input = message.value
        break

      case "output-size":
        item.size.output = message.value
        break

      case "stage":
        item.stages[message.stage] = message.state
        break
    }

    this.render()
  }

  /**
   * Maps a stage state to its coloured glyph.
   *
   * @param {string} state - One of pending|active|done|warning|error.
   * @returns {string} The coloured marker.
   */
  #marker(state) {
    switch(state) {
      case "active": return `{pending}${this.#g.active}{/}`
      case "done": return `{success}${this.#g.success}{/}`
      case "warning": return `{warning}${this.#g.warning}{/}`
      case "error": return `{error}${this.#g.error}{/}`
      default: return `{pending}${this.#g.pending}{/}`
    }
  }

  /**
   * Maps an input/output size to its coloured glyph. undefined is pending,
   * null is error, 0 is warning, any other number is success.
   *
   * @param {number|null|undefined} size - The tracked size value.
   * @returns {string} The coloured marker.
   */
  #sizeMarker(size) {
    if(size === undefined)
      return `{pending}${this.#g.pending}{/}`

    if(size === null)
      return `{error}${this.#g.error}{/}`

    if(size === 0)
      return `{warning}${this.#g.warning}{/}`

    return `{success}${this.#g.success}{/}`
  }

  render(cls=true) {
    const lines = []

    for(const [file, {output, stages, size}] of this.#files) {
      const srcRel = FS.toRelativePath(this.#basePath.path, file.path)
      const outRel = FS.toRelativePath(this.#basePath.path, output.path)
      const done = size.output !== undefined

      lines.push(
        `{border}${done ? this.#g.upperDone : this.#g.upper}{/}${this.#sizeMarker(size.input)} Input {fileName}${srcRel}{B>}` +
        (size.input ? ` ({fileSize}${size.input.toLocaleString()}{/} bytes)` : "")
      )

      if(!this.#terse)
        for(const stage of this.#stages)
          lines.push(`{border}${this.#g.mid}{/}  ${this.#marker(stages[stage])} ${stage}`)

      lines.push(
        `{border}${done ? this.#g.lowerDone : this.#g.lower}{/}${this.#sizeMarker(size.output)} Output {fileName}${outRel}{/}` +
        (size.output ? ` ({fileSize}${size.output.toLocaleString()}{/} bytes)` : "")
      )
    }

    const out = c`${lines.join("\n")}\n`

    cls && Term.cls()
    Term.write(Term.hasColor ? out : stripVTControlCharacters(out))
  }
}
