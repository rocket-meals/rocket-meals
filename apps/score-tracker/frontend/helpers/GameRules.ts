import type { ScoringMode } from './GameTypesStorage';

// ─── Types ────────────────────────────────────────────────────────────────────
//
// A generic, JSON-only rule system for games whose score entry needs more than
// a plain number - e.g. "tap the cards you had this round". `scoreFormula` is
// a small whitelisted expression tree (not executable code) evaluated against
// the selected cards, so an imported/shared game preset can never run
// arbitrary logic - only the operations defined in `evaluateRuleExpr` below.

export type CardCategory = 'number' | 'modifier' | 'multiplier' | 'action';

export const CARD_CATEGORIES: CardCategory[] = ['number', 'modifier', 'multiplier', 'action'];

export type CardItem = {
	id: string;
	label: string;
	category: CardCategory;
	/** Face value used by `sumValues`/scoring. Irrelevant for plain action cards. */
	value?: number;
};

export type RuleExpr =
	| { op: 'const'; value: number }
	| { op: 'sumValues'; category?: CardCategory }
	| { op: 'countItems'; category?: CardCategory }
	| { op: 'hasItem'; itemId: string }
	| { op: 'add'; args: RuleExpr[] }
	| { op: 'multiply'; args: RuleExpr[] }
	| { op: 'if'; cond: RuleExpr; then: RuleExpr; else: RuleExpr }
	| { op: 'gte'; a: RuleExpr; b: RuleExpr };

export type ScoreEntryRules = {
	/** The palette of selectable cards shown when entering a score. Tapping a
	 *  card always just toggles it on/off - a plain multi-select. Tapping an
	 *  already-selected card again (e.g. a mis-tapped duplicate number) simply
	 *  deselects it; there is no separate bust concept in the UI. */
	items: CardItem[];
	/** Computes the round score from the selected cards. */
	scoreFormula: RuleExpr;
	/**
	 * Reaching this many selected 'number' cards activates a bonus indicator
	 * (the score formula is expected to add `bonusPoints` itself once this
	 * many are selected - these two fields only drive the display, the
	 * formula's own result always stays authoritative for the actual score).
	 */
	bonusAtNumberCount?: number;
	/** Point value shown next to the bonus indicator/breakdown once `bonusAtNumberCount` is reached. */
	bonusPoints?: number;
};

export type GameRules = {
	version: 1;
	/** Custom score-entry rules (e.g. a card picker instead of a plain number). Absent = plain numeric entry. */
	scoreEntry?: ScoreEntryRules;
	/** Custom starting-player rule, only read when `GameType.startingPlayerMode === 'custom'`. */
	playerOrder?: PlayerOrderRule | null;
};

/** A shareable game template: everything needed to create a new game type. */
export type GamePreset = {
	name: string;
	icon: string;
	scoringMode: ScoringMode;
	maxRounds?: number | null;
	maxScore?: number | null;
	rules?: GameRules | null;
	/** How the starting player rotates each round. undefined/absent defaults to 'fixed'. */
	startingPlayerMode?: StartingPlayerMode;
	/**
	 * Content version of this game definition (distinct from `rules.version`,
	 * the fixed rule-schema version). Bump this yourself when sharing an
	 * updated JSON so recipients re-importing it can tell it changed.
	 * Undefined/absent defaults to 1.
	 */
	version?: number;
};

// ─── Evaluation ───────────────────────────────────────────────────────────────

export type RuleEvalContext = {
	selectedItems: CardItem[];
};

