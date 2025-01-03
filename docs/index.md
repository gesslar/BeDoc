---
layout: bedoc
title: BeDoc
nav_exclude: true
---

# Welcome to BeDoc

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
- **Type-Safe Response System**: Every operation returns consistent, typed
  responses with clear success/error states and detailed messages, making error
  handling and debugging straightforward.
- **Multi-Environment Support**: Operate BeDoc via the command line interface
  (CLI), embed it in Visual Studio Code as an extension, or integrate it into
  GitHub Actions for automated workflows.
- **Dynamic Configuration**: Configure BeDoc using JSON files or a rich set of CLI
  options. You can specify input files, directories, output paths, and more to
  suit your workflow.
- **Automatic Module Discovery**: BeDoc identifies and loads parsers and printers
  from local and global `node_modules` directories, streamlining the integration
  process.
- **Enhanced Debugging Tools**: Benefit from detailed logging and error handling
  to make troubleshooting straightforward and transparent.

## Getting Started

1. **Installation**:
   - To install BeDoc globally via npm, run:
     ```bash
     npm install -g bedoc
     ```
   - Alternatively, include it as a dependency in your project's `package.json`.

2. **CLI Usage**:
   The CLI offers a straightforward interface for generating documentation:
   ```bash
   # Generate documentation from JavaScript files
   bedoc -l javascript -f markdown -i src/*.js -o docs

   # Use mock mode for testing parsers/printers
   bedoc --mock ./mock-modules -l lpc -f markdown -i test/*.c -o test/docs

   # Use local parser and printer files directly (no installation needed)
   bedoc --parser ./my-parser.js --printer ./my-printer.js -i src/*.c -o docs
   # Or use the short form
   bedoc -p ./my-parser.js -r ./my-printer.js -i src/*.c -o docs
   ```

3. **Hook System**:
   Customize the documentation process by adding hooks at any stage:
   ```javascript
   // my_custom_hooks.js
   const print = {
     // Enrich documentation with data from external API
     "start": async ({ module, content }) => {
       try {
         // Fetch latest version info from package registry
         const pkgInfo = await fetch(`https://registry.npmjs.org/${module}`);
         const { version, downloads } = await pkgInfo.json();

         // Add the data to the documentation
         content.metadata = {
            ...content.metadata,
            version,
            monthlyDownloads: downloads.lastMonth
         };

         return {
            status: "success",
            message: "Package info fetched successfully",
            module,
            content
         };
       } catch(error) {
         return {
            status: "error",
            error: error,
         };
       }
     },

     // Transform content using AI service
     "section_load": async ({ section }) => {
       if (section.description) {
         // Get improved description from AI service
         try {
           const improved = await aiService.enhance(section.description);
           section.description = improved;
           return {
             status: "success",
             message: "Section description enhanced",
             section
           };
         } catch (error) {
           return {
             status: "error",
             error: error,
           };
         }
       }
     }
   };

   export { print };
   ```

   This example shows how hooks can interact with external services (like npm
   registry or AI services) to enrich documentation during generation. The async
   nature of hooks means these external calls don't block the main process.

4. **VS Code Integration**:
   Use BeDoc as a Visual Studio Code extension. The `Generate Documentation`
   command allows you to parse and print files directly from the editor,
   enhancing your productivity.

5. **Custom Extensions**:
   Develop and register your own parsers and printers to expand BeDoc's
   capabilities:
   ```javascript
   // my-custom-parser.js
   export const meta = {
     language: "mylang",
     languageExtension: ".ml"
   };

   export class Parser {
     async parse(file, content) {
       // Parse the content
       return {
         status: "success",
         result: { /* parsed data */ }
       };
     }
   }
   ```

## Documentation

Explore the full capabilities of BeDoc:

- **[Command-Line Options](#)**: Learn how to tailor BeDoc to your specific needs
  using its extensive CLI parameters.
- **[Creating Custom Modules](#)**: Discover how to build and register custom
  parsers and printers.
- **[Hook System Guide](#)**: Learn how to extend BeDoc's functionality through
  hooks.
- **[Configuration Guide](#)**: Understand how to leverage JSON configuration
  files for advanced setups.
- **[Response Types](#)**: Understand BeDoc's type-safe response system for
  better error handling.

## Contribute

BeDoc is an open-source project released under [The Unlicense](https://unlicense.org),
placing it in the public domain. This means you are free to use, modify, and
distribute the software without restrictions. Community contributions are welcome
and encouraged. To report bugs or suggest features, please visit our
[issue tracker]({{ site.issues }}). For the latest updates and source code,
explore our [GitHub repository]({{ site.repo }}).

Elevate your documentation workflow with BeDoc today!
