import React from 'react';
import {
    type TCard,
    createStandardDeck,
    Zones,
    isStandardCard,
} from 'ink-playing-cards';

// --- Types ---

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Value =
	| '2'
	| '3'
	| '4'
	| '5'
	| '6'
	| '7'
	| '8'
	| '9'
	| '10'
	| 'J'
	| 'Q'
	| 'K'
	| 'A';

export type TableauColumn = {
	faceDown: TCard[];
	faceUp: TCard[];
};

export type GameSnapshot = {
	stock: TCard[];
	waste: TCard[];
	foundations: Record<Suit, TCard[]>;
	tableau: TableauColumn[];
	moves: number;
	stockCycles: number;
};

export type SolitaireState = {
	stock: TCard[];
	waste: TCard[];
	foundations: Record<Suit, TCard[]>;
	tableau: TableauColumn[];
	cursor: CursorPosition;
	selected: SelectedCard | null;
	moves: number;
	gameWon: boolean;
	stockCycles: number;
	history: GameSnapshot[];
	statusMessage: string;
};

export type CursorPosition = {
	zone: 'stock' | 'waste' | 'foundation' | 'tableau';
	col: number;
	row: number;
};

export type SelectedCard = {
	zone: 'waste' | 'foundation' | 'tableau';
	col: number;
	row: number;
};

export type SolitaireAction =
	| {type: 'DRAW_STOCK'}
	| {type: 'MOVE_CURSOR'; direction: 'left' | 'right' | 'up' | 'down'}
	| {type: 'SELECT'}
	| {type: 'AUTO_COMPLETE'}
	| {type: 'AUTO_FOUNDATION'}
	| {type: 'UNDO'}
	| {type: 'NEW_GAME'};

// --- Constants ---

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const FOUNDATION_SUITS: Suit[] = [
	'hearts',
	'diamonds',
	'clubs',
	'spades',
];

const VALUE_ORDER: Value[] = [
	'A',
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
	'10',
	'J',
	'Q',
	'K',
];

const MAX_HISTORY = 50;

// --- Helpers ---

function valueIndex(v: string): number {
	return VALUE_ORDER.indexOf(v as Value);
}

export function isRed(suit: string): boolean {
	return suit === 'hearts' || suit === 'diamonds';
}

export function cardLabel(card: TCard): string {
	if (!isStandardCard(card)) return '?';
	const suitSymbol =
		card.suit === 'hearts'
			? '♥'
			: card.suit === 'diamonds'
				? '♦'
				: card.suit === 'clubs'
					? '♣'
					: '♠';
	return `${card.value}${suitSymbol}`;
}

function canStackOnTableau(card: TCard, target: TCard): boolean {
	if (!isStandardCard(card) || !isStandardCard(target)) return false;
	return (
		isRed(card.suit) !== isRed(target.suit) &&
		valueIndex(card.value) === valueIndex(target.value) - 1
	);
}

function canStackOnFoundation(
	card: TCard,
	foundation: TCard[],
	targetSuit: Suit,
): boolean {
	if (!isStandardCard(card)) return false;
	if (card.suit !== targetSuit) return false;
	if (foundation.length === 0) return card.value === 'A';
	const top = foundation[foundation.length - 1];
	if (!top || !isStandardCard(top)) return false;
	return valueIndex(card.value) === valueIndex(top.value) + 1;
}

function snapshot(state: SolitaireState): GameSnapshot {
	return {
		stock: [...state.stock],
		waste: [...state.waste],
		foundations: {
			hearts: [...state.foundations.hearts],
			diamonds: [...state.foundations.diamonds],
			clubs: [...state.foundations.clubs],
			spades: [...state.foundations.spades],
		},
		tableau: state.tableau.map((col) => ({
			faceDown: [...col.faceDown],
			faceUp: [...col.faceUp],
		})),
		moves: state.moves,
		stockCycles: state.stockCycles,
	};
}

