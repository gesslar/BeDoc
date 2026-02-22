export const Hooks = {
  parser: {},

  formatter: {
    async end(module) {
      const {moduleContent} = module

      return moduleContent.replace(
        /```lua\n([\s\S]+?)```/g,
        '<syntaxhighlight lang="lua">\n$1</syntaxhighlight>\n',
      )
    },
  },
}
