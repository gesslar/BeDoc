const meta = Object.freeze({
  format: "mock",
  formatExtension: ".mock",
})

class Printer {
  constructor(core) {
    this.core = core
  }

  print(module, content) {
    const output = `
      Type: ${content.name}
      Lines: ${content.metadata?.lines}
      Length: ${content.metadata?.length}
      Content: ${content.content}
    `.trim()

    return {
      status: "success",
      message: "File printed successfully",
      destFile: `${module}${meta.formatExtension}`,
      content: output,
    }
  }
};

export { meta, Printer }
