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

export type SolitaireState = {
	stock: TCard[];
	waste: TCard[];
	foundations: Record<Suit, TCard[]>;
	tableau: TableauColumn[];
	cursor: CursorPosition;
	selected: SelectedCard | null;
	moves: number;
	gameWon: boolean;
};

export type CursorPosition = {
	zone: 'stock' | 'waste' | 'foundation' | 'tableau';
	col: number; // tableau column (0-6), foundation index (0-3), 0 for stock/waste
	row: number; // card index within tableau faceUp (only for tableau)
};

export type SelectedCard = {
	zone: 'waste' | 'foundation' | 'tableau';
	col: number;
	row: number; // index in faceUp for tableau; 0 for waste/foundation
};

export type SolitaireAction =
	| {type: 'DRAW_STOCK'}
	| {type: 'MOVE_CURSOR'; direction: 'left' | 'right' | 'up' | 'down'}
	| {type: 'SELECT'}
	| {type: 'AUTO_COMPLETE'}
	| {type: 'NEW_GAME'};

// --- Helpers ---

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const FOUNDATION_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

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

function valueIndex(v: string): number {
	return VALUE_ORDER.indexOf(v as Value);
}

function isRed(suit: string): boolean {
	return suit === 'hearts' || suit === 'diamonds';
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
			return drawFromStock(state);

		case 'MOVE_CURSOR':
			return moveCursor(state, action.direction);

		case 'SELECT':
			return handleSelect(state);

		case 'AUTO_COMPLETE':
			return autoComplete(state);

		default:
			return state;
	}
}

function drawFromStock(state: SolitaireState): SolitaireState {
	if (state.stock.length === 0) {
		// Recycle waste back to stock
		return {
			...state,
			stock: [...state.waste].reverse().map((c) => ({...c, faceUp: false})),
			waste: [],
		};
	}

	const newStock = [...state.stock];
	const card = newStock.pop();
	if (!card) return state;

	return {
		...state,
		stock: newStock,
		waste: [...state.waste, {...card, faceUp: true}],
	};
}

function moveCursor(
	state: SolitaireState,
	direction: 'left' | 'right' | 'up' | 'down',
): SolitaireState {
	const {cursor} = state;
	let {zone, col, row} = cursor;

	// Zone layout (top row): stock | waste | [gap] | f0 | f1 | f2 | f3
	// Bottom row: t0 | t1 | t2 | t3 | t4 | t5 | t6

	if (direction === 'up') {
		if (zone === 'tableau') {
			if (row > 0) {
				row--;
			} else {
				// Move to top row
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
		if (zone === 'stock') {
			// Already leftmost
		} else if (zone === 'waste') {
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

	return {...state, cursor: {zone, col, row}};
}

function handleSelect(state: SolitaireState): SolitaireState {
	const {cursor, selected} = state;

	// Stock: draw a card
	if (cursor.zone === 'stock') {
		return drawFromStock({...state, selected: null});
	}

	// Nothing selected yet — pick up a card
	if (!selected) {
		return selectCard(state);
	}

	// Something selected — try to place it
	return placeCard(state);
}

function selectCard(state: SolitaireState): SolitaireState {
	const {cursor} = state;

	if (cursor.zone === 'waste' && state.waste.length > 0) {
		return {...state, selected: {zone: 'waste', col: 0, row: 0}};
	}

	if (cursor.zone === 'foundation') {
		const suit = FOUNDATION_SUITS[cursor.col]!;
		if (state.foundations[suit].length > 0) {
			return {
				...state,
				selected: {zone: 'foundation', col: cursor.col, row: 0},
			};
		}
	}

	if (cursor.zone === 'tableau') {
		const tabCol = state.tableau[cursor.col];
		if (tabCol && tabCol.faceUp.length > 0 && cursor.row < tabCol.faceUp.length) {
			return {
				...state,
				selected: {zone: 'tableau', col: cursor.col, row: cursor.row},
			};
		}
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
	if (!sel) return {...state, selected: null};

	const {cards, source} = sel;
	const firstCard = cards[0]!;

	// Deselect if clicking same spot
	if (source.zone === cursor.zone && source.col === cursor.col) {
		return {...state, selected: null};
	}

	// Try placing on foundation
	if (cursor.zone === 'foundation' && cards.length === 1) {
		const suit = FOUNDATION_SUITS[cursor.col]!;
		const pile = state.foundations[suit];
		if (canStackOnFoundation(firstCard, pile, suit)) {
			const newState = removeFromSource(state, source, 1);
			return {
				...newState,
				foundations: {
					...newState.foundations,
					[suit]: [...pile, {...firstCard, faceUp: true}],
				},
				selected: null,
				moves: newState.moves + 1,
				gameWon: checkWin({
					...newState,
					foundations: {
						...newState.foundations,
						[suit]: [...pile, firstCard],
					},
				}),
			};
		}
	}

	// Try placing on tableau
	if (cursor.zone === 'tableau') {
		const targetCol = state.tableau[cursor.col];
		if (!targetCol) return {...state, selected: null};

		const canPlace =
			targetCol.faceUp.length === 0 && targetCol.faceDown.length === 0
				? isStandardCard(firstCard) && firstCard.value === 'K' // Empty column: only Kings
				: targetCol.faceUp.length > 0 &&
					canStackOnTableau(
						firstCard,
						targetCol.faceUp[targetCol.faceUp.length - 1]!,
					);

		if (canPlace) {
			const newState = removeFromSource(state, source, cards.length);
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
			};
		}
	}

	// Invalid move — deselect
	return {...state, selected: null};
}

function removeFromSource(
	state: SolitaireState,
	source: SelectedCard,
	_count: number,
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

		// Flip top face-down card if no face-up cards remain
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

function checkWin(state: SolitaireState): boolean {
	return SUITS.every((s) => state.foundations[s].length === 13);
}

function autoComplete(state: SolitaireState): SolitaireState {
	// Only auto-complete when all tableau cards are face-up
	const allFaceUp = state.tableau.every((col) => col.faceDown.length === 0);
	if (!allFaceUp || state.stock.length > 0) return state;

	let current = {...state, selected: null};
	let moved = true;

	while (moved) {
		moved = false;

		// Try waste
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
				}
			}
		}

		// Try each tableau column
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
				break; // Restart loop
			}
		}
	}

	current.gameWon = checkWin(current);
	return current;
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
			newGame: () => dispatch({type: 'NEW_GAME' as const}),
		}),
		[],
	);

	return {state, ...actions};
}
