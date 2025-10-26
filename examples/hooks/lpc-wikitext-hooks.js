class print {
  static meta = Object.freeze({
    name: "lpc-wikitext.print.hooks"
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

    // Trim leading and trailing empty lines from description
    if(next.description) {
      const content = next.description
      while(content.length && !content.at(0))
        content.shift()

      while(content.length && !content.at(-1))
        content.pop()
    }
  }

  async after$finalise(context) {
    const {destContent} = context

    context.destContent = destContent.replace(
      /```c\n([\s\S]+?)```/g,
      '<syntaxhighlight lang="c">\n$1</syntaxhighlight>\n',
    )
  }
}

export {print}
