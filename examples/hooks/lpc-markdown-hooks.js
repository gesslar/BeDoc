export class print {
  static meta = Object.freeze({
    name: "lpc-markdown-hooks"
  })

  #jokes = []
  #debug

  constructor({debug}) {
    debug("Init hooks for: %o", 2, print.meta.name)

    this.#debug = debug
  }

  async before$prepare(context) {
    const debug = this.#debug
    const {moduleName,functions} = context

      debug("Start hook for %o (%d functions)", 2,
        moduleName, functions.length
      )

      const result = await this.#getDadJokes(functions.length)
      const {status, jokes} = result

      if(status === "error")
        throw new Error(`Failed to fetch jokes: ${result.error}`)

      debug("Fetched %d jokes", 2, jokes.length)

      this.#jokes = jokes.map(joke => joke.joke)
    }

    async before$render(context) {
      const joke = this.#jokes.pop()
      if(!joke)
        return

      const content = context.value.remaining.at(0).description
      const joked = `${content}\n${joke}`

      context.value.remaining.at(0).description = joked
    }

    /**
     * Fetches a dad joke from the icanhazdadjoke API.
     * @param {number} number - The number of jokes to fetch.
     * @returns {Promise<object>} The result of the fetch operation.
     */
    async #getDadJokes(number = 1) {
      const url = `https://icanhazdadjoke.com/search?limit=${number}`

      try {
        const headers = new Headers()
        headers.append("Accept", "application/json")
        headers.append("User-Agent", "BeDoc Sample API Usage " +
        "(https://github.com/gesslar/BeDoc)")
        const response = await fetch(url, {
          method: "GET",
          headers: headers,
        })
        if(!response.ok)
          throw new Error(`HTTP error! status: ${response.status}: `+
          `${response.statusText}`)

        const data = await response.json()
        return {
          status: "success",
          message: "Jokes fetched successfully",
          jokes: data.results
        }
      } catch(error) {
        return {
          status: "error",
          error: error,
        }
      }
    }
}
