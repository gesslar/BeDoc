/**
 * The meta information for this printer.
 */
const meta = Object.freeze({
  // Printer information
  format: "wikitext",
  formatExtension: ".wikitext",
});

class Printer {
  constructor(core) {
    this.core = core;
  }

  /**
   * @param {string} module
   * @param {Object} content
   */
  async print(module, content) {
    const work = content.funcs.sort((a, b) => a.name.localeCompare(b.name));
    const output = work.map(func => {
      const { name, description, param, return: returns, example, meta } = func;

      // First the function name
      const outputName = `== ${name} ==\n`;

      // Then the description
      const outputDescription = description?.length
        ? description.map(line => line.trim()).join('\n')
        : '';

      // Then the parameters
      const outputParams = param.length
        ? "=== Parameters ===\n\n" + param.map(param => {
          const isOptional = param.content.some(line => line.toLowerCase().includes('(optional)'));

          const content = param.content
            .map(line => line.replace(/\s*\(optional\)\s*/gi, '').trim())
            .join(' ')
            .replace(/\s+/g, ' ');

          const optionalTag = param.optional || isOptional ? ", ''optional''" : '';
          return `* '''${param.name}''' (${param.type}${optionalTag}): ${content}`;
        }).join('\n') + '\n'
        : '';

      // Then the returns
      const outputReturns = returns
        ? `=== Returns ===\n\n${returns.content
            ? `* '''${returns.type}''': ${returns.content.map(line => line.trim()).join('\n')}`
            : `* '''${returns.type}'''`}`
        : '';

      // Then the example
      const outputExample = example?.length
        ? "=== Example ===\n\n" + example.join('\n')
        : '';

      return `${outputName}` +
        `${outputDescription.length ? `${outputDescription}` : ''}` +
        `${outputParams.length ? `\n${outputParams}` : ''}` +
        `${outputReturns.length ? `\n${outputReturns}` : ''}` +
        `${outputExample.length ? `\n${outputExample}` : ''}`;
    });

    return {
      status: 'success',
      message: 'File printed successfully',
      destFile: `${module}${meta.formatExtension}`,
      content: output.join('\n\n'),
    };
  }
};

module.exports = { meta, Printer };
