# ink-starter

Boilerplate for building CLI applications with [Ink](https://github.com/vadimdemedes/ink) 6.x, React 19, and TypeScript.

> Click **"Use this template"** on GitHub to create a new repo from this starter.

## Stack

- **Ink 6** — React renderer for the terminal
- **React 19** — component-based UI
- **TypeScript** — type safety with `react-jsx` transform
- **AVA** — concurrent test runner with `tsx` loader
- **ink-testing-library** — test utilities for Ink components
- **XO + Prettier** — linting and formatting
- **release-it** — versioning and publishing
- **GitHub Actions** — CI on push and PR

## Getting Started

```bash
# Install dependencies
yarn install

# Run in development (watches for changes)
yarn dev

# Run the CLI
yarn start

# Run tests
yarn test

# Type-check (includes tests)
yarn typecheck

# Lint and format
yarn lint
yarn lint:fix
```

## Project Structure

```
src/
  app.tsx    — main App component
  cli.tsx    — CLI entry point (renders App)
test/
  app.tsx    — AVA tests using ink-testing-library
```

## Requirements

- Node.js >= 22 (required by Ink 6)

## License

MIT
