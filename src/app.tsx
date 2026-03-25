import { Box, Text, useApp, useInput } from 'ink';
import { MiniCard, isStandardCard, type TCard } from 'ink-playing-cards';
import {
    useSolitaire,
    type CursorPosition,
    type SelectedCard,
    type Suit,
    type TableauColumn,
} from './solitaire.js';

const FOUNDATION_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS: Record<Suit, string> = {
	hearts: '♥',
	diamonds: '♦',
	clubs: '♣',
	spades: '♠',
};

function CardSlot({
	card,
	faceUp,
	highlighted,
	selected,
	label,
}: {
	card?: TCard;
	faceUp?: boolean;
	highlighted?: boolean;
	selected?: boolean;
	label?: string;
}) {
	if (card && isStandardCard(card)) {
		return (
			<Box
				borderStyle={selected ? 'double' : highlighted ? 'bold' : undefined}
				borderColor={selected ? 'yellow' : highlighted ? 'cyan' : undefined}
			>
				<MiniCard
					{...card}
					faceUp={faceUp ?? card.faceUp}
					variant="mini"
				/>
			</Box>
		);
	}

	// Empty slot placeholder
	const borderColor = highlighted ? 'cyan' : 'gray';
	return (
		<Box
			width={7}
			height={6}
			borderStyle={highlighted ? 'bold' : 'single'}
			borderColor={borderColor}
			alignItems="center"
			justifyContent="center"
		>
			<Text dimColor>{label ?? '·'}</Text>
		</Box>
	);
}

function StockPile({
	stock,
	waste,
	cursor,
}: {
	stock: TCard[];
	waste: TCard[];
	cursor: CursorPosition;
}) {
	const stockHighlight = cursor.zone === 'stock';
	const wasteHighlight = cursor.zone === 'waste';
	const topWaste = waste.length > 0 ? waste[waste.length - 1] : undefined;

	return (
		<Box gap={1}>
			<Box flexDirection="column" alignItems="center">
				<Text dimColor>Stock</Text>
				{stock.length > 0 ? (
					<CardSlot
						card={stock[stock.length - 1]}
						faceUp={false}
						highlighted={stockHighlight}
						label={`[${stock.length}]`}
					/>
				) : (
					<CardSlot highlighted={stockHighlight} label="↺" />
				)}
			</Box>
			<Box flexDirection="column" alignItems="center">
				<Text dimColor>Waste</Text>
				{topWaste ? (
					<CardSlot card={topWaste} faceUp highlighted={wasteHighlight} />
				) : (
					<CardSlot highlighted={wasteHighlight} />
				)}
			</Box>
		</Box>
	);
}

function Foundations({
	foundations,
	cursor,
	selected,
}: {
	foundations: Record<Suit, TCard[]>;
	cursor: CursorPosition;
	selected: SelectedCard | null;
}) {
	return (
		<Box gap={1}>
			{FOUNDATION_SUITS.map((suit, i) => {
				const pile = foundations[suit];
				const topCard = pile.length > 0 ? pile[pile.length - 1] : undefined;
				const isHighlighted = cursor.zone === 'foundation' && cursor.col === i;
				const isSelected =
					selected?.zone === 'foundation' && selected.col === i;

				return (
					<Box key={suit} flexDirection="column" alignItems="center">
						<Text dimColor>{SUIT_SYMBOLS[suit]}</Text>
						{topCard ? (
							<CardSlot
								card={topCard}
								faceUp
								highlighted={isHighlighted}
								selected={isSelected}
							/>
						) : (
							<CardSlot
								highlighted={isHighlighted}
								label={SUIT_SYMBOLS[suit]}
							/>
						)}
					</Box>
				);
			})}
		</Box>
	);
}

function TableauView({
	tableau,
	cursor,
	selected,
}: {
	tableau: TableauColumn[];
	cursor: CursorPosition;
	selected: SelectedCard | null;
}) {
	return (
		<Box gap={1}>
			{tableau.map((col, colIdx) => {
				const isCursorCol = cursor.zone === 'tableau' && cursor.col === colIdx;

				return (
					<Box key={colIdx} flexDirection="column" alignItems="center">
						<Text dimColor>{colIdx + 1}</Text>
						{/* Face-down cards as compact indicators */}
						{col.faceDown.length > 0 && (
							<Text dimColor>
								{'▒'.repeat(Math.min(col.faceDown.length, 5))}
							</Text>
						)}
						{/* Face-up cards */}
						{col.faceUp.length > 0 ? (
							col.faceUp.map((card, rowIdx) => {
								const isHighlighted = isCursorCol && cursor.row === rowIdx;
								const isSelected =
									selected?.zone === 'tableau' &&
									selected.col === colIdx &&
									rowIdx >= selected.row;

								return (
									<Box key={card.id} marginTop={rowIdx > 0 ? -2 : 0}>
										<CardSlot
											card={card}
											faceUp
											highlighted={isHighlighted}
											selected={isSelected}
										/>
									</Box>
								);
							})
						) : (
							<CardSlot
								highlighted={isCursorCol && cursor.row === 0}
								label="·"
							/>
						)}
					</Box>
				);
			})}
		</Box>
	);
}

function WinScreen({moves}: {moves: number}) {
	return (
		<Box
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			padding={2}
		>
			<Text color="green" bold>
				🎉 You Win! 🎉
			</Text>
			<Text>
				Completed in <Text color="cyan">{moves}</Text> moves
			</Text>
			<Text dimColor>Press n for new game, q to quit</Text>
		</Box>
	);
}

export default function App() {
	const {state, move, select, autoComplete, newGame} = useSolitaire();
	const {exit} = useApp();

	useInput((input, key) => {
		if (input === 'q') {
			exit();
			return;
		}

		if (input === 'n') {
			newGame();
			return;
		}

		if (input === 'a') {
			autoComplete();
			return;
		}

		if (key.leftArrow) move('left');
		else if (key.rightArrow) move('right');
		else if (key.upArrow) move('up');
		else if (key.downArrow) move('down');
		else if (key.return || input === ' ') select();
	});

	if (state.gameWon) {
		return <WinScreen moves={state.moves} />;
	}

	const foundationCount = FOUNDATION_SUITS.reduce(
		(sum, s) => sum + state.foundations[s].length,
		0,
	);

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box justifyContent="space-between" marginBottom={1}>
				<Text bold color="green">
					♠ Solitaire
				</Text>
				<Text>
					Moves: <Text color="cyan">{state.moves}</Text>
					{'  '}
					Foundation: <Text color="yellow">{foundationCount}/52</Text>
				</Text>
			</Box>

			{/* Top row: Stock + Waste ... Foundations */}
			<Box justifyContent="space-between" marginBottom={1}>
				<StockPile
					stock={state.stock}
					waste={state.waste}
					cursor={state.cursor}
				/>
				<Foundations
					foundations={state.foundations}
					cursor={state.cursor}
					selected={state.selected}
				/>
			</Box>

			{/* Tableau */}
			<TableauView
				tableau={state.tableau}
				cursor={state.cursor}
				selected={state.selected}
			/>

			{/* Controls */}
			<Box marginTop={1}>
				<Text dimColor>
					←→↑↓ move | Space/Enter select | a auto-complete | n new game | q
					quit
				</Text>
			</Box>
		</Box>
	);
}
