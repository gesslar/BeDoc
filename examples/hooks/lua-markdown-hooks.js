// This file is created to demonstrate the usage of hooks in the Lua Markdown

class Hooks {
  #logger

  constructor({logger}) {
    this.#logger = logger
  }

  print = {
    enter: async({name, section}) => {
      const debug = this.#logger.newDebug()

      if(name === "return") {
        debug("section", JSON.stringify(section, null, 1))
      }
    }
  }

  parse = {}
}

export default Hooks