function pushHistory(state: SolitaireState): SolitaireState {
	const hist = [...state.history, snapshot(state)];
	if (hist.length > MAX_HISTORY) hist.shift();
	return {...state, history: hist};
}

// --- Init ---

export function createInitialState(): SolitaireState {
	const deck = Zones.shuffleCards(createStandardDeck());
	const tableau: TableauColumn[] = [];
	let idx = 0;

	for (let col = 0; col < 7; col++) {
		const faceDown: TCard[] = [];
		for (let j = 0; j < col; j++) {
			const card = deck[idx++];
			if (card) faceDown.push({...card, faceUp: false});
		}

		const topCard = deck[idx++];
		const faceUp: TCard[] = topCard ? [{...topCard, faceUp: true}] : [];
		tableau.push({faceDown, faceUp});
	}

	const stock = deck.slice(idx).map((c) => ({...c, faceUp: false}));

	return {
		stock,
		waste: [],
		foundations: {hearts: [], diamonds: [], clubs: [], spades: []},
		tableau,
		cursor: {zone: 'tableau', col: 0, row: 0},
		selected: null,
		moves: 0,
		gameWon: false,
		stockCycles: 0,
		history: [],
		statusMessage: '',
	};
}

// --- Reducer ---

export function solitaireReducer(
	state: SolitaireState,
	action: SolitaireAction,
): SolitaireState {
	switch (action.type) {
		case 'NEW_GAME':
			return createInitialState();

		case 'DRAW_STOCK':
			return drawFromStock(pushHistory(state));

		case 'MOVE_CURSOR':
			return moveCursor(state, action.direction);

		case 'SELECT':
			return handleSelect(state);

		case 'AUTO_COMPLETE':
			return autoComplete(state);

		case 'AUTO_FOUNDATION':
			return autoFoundation(state);

		case 'UNDO':
			return undo(state);

		default:
			return state;
	}
}

// --- Undo ---

function undo(state: SolitaireState): SolitaireState {
	if (state.history.length === 0) {
		return {...state, statusMessage: 'Nothing to undo'};
	}

	const prev = state.history[state.history.length - 1]!;
	return {
		...state,
		stock: prev.stock,
		waste: prev.waste,
		foundations: prev.foundations,
		tableau: prev.tableau,
		moves: prev.moves,
		stockCycles: prev.stockCycles,
		history: state.history.slice(0, -1),
		selected: null,
		statusMessage: 'Undone',
	};
}

// --- Stock ---

function drawFromStock(state: SolitaireState): SolitaireState {
	if (state.stock.length === 0) {
		if (state.waste.length === 0) {
			return {...state, statusMessage: 'Stock and waste are empty'};
		}

		return {
			...state,
			stock: [...state.waste].reverse().map((c) => ({...c, faceUp: false})),
			waste: [],
			stockCycles: state.stockCycles + 1,
			statusMessage: `Recycled waste (pass ${String(state.stockCycles + 1)})`,
		};
	}

	const newStock = [...state.stock];
	const card = newStock.pop();
	if (!card) return state;

	return {
		...state,
		stock: newStock,
		waste: [...state.waste, {...card, faceUp: true}],
		statusMessage: `Drew ${cardLabel({...card, faceUp: true})}`,
	};
}

// --- Cursor ---