export function evaluateRuleExpr(expr: RuleExpr, ctx: RuleEvalContext): number {
	switch (expr.op) {
		case 'const':
			return expr.value;
		case 'sumValues': {
			const items = expr.category ? ctx.selectedItems.filter((item) => item.category === expr.category) : ctx.selectedItems;
			return items.reduce((sum, item) => sum + (item.value ?? 0), 0);
		}
		case 'countItems': {
			const items = expr.category ? ctx.selectedItems.filter((item) => item.category === expr.category) : ctx.selectedItems;
			return items.length;
		}
		case 'hasItem':
			return ctx.selectedItems.some((item) => item.id === expr.itemId) ? 1 : 0;
		case 'add':
			return expr.args.reduce((sum, arg) => sum + evaluateRuleExpr(arg, ctx), 0);
		case 'multiply':
			return expr.args.reduce((product, arg) => product * evaluateRuleExpr(arg, ctx), 1);
		case 'if':
			return evaluateRuleExpr(expr.cond, ctx) !== 0 ? evaluateRuleExpr(expr.then, ctx) : evaluateRuleExpr(expr.else, ctx);
		case 'gte':
			return evaluateRuleExpr(expr.a, ctx) >= evaluateRuleExpr(expr.b, ctx) ? 1 : 0;
	}
}

// ─── Player order (starting-player rotation) ───────────────────────────────────
//
// Three built-in modes cover the common cases (seating order never changes,
// last round's best score starts next, simple round-robin). `custom` hands
// the decision to a small whitelisted expression tree evaluated against the
// previous round's per-seat scores and a carried-over numeric state - same
// "JSON only, no executable code" approach as `scoreFormula` above - for
// games with unusual dealer rules.
//
// "Seat"/index always refers to a position in the current, table-ordered
// player list (the same order shown/edited in the setup screen), not a
// player id - reordering players is a separate, purely manual action.

export type StartingPlayerMode = 'fixed' | 'previousWinner' | 'rotate' | 'custom';

export const STARTING_PLAYER_MODES: StartingPlayerMode[] = ['fixed', 'previousWinner', 'rotate', 'custom'];

export type PlayerOrderRuleExpr =
	| { op: 'const'; value: number }
	| { op: 'playerCount' }
	| { op: 'previousStartIndex' }
	| { op: 'state' }
	| { op: 'roundWinnerIndex' }
	| { op: 'add'; args: PlayerOrderRuleExpr[] }
	| { op: 'mod'; a: PlayerOrderRuleExpr; b: PlayerOrderRuleExpr }
	| { op: 'if'; cond: PlayerOrderRuleExpr; then: PlayerOrderRuleExpr; else: PlayerOrderRuleExpr }
	| { op: 'gte'; a: PlayerOrderRuleExpr; b: PlayerOrderRuleExpr };

/**
 * A dynamic "who starts the next round" rule, evaluated once after each
 * round. `startIndex` picks the next starting seat; `nextState` becomes
 * `state` for the following round's evaluation (e.g. a dealer counter).
 */
export type PlayerOrderRule = {
	version: 1;
	startIndex: PlayerOrderRuleExpr;
	nextState: PlayerOrderRuleExpr;
	initialState: number;
};

export type PlayerOrderEvalContext = {
	/** Number of seats (players in table order). */
	playerCount: number;
	/** Seat index of whoever started the round just finished, or -1 if unknown (before round 1, or that seat no longer exists). */
	previousStartIndex: number;
	/** That round's own per-seat score (table order), null where not entered. */
	previousRoundScores: (number | null)[];
	scoringMode: ScoringMode;
	/** Carried-over numeric state from the previous evaluation (see `PlayerOrderRule.initialState`). */
	state: number;
};

function roundWinnerIndex(scores: (number | null)[], scoringMode: ScoringMode, fallback: number): number {
	let bestIndex = -1;
	let bestScore = scoringMode === 'lowWins' ? Infinity : -Infinity;
	for (let i = 0; i < scores.length; i++) {
		const score = scores[i];
		if (score == null) continue;
		const isBetter = scoringMode === 'lowWins' ? score < bestScore : score > bestScore;
		if (isBetter) {
			bestScore = score;
			bestIndex = i;
		}
	}
	return bestIndex >= 0 ? bestIndex : fallback;
}

