---
layout: default
title: Creating Printers
---

# Creating Printers for BeDoc

This guide explains how to create custom printers for BeDoc. Printers are
responsible for transforming parsed documentation into specific output formats
like Markdown, HTML, or any other format you need.

## Printer Structure

A BeDoc printer consists of two main parts:

1. **Meta Information**: Defines the output format.
2. **Printer Class**: Implements the formatting logic.

Here's the basic structure:

```javascript
// Define meta information
export const meta = {
  format: "myformat",     // Format identifier for -f option
  extension: ".mf"        // Output file extension
}

// Implement the printer class
export class Printer {
  constructor(core) {
    this.core = core    // Access to BeDoc core utilities
  }

  async print(module, content) {
    // Transform content into desired format
    return {
      status: "success",
      destFile: `${module}.${meta.extension.slice(1)}`,
      content: "formatted output"
    }
  }
}
```

## Response Format

The printer's `print` method must return a response object with the following
structure:

```javascript
// Success response
{
  status: "success",
  destFile: string,    // Output filename (e.g., "module.md")
  content: string      // Formatted documentation content
}

// Error response
{
  status: "error",
  message: string      // Error description
}
```

## Core Utilities

The printer has access to BeDoc's core utilities through `this.core`:

- `this.core.logger`: Logging functions (debug, info, warn, error)
- `this.core.string`: String manipulation utilities
- `this.core.valid`: Validation utilities
- `this.core.data`: Data structure utilities
- `this.core.fdUtil`: File system utilities

## Hook Support

Printers automatically support [hooks](hooks), allowing users to modify the
printing process. Hook points include:

- `start`: Before printing begins
- `section_load`: When a documentation section is loaded
- `enter`: When entering a section
- `exit`: When exiting a section
- `end`: After printing completes

## Example Implementation

Here's a simplified example of a Markdown printer:

```javascript
export const meta = {
  format: "markdown",
  extension: ".md"
}

export class Printer {
  constructor(core) {
    this.core = core
  }

  async print(module, content) {
    try {
      let output = ""

      // Add module header
      output += `# ${module}\n\n`
      if(content.description) {
        output += `${content.description}\n\n`
      }

      // Process each section
      for(const section of content.sections) {
        // Section header
        output += `## ${section.name}\n\n`

        // Section description
        if(section.description) {
          output += `${section.description}\n\n`
        }

        // Parameters
        if(section.params && section.params.length > 0) {
          output += "### Parameters\n\n"
          for(const param of section.params) {
            output += `- **\`${param.name}\`** (\`${param.type}\`): ` +
              `${param.description}\n`
          }
          output += "\n"
        }

        // Return value
        if(section.returns) {
          output += "### Returns\n\n"
          output += `- **\`${section.returns.type}\`**: ${section.returns.description}\n\n`
        }
      }

      return {
        status: "success",
        destFile: `${module}${meta.extension}`,
        content: output
      }
    } catch(error) {
      return {
        status: "error",
        message: error.message
      }
    }
  }
}
```

This printer would generate Markdown output like:

```markdown
# MyModule

Module description goes here.

## calculateArea

Calculates the area of a rectangle.

### Parameters

- **`width`** (`number`): The width of the rectangle
- **`height`** (`number`): The height of the rectangle

### Returns

- **`number`**: The calculated area
```

## Best Practices

1. **Error Handling**: Always return appropriate error responses with detailed
   messages.

2. **Async Support**: Make your printer async to handle large documents
   efficiently and support async hooks.

3. **Validation**: Validate input content structure before processing.

4. **Logging**: Use the core logger for debugging and error tracking:
   ```javascript
   this.core.logger.debug("Processing section...")
   this.core.logger.error("Failed to format section")
   ```

5. **Content Structure**: Keep your output well-organized and consistent with
   the format's conventions.

## Testing Your Printer

BeDoc provides multiple ways to test your printers:

1. **Mock Mode**: Test using a local mock environment:
   ```bash
   bedoc --mock ./my-printer -l javascript -f myformat -i test/*.js -o test/docs
   ```

2. **Direct File Usage**: Test your printer file directly without installing:
   ```bash
   bedoc --printer ./my-printer.js -l javascript -i test/*.js -o test/docs
   # Or use the short form
   bedoc -P ./my-printer.js -l javascript -i test/*.js -o test/docs
   ```

These options allow you to rapidly iterate on your printer implementation
without needing to package and install it first.

## Publishing Your Printer

When ready to publish, package your printer following BeDoc's naming and
structure conventions:

```json
{
  "name": "bedoc-myformat-printer",
  "version": "1.0.0",
  "type": "module",
  "description": "MyFormat printer for BeDoc",
  "bedoc": {
    "printers": [
      "./bedoc-myformat-printer.js"
    ]
  }
}
```

You can also package multiple printers together:

```json
{
  "name": "bedoc-doc-printers",
  "version": "1.0.0",
  "type": "module",
  "description": "Documentation printers for BeDoc",
  "bedoc": {
    "printers": [
      "./bedoc-markdown-printer.js",
      "./bedoc-html-printer.js"
    ]
  }
}
```

This structure allows BeDoc to automatically discover and load your printer
when installed.
