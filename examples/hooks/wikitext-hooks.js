const print = {
  "exit": async({name, content}) => {
    if(name === "example") {
      const newContent = content
        .replace(
          /```c\n([\s\S]+?)```/g,
          '<syntaxhighlight lang="c">\n$1</syntaxhighlight>\n'
        )
      return newContent;
    }
    return content;
  }
}

export { print }
