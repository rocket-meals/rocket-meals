import { File, Paths } from 'expo-file-system';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Represents a player in the Cathedral game */
export type Player = 'light' | 'dark';

/** A building piece in the Cathedral game */
export type BuildingPiece = {
	id: string;
	name: string;
	/** The shape of the building as an array of [row, col] offsets from origin */
	shape: [number, number][];
	/** Number of squares this building occupies */
	size: number;
	player: Player;
};

/** Represents a placed building on the board */
export type PlacedBuilding = {
	pieceId: string;
	player: Player | 'cathedral';
	/** Top-left position on the board [row, col] */
	position: [number, number];
	/** Current rotation (0, 90, 180, 270) */
	rotation: number;
	/** The actual squares occupied on the board [row, col][] */
	squares: [number, number][];
};

/** Cell state on the 10x10 board */
export type CellState = {
	occupiedBy: string | null; // pieceId or 'cathedral' or null
	claimedBy: Player | null; // territory claimed by a player
};

/** Full game state */
export type GameState = {
	board: CellState[][];
	placedBuildings: PlacedBuilding[];
	lightRemainingPieces: string[]; // piece IDs
	darkRemainingPieces: string[]; // piece IDs
	cathedralPlaced: boolean;
	currentPlayer: Player;
	gameOver: boolean;
	winner: Player | 'draw' | null;
	lightScore: number;
	darkScore: number;
	moveCount: number;
};

// ─── Building definitions ─────────────────────────────────────────────────────

export const LIGHT_BUILDINGS: BuildingPiece[] = [
	{ id: 'l-tavern-1', name: 'Tavern', shape: [[0, 0]], size: 1, player: 'light' },
	{ id: 'l-tavern-2', name: 'Tavern', shape: [[0, 0]], size: 1, player: 'light' },
	{ id: 'l-stable-1', name: 'Stable', shape: [[0, 0], [0, 1]], size: 2, player: 'light' },
	{ id: 'l-stable-2', name: 'Stable', shape: [[0, 0], [0, 1]], size: 2, player: 'light' },
	{ id: 'l-inn-1', name: 'Inn', shape: [[0, 0], [0, 1], [1, 0]], size: 3, player: 'light' },
	{ id: 'l-inn-2', name: 'Inn', shape: [[0, 0], [0, 1], [1, 0]], size: 3, player: 'light' },
	{ id: 'l-bridge', name: 'Bridge', shape: [[0, 0], [1, 0], [2, 0]], size: 3, player: 'light' },
	{ id: 'l-manor', name: 'Manor', shape: [[0, 0], [0, 1], [1, 0], [1, 1]], size: 4, player: 'light' },
	{ id: 'l-square', name: 'Square', shape: [[0, 0], [0, 1], [1, 0], [1, 1]], size: 4, player: 'light' },
	{ id: 'l-abbey', name: 'Abbey', shape: [[0, 0], [0, 1], [0, 2], [1, 0]], size: 4, player: 'light' },
	{ id: 'l-academy', name: 'Academy', shape: [[0, 0], [0, 1], [0, 2], [1, 1]], size: 4, player: 'light' },
	{ id: 'l-infirmary', name: 'Infirmary', shape: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2]], size: 5, player: 'light' },
	{ id: 'l-castle', name: 'Castle', shape: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1]], size: 5, player: 'light' },
	{ id: 'l-tower', name: 'Tower', shape: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], size: 5, player: 'light' },
];