export function evaluatePlayerOrderExpr(expr: PlayerOrderRuleExpr, ctx: PlayerOrderEvalContext): number {
	switch (expr.op) {
		case 'const':
			return expr.value;
		case 'playerCount':
			return ctx.playerCount;
		case 'previousStartIndex':
			return ctx.previousStartIndex;
		case 'state':
			return ctx.state;
		case 'roundWinnerIndex':
			return roundWinnerIndex(ctx.previousRoundScores, ctx.scoringMode, Math.max(0, ctx.previousStartIndex));
		case 'add':
			return expr.args.reduce((sum, arg) => sum + evaluatePlayerOrderExpr(arg, ctx), 0);
		case 'mod': {
			const b = evaluatePlayerOrderExpr(expr.b, ctx);
			if (b === 0) return 0;
			const a = evaluatePlayerOrderExpr(expr.a, ctx);
			return ((a % b) + b) % b;
		}
		case 'if':
			return evaluatePlayerOrderExpr(expr.cond, ctx) !== 0
				? evaluatePlayerOrderExpr(expr.then, ctx)
				: evaluatePlayerOrderExpr(expr.else, ctx);
		case 'gte':
			return evaluatePlayerOrderExpr(expr.a, ctx) >= evaluatePlayerOrderExpr(expr.b, ctx) ? 1 : 0;
	}
}

/** Built-in "rotate" behavior expressed as a `PlayerOrderRule`, seeded when a game type first switches to `custom`. */
export const ROTATE_PLAYER_ORDER_RULE: PlayerOrderRule = {
	version: 1,
	startIndex: {
		op: 'mod',
		a: { op: 'add', args: [{ op: 'previousStartIndex' }, { op: 'const', value: 1 }] },
		b: { op: 'playerCount' },
	},
	nextState: { op: 'const', value: 0 },
	initialState: 0,
};

/**
 * Compute which seat (index into the current, table-ordered player list)
 * starts the next round, plus the numeric state to carry into the following
 * evaluation. `previousStartIndex`/`previousRoundScores` describe the round
 * just finished; pass `previousStartIndex: -1` before round 1 has been played.
 */
export function computeNextStartingPlayerIndex(params: {
	mode: StartingPlayerMode;
	customRule?: PlayerOrderRule | null;
	playerCount: number;
	previousStartIndex: number;
	previousRoundScores: (number | null)[];
	scoringMode: ScoringMode;
	state: number;
}): { startIndex: number; nextState: number } {
	const { mode, customRule, playerCount, previousStartIndex, previousRoundScores, scoringMode, state } = params;
	if (playerCount <= 0) return { startIndex: 0, nextState: state };

	switch (mode) {
		case 'fixed':
			return { startIndex: 0, nextState: state };
		case 'rotate': {
			const prev = Math.max(0, previousStartIndex);
			return { startIndex: (prev + 1) % playerCount, nextState: state };
		}
		case 'previousWinner':
			return {
				startIndex: roundWinnerIndex(previousRoundScores, scoringMode, Math.max(0, previousStartIndex)),
				nextState: state,
			};
		case 'custom': {
			if (!customRule) return { startIndex: 0, nextState: state };
			const ctx: PlayerOrderEvalContext = { playerCount, previousStartIndex, previousRoundScores, scoringMode, state };
			const rawIndex = Math.trunc(evaluatePlayerOrderExpr(customRule.startIndex, ctx));
			const nextState = evaluatePlayerOrderExpr(customRule.nextState, ctx);
			const startIndex = ((rawIndex % playerCount) + playerCount) % playerCount;
			return { startIndex, nextState };
		}
	}
}

// ─── Validation (for import) ───────────────────────────────────────────────────

function isRuleExpr(value: unknown): value is RuleExpr {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	switch (v.op) {
		case 'const':
			return typeof v.value === 'number';
		case 'sumValues':
		case 'countItems':
			return v.category === undefined || (typeof v.category === 'string' && CARD_CATEGORIES.includes(v.category as CardCategory));
		case 'hasItem':
			return typeof v.itemId === 'string';
		case 'add':
		case 'multiply':
			return Array.isArray(v.args) && v.args.length > 0 && v.args.every(isRuleExpr);
		case 'if':
			return isRuleExpr(v.cond) && isRuleExpr(v.then) && isRuleExpr(v.else);
		case 'gte':
			return isRuleExpr(v.a) && isRuleExpr(v.b);
		default:
			return false;
	}
}

