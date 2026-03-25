# tSolitaire ♠

Terminal Klondike Solitaire built with [Ink](https://github.com/vadimdemedes/ink) 6, React 19, and [ink-playing-cards](https://www.npmjs.com/package/ink-playing-cards).

## Play

```bash
yarn install
yarn build
yarn start
# or: npx tsx src/cli.tsx
```

## Controls

| Key | Action |
|-----|--------|
| ←→↑↓ | Navigate between piles and cards |
| Space / Enter | Select card or place it |
| a | Auto-complete (when all tableau cards are face-up) |
| n | New game |
| q | Quit |

## Rules

Classic Klondike solitaire:

- Build four foundation piles (♥♦♣♠) from Ace to King
- Stack tableau cards in descending order, alternating colors
- Only Kings can be placed on empty tableau columns
- Draw from stock one card at a time

## Project Structure

```
src/
  cli.tsx        — entry point
  app.tsx        — UI layout and input handling
  solitaire.tsx  — game state, logic, and reducer
test/
  app.tsx        — AVA tests
```

## Stack

- Ink 6 — React renderer for the terminal
- React 19 — component-based UI
- ink-playing-cards — card components and deck utilities
- TypeScript — type safety with `react-jsx` transform
- AVA + ink-testing-library — testing

## Development

```bash
yarn dev        # watch mode
yarn typecheck  # type-check
yarn lint       # lint + format check
yarn test       # run tests
```

## Requirements

- Node.js >= 22

## License

MIT
