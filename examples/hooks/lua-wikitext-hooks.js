export const Hooks = {
  parse: {},

  print: {
    async end({_module, _content, output}) {
      return output.replace(
        /```lua\n([\s\S]+?)```/g,
        '<syntaxhighlight lang="lua">\n$1</syntaxhighlight>\n',
      )
    },
  },
}