function moveCursor(
	state: SolitaireState,
	direction: 'left' | 'right' | 'up' | 'down',
): SolitaireState {
	const {cursor} = state;
	let {zone, col, row} = cursor;

	if (direction === 'up') {
		if (zone === 'tableau') {
			if (row > 0) {
				row--;
			} else {
				if (col <= 1) {
					zone = col === 0 ? 'stock' : 'waste';
					col = 0;
				} else {
					zone = 'foundation';
					col = Math.min(col - 3, 3);
				}

				row = 0;
			}
		}
	} else if (direction === 'down') {
		if (zone === 'stock' || zone === 'waste') {
			const wasWaste = zone === 'waste';
			zone = 'tableau';
			col = wasWaste ? 1 : 0;
			row = 0;
		} else if (zone === 'foundation') {
			zone = 'tableau';
			col = Math.min(col + 3, 6);
			row = 0;
		} else if (zone === 'tableau') {
			const tabCol = state.tableau[col];
			if (tabCol && row < tabCol.faceUp.length - 1) {
				row++;
			}
		}
	} else if (direction === 'left') {
		if (zone === 'waste') {
			zone = 'stock';
			col = 0;
		} else if (zone === 'foundation') {
			if (col > 0) {
				col--;
			} else {
				zone = 'waste';
				col = 0;
			}
		} else if (zone === 'tableau') {
			if (col > 0) {
				col--;
				const tabCol = state.tableau[col];
				row = tabCol ? Math.min(row, Math.max(0, tabCol.faceUp.length - 1)) : 0;
			}
		}
	} else if (direction === 'right') {
		if (zone === 'stock') {
			zone = 'waste';
			col = 0;
		} else if (zone === 'waste') {
			zone = 'foundation';
			col = 0;
		} else if (zone === 'foundation') {
			if (col < 3) {
				col++;
			}
		} else if (zone === 'tableau') {
			if (col < 6) {
				col++;
				const tabCol = state.tableau[col];
				row = tabCol ? Math.min(row, Math.max(0, tabCol.faceUp.length - 1)) : 0;
			}
		}
	}

	return {...state, cursor: {zone, col, row}, statusMessage: ''};
}

// --- Select / Place ---

function handleSelect(state: SolitaireState): SolitaireState {
	const {cursor, selected} = state;

	if (cursor.zone === 'stock') {
		return drawFromStock(pushHistory({...state, selected: null}));
	}

	if (!selected) {
		return selectCard(state);
	}

	return placeCard(state);
}

function selectCard(state: SolitaireState): SolitaireState {
	const {cursor} = state;

	if (cursor.zone === 'waste' && state.waste.length > 0) {
		const card = state.waste[state.waste.length - 1]!;
		return {
			...state,
			selected: {zone: 'waste', col: 0, row: 0},
			statusMessage: `Selected ${cardLabel(card)} from waste`,
		};
	}

	if (cursor.zone === 'foundation') {
		const suit = FOUNDATION_SUITS[cursor.col]!;
		const pile = state.foundations[suit];
		if (pile.length > 0) {
			const card = pile[pile.length - 1]!;
			return {
				...state,
				selected: {zone: 'foundation', col: cursor.col, row: 0},
				statusMessage: `Selected ${cardLabel(card)} from foundation`,
			};
		}

		return {...state, statusMessage: 'Empty foundation'};
	}

	if (cursor.zone === 'tableau') {
		const tabCol = state.tableau[cursor.col];
		if (
			tabCol &&
			tabCol.faceUp.length > 0 &&
			cursor.row < tabCol.faceUp.length
		) {
			const card = tabCol.faceUp[cursor.row]!;
			const count = tabCol.faceUp.length - cursor.row;
			return {
				...state,
				selected: {zone: 'tableau', col: cursor.col, row: cursor.row},
				statusMessage:
					count > 1
						? `Selected ${String(count)} cards from ${cardLabel(card)}`
						: `Selected ${cardLabel(card)}`,
			};
		}

		if (tabCol && tabCol.faceDown.length > 0 && tabCol.faceUp.length === 0) {
			return {...state, statusMessage: 'Card is face-down'};
		}

		return {...state, statusMessage: 'Empty column (needs King)'};
	}

	return state;
}

