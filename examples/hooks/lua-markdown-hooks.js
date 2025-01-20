import console from "node:console"

export const Hooks = {
  parse: {},

  print: {
    async enter({name, section}) {
      if(name === "return") {
        console.debug("section", JSON.stringify(section, null, 1))
      }
    }
  }

}