function isCardItem(value: unknown): value is CardItem {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	if (typeof v.id !== 'string' || v.id === '' || typeof v.label !== 'string') return false;
	if (typeof v.category !== 'string' || !CARD_CATEGORIES.includes(v.category as CardCategory)) return false;
	if (v.value !== undefined && typeof v.value !== 'number') return false;
	return true;
}

function isScoreEntryRules(value: unknown): value is ScoreEntryRules {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	if (!Array.isArray(v.items) || v.items.length === 0 || !v.items.every(isCardItem)) return false;
	const ids = new Set((v.items as CardItem[]).map((item) => item.id));
	if (ids.size !== v.items.length) return false;
	if (!isRuleExpr(v.scoreFormula)) return false;
	if (v.bonusAtNumberCount !== undefined && typeof v.bonusAtNumberCount !== 'number') return false;
	if (v.bonusPoints !== undefined && typeof v.bonusPoints !== 'number') return false;
	return true;
}

function isPlayerOrderRuleExpr(value: unknown): value is PlayerOrderRuleExpr {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	switch (v.op) {
		case 'const':
			return typeof v.value === 'number';
		case 'playerCount':
		case 'previousStartIndex':
		case 'state':
		case 'roundWinnerIndex':
			return true;
		case 'add':
			return Array.isArray(v.args) && v.args.length > 0 && v.args.every(isPlayerOrderRuleExpr);
		case 'mod':
			return isPlayerOrderRuleExpr(v.a) && isPlayerOrderRuleExpr(v.b);
		case 'if':
			return isPlayerOrderRuleExpr(v.cond) && isPlayerOrderRuleExpr(v.then) && isPlayerOrderRuleExpr(v.else);
		case 'gte':
			return isPlayerOrderRuleExpr(v.a) && isPlayerOrderRuleExpr(v.b);
		default:
			return false;
	}
}

function isPlayerOrderRule(value: unknown): value is PlayerOrderRule {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	if (v.version !== 1) return false;
	if (!isPlayerOrderRuleExpr(v.startIndex)) return false;
	if (!isPlayerOrderRuleExpr(v.nextState)) return false;
	if (typeof v.initialState !== 'number') return false;
	return true;
}

/** Validate an imported player-order rule. Returns it typed, or `null` if malformed. */
export function validatePlayerOrderRule(value: unknown): PlayerOrderRule | null {
	return isPlayerOrderRule(value) ? (value as PlayerOrderRule) : null;
}

/** Validate an imported rules object. Returns it typed, or `null` if malformed. */
export function validateGameRules(value: unknown): GameRules | null {
	if (typeof value !== 'object' || value === null) return null;
	const v = value as Record<string, unknown>;
	if (v.version !== 1) return null;

	let scoreEntry: ScoreEntryRules | undefined;
	if (v.scoreEntry !== undefined && v.scoreEntry !== null) {
		if (!isScoreEntryRules(v.scoreEntry)) return null;
		scoreEntry = v.scoreEntry as ScoreEntryRules;
	}

	let playerOrder: PlayerOrderRule | null | undefined;
	if (v.playerOrder !== undefined && v.playerOrder !== null) {
		playerOrder = validatePlayerOrderRule(v.playerOrder);
		if (!playerOrder) return null;
	}

	return { version: 1, scoreEntry, playerOrder };
}

/**
 * Parse a shareable game-template JSON string (as produced by "Spiel
 * exportieren") for import. Returns the parsed preset, or `null` if the text
 * isn't a valid one.
 */