function getSelectedCards(
	state: SolitaireState,
): {cards: TCard[]; source: SelectedCard} | null {
	const {selected} = state;
	if (!selected) return null;

	if (selected.zone === 'waste') {
		const card = state.waste[state.waste.length - 1];
		return card ? {cards: [card], source: selected} : null;
	}

	if (selected.zone === 'foundation') {
		const suit = FOUNDATION_SUITS[selected.col]!;
		const pile = state.foundations[suit];
		const card = pile[pile.length - 1];
		return card ? {cards: [card], source: selected} : null;
	}

	if (selected.zone === 'tableau') {
		const tabCol = state.tableau[selected.col];
		if (!tabCol) return null;
		const cards = tabCol.faceUp.slice(selected.row);
		return cards.length > 0 ? {cards, source: selected} : null;
	}

	return null;
}

function placeCard(state: SolitaireState): SolitaireState {
	const {cursor} = state;
	const sel = getSelectedCards(state);
	if (!sel) return {...state, selected: null, statusMessage: ''};

	const {cards, source} = sel;
	const firstCard = cards[0]!;

	// Deselect if clicking same spot
	if (source.zone === cursor.zone && source.col === cursor.col) {
		return {...state, selected: null, statusMessage: 'Deselected'};
	}

	// Try placing on foundation
	if (cursor.zone === 'foundation' && cards.length === 1) {
		const suit = FOUNDATION_SUITS[cursor.col]!;
		const pile = state.foundations[suit];
		if (canStackOnFoundation(firstCard, pile, suit)) {
			const withHistory = pushHistory(state);
			const newState = removeFromSource(withHistory, source);
			const newFoundations = {
				...newState.foundations,
				[suit]: [...pile, {...firstCard, faceUp: true}],
			};
			return {
				...newState,
				foundations: newFoundations,
				selected: null,
				moves: newState.moves + 1,
				gameWon: checkWin({...newState, foundations: newFoundations}),
				statusMessage: `Placed ${cardLabel(firstCard)} on foundation`,
			};
		}

		return {
			...state,
			selected: null,
			statusMessage: `Can't place ${cardLabel(firstCard)} on ${suit} foundation`,
		};
	}

	// Try placing on tableau
	if (cursor.zone === 'tableau') {
		const targetCol = state.tableau[cursor.col];
		if (!targetCol) return {...state, selected: null, statusMessage: ''};

		const canPlace =
			targetCol.faceUp.length === 0 && targetCol.faceDown.length === 0
				? isStandardCard(firstCard) && firstCard.value === 'K'
				: targetCol.faceUp.length > 0 &&
					canStackOnTableau(
						firstCard,
						targetCol.faceUp[targetCol.faceUp.length - 1]!,
					);

		if (canPlace) {
			const withHistory = pushHistory(state);
			const newState = removeFromSource(withHistory, source);
			const newTableau = [...newState.tableau];
			const newCol = {...newTableau[cursor.col]!};
			newCol.faceUp = [
				...newCol.faceUp,
				...cards.map((c) => ({...c, faceUp: true})),
			];
			newTableau[cursor.col] = newCol;
			return {
				...newState,
				tableau: newTableau,
				selected: null,
				moves: newState.moves + 1,
				statusMessage:
					cards.length > 1
						? `Moved ${String(cards.length)} cards to column ${String(cursor.col + 1)}`
						: `Moved ${cardLabel(firstCard)} to column ${String(cursor.col + 1)}`,
			};
		}

		return {
			...state,
			selected: null,
			statusMessage: `Can't place ${cardLabel(firstCard)} there`,
		};
	}

	return {...state, selected: null, statusMessage: 'Invalid move'};
}

function removeFromSource(
	state: SolitaireState,
	source: SelectedCard,
): SolitaireState {
	if (source.zone === 'waste') {
		return {...state, waste: state.waste.slice(0, -1)};
	}

	if (source.zone === 'foundation') {
		const suit = FOUNDATION_SUITS[source.col]!;
		return {
			...state,
			foundations: {
				...state.foundations,
				[suit]: state.foundations[suit].slice(0, -1),
			},
		};
	}

	if (source.zone === 'tableau') {
		const newTableau = [...state.tableau];
		const col = {...newTableau[source.col]!};
		col.faceUp = col.faceUp.slice(0, source.row);

		if (col.faceUp.length === 0 && col.faceDown.length > 0) {
			const flipped = col.faceDown[col.faceDown.length - 1]!;
			col.faceDown = col.faceDown.slice(0, -1);
			col.faceUp = [{...flipped, faceUp: true}];
		}

		newTableau[source.col] = col;
		return {...state, tableau: newTableau};
	}

	return state;
}

