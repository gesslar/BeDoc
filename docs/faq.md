---
layout: bedoc
title: FAQ
permalink: /faq/
---

## What is BeDoc?
BeDoc is an open-source documentation engine designed for flexibility and
adaptability. It allows developers to create and use parsers and printers for
programming languages and documentation formats that may not have robust support
elsewhere.

## How is BeDoc different from other documentation tools?
BeDoc distinguishes itself in the following ways:

- **Pluggable Architecture**: Unlike many tools that focus on specific formats,
  BeDoc allows developers to integrate custom parsers and printers tailored to
  their unique requirements. The hook system provides unprecedented control over
  the documentation process.
- **Type-Safe Design**: BeDoc's response system ensures type safety and
  consistent error handling across all operations, making it more reliable and
  easier to debug than traditional tools.
- **Niche Format Support**: Popular tools like Sphinx or MkDocs excel at
  supporting mainstream formats. BeDoc's strength lies in enabling support for
  less common or project-specific formats.
- **Broad Integration**: BeDoc seamlessly integrates with CLI workflows, Visual
  Studio Code extensions, and CI/CD pipelines, providing a unified solution for
  various development environments.

## What is the hook system and how does it work?
The hook system allows you to modify BeDoc's behavior at specific points in the
documentation process without changing the core code. You can add hooks for both
parsing and printing operations, enabling tasks like:
- Preprocessing input files
- Modifying parsed content before printing
- Adding custom validation
- Generating additional output files

The hook system is fully asynchronous, which enables powerful integration
possibilities. Your hooks can:
- Make API calls to enrich documentation with external data
- Validate documentation against remote style guides
- Transform content using AI services
- Integrate with issue trackers or project management tools
- Run long-running processes without blocking documentation generation

This asynchronous nature means you can build sophisticated documentation
workflows that interact with external services and tools, all while maintaining
the core simplicity of BeDoc.

## How does BeDoc handle errors and responses?
BeDoc uses a type-safe response system where every operation returns a consistent
response object with:
- A status field ("success" or "error")
- A detailed message
- Operation-specific data (like file paths or line numbers)
This makes error handling predictable and debugging straightforward.

## What is mock testing in BeDoc?
Mock testing allows you to develop and test parsers or printers in isolation
using a local mock environment. Instead of installing modules globally, you can
point BeDoc to a local directory containing your test modules. This is
particularly useful during development and testing phases.

## Should I use BeDoc for my project?
If your project requires support for niche formats, custom documentation needs,
or you need fine-grained control over the documentation process through hooks,
BeDoc might be a perfect fit. However, for mainstream languages and formats like
Markdown or reStructuredText, tools like MkDocs or Sphinx may offer more mature
ecosystems.

## Can I use BeDoc in CI/CD workflows?
Yes, BeDoc is designed with CI/CD compatibility in mind. Its CLI, type-safe
responses, and modular structure make it easy to integrate into build pipelines,
enabling automated documentation generation with reliable error handling.

## Does BeDoc support collaborative documentation efforts?
BeDoc is not a collaboration platform like Confluence or MediaWiki. However, it
can be paired with other tools to support collaborative workflows by generating
outputs that integrate into shared systems.

## When should I choose another tool over BeDoc?
If your needs align with mainstream formats or you require robust features like
wiki-based collaboration (e.g., MediaWiki) or enterprise integrations (e.g.,
Confluence), those tools may be a better fit. BeDoc shines in flexibility and
customization, but it's not a one-size-fits-all solution.

## How do I get started?
Visit our [GitHub repository]({{ site.repo }}) for installation instructions and
examples. If you encounter issues or have questions, check out our
[issue tracker]({{ site.issues }}).

## What license does BeDoc use?
BeDoc is released under [The Unlicense](https://unlicense.org), placing it in
the public domain. This means you're free to use, modify, and distribute it
without restrictions.
