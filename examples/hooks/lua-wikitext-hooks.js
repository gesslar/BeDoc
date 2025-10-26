class print {
  static meta = Object.freeze({
    name: "lua-wikitext.print.hooks"
  })

  #debug

  constructor({debug}) {
    this.#debug = debug
    this.#debug("Init hooks for: %o", 2, print.meta.name)
  }

  async after$finalise(context) {
    const {destContent} = context

    context.destContent = destContent.replace(
      /```lua\n([\s\S]+?)```/g,
      '<syntaxhighlight lang="lua">\n$1</syntaxhighlight>\n',
    )
  }
}

export {print}
