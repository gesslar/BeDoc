/**
 * The meta information for this parser.
 */
const meta = {
  // Parser information
  language: "lpc",
  languageExtension: ".c",
  // Printer information
  format: "markdown",
  formatExtension: ".md",
};

class Printer {
  constructor(core) {
    this.core = core;
  }

  /**
   * Wraps text to a specified width
   * @param {string} str The text to wrap
   * @param {number} wrapAt The column at which to wrap the text
   * @param {number} indentAt The number of spaces to indent wrapped lines
   * @returns {string} The wrapped text
   */
  wrap(str, wrapAt = 80, indentAt = 0) {
    const sections = str.split('\n').map(section => {
      let parts = section.split(' ');
      let inCodeBlock = false;
      let isStartOfLine = true;  // Start of each section is start of line

      // Preserve leading space if it existed
      if(section[0] === ' ') {
        parts = ['', ...parts];
      }

      let running = 0;

      parts = parts.map(part => {
        // Only check for code block if we're at start of line
        if(isStartOfLine && /^```(?:\w+)?$/.test(part)) {
          inCodeBlock = !inCodeBlock;
          running += (part.length + 1);
          isStartOfLine = false;
          return part;
        }

        if(part[0] === '\n') {
          running = 0;
          isStartOfLine = true;  // Next part will be at start of line
          return part;
        }

        running += (part.length + 1);
        isStartOfLine = false;   // No longer at start of line

        if(!inCodeBlock && running >= wrapAt) {
          running = part.length + indentAt;
          isStartOfLine = true;  // After newline, next part will be at start
          return '\n' + ' '.repeat(indentAt) + part;
        }

        return part;
      });

      return parts.join(' ')
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n');
    });

    return sections.join('\n');
  }

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
        ? this.wrap(description.map(line => line.trim()).join('\n'))
        : '';

      // Then the parameters
      const outputParams = param.map(param => {
        const isOptional = param.content.some(line => line.toLowerCase().includes('(optional)'));

        const content = param.content
          .map(line => line.replace(/\s*\(optional\)\s*/gi, '').trim()) // Remove "(optional)" from content
          .join(' ') // Flatten multiline descriptions into one line
          .replace(/\s+/g, ' '); // Ensure clean spacing

        const optionalTag = param.optional || isOptional ? ', *optional*' : '';
        return this.wrap(
          `- **\`${param.name}\`** (\`${param.type}\`${optionalTag}): ${content}`,
          undefined,
          2
        );
      }).join('\n');

      // Then the returns
      const outputReturns = returns
        ? `### Returns\n\n${this.wrap(
          returns.content
            ? `- **\`${returns.type}\`**: ${returns.content}`
            : `- **\`${returns.type}\`**`,
          undefined,
          2
        )}`
        : '';


      // Then the example
      const outputExample = example?.length
        ? "### Example\n\n" + this.wrap(example.join('\n'))
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
