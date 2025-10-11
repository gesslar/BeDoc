import {Sass} from "@gesslar/toolkit"
import ActionBuilder, {ACTIVITY} from "./ActionBuilder.js"
import Piper from "./Piper.js"
/**
 * Orchestrates execution of {@link ActionBuilder}-produced pipelines.
 *
 * Activities run in insertion order, with support for once-off work, repeated
 * loops, and nested parallel pipelines. Each activity receives a mutable
 * context object under `result.value` that can be replaced or enriched.
 */
export default class ActionRunner {
  #action = null
  #build = null
  #hooks = null

  constructor({action, build}, hooks) {
    this.#action = action
    this.#build = build
    this.#hooks = hooks
  }

  /**
   * Executes the configured action pipeline.
   *
   * @param {unknown} content Seed value passed to the first activity.
   * @returns {Promise<unknown>} Final value produced by the pipeline, or null when a parallel stage reports failures.
   * @throws {Sass} When no activities are registered or required parallel builders are missing.
   */
  async run(content) {
    const activities = this.#build.activities

    if(!activities.size)
      throw Sass.new("No activities defined in action.")

    const result = content
    const action = this.#action

    for(const [name,activity] of activities) {
      const {op} = activity

      if(activity.kind === ACTIVITY.ONCE) {
        this.#hooks && await this.#hooks.callHook("before", name, result)

        if(!await op.call(action, result))
          break

        this.#hooks && await this.#hooks.callHook("after", name, result)
      } else if(activity.kind == ACTIVITY.MANY) {
        for(;;) {

          this.#hooks && await this.#hooks.callHook("before", name, result)

          if(!await op.call(action, result))
            break

          this.#hooks && await this.#hooks.callHook("after", name, result)
        }
      } else if(activity.kind === ACTIVITY.PARALLEL) {
        if(op === undefined)
          throw Sass.new("Missing action builder. Did you return the builder?")

        if(!op)
          throw Sass.new("Okay, cheeky monkey, you need to return the builder for this to work.")

        const builder = op.build()
        const piper = new Piper()
          .addStep(item => {
            const runner = new ActionRunner(builder, this.#hooks)

            return runner.run(item)
          }, {name: `Process Parallel ActionRunner Activity`,})

        await piper.pipe(result.value)
      }
    }

    return result
  }
}
