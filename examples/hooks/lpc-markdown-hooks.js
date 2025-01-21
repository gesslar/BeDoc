import console from "node:console"

export const Hooks = {
  parse: {},

  print: {
    async init(arg) {
      console.debug(arg)
    },

    async enter({name, section}) {
      if(name === "description") {
        // const translated = await getDadJoke()
        // if(translated.status == "success")
        //   section.description = [...section.description, translated.joke]
        //   section.description = [...section.description, translated.joke]
        // return translated
      }
    }
  }
}

/**
 * Fetches a dad joke from the icanhazdadjoke API.
 * @returns {Promise<object>} The result of the fetch operation.
 */
async function getDadJoke() {
  const url = "https://icanhazdadjoke.com"

  try {
    const headers = new Headers()
    headers.append("Accept", "application/json")
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    })
    if(!response.ok)
      throw new Error(`HTTP error! status: ${response.status}`)

    const data = await response.json()
    return {
      status: "success",
      message: "Joke fetched successfully",
      joke: data.joke,
    }
  } catch(error) {
    return {
      status: "error",
      error: error,
    }
  }
}
