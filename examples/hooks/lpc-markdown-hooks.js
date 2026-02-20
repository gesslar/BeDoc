export class Parse {
  after$extractTags = ctx => {
    // NO EXAMPLES! Figure it out on your own.

    delete ctx.tag.example
  }
}

export class Format {
  jokes = []

  setup = async ctx => {
    const result = await this.getDadJokes(ctx.length)
    const {status, jokes} = result

    if(status === "error")
      throw new Error(`Failed to fetch jokes: ${result.error}`)

    this.jokes = jokes.map(joke => joke.joke)
  }

  before$formatFunction = async ctx => {
    const joke = this.jokes.pop()

    if(joke)
      ctx.description.push("", joke)
  }

  /**
     * Fetches a dad joke from the icanhazdadjoke API.
     *
     * @param {number} number - The number of jokes to fetch.
     * @returns {Promise<object>} The result of the fetch operation.
     */
  getDadJokes = async(number = 1) => {
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
