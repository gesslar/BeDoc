/**
 * The meta information for this parser.
 */
const meta = Object.freeze({
  // Printer information
  format: "markdown",
  formatExtension: ".md",
});

class Printer {
  constructor(core) {
    this.core = core;
    this.string = core.string;
    this.logger = core.logger;
  }

  /**
   * @param {string} module
   * @param {Object} content
   */
  async print(module, content) {
    const HOOKS = this.HOOKS;

    await this.hook(HOOKS.START, {module, content});

    const work = content.funcs.sort((a, b) => a.name.localeCompare(b.name));
    const output = [];

    const printName = async(section) => {
      await this.hook(HOOKS.ENTER, {name:"name", section, meta});
      const outputName = `## ${section.name}`;
      await this.hook(HOOKS.EXIT, {name:"name", section, meta});
      return outputName;
    }

    const printDescription = async(section) => {
      console.log("this", this);
      this.logger.debug(`[printDescription] section: ${JSON.stringify(section, null, 2)}`);
      await this.hook(HOOKS.ENTER, {name:"description", section, meta});
      const outputDescription = section.description?.length
        ? this.string.wrap(section.description.map(line => line.trim()).join("\n"))
        : "";
      await this.hook(HOOKS.EXIT, {name:"description", section, meta});
      return outputDescription;
    }

    const printParams = async(section) => {
      await this.hook(HOOKS.ENTER, {name:"param", section, meta});
      const outputParams = [];

      if(!section.param)
        return outputParams;

      for(const param of section.param || []) {
        const isOptional = param.content.some(line => line.toLowerCase().includes("(optional)"));
        const content = param.content
          .map(line => line.replace(/\s*\(optional\)\s*/gi, "").trim()) // Remove "(optional)" from content
          .join(" ") // Flatten multiline descriptions into one line
          .replace(/\s+/g, " "); // Ensure clean spacing

        const optionalTag = param.optional || isOptional ? ", *optional*" : "";
        const result = this.string.wrap(
          `- **\`${param.name}\`** (\`${param.type}\`${optionalTag}): ${content}`,
          undefined,
          2
        );
        outputParams.push(result);
      }
      await this.hook(HOOKS.EXIT, {name:"param", section, meta});
      return outputParams;
    }

    /*
     *
     *"return": {
     *  "type": "mixed",
     *  "content": [
     *    "The filled array."
     *  ]
     * }
     */
    const printReturns = async(section) => {
      await this.hook(HOOKS.ENTER, {name:"return", section, meta});

      // Then the returns
      const outputReturns = section.return
        ? `### Returns\n\n${this.string.wrap(
          section.return.content
            ? `- **\`${section.return.type}\`**: ${section.return.content}`
            : `- **\`${section.return.type}\`**`,
          undefined,
          2
        )}`
        : "";

      await this.hook(HOOKS.EXIT, {name:"return", section, meta});
      return outputReturns;
    }

    const printExample = async(section) => {
      await this.hook(HOOKS.ENTER, {name:"example", section, meta});
      const outputExample = section.example?.length
        ? "### Example\n\n" + this.string.wrap(section.example.join("\n"))
        : "";
      await this.hook(HOOKS.EXIT, {name:"example", section, meta});
      return outputExample;
    }

    for(const section of work) {
      await this.hook(HOOKS.LOAD, {section, meta});

      // First the function name
      const outputName = await printName(section);

      // Then the description
      const outputDescription = await printDescription(section);

      // Then the parameters
      const outputParams = await printParams(section);

      // Then the returns
      const outputReturns = await printReturns(section);

      // Then the example
      const outputExample = await printExample(section);

      output.push(`${outputName}` +
             `${outputDescription.length ? `\n${outputDescription}\n` : ""}` +
             `${outputParams.length ? `\n${outputParams.join("\n")}\n` : ""}` +
             `${outputReturns.length ? `\n${outputReturns}\n` : ""}` +
             `${outputExample.length ? `\n${outputExample}\n` : ""}`);
    }

    await this.hook(HOOKS.END, {module, content, output});

    return {
      status: "success",
      message: "File printed successfully",
      destFile: `${module}${meta.formatExtension}`,
      content: output.join("\n"),
    }
  }
};

export { meta, Printer };
