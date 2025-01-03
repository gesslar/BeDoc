---
layout: bedoc
title: About
permalink: /about/
---

BeDoc is an innovative, open-source documentation engine that adapts to any
programming language or file format. It is designed to simplify the documentation
process by allowing developers to create, parse, and generate documentation
efficiently using pluggable parsers and printers. Whether you're a seasoned
developer or just starting, BeDoc ensures seamless integration into your
workflow.

## What Makes BeDoc Unique?

- **Versatility**: Supports a variety of environments, including CLI, VS Code
  extensions, and GitHub Actions.
- **Extensibility**: With its pluggable architecture, developers can create
  custom parsers and printers, and use hooks to modify the documentation process
  without changing core code.
- **Type Safety**: Built with TypeScript, BeDoc provides consistent response
  types and error handling across all operations, making debugging and
  maintenance straightforward.
- **Ease of Use**: Intuitive configuration, automatic module discovery, and a
  powerful hook system streamline setup and customization.
- **Mock Testing**: Develop and test your parsers and printers in isolation with
  a local mock environment.
- **Open Source**: Released under [The Unlicense](https://unlicense.org), BeDoc
  places no restrictions on usage, modification, or distribution.

## Architecture

BeDoc's architecture is built around three core concepts:
- **Parsers**: Convert source code into structured documentation data
- **Printers**: Transform structured data into the desired output format
- **Hooks**: Modify the documentation process at any point

This modular design allows for maximum flexibility while maintaining type safety
and predictable behavior.

## Join the Community

BeDoc thrives on contributions and collaboration. Whether you want to explore the
codebase, report an issue, or contribute new features, we invite you to get
involved. Visit our [GitHub repository]({{ site.repo }}) to learn more and start
contributing. For any feedback or bug reports, check out our
[issue tracker]({{ site.issues }}).
