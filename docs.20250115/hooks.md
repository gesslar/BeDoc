---
layout: page
title: Hook System
---

# BeDoc Hook System

The hook system allows you to modify and enhance the documentation process by
injecting custom logic at specific points. With full async/await support, hooks
can integrate with external services, APIs, and tools without blocking the main
process.

## Hook Types

BeDoc supports two types of hooks:

1. **Parser Hooks**: Modify the parsing process
   - Enhance parsed content
   - Add metadata
   - Validate documentation structure

2. **Printer Hooks**: Transform the output
   - Modify formatting
   - Add external content
   - Apply transformations

## Hook Events

Each hook type has specific events that are triggered during processing:

### Parser Events
- `start`: Before parsing begins
- `section_load`: When a documentation section is found
- `enter`: When entering a section
- `exit`: When exiting a section
- `end`: After parsing completes

### Printer Events
- `start`: Before printing begins
- `section_load`: When a section is loaded for printing
- `enter`: When entering a section
- `exit`: When exiting a section
- `end`: After printing completes

## Hook Context

Hooks receive context objects containing relevant data:

```javascript
// Parser start context
{
  file: {              // File being parsed
    path: string,
    name: string,
    module: string
  },
  content: string      // Raw file content
}

// Parser section context
{
  section: {           // Current section
    name: string,
    type: string,
    description: string,
    params: Array,
    returns: Object
  }
}

// Printer start context
{
  module: string,      // Module name
  content: {           // Parsed content
    name: string,
    description: string,
    sections: Array
  }
}

// Printer section context
{
  section: {           // Current section
    name: string,
    content: string    // Formatted section content
  }
}
```

## Hook Response Format

Hooks must return a response object:

```javascript
// Success response
{
  status: "success",
  message: string,     // Optional success message
  result: {           // Modified data
    // Context-specific data
  }
}

// Error response
{
  status: "error",
  message: string      // Error description
}
```

## Async Integration Examples

Hooks can perform async operations to enhance documentation:

```javascript
// hooks.js
export const print = {
  // Fetch latest version info from npm
  "start": async ({ module, content }) => {
    try {
      const pkgInfo = await fetch(`https://registry.npmjs.org/${module}`)
      const { version } = await pkgInfo.json()

      content.metadata = {
        ...content.metadata,
        version
      }

      return {
        status: "success",
        message: "Added npm version info",
        result: { module, content }
      }
    } catch(error) {
      return {
        status: "error",
        message: error.message
      }
    }
  },

  // Use AI to enhance descriptions
  "section_load": async ({ section }) => {
    try {
      const enhancedDesc = await aiService.enhance(section.description)
      section.description = enhancedDesc

      return {
        status: "success",
        message: "Enhanced description with AI",
        result: { section }
      }
    } catch(error) {
      return {
        status: "error",
        message: error.message
      }
    }
  },

  // Run code examples through formatter
  "enter": async ({ section }) => {
    if(section.type === "example") {
      try {
        const formatted = await prettier.format(section.content, {
          parser: "babel"
        })
        section.content = formatted

        return {
          status: "success",
          message: "Formatted code example",
          result: { section }
        }
      } catch(error) {
        return {
          status: "error",
          message: error.message
        }
      }
    }
  }
}

export const parse = {
  // Validate against schema
  "section_load": async ({ section }) => {
    try {
      await validateSchema(section)
      return {
        status: "success",
        message: "Section validated",
        result: { section }
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

## Best Practices

1. **Error Handling**: Always catch and properly report errors from async
   operations.

2. **Progress Logging**: Use console for debugging long-running operations
   ```javascript
   console.log("Fetching data from API...")
   console.info("Data transformation complete")
   ```

3. **Timeouts**: Implement timeouts for external API calls to prevent hanging:
   ```javascript
   const timeout = ms => new Promise((_, reject) =>
     setTimeout(() => reject(new Error("Timeout")), ms))

   const result = await Promise.race([
     apiCall(),
     timeout(5000)
   ])
   ```

4. **State Management**: Use the content object to pass state between hooks:
   ```javascript
   content.metadata = content.metadata || {}
   content.metadata.apiData = result
   ```

5. **Validation**: Validate modified content before returning:
   ```javascript
   if(!section.description) {
     return {
       status: "error",
       message: "Section description required"
     }
   }
   ```

## Using Hooks

1. Create a hooks file:
   ```javascript
   // my_hooks.js
   export const print = {
     // Your print hooks
   }

   export const parse = {
     // Your parse hooks
   }
   ```

2. Use it with BeDoc:
   ```bash
   bedoc -k ./my_hooks.js -l javascript -f markdown -i src/*.js -o docs
   ```

The async nature of hooks allows for powerful integrations while keeping the main
documentation process responsive. Long-running operations like API calls or local
processing happen in parallel, with results seamlessly integrated into the final
output.
