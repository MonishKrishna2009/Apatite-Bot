# oxlint Setup for Apatite Bot

## Overview
oxlint is a fast JavaScript/TypeScript linter that has been installed and configured for this project.

## Installation
oxlint has been installed as a dev dependency:
```bash
bun add -D oxlint@latest
```

## Configuration
- **Config file**: `oxlint.json` - Contains linting rules and ignore patterns
- **Rules**: Currently configured to warn on unused variables and unnecessary escapes
- **Scope**: Lints all JavaScript files in the `src/` directory

## Available Scripts

### `bun run lint`
Runs oxlint on the src/ directory and shows all warnings/errors with detailed output.

### `bun run lint:check`
Runs oxlint in quiet mode, only showing the summary (number of warnings/errors).

### `bun run lint:fix`
Runs oxlint with auto-fix enabled (where possible).

## Current Status
- **Version**: 1.19.0
- **Files scanned**: 81 files
- **Rules active**: 89 rules
- **Current issues**: 78 warnings, 0 errors

## Common Issues Found
1. **Unused variables**: Variables declared but never used
2. **Unused parameters**: Function parameters that aren't referenced
3. **Unused imports**: Imported modules that aren't used
4. **Unnecessary escapes**: Regex patterns with unnecessary escape characters

## Integration
oxlint is integrated into the development workflow and can be run:
- Before commits (recommended)
- In CI/CD pipelines
- As part of code review process

## Performance
oxlint is significantly faster than ESLint, completing linting of 81 files in ~24-29ms using 12 threads.
