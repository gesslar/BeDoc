---
layout: bedoc
title: BeDoc
nav_exclude: true
---

# Welcome to BeDoc

BeDoc is a comprehensive and adaptable documentation engine that integrates effortlessly with any programming language or file format. Built on a robust modular design, BeDoc enables developers to efficiently parse and generate documentation through custom parsers and printers. Whether you are using the command line, a VS Code extension, or a GitHub Action, BeDoc provides an intuitive and powerful solution.

## Key Features

- **Pluggable Architecture**: Extend BeDoc’s functionality with custom modules for parsing and printing tailored to the specific requirements of your project.
- **Multi-Environment Support**: Operate BeDoc via the command line interface (CLI), embed it in Visual Studio Code as an extension, or integrate it into GitHub Actions for automated workflows.
- **Dynamic Configuration**: Configure BeDoc using JSON files or a rich set of CLI options. You can specify input files, directories, output paths, and more to suit your workflow.
- **Automatic Module Discovery**: BeDoc identifies and loads parsers and printers from local and global `node_modules` directories, streamlining the integration process.
- **Enhanced Debugging Tools**: Benefit from detailed logging and error handling to make troubleshooting straightforward and transparent.

## Getting Started

1. **Installation**:
   - To install BeDoc globally via npm, run:
     ```bash
     npm install -g bedoc
     ```
   - Alternatively, include it as a dependency in your project’s `package.json`.

2. **CLI Usage**:
   The CLI offers a straightforward interface for generating documentation. For example:
   ```bash
   bedoc -l javascript -f markdown -i src/*.js -o docs
   ```
   This command processes JavaScript files from the `src` directory and outputs the documentation in Markdown format to the `docs` folder.

3. **VS Code Integration**:
   Use BeDoc as a Visual Studio Code extension. The `Generate Documentation` command allows you to parse and print files directly from the editor, enhancing your productivity.

4. **Custom Extensions**:
   Develop and register your own parsers and printers to expand BeDoc’s capabilities. Integrate these modules dynamically using the built-in `Registry` system.

5. **Mock Testing**:
   Isolate and test your custom parsers and printers efficiently with BeDoc’s mock discovery tools, ensuring a streamlined development process.

## Documentation

Explore the full capabilities of BeDoc:

- **[Command-Line Options](#)**: Learn how to tailor BeDoc to your specific needs using its extensive CLI parameters.
- **[Creating Custom Modules](#)**: Discover how to build and register custom parsers and printers.
- **[Configuration Guide](#)**: Understand how to leverage JSON configuration files for advanced setups.

## Contribute

BeDoc is an open-source project released under [The Unlicense](https://unlicense.org), placing it in the public domain. This means you are free to use, modify, and distribute the software without restrictions. Community contributions are welcome and encouraged. To report bugs or suggest features, please visit our [issue tracker]({{ site.issues }}). For the latest updates and source code, explore our [GitHub repository]({{ site.repo }}).

Elevate your documentation workflow with BeDoc today!