function checkWin(state: Pick<SolitaireState, 'foundations'>): boolean {
	return SUITS.every((s) => state.foundations[s].length === 13);
}

// --- Auto-foundation (send card under cursor to its foundation) ---

function autoFoundation(state: SolitaireState): SolitaireState {
	const {cursor} = state;
	let card: TCard | undefined;
	let source: SelectedCard | undefined;

	if (cursor.zone === 'waste' && state.waste.length > 0) {
		card = state.waste[state.waste.length - 1];
		source = {zone: 'waste', col: 0, row: 0};
	} else if (cursor.zone === 'tableau') {
		const tabCol = state.tableau[cursor.col];
		if (tabCol && tabCol.faceUp.length > 0) {
			card = tabCol.faceUp[tabCol.faceUp.length - 1];
			source = {zone: 'tableau', col: cursor.col, row: tabCol.faceUp.length - 1};
		}
	}

	if (!card || !source || !isStandardCard(card)) {
		return {...state, statusMessage: 'No card to send to foundation'};
	}

	const suit = card.suit as Suit;
	const pile = state.foundations[suit];
	const fIdx = FOUNDATION_SUITS.indexOf(suit);

	if (canStackOnFoundation(card, pile, suit)) {
		const withHistory = pushHistory({...state, selected: null});
		const newState = removeFromSource(withHistory, source);
		const newFoundations = {
			...newState.foundations,
			[suit]: [...pile, {...card, faceUp: true}],
		};
		return {
			...newState,
			foundations: newFoundations,
			selected: null,
			moves: newState.moves + 1,
			gameWon: checkWin({foundations: newFoundations}),
			cursor:
				fIdx >= 0
					? {...newState.cursor}
					: newState.cursor,
			statusMessage: `Sent ${cardLabel(card)} to foundation`,
		};
	}

	return {...state, statusMessage: `Can't send ${cardLabel(card)} to foundation yet`};
}

// --- Auto-complete ---

function autoComplete(state: SolitaireState): SolitaireState {
	const allFaceUp = state.tableau.every((col) => col.faceDown.length === 0);
	if (!allFaceUp || state.stock.length > 0) {
		return {
			...state,
			statusMessage: 'Can only auto-complete when all cards are face-up',
		};
	}

	const withHistory = pushHistory(state);
	let current: SolitaireState = {...withHistory, selected: null};
	let moved = true;
	let totalMoved = 0;

	while (moved) {
		moved = false;

		if (current.waste.length > 0) {
			const card = current.waste[current.waste.length - 1]!;
			if (isStandardCard(card)) {
				const pile = current.foundations[card.suit as Suit];
				if (canStackOnFoundation(card, pile, card.suit as Suit)) {
					current = {
						...current,
						waste: current.waste.slice(0, -1),
						foundations: {
							...current.foundations,
							[card.suit]: [...pile, {...card, faceUp: true}],
						},
						moves: current.moves + 1,
					};
					moved = true;
					totalMoved++;
				}
			}
		}

		for (let i = 0; i < 7; i++) {
			const col = current.tableau[i]!;
			if (col.faceUp.length === 0) continue;
			const card = col.faceUp[col.faceUp.length - 1]!;
			if (!isStandardCard(card)) continue;
			const pile = current.foundations[card.suit as Suit];
			if (canStackOnFoundation(card, pile, card.suit as Suit)) {
				const newTableau = [...current.tableau];
				const newCol = {...col};
				newCol.faceUp = newCol.faceUp.slice(0, -1);
				if (newCol.faceUp.length === 0 && newCol.faceDown.length > 0) {
					const flipped = newCol.faceDown[newCol.faceDown.length - 1]!;
					newCol.faceDown = newCol.faceDown.slice(0, -1);
					newCol.faceUp = [{...flipped, faceUp: true}];
				}

				newTableau[i] = newCol;
				current = {
					...current,
					tableau: newTableau,
					foundations: {
						...current.foundations,
						[card.suit]: [...pile, {...card, faceUp: true}],
					},
					moves: current.moves + 1,
				};
				moved = true;
				totalMoved++;
				break;
			}
		}
	}

	current.gameWon = checkWin(current);
	current.statusMessage =
		totalMoved > 0
			? `Auto-completed ${String(totalMoved)} cards`
			: 'No cards to auto-complete';
	return current;
}

