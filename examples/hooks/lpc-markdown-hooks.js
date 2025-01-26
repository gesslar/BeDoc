export const Hooks = {
  parse: {},

  print: {

    name: "lpc-markdown-hooks",
    jokes: [],

    async setup({log}) {
      this.log = log
      this.debug = log.newDebug()

      this.log.debug("Init hooks for: %o", 2, this.name)
    },

    async start({module, content}) {
      const debug = this.debug

      debug("Start hook for %s (%d functions)", 2,
        module, content.functions.length
      )

      const result = await this.getDadJokes(content.functions.length)
      const {status, jokes} = result

      if(status === "error")
        throw new Error(`Failed to fetch jokes: ${result.error}`)

      debug("Fetched %o jokes", 2, jokes.length)

      this.jokes = jokes.map(joke => joke.joke)
    },

    async enter({name, section}) {
      if(name === "description") {
        const joke = this.jokes.pop()

        if(joke)
          section.description = [...section.description, joke]
      }
    },

    /**
     * Fetches a dad joke from the icanhazdadjoke API.
     *
     * @param {number} number - The number of jokes to fetch.
     * @returns {Promise<object>} The result of the fetch operation.
     */
    async getDadJokes(number = 1) {
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
  },
}
