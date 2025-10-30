import { Sass } from "@gesslar/toolkit"
import {setTimeout as timeout} from "timers/promises"

class parse {
  static meta = Object.freeze({
    name: "markdown.parse.hooks.gesslar",
    kind: this.constructor.name,
  })

  #debug

  constructor({debug}) {
    this.#debug = debug

    this.#debug("Init hooks for: %o", 2, parse.meta.name)
  }

  async after$extractDescription(context) {
    context.description.forEach((item,index) => {
      if(item.groups?.content) {
        const wumbly = this.#jumbly(item.groups.content)

        context.description[index].groups.content = wumbly
      }
    })
  }

  #jumbly(x) {
    if(!x)
      return x

    return x.split("").map(y=>Math.floor(Math.random()*2)?y.toUpperCase():y).join("")
  }
}

class print {
  static meta = Object.freeze({
    name: "lpc.print.hooks.gesslar",
    kind: this.constructor.name,
  })

  #jokes = []
  #debug

  #rate = new Map([
    ["x-ratelimit-limit",0],
    ["x-ratelimit-remaining",0],
    ["x-ratelimit-reset",0],
    ["retry-after",0],
    ["last",0]
  ])

  constructor({debug}) {
    this.#debug = debug
    this.#debug("Init hooks for: %o", 2, print.meta.name)
  }

  async before$prepareFunctions(context) {
    try {
      const debug = this.#debug
      const {moduleName,functions} = context

      debug("Start hook for %o (%o functions)", 2, moduleName, functions.length)

      if(context.functions.length < 1) {
        debug("No functions in %o, exiting.", 2)
        return
      }

      const result = await this.#getDadJokes(moduleName,functions.length)
      if(!result)
        throw Sass.new("Unable to retrieve precious dad jokes. :(")

      const {status, jokes} = result

      if(status === "error")
        throw result.error


      debug("Fetched %o jokes", 2, jokes.length)

      this.#jokes = jokes.map(joke => joke.joke)
    } catch(error) {
      throw Sass.new("Fetching dad jokes", error)
    }
  }

  async before$renderFunction(context) {
    const joke = this.#jokes.pop()
    if(!joke)
      return

    context.remaining.at(0).description.push(joke);
  }

  #isGoodQuestionMark = r => {
    if(!r.ok)
      throw new Error(`HTTP error! status: ${r.status}: ${r.statusText}`)
  }

  #updateRate = r => {
    if(!r?.headers)
      return

    this.#rate.set("x-ratelimit-limit", parseInt(r.headers.get("x-ratelimit-limit")))
    this.#rate.set("x-ratelimit-remaining", parseInt(r.headers.get("x-ratelimit-remaining")))
    this.#rate.set("x-ratelimit-reset", parseInt(r.headers.get("x-ratelimit-reset")))
    this.#rate.set("retry-after", parseInt(r.headers.get("retry-after")))
    this.#rate.set("last", parseInt(Date.now()))
  }

  #retries = new Map()

  async #tryAgain(module, number, response, id) {
    if(!response?.headers)
      return

    try {
      const retryAfter = parseInt(response.headers.get("retry-after"))
      const tryingAfter = (retryAfter * 1_000) * 1.25

      this.#debug("[%o] Rate limited. Waiting for %os", 2, module, tryingAfter/1_000);

      await timeout(tryingAfter)

      return await this.#getDadJokes(module, number, id)
    } catch(error) {
      throw Sass.new("Executing hook retry", error)
    }
  }

  /**
   * Fetches a dad joke from the icanhazdadjoke API.
   * @param module
   * @param {number} number - The number of jokes to fetch.
   * @param id
   * @returns {Promise<object>} The result of the fetch operation.
   */
  async #getDadJokes(module, number = 1, id=Symbol(performance.now())) {
    const url = `https://icanhazdadjoke.com/search?limit=${number}`
    const rate = this.#rate

    // If they're all 0, then this is a first run.
    const firstRun = Array.from(rate.values()).reduce((acc,curr) => acc + curr, 0) === 0

    const headers = new Headers()
    headers.append("Accept", "application/json")
    headers.append("User-Agent", "BeDoc Sample API Usage (https://github.com/gesslar/BeDoc)")

    let response
    let result

    try {
      if(firstRun) {
        response = await fetch(url, {method:"HEAD", headers})
        this.#isGoodQuestionMark(response)
        this.#updateRate(response)
      }

      response = await fetch(url, {method: "GET", headers,})

      this.#isGoodQuestionMark(response)

      const data = await response.json()

      // This is legit, right??
      const x = undefined
      const {y} = x

      result = {
        status: "success",
        message: "Jokes fetched successfully",
        jokes: data.results
      }
    } catch(error) {
      // rate limited
      if(response?.status === 429) {
        if(!this.#retries.has(id))
          this.#retries.set(id, 1)
        else
          this.#retries.set(id, this.#retries.get(id) + 1)

        if(this.#retries.get(id) > 5)
          throw Sass.new("Exceeded maximum retries.", error)

        return await this.#tryAgain(module, number, response, id)
      } else {
        throw Sass.new("Fetching dad jokes.", error)
      }
    } finally {
      this.#updateRate(response)
    }

    return await result
  }
}

export {parse,print}
