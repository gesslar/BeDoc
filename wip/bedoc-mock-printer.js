const meta = Object.freeze({
  name: "mock",
  type: "printer",
});

class Printer {
  constructor(core) {
    this.core = core;
  }

  print(content) {
    return `
      Type: ${content.name}
      Lines: ${content.metadata?.lines}
      Length: ${content.metadata?.length}
      Content: ${content.content}
    `.trim();
  }
};

export { meta, Printer };
