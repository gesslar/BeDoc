# BeDoc

[![CodeQL Advanced](https://github.com/gesslar/BeDoc/actions/workflows/codeql.yml/badge.svg)](https://github.com/gesslar/BeDoc/actions/workflows/codeql.yml)
[![Dependabot Updates](https://github.com/gesslar/BeDoc/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/gesslar/BeDoc/actions/workflows/dependabot/dependabot-updates)
[![Auto PR and Merge - dev 🤗](https://github.com/gesslar/BeDoc/actions/workflows/autopr-dev.yml/badge.svg?branch=dev)](https://github.com/gesslar/BeDoc/actions/workflows/autopr-dev.yml)


# BeDoc

**BeDoc** is a powerful, pluggable documentation generator designed to handle any programming language and output format. With its extensible framework, you can easily create custom parsers and printers to generate structured documentation for your projects.

---

## Key Features

- **Pluggable Design**: BeDoc works seamlessly with custom parsers and printers
  to fit your unique needs. BeDoc also supports async operations, allowing for
  efficient handling of large projects.
- **Customizable Input**: Accommodate any text input, whether it’s a well-known
  language like LPC or Lua, or an underserved format needing attention.
- **Async Hooks**: Take advantage of BeDoc's powerful ability to use async
  hooks to modify content in-flight, providing dynamic customization during the
  documentation generation process.
- **Versatile Output**: Generate documentation in formats like Markdown,
  Wikitext, and more.
- **Configurable**: Supports JSON-based configuration for seamless
  customization.
- **Integrated Workflow**: Use the CLI for smooth integration into your
  development environment.

---

## Installation

Install BeDoc globally using NPM:

```bash
npm i -g @gesslar/bedoc
```

Or add it to your project as a dev dependency:

```bash
npm i -D @gesslar/bedoc
```

---

## Quick Start

Here’s how to use BeDoc programmatically:

```javascript
import BeDoc from "@gesslar/bedoc"

// Initialize BeDoc with your configuration
const docGenerator = new BeDoc({
  input: './src',
  output: './docs',
  format: 'markdown',
});

// Generate documentation
(async () => {
  try {
    await docGenerator.generate();
    console.log('Documentation generated successfully!');
  } catch (error) {
    console.error('Error generating documentation:', error);
  }
})();
```

For detailed usage instructions and examples, visit the website:
👉 **[BeDoc Documentation](https://bedoc.gesslar.dev/)**

---

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

---

## License

This project is licensed under the [Unlicense](./LICENSE).

---

**Get started with BeDoc today and simplify your documentation workflow!**

_Do not taunt Happy Fun Ball._