// --- Context hint generator ---

export function getContextHint(state: SolitaireState): string {
	const {cursor, selected} = state;

	if (selected) {
		const sel = getSelectedCards(state);
		if (sel) {
			const label = cardLabel(sel.cards[0]!);
			const count = sel.cards.length;
			return count > 1
				? `Holding ${String(count)} cards from ${label} — arrow to target, Enter to place, Esc to cancel`
				: `Holding ${label} — arrow to target, Enter to place, Esc to cancel`;
		}

		return 'Press Esc to cancel selection';
	}

	if (cursor.zone === 'stock') {
		return state.stock.length > 0
			? `Stock (${String(state.stock.length)} cards) — Enter to draw`
			: state.waste.length > 0
				? 'Stock empty — Enter to recycle waste'
				: 'Stock and waste empty';
	}

	if (cursor.zone === 'waste') {
		if (state.waste.length > 0) {
			const card = state.waste[state.waste.length - 1]!;
			return `Waste: ${cardLabel(card)} — Enter to pick up, f to send to foundation`;
		}

		return 'Waste is empty';
	}

	if (cursor.zone === 'foundation') {
		const suit = FOUNDATION_SUITS[cursor.col]!;
		const pile = state.foundations[suit];
		const suitSymbol =
			suit === 'hearts'
				? '♥'
				: suit === 'diamonds'
					? '♦'
					: suit === 'clubs'
						? '♣'
						: '♠';
		return pile.length > 0
			? `${suitSymbol} Foundation (${String(pile.length)}/13) — top: ${cardLabel(pile[pile.length - 1]!)}`
			: `${suitSymbol} Foundation — empty, needs A${suitSymbol}`;
	}

	if (cursor.zone === 'tableau') {
		const tabCol = state.tableau[cursor.col];
		if (!tabCol) return '';
		if (tabCol.faceUp.length === 0 && tabCol.faceDown.length === 0) {
			return 'Empty column — only Kings can go here';
		}

		if (tabCol.faceUp.length === 0) {
			return `Column ${String(cursor.col + 1)}: ${String(tabCol.faceDown.length)} face-down`;
		}

		const card = tabCol.faceUp[cursor.row];
		if (card) {
			return `${cardLabel(card)} — Enter to select, f to send to foundation`;
		}
	}

	return '';
}

// --- Hook ---

export function useSolitaire() {
	const [state, dispatch] = React.useReducer(
		solitaireReducer,
		null,
		createInitialState,
	);

	const actions = React.useMemo(
		() => ({
			drawStock: () => dispatch({type: 'DRAW_STOCK' as const}),
			move: (direction: 'left' | 'right' | 'up' | 'down') =>
				dispatch({type: 'MOVE_CURSOR' as const, direction}),
			select: () => dispatch({type: 'SELECT' as const}),
			autoComplete: () => dispatch({type: 'AUTO_COMPLETE' as const}),
			autoFoundation: () => dispatch({type: 'AUTO_FOUNDATION' as const}),
			undo: () => dispatch({type: 'UNDO' as const}),
			newGame: () => dispatch({type: 'NEW_GAME' as const}),
		}),
		[],
	);

	return {state, ...actions};
}
