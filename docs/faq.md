---
layout: bedoc
title: FAQ
permalink: /faq/
---

## What is BeDoc?
BeDoc is an open-source documentation engine designed for flexibility and adaptability. It allows developers to create and use parsers and printers for programming languages and documentation formats that may not have robust support elsewhere.

## How is BeDoc different from other documentation tools?
BeDoc distinguishes itself in the following ways:

- **Pluggable Architecture**: Unlike many tools that focus on specific formats, BeDoc allows developers to integrate custom parsers and printers tailored to their unique requirements.
- **Niche Format Support**: Popular tools like Sphinx or MkDocs excel at supporting mainstream formats. BeDoc’s strength lies in enabling support for less common or project-specific formats.
- **Broad Integration**: BeDoc seamlessly integrates with CLI workflows, Visual Studio Code extensions, and CI/CD pipelines, providing a unified solution for various development environments.

## Should I use BeDoc for my project?
If your project requires support for niche formats or custom documentation needs, BeDoc might be a perfect fit. However, for mainstream languages and formats like Markdown or reStructuredText, tools like MkDocs or Sphinx may offer more mature ecosystems.

## Can I use BeDoc in CI/CD workflows?
Yes, BeDoc is designed with CI/CD compatibility in mind. Its CLI and modular structure make it easy to integrate into build pipelines, enabling automated documentation generation.

## Does BeDoc support collaborative documentation efforts?
BeDoc is not a collaboration platform like Confluence or MediaWiki. However, it can be paired with other tools to support collaborative workflows by generating outputs that integrate into shared systems.

## When should I choose another tool over BeDoc?
If your needs align with mainstream formats or you require robust features like wiki-based collaboration (e.g., MediaWiki) or enterprise integrations (e.g., Confluence), those tools may be a better fit. BeDoc shines in flexibility, but it’s not a one-size-fits-all solution.

## How do I get started?
Visit our [GitHub repository]({{ site.repo }}) for installation instructions and examples. If you encounter issues or have questions, check out our [issue tracker]({{ site.issues }}).

## What license does BeDoc use?
BeDoc is released under [The Unlicense](https://unlicense.org), placing it in the public domain. This means you’re free to use, modify, and distribute it without restrictions.
