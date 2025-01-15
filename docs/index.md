---
layout: default
title: BeDoc
nav_exclude: true
---

# Welcome to BeDoc 🤗

BeDoc is a comprehensive and adaptable documentation engine that integrates
effortlessly with any programming language or file format. Built on a robust
modular design, BeDoc enables developers to efficiently parse and generate
documentation through custom parsers and printers. Whether you are using the
command line, a VS Code extension, or a GitHub Action, BeDoc provides an intuitive
and powerful solution.

## Key Features

- **Pluggable Architecture**: Extend BeDoc's functionality with custom parsers and
  printers tailored to your project's needs. The hook system allows you to modify
  the documentation pipeline at any point without changing core code.
- **Consistent Response System**: Every operation returns consistent response
  objects with clear success/error states and detailed messages, making error
  handling and debugging straightforward.
- **Multi-Environment Support**: Operate BeDoc via the command line interface
  (CLI), embed it in Visual Studio Code as an extension, or integrate it into
  GitHub Actions for automated workflows.
- **Dynamic Configuration**: Configure BeDoc using JSON files or CLI options to
  specify input files, output paths, and more to suit your workflow.
- **Automatic Module Discovery**: BeDoc identifies and loads parsers and printers
  from npm packages that follow the BeDoc naming convention, streamlining the
  integration process.
- **Enhanced Debugging**: Detailed logging and error handling make troubleshooting
  straightforward and transparent.

## Getting Started

1. **Installation**:
   ```bash
   # Install globally
   npm install -g bedoc

   # Or add to your project
   npm install --save-dev bedoc
   ```

2. **Basic Usage**:
   ```bash
   # Generate documentation from JavaScript files
   bedoc -l javascript -f markdown -i src/*.js -o docs
   ```

3. **Configuration**:
   Create a `bedoc.config.json` for reusable settings:
   ```json
   {
     "language": "javascript",
     "format": "markdown",
     "input": ["src/**/*.js"],
     "output": "docs/api"
   }
   ```

   Or add a `bedoc` section to your `package.json`:
   ```json
   {
     "name": "my-project",
     "version": "1.0.0",
     "bedoc": {
       "language": "javascript",
       "format": "markdown",
       "input": ["src/**/*.js"],
       "output": "docs/api"
     }
   }
   ```

## Architecture

BeDoc's architecture is built around three core concepts:
- **Parsers**: Convert source code into structured documentation data
- **Printers**: Transform structured data into the desired output format
- **Hooks**: Modify the documentation process at any point

Plugins (parsers and printers) are discovered through npm packages that follow the
BeDoc naming convention (`bedoc-*`) and include a `bedoc` field in their package.json.
This modular design allows for maximum flexibility while maintaining clean interfaces
and predictable behavior.

## Documentation

Explore the full capabilities of BeDoc:

- **[Configuration Guide](configuration)**: Learn how to configure BeDoc using
  CLI options or configuration files.
- **[Creating Parsers](parsers)**: Build custom parsers to support new
  languages or documentation styles.
- **[Creating Printers](printers)**: Develop printers to output documentation
  in your desired format.
- **[Hook System](hooks)**: Extend BeDoc's functionality through hooks to
  customize the documentation process.

## Contribute

BeDoc is an open-source project released under [The Unlicense](https://unlicense.org),
placing it in the public domain. This means you are free to use, modify, and
distribute the software without restrictions. Community contributions are welcome
and encouraged. To report bugs or suggest features, please visit our
[issue tracker]({{ site.issues }}). For the latest updates and source code,
explore our [GitHub repository]({{ site.repo }}).

Elevate your documentation workflow with BeDoc today!