export const DARK_BUILDINGS: BuildingPiece[] = [
	{ id: 'd-tavern-1', name: 'Tavern', shape: [[0, 0]], size: 1, player: 'dark' },
	{ id: 'd-tavern-2', name: 'Tavern', shape: [[0, 0]], size: 1, player: 'dark' },
	{ id: 'd-stable-1', name: 'Stable', shape: [[0, 0], [0, 1]], size: 2, player: 'dark' },
	{ id: 'd-stable-2', name: 'Stable', shape: [[0, 0], [0, 1]], size: 2, player: 'dark' },
	{ id: 'd-inn-1', name: 'Inn', shape: [[0, 0], [0, 1], [1, 0]], size: 3, player: 'dark' },
	{ id: 'd-inn-2', name: 'Inn', shape: [[0, 0], [0, 1], [1, 0]], size: 3, player: 'dark' },
	{ id: 'd-bridge', name: 'Bridge', shape: [[0, 0], [1, 0], [2, 0]], size: 3, player: 'dark' },
	{ id: 'd-manor', name: 'Manor', shape: [[0, 0], [0, 1], [1, 0], [1, 1]], size: 4, player: 'dark' },
	{ id: 'd-square', name: 'Square', shape: [[0, 0], [0, 1], [1, 0], [1, 1]], size: 4, player: 'dark' },
	{ id: 'd-abbey', name: 'Abbey', shape: [[0, 0], [0, 1], [0, 2], [1, 0]], size: 4, player: 'dark' },
	{ id: 'd-academy', name: 'Academy', shape: [[0, 0], [0, 1], [0, 2], [1, 1]], size: 4, player: 'dark' },
	{ id: 'd-infirmary', name: 'Infirmary', shape: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2]], size: 5, player: 'dark' },
	{ id: 'd-castle', name: 'Castle', shape: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1]], size: 5, player: 'dark' },
	{ id: 'd-tower', name: 'Tower', shape: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], size: 5, player: 'dark' },
];

export const CATHEDRAL_PIECE: BuildingPiece = {
	id: 'cathedral',
	name: 'Cathedral',
	shape: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
	size: 5,
	player: 'light', // placed by the light player at start
};

// ─── Board helpers ────────────────────────────────────────────────────────────

export const BOARD_SIZE = 10;

export function createEmptyBoard(): CellState[][] {
	const board: CellState[][] = [];
	for (let r = 0; r < BOARD_SIZE; r++) {
		const row: CellState[] = [];
		for (let c = 0; c < BOARD_SIZE; c++) {
			row.push({ occupiedBy: null, claimedBy: null });
		}
		board.push(row);
	}
	return board;
}

export function createInitialGameState(): GameState {
	return {
		board: createEmptyBoard(),
		placedBuildings: [],
		lightRemainingPieces: LIGHT_BUILDINGS.map((b) => b.id),
		darkRemainingPieces: DARK_BUILDINGS.map((b) => b.id),
		cathedralPlaced: false,
		currentPlayer: 'light',
		gameOver: false,
		winner: null,
		lightScore: 0,
		darkScore: 0,
		moveCount: 0,
	};
}

// ─── Rotation helper ──────────────────────────────────────────────────────────

export function rotateShape(shape: [number, number][], rotation: number): [number, number][] {
	const times = ((rotation % 360) + 360) % 360 / 90;
	let result = shape.map((s) => [...s] as [number, number]);
	for (let i = 0; i < times; i++) {
		result = result.map(([r, c]) => [c, -r] as [number, number]);
	}
	// Normalize to non-negative coordinates
	const minR = Math.min(...result.map(([r]) => r));
	const minC = Math.min(...result.map(([, c]) => c));
	return result.map(([r, c]) => [r - minR, c - minC] as [number, number]);
}

// ─── File access ──────────────────────────────────────────────────────────────

function getGameFile(): File {
	return new File(Paths.document, 'cathedral-game.json');
}

/**
 * Persist game state to disk.
 */
export function saveGameState(state: GameState): void {
	try {
		getGameFile().write(JSON.stringify(state));
	} catch (err) {
		console.warn('[GameStorage] Failed to save game state:', err);
	}
}

/**
 * Load persisted game state from disk.
 */
export async function loadGameState(): Promise<GameState> {
	try {
		const file = getGameFile();
		if (!file.exists) return createInitialGameState();
		const content = await file.text();
		const parsed = JSON.parse(content) as GameState;
		if (parsed.board && Array.isArray(parsed.placedBuildings)) {
			return parsed;
		}
		return createInitialGameState();
	} catch {
		return createInitialGameState();
	}
}
