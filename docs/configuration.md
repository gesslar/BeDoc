---
layout: bedoc
title: Configuration Guide
nav_order: 5
---

# BeDoc Configuration Guide

BeDoc offers flexible configuration through both command-line arguments and configuration files. This guide explains both approaches and how they can be combined for optimal workflow.

## Command Line Arguments

### Basic Usage
```bash
bedoc -l <language> -f <format> -i <input> -o <output>
```

### Core Options
- `-l, --language <lang>`: Source code language (e.g., javascript, lpc)
- `-f, --format <format>`: Output format (e.g., markdown, html)
- `-i, --input <glob>`: Input file pattern(s). Multiple patterns can be comma-separated (e.g., "src/*.js,lib/*.js")
- `-o, --output <dir>`: Output directory for generated docs
- `-x, --exclude <glob>`: Patterns to exclude. Multiple patterns can be comma-separated (e.g., "**/*.test.js,**/*.spec.js")

### Module Options
- `-p, --parser <file>`: Use local parser file
- `-P, --printer <file>`: Use local printer file
- `--mock <dir>`: Use mock directory for testing

### Hook Options
- `--hooks <file>`: Load hooks from JavaScript file

### Debug Options
- `-d, --debug`: Enable debug mode

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
  ]
}
```

### Configuration Options

#### Core Settings
- `language`: Source code language
- `format`: Output format
- `input`: Single glob pattern or array of patterns
- `output`: Output directory path

#### Module Settings
- `parser`: Path to local parser file
- `printer`: Path to local printer file
- `mockDir`: Directory for mock testing

#### Hook Settings
- `hooks`: Path to hooks file

#### Filter Settings
- `exclude`: Patterns to exclude from input
- `include`: Patterns to explicitly include

#### Debug Settings
- `debug`: Enable debug mode

## Using Multiple Configurations

You can maintain different configurations for different purposes:

```json
{
  "default": {
    "language": "javascript",
    "format": "markdown",
    "output": "docs/api"
  },
  "development": {
    "extends": "default",
    "debug": true
  },
  "production": {
    "extends": "default",
    "exclude": ["**/*.test.js"]
  }
}
```

Use specific configurations with the `--config` flag:
```bash
bedoc --config production
```

## Environment Variables

BeDoc also supports configuration through environment variables:

- `BEDOC_LANGUAGE`: Source language
- `BEDOC_FORMAT`: Output format
- `BEDOC_OUTPUT`: Output directory
- `BEDOC_DEBUG`: Enable debug mode (true/false)

Environment variables take precedence over config file settings.

## Configuration Priority

BeDoc applies settings in the following order (highest to lowest priority):
1. Command line arguments
2. Environment variables
3. package.json
4. Project config file (`bedoc.config.json`)
5. Global user config (`~/.bedoc/config.json`)

This allows you to override specific settings while maintaining a base
configuration.
