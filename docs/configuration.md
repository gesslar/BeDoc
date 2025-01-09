---
layout: bedoc
title: Configuration Guide
nav_order: 5
---

# BeDoc Configuration Guide

BeDoc offers flexible configuration through command-line arguments, environment
variables, and configuration files. This guide explains all configuration methods
and how they interact.

## Command Line Arguments

### Basic Usage
```bash
bedoc -l <language> -f <format> -i <input> -o <output>
```

### Core Options
- `-l, --language <lang>`: Source code language (e.g., javascript, lpc)
- `-f, --format <format>`: Output format (e.g., markdown, html)
- `-i, --input <glob>`: Input file pattern(s). Multiple patterns can be
  comma-separated (e.g., "src/*.js,lib/*.js")
- `-o, --output <dir>`: Output directory for generated docs
- `-x, --exclude <glob>`: Patterns to exclude. Multiple patterns can be
  comma-separated (e.g., "**/*.test.js,**/*.spec.js")

### Module Options
- `-p, --parser <file>`: Use local parser file
- `-P, --printer <file>`: Use local printer file
- `--mock <dir>`: Use mock directory for testing

### Hook Options
- `--hooks <file>`: Load hooks from JavaScript file

### Debug Options
- `-d, --debug`: Enable debug mode
- `--debugLevel <level>`: Set debug verbosity level (default: 0)

## Configuration File

Create a `bedoc.config.json` in your project root for reusable settings:

```json
{
  "language": "javascript",
  "format": "markdown",
  "input": [
    "src/**/*.js",
    "lib/**/*.js"
  ],
  "output": "docs/api",
  "hooks": "./hooks/custom.js",
  "exclude": [
    "**/*.test.js",
    "**/*.spec.js"
  ],
  "debug": false,
  "debugLevel": 0
}
```

## Package.json Configuration

You can include BeDoc configuration in your `package.json` under the `bedoc` key:

```json
{
  "name": "your-project",
  "version": "1.0.0",
  "bedoc": {
    "language": "javascript",
    "format": "markdown",
    "input": ["src/**/*.js"],
    "output": "docs/api"
  }
}
```

## Environment Variables

BeDoc supports configuration through environment variables. Each variable must be
prefixed with `BEDOC_` and uppercase:

- `BEDOC_LANGUAGE`: Source language
- `BEDOC_FORMAT`: Output format
- `BEDOC_OUTPUT`: Output directory
- `BEDOC_DEBUG`: Enable debug mode (true/false)
- `BEDOC_DEBUGLEVEL`: Debug verbosity level

For example:
```bash
BEDOC_DEBUG=true BEDOC_DEBUGLEVEL=5 bedoc
```

## Configuration Priority

BeDoc applies settings in the following order (highest to lowest priority):

1. Command line arguments (when explicitly set)
2. Project config file (`bedoc.config.json`)
3. package.json `bedoc` section
4. Environment variables
5. Command line defaults

Important notes about priority:
- Command line arguments only take precedence when explicitly set by the user
- Default values from command line arguments have the lowest priority
- Earlier sources are overridden by later ones in the configuration cascade

For example, if `debug: true` is set in your config file and you don't specify
`-d` on the command line, the config file's value will be used even though
there's a command line default of `false`.

## Example Configuration Cascade

Here's how different configuration sources might combine:

```bash
# Environment (lowest priority)
BEDOC_DEBUG=true
BEDOC_LANGUAGE=python

# package.json bedoc section
{
  "language": "typescript",
  "debug": true
}

# bedoc.config.json
{
  "language": "javascript",
  "debug": false,
  "debugLevel": 3
}

# Command line (highest priority)
bedoc --debugLevel 4

# Final result
{
  "language": "javascript",  # from config file (overrides package.json and env)
  "debug": false,           # from config file (overrides package.json and env)
  "debugLevel": 4          # from command line (overrides config file)
}
```
