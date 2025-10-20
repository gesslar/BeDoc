class print {
  static meta = Object.freeze({
    name: "lpc.print.hooks.gesslar"
  })

  #jokes = []
  #debug

  constructor({debug}) {
    this.#debug = debug

    this.#debug("Init hooks for: %o", 2, print.meta.name)
  }

  async before$prepare(context) {
    const debug = this.#debug
    const {moduleName,functions} = context

    debug("Start hook for %o (%o functions)", 2, moduleName, functions.length)

    const result = await this.#getDadJokes(functions.length)
    const {status, jokes} = result

    if(status === "error")
      throw result.error

    debug("Fetched %o jokes", 2, jokes.length)

    this.#jokes = jokes.map(joke => joke.joke)
  }

  async before$render(context) {
    const joke = this.#jokes.pop()
    if(!joke)
      return

    context.value.remaining.at(0).description.push(joke);
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

class parse {
  static meta = Object.freeze({
    name: "markdown.parse.hooks.gesslar"
  })

  #debug

  constructor({debug}) {
    this.#debug = debug

    this.#debug("Init hooks for: %o", 2, parse.meta.name)
  }

  async after$description(context) {
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

export {print,parse}
