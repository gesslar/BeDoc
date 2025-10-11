# Repository Guidelines

## Project Structure & Module Organization

- `src/cli.js` is the Node CLI entrypoint; it wires CLI flags from `core/ConfigurationParameters.js` into the `BeDoc` engine.
- `src/core/` contains the modular pipeline (configuration, discovery, action and hook managers, contracts, utilities). Treat each subdirectory as a self-contained package.
- `dist/types/` ships the generated TypeScript declaration files used by downstream consumers—update them when public APIs change.
- `examples/` holds ready-to-run configs and sample parsers; mirror their layout when documenting new formats.
- `work/` is the sandbox for experimental parsers and fixtures (e.g., the LPC parser prototype); keep anything committed here reproducible.

## Build, Test, and Development Commands

- `npm install` bootstraps dependencies; rerun after editing `package.json`.
- `npm run lint:check` runs the flat ESLint suite across `src/` and `work/`.
- `npm run lint:fix` applies safe autofixes—verify manually afterward.
- `node src/cli.js --help` surfaces all runtime flags; dry-run new parsers with `node src/cli.js --input work/markdown-printer.js --output ./tmp`.
- `npm run update` refreshes dependency pins via `npm-check-updates`; commit lockfile changes with the same PR.

## Coding Style & Naming Conventions

- Follow the supplied ESLint config: 2-space indentation, double quotes, no semicolons, one blank line between logical blocks.
- Keep files in ES modules (`type: "module"`); export classes in PascalCase (`ActionManager`), helpers in camelCase.
- Public classes and functions require JSDoc with explicit types; prefer `async`/`await` over raw promises.
- Group configuration schemas under `core/contract/`; name contracts `<feature>.yaml` to match their provider.

## Testing Guidelines

- There is no formal test runner; build scenario-driven tests in `work/` (see `work/test.js`) or add lightweight scripts alongside new modules.
- When adding processors, capture representative input/output fixtures under `examples/` and assert them via Node scripts (`node work/test-builder.mjs`).
- Block PRs until lint passes and manual CLI runs cover new code paths; document gaps in the PR description.

## Commit & Pull Request Guidelines

- Use conventional commits (`feat(parser): ...`, `fix(core): ...`) as outlined in `CONTRIBUTING.md`; keep commits scoped to a single concern.
- Reference related issues (`Closes #123`) and summarise behaviour changes, config flags touched, and manual verification steps.
- Screenshot or copy CLI diffs when UI output changes; include sample config snippets for new options.
- Ensure GitHub Actions (lint, CodeQL, Dependabot) stay green before requesting review.
