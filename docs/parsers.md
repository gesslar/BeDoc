---
layout: default
title: Creating Parsers
---

# Creating Parsers for BeDoc

This guide explains how to create custom parsers for BeDoc. Parsers are
responsible for analyzing source code and extracting documentation information
in a structured format.

## Parser Structure

A BeDoc parser consists of two main parts:

1. **Meta Information**: Defines the language and file extension.
2. **Parser Class**: Implements the parsing logic.

Here's the basic structure:

```javascript
// Define meta information
export const meta = {
  language: "mylang",      // Language identifier
  languageExtension: ".ml" // File extension
}

// Implement the parser class
export class Parser {
  constructor(core) {
    this.core = core // Access to BeDoc core utilities
  }

  async parse(file, content) {
    // Parse the content and return a response
    return {
      status: "success",
      result: {
        file,
        raw: content,
        funcs: [] // Array of parsed functions
      }
    }
  }
}
```

## Response Format

The parser's `parse` method must return a response object with the following
structure:

```javascript
// Success response
{
  status: "success",
  result: {
    file: string,     // Source file path
    raw: string,      // Original file content
    funcs: [         // Array of parsed functions
      {
        name: string,           // Function name
        description: string[],  // Function description
        params: [               // Function parameters
          {
            type: string,       // Parameter type
            name: string,       // Parameter name
            content: string[]   // Parameter description
          }
        ],
        return: {               // Return value info
          type: string,         // Return type
          content: string[]     // Return description
        }
      }
    ]
  }
}

// Error response
{
  status: "error",
  file: string,       // Source file path
  line: string,       // Problematic line
  lineNumber: number, // Line number where error occurred
  message: string     // Error description
}
```

## Core Utilities

The parser has access to BeDoc's core utilities through `this.core`:

- `this.core.logger`: Logging functions (debug, info, warn, error)
- `this.core.string`: String manipulation utilities
- `this.core.valid`: Validation utilities
- `this.core.data`: Data structure utilities
- `this.core.fdUtil`: File system utilities

## Hook Support

Parsers automatically support [hooks](hooks), allowing users to modify the
parsing process. Hook points include:

- `START`: Before parsing begins
- `FILE_LOAD`: When a file is loaded
- `SECTION_LOAD`: When a documentation section is found
- `END`: After parsing completes

## Example Implementation

Here's a simplified example of a documentation parser:

```javascript
export const meta = {
  language: "example",
  languageExtension: ".ex"
}

export class Parser {
  constructor(core) {
    this.core = core
    this.patterns = {
      docStart: /^\s*\/\*\*(.*)$/,    // /** Start of doc block
      docEnd: /^\s*\*\/\s*$/,         // */ End of doc block
      docLine: /^\s*\*\s?(.*)$/,      // * Documentation line
      funcDef: /^function\s+(\w+)/    // Function definition
    }
  }

  async parse(file, content) {
    try {
      const lines = content.split(/\r?\n/)
      const funcs = []
      let currentFunc = null
      let inDoc = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (this.patterns.docStart.test(line)) {
          inDoc = true
          currentFunc = { description: [] }
          continue
        }

        if (inDoc && this.patterns.docEnd.test(line)) {
          inDoc = false
          continue
        }

        if (inDoc && this.patterns.docLine.test(line)) {
          const [, content] = this.patterns.docLine.exec(line)
          currentFunc.description.push(content)
          continue
        }

        if (!inDoc && currentFunc) {
          const funcMatch = this.patterns.funcDef.exec(line)
          if (funcMatch) {
            currentFunc.name = funcMatch[1]
            funcs.push(currentFunc)
            currentFunc = null
          }
        }
      }

      return {
        status: "success",
        result: { file, raw: content, funcs }
      }
    } catch (error) {
      return {
        status: "error",
        file,
        line: null,
        lineNumber: null,
        message: error.message
      }
    }
  }
}
```

## Best Practices

1. **Error Handling**: Always return appropriate error responses with detailed
   messages and line numbers when possible.

2. **Async Support**: Make your parser async to handle large files efficiently and
   support async hooks.

3. **Validation**: Validate input parameters and document structure before
   processing.

4. **Logging**: Use the core logger for debugging and error tracking:
   ```javascript
   this.core.logger.debug("Processing file...")
   this.core.logger.error("Failed to parse line")
   ```

5. **State Management**: Keep track of parser state (e.g., inside comment block,
   current function) clearly and reset it appropriately.

## Testing Your Parser

BeDoc provides multiple ways to test your parsers:

1. **Mock Mode**: Test using a local mock environment:
   ```bash
   bedoc --mock ./my-parser -l mylang -f markdown -i test/*.ml -o test/docs
   ```

2. **Direct File Usage**: Test your parser file directly without installation:
   ```bash
   bedoc --parser ./my-parser.js --printer markdown -i test/*.ml -o test/docs
   # Or use the short form
   bedoc -p ./my-parser.js -r markdown -i test/*.ml -o test/docs
   ```

These options allow you to rapidly iterate on your parser implementation without
needing to package and install it first. The direct file usage is particularly
helpful during initial development and debugging.

## Publishing Your Parser

When ready to publish, package your parser following BeDoc's naming and structure
conventions:

```json
{
  "name": "bedoc-mylang-parser",
  "version": "1.0.0",
  "type": "module",
  "description": "MyLang parser for BeDoc",
  "bedoc": {
    "parsers": [
      "./bedoc-mylang-parser.js"
    ]
  }
}
```

This structure allows BeDoc to automatically discover and load your parser when installed.
