/**
 * The meta information for this parser.
 */
const meta = {
  // Printer information
  format: "markdown",
  formatExtension: ".md",
};

class Printer {
  constructor(core) {
    this.core = core;
  }

  /**
  /**
   * @param {string} module
   * @param {Object} content
   */
  async print(module, content) {
    const work = content.funcs.sort((a, b) => a.name.localeCompare(b.name));
    const output = work.map(func => {
      const {name, description, param, return: returns, example, meta} = func;

      // First the function name
      const outputName = `## ${name}`;

      // Then the description
      const outputDescription = description?.length
        ? this.core.util.wrap(description.map(line => line.trim()).join('\n'))
        : '';

      // Then the parameters
      const outputParams = param.map(param => {
        const isOptional = param.content.some(line => line.toLowerCase().includes('(optional)'));

        const content = param.content
          .map(line => line.replace(/\s*\(optional\)\s*/gi, '').trim()) // Remove "(optional)" from content
          .join(' ') // Flatten multiline descriptions into one line
          .replace(/\s+/g, ' '); // Ensure clean spacing

        const optionalTag = param.optional || isOptional ? ', *optional*' : '';
        return this.core.util.wrap(
          `- **\`${param.name}\`** (\`${param.type}\`${optionalTag}): ${content}`,
          undefined,
          2
        );
      }).join('\n');

      // Then the returns
      const outputReturns = returns
        ? `### Returns\n\n${this.core.util.wrap(
          returns.content
            ? `- **\`${returns.type}\`**: ${returns.content}`
            : `- **\`${returns.type}\`**`,
          undefined,
          2
        )}`
        : '';


      // Then the example
      const outputExample = example?.length
        ? "### Example\n\n" + this.core.util.wrap(example.join('\n'))
        : '';

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
