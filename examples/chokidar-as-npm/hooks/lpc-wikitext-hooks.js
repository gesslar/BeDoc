export const Hooks = {
  parser: {},

  formatter: {
    async enter(section) {
      const {sectionName, sectionContent} = section

      if(sectionName === "description") {
        // Trim leading and trailing empty lines.
        const content = sectionContent
        while(content.length && !content.at(0))
          content.shift()

        while(content.length && !content.at(-1))
          content.pop()
      }

      return section
    },

    async end(module) {
      const {moduleContent} = module

      return moduleContent.replace(
        /```c\n([\s\S]+?)```/g,
        '<syntaxhighlight lang="c">\n$1</syntaxhighlight>\n',
      )
    },
  },
}
