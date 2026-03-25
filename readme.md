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
| Esc | Cancel selection |
| f | Send card under cursor to its foundation |
| u | Undo last move |
| a | Auto-complete (when all cards face-up) |
| h | Toggle contextual hints |
| n | New game |
| q | Quit |

## Features

- Full Klondike solitaire rules
- Undo support (up to 50 moves)
- Game timer and move counter
- Auto-foundation shortcut (f key)
- Auto-complete when all cards are revealed
- Contextual hints (toggle with h)
- Status messages for every action
- Stock cycle counter
- Color-coded suits (red/white)
- Animated win screen

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
  app.tsx        — UI layout, input handling, timer
  solitaire.tsx  — game state, logic, reducer, undo
test/
  app.tsx        — AVA tests
```

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
