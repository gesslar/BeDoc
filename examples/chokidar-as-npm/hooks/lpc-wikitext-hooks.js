export class Format {
  // Trim leading and trailing blank lines from the description before it is
  // rendered (mirrors the old object-hook `enter` behaviour).
  before$formatFunction = ctx => {
    const description = ctx.description

    if(Array.isArray(description)) {
      while(description.length && !description.at(0)?.trim())
        description.shift()

      while(description.length && !description.at(-1)?.trim())
        description.pop()
    }
  }

  // Convert Markdown ```c fences in the rendered sections into Wikitext
  // syntaxhighlight blocks (mirrors the old `end` behaviour). Hooks are
  // mutation-only — the return value is ignored — so the formatted sections
  // are rewritten in place on the result object.
  after$formatFunction = (ctx, result) => {
    if(!Array.isArray(result?.formatted))
      return

    result.formatted = result.formatted.map(section =>
      section.replace(
        /```c\n([\s\S]+?)```/g,
        "<syntaxhighlight lang=\"c\">\n$1</syntaxhighlight>\n",
      ),
    )
  }
}
