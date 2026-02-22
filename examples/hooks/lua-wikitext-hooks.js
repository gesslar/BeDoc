export class Format {
  // Convert Markdown ```lua fences in the rendered sections into Wikitext
  // syntaxhighlight blocks (mirrors the old `end` behaviour). Hooks are
  // mutation-only — the return value is ignored — so the formatted sections
  // are rewritten in place on the result object.
  after$formatFunction = (ctx, result) => {
    if(!Array.isArray(result?.formatted))
      return

    result.formatted = result.formatted.map(section =>
      section.replace(
        /```lua\n([\s\S]+?)```/g,
        "<syntaxhighlight lang=\"lua\">\n$1</syntaxhighlight>\n",
      ),
    )
  }
}