export function parseGamePreset(text: string): GamePreset | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return null;
	}
	if (typeof parsed !== 'object' || parsed === null) return null;
	const v = parsed as Record<string, unknown>;
	if (typeof v.name !== 'string' || v.name.trim() === '') return null;
	if (typeof v.icon !== 'string' || v.icon === '') return null;
	if (v.scoringMode !== 'highWins' && v.scoringMode !== 'lowWins') return null;
	if (v.maxRounds !== undefined && v.maxRounds !== null && typeof v.maxRounds !== 'number') return null;
	if (v.maxScore !== undefined && v.maxScore !== null && typeof v.maxScore !== 'number') return null;
	if (v.version !== undefined && typeof v.version !== 'number') return null;
	if (v.startingPlayerMode !== undefined && !STARTING_PLAYER_MODES.includes(v.startingPlayerMode as StartingPlayerMode)) return null;

	let rules: GameRules | null = null;
	if (v.rules !== undefined && v.rules !== null) {
		rules = validateGameRules(v.rules);
		if (!rules) return null;
	}

	return {
		name: v.name,
		icon: v.icon,
		scoringMode: v.scoringMode,
		maxRounds: (v.maxRounds as number | null | undefined) ?? null,
		maxScore: (v.maxScore as number | null | undefined) ?? null,
		rules,
		startingPlayerMode: (v.startingPlayerMode as StartingPlayerMode | undefined) ?? 'fixed',
		version: (v.version as number | undefined) ?? 1,
	};
}

// ─── Built-in Flip Seven preset ────────────────────────────────────────────────
//
// Official rules: number cards 0-12 scored at face value, +2/+4/+6/+8/+10 flat
// modifiers, a single x2 multiplier applied to the number-card sum only, and
// collecting 7 unique number cards ends the round instantly with a +15
// bonus. First to 200 total points wins.
//
// This app only records the outcome of a round played at the table, not a
// live turn-by-turn simulation: there's no Freeze/Flip Three/Second Chance
// automation (those only affect who draws next during live play, not the
// final score), and no separate "bust" concept - tapping a card is always a
// plain select/deselect, so a mis-tapped duplicate number just deselects.

function numberCard(n: number): CardItem {
	return { id: `n${n}`, label: String(n), category: 'number', value: n };
}

const FLIP_SEVEN_ITEMS: CardItem[] = [
	...Array.from({ length: 13 }, (_, n) => numberCard(n)),
	{ id: 'mod2', label: '+2', category: 'modifier', value: 2 },
	{ id: 'mod4', label: '+4', category: 'modifier', value: 4 },
	{ id: 'mod6', label: '+6', category: 'modifier', value: 6 },
	{ id: 'mod8', label: '+8', category: 'modifier', value: 8 },
	{ id: 'mod10', label: '+10', category: 'modifier', value: 10 },
	{ id: 'x2', label: 'x2', category: 'multiplier', value: 2 },
];

// Note on `then`: it is a persisted schema key of RuleExpr (stored game types
// and shareable preset JSON rely on it) and never holds a function, so these
// objects are not actually thenable - renaming it would break existing data.
const FLIP_SEVEN_SCORE_FORMULA: RuleExpr = {
	op: 'add',
	args: [
		{
			op: 'multiply',
			args: [
				{ op: 'sumValues', category: 'number' },
				{ op: 'if', cond: { op: 'hasItem', itemId: 'x2' }, then: { op: 'const', value: 2 }, else: { op: 'const', value: 1 } }, // NOSONAR - data schema key, not a thenable
			],
		},
		{ op: 'sumValues', category: 'modifier' },
		{
			op: 'if',
			cond: { op: 'gte', a: { op: 'countItems', category: 'number' }, b: { op: 'const', value: 7 } },
			then: { op: 'const', value: 15 }, // NOSONAR - data schema key, not a thenable
			else: { op: 'const', value: 0 },
		},
	],
};

export const FLIP_SEVEN_PRESET: GamePreset = {
	name: 'Flip Seven',
	icon: '🃏',
	scoringMode: 'highWins',
	maxRounds: null,
	maxScore: 200,
	version: 1,
	rules: {
		version: 1,
		scoreEntry: {
			items: FLIP_SEVEN_ITEMS,
			scoreFormula: FLIP_SEVEN_SCORE_FORMULA,
			bonusAtNumberCount: 7,
			bonusPoints: 15,
		},
	},
};
