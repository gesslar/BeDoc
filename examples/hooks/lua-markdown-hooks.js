export const Hooks = {
  parse: {},

  print: {
    async enter({name, section}) {
      if(name === "return")
        this.log.debug("section: %j", 1, section)
    },
  },
}
