import {Valid} from "@gesslar/toolkit"

/** @typedef {import("./ActionRunner.js").default} ActionRunner */

/**
 * Activity bit flags recognised by {@link ActionBuilder#act}. The flag decides
 * how results are accumulated for each activity.
 *
 * @readonly
 * @enum {number}
 */
export const ACTIVITY = Object.freeze({
  ONCE: 1<<1,
  MANY: 1<<2,
  PARALLEL: 1<<3,
})

/**
 * Fluent builder for describing how an action should process the context that
 * flows through the {@link ActionRunner}. Consumers register named activities,
 * optional hook pairs, and nested parallel pipelines before handing the
 * builder back to the runner for execution.
 *
 * Typical usage:
 *
 * ```js
 * const pipeline = new ActionBuilder(myAction)
 *   .act("prepare", ACTIVITY.ONCE, ctx => ctx.initialise())
 *   .parallel(parallel => parallel
 *     .act("step", ACTIVITY.MANY, ctx => ctx.consume())
 *   )
 *   .act("finalise", ACTIVITY.ONCE, ctx => ctx.complete())
 *   .build()
 * ```
 *
 * @class ActionBuilder
 */
export default class ActionBuilder {
  #action = null
  #activities = new Map([])

  /**
   * Creates a new ActionBuilder instance with the provided action callback.
   *
   * @param {(ctx: object) => void} action Base action invoked by the runner when a block
   *   satisfies the configured structure.
   */
  constructor(action) {
    this.#action = action
  }

  /**
   * Returns the underlying action that will receive the extracted context.
   *
   * @returns {(ctx: object) => void} The action callback function that processes the extracted context.
   */
  get action() {
    return this.#action
  }

  /**
   * Returns the registered activities keyed by their name.
   *
   * @returns {Map<string | symbol, {op: (context: object) => unknown, kind: number, hooks: {before: ((context: object) => void)|null, after: ((context: object) => void)|null}}>} Map of registered activities and their metadata.
   */
  get activities() {
    return this.#activities
  }

  /**
   * Registers a named activity that will run for each matching block.
   *
   * @param {string} name Unique activity identifier.
   * @param {number} kind Activity accumulation strategy (see {@link ACTIVITY}).
   * @param {(context: object) => unknown} op Work function executed with the runner context.
   * @param {{before?: (context: object) => void, after?: (context: object) => void}} [hooks] Optional hooks to run before or after the activity operation.
   * @returns {ActionBuilder} Builder instance for chaining.
   */
  act(name, kind, op, hooks={}) {
    this.#validActivityKind(kind)
    this.#dupeActivityCheck(name)

    hooks = this.#normalizeHooks(hooks)

    this.#activities.set(name, {op, kind, hooks})

    return this
  }

  #normalizeHooks({before=null, after=null}) {
    return {before, after}
  }

  /**
   * Defines a nested pipeline that will run with the {@link ACTIVITY} flag PARALLEL.
   *
   * The callback receives a fresh {@link ActionBuilder} scoped to the current
   * action. The callback must return the configured builder so the runner can
   * execute the nested pipeline.
   *
   * @param {(builder: ActionBuilder) => ActionBuilder} func Callback configuring a nested builder.
   * @returns {ActionBuilder} Builder instance for chaining.
   */
  parallel(func) {
    const activityName = Symbol(performance.now())

    this.#activities.set(activityName, {
      op: func.call(this.action, new ActionBuilder(this.action)),
      kind: ACTIVITY.PARALLEL
    })

    return this
  }

  #validActivityKind(kind) {
    Valid.assert(
      Object.values(ACTIVITY).includes(kind),
      "Invalid activity kind."
    )
  }

  /**
   * Validates that an activity name has not been reused.
   *
   * @private
   * @param {string|symbol} name Activity identifier.
   */
  #dupeActivityCheck(name) {
    Valid.assert(
      !this.#activities.has(name),
      `Activity '${String(name)}' has already been registered.`
    )
  }

  /**
   * Finalises the builder and returns a payload that can be consumed by the
   * runner.
   *
   * @returns {{action: (context: object) => unknown, build: ActionBuilder}} Payload consumed by the {@link ActionRunner} constructor.
   */
  build() {
    return {action: this.#action, build: this}
  }
}
