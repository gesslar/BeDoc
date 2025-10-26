class print {
  static meta = Object.freeze({
    name: "lua-markdown.print.hooks"
  })

  #debug

  constructor({debug}) {
    this.#debug = debug
    this.#debug("Init hooks for: %o", 2, print.meta.name)
  }

  async before$render(context) {
    const {value} = context
    const next = value.remaining[0]

    if(!next)
      return

    if(next.return) {
      this.#debug("return section: %j", 1, next.return)
    }
  }
}

export {print}
