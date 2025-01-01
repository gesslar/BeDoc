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
    this.util = core.util;
    this.logger = core.logger;
  }

  /**
   * @param {string} module
   * @param {Object} content
   */
  async print(module, content) {
    const HOOKS = this.HOOKS;
    const work = content.funcs.sort((a, b) => a.name.localeCompare(b.name));

    const output = work.map(section => {
      this.hook(HOOKS.LOAD, {section, meta});

      // First the function name
      this.hook(HOOKS.ENTER, {name:"name", section, meta});
      const outputName = `## ${section.name}`;
      this.hook(HOOKS.EXIT, {name:"name", section, meta});

      // Then the description
      this.hook(HOOKS.ENTER, {name:"description", section, meta});
      const outputDescription = section.description?.length
        ? this.util.wrap(section.description.map(line => line.trim()).join('\n'))
        : '';
      this.hook(HOOKS.EXIT, {name:"description", section, meta});
      // Then the parameters
      const outputParams = section.params?.map(param => {
        this.hook(HOOKS.ENTER, {name:"param", param, meta});
        const isOptional = param.content.some(line => line.toLowerCase().includes('(optional)'));

        const content = param.content
          .map(line => line.replace(/\s*\(optional\)\s*/gi, '').trim()) // Remove "(optional)" from content
          .join(' ') // Flatten multiline descriptions into one line
          .replace(/\s+/g, ' '); // Ensure clean spacing

        const optionalTag = param.optional || isOptional ? ', *optional*' : '';
        const result = this.util.wrap(
          `- **\`${param.name}\`** (\`${param.type}\`${optionalTag}): ${content}`,
          undefined,
          2
        );
        this.hook(HOOKS.EXIT, {name:"param", param, meta});
        return result;
      }).join('\n') || '';

      // Then the returns
      this.hook(HOOKS.ENTER, {name:"returns", section, meta});
      const outputReturns = section.returns
        ? `### Returns\n\n${this.util.wrap(
          section.returns.content
            ? `- **\`${section.returns.type}\`**: ${section.returns.content}`
            : `- **\`${section.returns.type}\`**`,
          undefined,
          2
        )}`
        : '';
      this.hook(HOOKS.EXIT, {name:"returns", section, meta});

      // Then the example
      this.hook(HOOKS.ENTER, {name:"example", section, meta});
      const outputExample = section.example?.length
        ? "### Example\n\n" + this.util.wrap(section.example.join('\n'))
        : '';
      this.hook(HOOKS.EXIT, {name:"example", section, meta});

      return `${outputName}` +
             `${outputDescription.length ? `\n${outputDescription}\n` : ''}` +
             `${outputParams.length ? `\n${outputParams}\n` : ''}` +
             `${outputReturns.length ? `\n${outputReturns}\n` : ''}` +
             `${outputExample.length ? `\n${outputExample}\n` : ''}`;
    });

    return {
      status: 'success',
      message: 'File printed successfully',
      destFile: `${module}${meta.formatExtension}`,
      content: output.join('\n\n'),
    }
  }
};

module.exports = { meta, Printer };
