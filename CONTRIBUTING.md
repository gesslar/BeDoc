# Contributing to BeDoc

Thank you for considering contributing to BeDoc! This document outlines the process and guidelines for contributing to the project. Please read it carefully before making any changes or submitting pull requests.

---

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Issues](#reporting-issues)
  - [Feature Requests](#feature-requests)
  - [Submitting Code Changes](#submitting-code-changes)
- [Development Guidelines](#development-guidelines)
  - [Code Style](#code-style)
  - [Commit Messages](#commit-messages)
  - [Pull Requests](#pull-requests)
- [Setting Up Your Environment](#setting-up-your-environment)

---

## Code of Conduct
All contributors must adhere to the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). Respect and professionalism are expected in all interactions.

---

## How Can I Contribute?

### Reporting Issues
If you find a bug or something isn’t working as expected:
1. Check the [issues](https://github.com/gesslar/BeDoc/issues) to ensure it hasn’t already been reported.
2. Open a new issue with:
   - A clear title.
   - A detailed description of the problem.
   - Steps to reproduce the issue.
   - Relevant logs or screenshots (if applicable).

### Feature Requests
Have an idea for a new feature? Create an issue with:
- A description of the feature.
- Why it would be useful.
- Potential challenges or considerations.

### Submitting Code Changes
We welcome code contributions! Before submitting a pull request:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature-name`).
3. Ensure all changes adhere to the [Code Style](#code-style).
4. Add tests for your changes if applicable.
5. Commit your changes with a [good commit message](#commit-messages).
6. Push your branch and open a pull request.

---

## Development Guidelines

### Code Style
BeDoc enforces strict style rules. Please ensure your code adheres to the following:
- Use **ESLint** with the provided flat configuration.
- Formatting rules include:
  - Insert final newlines.
  - Trim trailing whitespace.
  - Use `\n` for line endings.
- JavaScript files are formatted using **ESLint**.
- XML files are formatted using **Red Hat XML Formatter**.

Make sure to enable auto-formatting on save in your editor. Project-specific VS Code settings are available in `.vscode/settings.json`.

### Commit Messages
Follow this structure for commit messages:
- **Type**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, etc.
- **Scope**: A short scope or module name (e.g., `parser`, `hooks`).
- **Message**: A concise summary of the change.

Example:
```
feat(parser): add support for async hooks
```

### Pull Requests
- Reference related issues in the description (e.g., `Closes #123`).
- Provide a summary of the changes and why they’re needed.
- Ensure all checks pass (e.g., linting, tests).
- Keep pull requests focused; avoid unrelated changes.

---

## Setting Up Your Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/gesslar/BeDoc.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Use the following tools:
   - **Node.js** (v18 or later).
   - **ESLint** for linting.
   - Your preferred editor (VS Code recommended).

4. Use the provided VS Code settings in `.vscode/settings.json` for consistent formatting.

---

Thank you for contributing to BeDoc! Your efforts make this project better for everyone.
