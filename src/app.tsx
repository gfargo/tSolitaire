import { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { MiniCard, isStandardCard, type TCard } from 'ink-playing-cards';
import {
    useSolitaire,
    getContextHint, FOUNDATION_SUITS,
    type CursorPosition,
    type SelectedCard,
    type Suit,
    type TableauColumn
} from './solitaire.js';

const SUIT_SYMBOLS: Record<Suit, string> = {
	hearts: '♥',
	diamonds: '♦',
	clubs: '♣',
	spades: '♠',
};

const SUIT_COLORS: Record<Suit, string> = {
	hearts: 'red',
	diamonds: 'red',
	clubs: 'white',
	spades: 'white',
};

// --- Timer hook ---

function useTimer(running: boolean) {
	const [seconds, setSeconds] = useState(0);

	useEffect(() => {
		if (!running) return;
		const interval = setInterval(() => {
			setSeconds((s) => s + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [running]);

	const reset = () => setSeconds(0);

	const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

	return {seconds, formatted, reset};
}

// --- Card rendering ---

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

function SuitLabel({suit}: {suit: Suit}) {
	return <Text color={SUIT_COLORS[suit]}>{SUIT_SYMBOLS[suit]}</Text>;
}

// --- Stock & Waste ---

function StockPile({
	stock,
	waste,
	cursor,
	stockCycles,
}: {
	stock: TCard[];
	waste: TCard[];
	cursor: CursorPosition;
	stockCycles: number;
}) {
	const stockHighlight = cursor.zone === 'stock';
	const wasteHighlight = cursor.zone === 'waste';
	const topWaste = waste.length > 0 ? waste[waste.length - 1] : undefined;

	return (
		<Box gap={1}>
			<Box flexDirection="column" alignItems="center">
				<Text dimColor>
					Stock{stockCycles > 0 ? ` ×${String(stockCycles + 1)}` : ''}
				</Text>
				{stock.length > 0 ? (
					<Box flexDirection="column" alignItems="center">
						<CardSlot
							card={stock[stock.length - 1]}
							faceUp={false}
							highlighted={stockHighlight}
						/>
						<Text dimColor>{String(stock.length)}</Text>
					</Box>
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

// --- Foundations ---

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
						<SuitLabel suit={suit} />
						{topCard ? (
							<Box flexDirection="column" alignItems="center">
								<CardSlot
									card={topCard}
									faceUp
									highlighted={isHighlighted}
									selected={isSelected}
								/>
								<Text dimColor>
									{String(pile.length)}
									<Text color="gray">/13</Text>
								</Text>
							</Box>
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

// --- Tableau ---

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
						{col.faceDown.length > 0 && (
							<Text dimColor>
								{'▒'.repeat(Math.min(col.faceDown.length, 5))}
							</Text>
						)}
						{col.faceUp.length > 0 ? (
							col.faceUp.map((card: TCard, rowIdx: number) => {
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

// --- Win screen ---

function WinScreen({
	moves,
	time,
	onNewGame,
	onQuit,
}: {
	moves: number;
	time: string;
	onNewGame: () => void;
	onQuit: () => void;
}) {
	const [frame, setFrame] = useState(0);
	const suits = ['♠', '♥', '♦', '♣'];

	useEffect(() => {
		const interval = setInterval(() => {
			setFrame((f) => (f + 1) % 20);
		}, 150);
		return () => clearInterval(interval);
	}, []);

	useInput((input) => {
		if (input === 'n') onNewGame();
		if (input === 'q') onQuit();
	});

	const cascade = suits
		.map((s, i) => (frame + i) % 2 === 0 ? s : ' ')
		.join(' ');

	return (
		<Box
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			padding={2}
			borderStyle="double"
			borderColor="green"
		>
			<Text> </Text>
			<Text color="green" bold>
				{cascade} YOU WIN! {cascade}
			</Text>
			<Text> </Text>
			<Text>
				Moves: <Text color="cyan" bold>{moves}</Text>
				{'   '}
				Time: <Text color="cyan" bold>{time}</Text>
			</Text>
			<Text> </Text>
			<Text dimColor>n new game · q quit</Text>
		</Box>
	);
}

// --- Status bar ---

function StatusBar({
	message,
	hint,
	showHints,
}: {
	message: string;
	hint: string;
	showHints: boolean;
}) {
	return (
		<Box flexDirection="column" marginTop={1}>
			{message ? (
				<Text color="yellow" italic>
					{message}
				</Text>
			) : null}
			{showHints && hint ? (
				<Text color="gray" italic>
					{hint}
				</Text>
			) : null}
		</Box>
	);
}

// --- Main App ---

export default function App() {
	const {state, move, select, autoComplete, autoFoundation, undo, newGame} =
		useSolitaire();
	const {exit} = useApp();
	const [showHints, setShowHints] = useState(false);
	const timer = useTimer(!state.gameWon);

	const handleNewGame = () => {
		newGame();
		timer.reset();
	};

	useInput(
		(input, key) => {
			if (state.gameWon) return;

			if (input === 'q') {
				exit();
				return;
			}

			if (input === 'n') {
				handleNewGame();
				return;
			}

			if (input === 'a') {
				autoComplete();
				return;
			}

			if (input === 'f') {
				autoFoundation();
				return;
			}

			if (input === 'u') {
				undo();
				return;
			}

			if (input === 'h') {
				setShowHints((v) => !v);
				return;
			}

			if (key.escape) {
				// Deselect
				select();
				return;
			}

			if (key.leftArrow) move('left');
			else if (key.rightArrow) move('right');
			else if (key.upArrow) move('up');
			else if (key.downArrow) move('down');
			else if (key.return || input === ' ') select();
		},
		{isActive: !state.gameWon},
	);

	if (state.gameWon) {
		return (
			<WinScreen
				moves={state.moves}
				time={timer.formatted}
				onNewGame={handleNewGame}
				onQuit={() => exit()}
			/>
		);
	}

	const foundationCount = FOUNDATION_SUITS.reduce(
		(sum, s) => sum + state.foundations[s].length,
		0,
	);

	const hint = getContextHint(state);

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box justifyContent="space-between" marginBottom={1}>
				<Text bold color="green">
					♠ Solitaire
				</Text>
				<Box gap={2}>
					<Text>
						<Text color="cyan">{timer.formatted}</Text>
					</Text>
					<Text>
						Moves: <Text color="cyan">{state.moves}</Text>
					</Text>
					<Text>
						<Text color="yellow">{foundationCount}</Text>
						<Text dimColor>/52</Text>
					</Text>
				</Box>
			</Box>

			{/* Top row */}
			<Box justifyContent="space-between" marginBottom={1}>
				<StockPile
					stock={state.stock}
					waste={state.waste}
					cursor={state.cursor}
					stockCycles={state.stockCycles}
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

			{/* Status bar */}
			<StatusBar
				message={state.statusMessage}
				hint={hint}
				showHints={showHints}
			/>

			{/* Controls */}
			<Box marginTop={1}>
				<Text dimColor>
					←→↑↓ move · Space select · f foundation · u undo · a auto · h
					hints · n new · q quit
				</Text>
			</Box>
		</Box>
	);
}
