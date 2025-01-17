const print = {
  async end({_module, _content, output}) {
    return output
      .replace(
        /```c\n([\s\S]+?)```/g,
        '<syntaxhighlight lang="c">\n$1</syntaxhighlight>\n'
      )
  }
}

export { print }
