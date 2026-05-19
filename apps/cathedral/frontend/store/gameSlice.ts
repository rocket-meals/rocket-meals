import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
	GameState,
	Player,
	PlacedBuilding,
	CellState,
	BOARD_SIZE,
	LIGHT_BUILDINGS,
	DARK_BUILDINGS,
	CATHEDRAL_PIECE,
	createInitialGameState,
	rotateShape,
} from '../helpers/GameStorage';
export type { GameState };

// ─── State type ───────────────────────────────────────────────────────────────

export type GameSliceState = GameState;

const initialState: GameSliceState = createInitialGameState();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAllBuildings() {
	return [...LIGHT_BUILDINGS, ...DARK_BUILDINGS, CATHEDRAL_PIECE];
}

function getBuildingById(id: string) {
	return getAllBuildings().find((b) => b.id === id);
}

function getSquaresForPlacement(pieceId: string, position: [number, number], rotation: number): [number, number][] | null {
	const building = getBuildingById(pieceId);
	if (!building) return null;

	const rotatedShape = rotateShape(building.shape, rotation);
	const squares: [number, number][] = rotatedShape.map(([r, c]) => [
		position[0] + r,
		position[1] + c,
	]);

	// Check bounds
	for (const [r, c] of squares) {
		if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return null;
	}

	return squares;
}

function isPlacementValid(state: GameSliceState, pieceId: string, squares: [number, number][]): boolean {
	for (const [r, c] of squares) {
		const cell = state.board[r][c];
		if (cell.occupiedBy !== null) return false;

		// Cannot place in territory claimed by the opponent
		const building = getBuildingById(pieceId);
		if (!building) return false;
		const placingPlayer = pieceId === 'cathedral' ? null : building.player;
		if (cell.claimedBy !== null && cell.claimedBy !== placingPlayer) return false;
	}
	return true;
}

/** Check if a single building is completely surrounded (isolated) */
function isBuildingSurrounded(board: CellState[][], placed: PlacedBuilding, allPlaced: PlacedBuilding[]): boolean {
	// Get all cells adjacent to this building (wall-to-wall, not diagonal)
	const buildingSquareSet = new Set(placed.squares.map(([r, c]) => `${r},${c}`));

	for (const [r, c] of placed.squares) {
		const neighbors: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
		for (const [nr, nc] of neighbors) {
			// Wall counts as surrounding
			if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
			// Part of self
			if (buildingSquareSet.has(`${nr},${nc}`)) continue;
			// Must be occupied by another building to be "surrounded"
			if (board[nr][nc].occupiedBy === null) return false;
		}
	}
	return true;
}

/** Calculate territory claims using flood-fill */
function calculateTerritory(state: GameSliceState): void {
	// Reset all claims
	for (let r = 0; r < BOARD_SIZE; r++) {
		for (let c = 0; c < BOARD_SIZE; c++) {
			state.board[r][c].claimedBy = null;
		}
	}

	// For each empty region, check if it's enclosed by one player's buildings (and walls)
	const visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));

	for (let r = 0; r < BOARD_SIZE; r++) {
		for (let c = 0; c < BOARD_SIZE; c++) {
			if (visited[r][c]) continue;
			if (state.board[r][c].occupiedBy !== null) {
				visited[r][c] = true;
				continue;
			}

			// Flood fill to find connected empty region
			const region: [number, number][] = [];
			const queue: [number, number][] = [[r, c]];
			visited[r][c] = true;
			const boundaryPlayers = new Set<string>();
			let touchesCathedral = false;

			while (queue.length > 0) {
				const [cr, cc] = queue.shift()!;
				region.push([cr, cc]);

				const neighbors: [number, number][] = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];
				for (const [nr, nc] of neighbors) {
					// Wall is neutral boundary (doesn't prevent claim)
					if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;

					if (visited[nr][nc]) {
						// If already visited occupied cell, check who owns it
						if (state.board[nr][nc].occupiedBy !== null) {
							const occupant = state.board[nr][nc].occupiedBy!;
							if (occupant === 'cathedral') {
								touchesCathedral = true;
							} else {
								const placedBuilding = state.placedBuildings.find(
									(pb) => pb.squares.some(([pr, pc]) => pr === nr && pc === nc)
								);
								if (placedBuilding) {
									boundaryPlayers.add(placedBuilding.player === 'cathedral' ? 'cathedral' : placedBuilding.player);
								}
							}
						}
						continue;
					}

					visited[nr][nc] = true;

					if (state.board[nr][nc].occupiedBy !== null) {
						const occupant = state.board[nr][nc].occupiedBy!;
						if (occupant === 'cathedral') {
							touchesCathedral = true;
						} else {
							const placedBuilding = state.placedBuildings.find(
								(pb) => pb.squares.some(([pr, pc]) => pr === nr && pc === nc)
							);
							if (placedBuilding) {
								boundaryPlayers.add(placedBuilding.player === 'cathedral' ? 'cathedral' : placedBuilding.player);
							}
						}
					} else {
						queue.push([nr, nc]);
					}
				}
			}

			// Territory can only be claimed if:
			// 1. Bounded by exactly one player's buildings (and walls)
			// 2. Cathedral is NOT part of the boundary
			// Rule: "You may not use the Cathedral as part of the boundary to enclose the claimed space"
			if (!touchesCathedral && boundaryPlayers.size === 1) {
				const claimingPlayer = [...boundaryPlayers][0] as Player;
				if (claimingPlayer === 'light' || claimingPlayer === 'dark') {
					for (const [rr, rc] of region) {
						state.board[rr][rc].claimedBy = claimingPlayer;
					}
				}
			}
		}
	}
}

function checkGameOver(state: GameSliceState): void {
	// Game is over when neither player can make a move
	const lightCanMove = canPlayerMove(state, 'light');
	const darkCanMove = canPlayerMove(state, 'dark');

	if (!lightCanMove && !darkCanMove) {
		state.gameOver = true;
		// Calculate scores: sum of squares of unplaced buildings
		state.lightScore = state.lightRemainingPieces.reduce((sum, id) => {
			const b = getBuildingById(id);
			return sum + (b ? b.size : 0);
		}, 0);
		state.darkScore = state.darkRemainingPieces.reduce((sum, id) => {
			const b = getBuildingById(id);
			return sum + (b ? b.size : 0);
		}, 0);

		if (state.lightScore < state.darkScore) {
			state.winner = 'light';
		} else if (state.darkScore < state.lightScore) {
			state.winner = 'dark';
		} else {
			state.winner = 'draw';
		}
	} else if (!lightCanMove && state.currentPlayer === 'light') {
		state.currentPlayer = 'dark';
	} else if (!darkCanMove && state.currentPlayer === 'dark') {
		state.currentPlayer = 'light';
	}
}

function canPlayerMove(state: GameSliceState, player: Player): boolean {
	const remainingPieces = player === 'light' ? state.lightRemainingPieces : state.darkRemainingPieces;

	for (const pieceId of remainingPieces) {
		for (let r = 0; r < BOARD_SIZE; r++) {
			for (let c = 0; c < BOARD_SIZE; c++) {
				for (const rotation of [0, 90, 180, 270]) {
					const squares = getSquaresForPlacement(pieceId, [r, c], rotation);
					if (squares && isPlacementValid(state, pieceId, squares)) {
						return true;
					}
				}
			}
		}
	}
	return false;
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const gameSlice = createSlice({
	name: 'game',
	initialState,
	reducers: {
		loadGameState(_state, action: PayloadAction<GameState>) {
			return action.payload;
		},

		/** Place the Cathedral on the board (first move by light player) */
		placeCathedral(state, action: PayloadAction<{ position: [number, number]; rotation: number }>) {
			if (state.cathedralPlaced) return;

			const { position, rotation } = action.payload;
			const squares = getSquaresForPlacement('cathedral', position, rotation);
			if (!squares) return;
			if (!isPlacementValid(state, 'cathedral', squares)) return;

			// Place cathedral
			for (const [r, c] of squares) {
				state.board[r][c].occupiedBy = 'cathedral';
			}
			state.placedBuildings.push({
				pieceId: 'cathedral',
				player: 'cathedral',
				position,
				rotation,
				squares,
			});
			state.cathedralPlaced = true;
			state.currentPlayer = 'dark'; // Dark goes first after cathedral
			state.moveCount++;
		},

		/** Place a building on the board */
		placeBuilding(state, action: PayloadAction<{ pieceId: string; position: [number, number]; rotation: number }>) {
			const { pieceId, position, rotation } = action.payload;
			const building = getBuildingById(pieceId);
			if (!building) return;

			// Validate it's the correct player's turn
			if (!state.cathedralPlaced) return; // Cathedral must be placed first
			if (building.player !== state.currentPlayer) return;

			// Check the piece is still available
			const remainingPieces = state.currentPlayer === 'light' ? state.lightRemainingPieces : state.darkRemainingPieces;
			const pieceIndex = remainingPieces.indexOf(pieceId);
			if (pieceIndex === -1) return;

			const squares = getSquaresForPlacement(pieceId, position, rotation);
			if (!squares) return;
			if (!isPlacementValid(state, pieceId, squares)) return;

			// Place building
			for (const [r, c] of squares) {
				state.board[r][c].occupiedBy = pieceId;
			}
			state.placedBuildings.push({
				pieceId,
				player: building.player,
				position,
				rotation,
				squares,
			});

			// Remove from remaining
			if (state.currentPlayer === 'light') {
				state.lightRemainingPieces.splice(pieceIndex, 1);
			} else {
				state.darkRemainingPieces.splice(pieceIndex, 1);
			}

			state.moveCount++;

			// Check for captures (only single isolated buildings can be captured)
			// Rule 5: cannot capture if more than one opponent building is surrounded together
			const opponentPlayer: Player = state.currentPlayer === 'light' ? 'dark' : 'light';
			const opponentBuildings = state.placedBuildings.filter(
				(pb) => pb.player === opponentPlayer || pb.player === 'cathedral'
			);

			for (const opBuilding of opponentBuildings) {
				if (isBuildingSurrounded(state.board, opBuilding, state.placedBuildings)) {
					// Check Rule 5: if surrounding captures more than one building, none can be removed
					// Only capture if it's a single isolated building
					const adjacentOpponentCount = countAdjacentOpponentBuildings(state, opBuilding, opponentPlayer);
					if (adjacentOpponentCount === 0) {
						// Remove the building
						for (const [r, c] of opBuilding.squares) {
							state.board[r][c].occupiedBy = null;
						}
						state.placedBuildings = state.placedBuildings.filter((pb) => pb !== opBuilding);

						// Return piece to opponent (except cathedral which is removed permanently)
						if (opBuilding.player !== 'cathedral') {
							if (opBuilding.player === 'light') {
								state.lightRemainingPieces.push(opBuilding.pieceId);
							} else {
								state.darkRemainingPieces.push(opBuilding.pieceId);
							}
						} else {
							state.cathedralPlaced = false;
						}
					}
				}
			}

			// Recalculate territory (not on first move per Rule 4)
			if (state.moveCount > 2) {
				calculateTerritory(state);
			}

			// Switch player
			state.currentPlayer = state.currentPlayer === 'light' ? 'dark' : 'light';

			// Check game over
			checkGameOver(state);
		},

		/** Reset to a new game */
		resetGame() {
			return createInitialGameState();
		},
	},
});

/** Count adjacent opponent buildings touching the given building */
function countAdjacentOpponentBuildings(state: GameSliceState, building: PlacedBuilding, opponentPlayer: Player): number {
	const buildingSquareSet = new Set(building.squares.map(([r, c]) => `${r},${c}`));
	const adjacentBuildings = new Set<string>();

	for (const [r, c] of building.squares) {
		const neighbors: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
		for (const [nr, nc] of neighbors) {
			if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
			if (buildingSquareSet.has(`${nr},${nc}`)) continue;
			const cell = state.board[nr][nc];
			if (cell.occupiedBy !== null && cell.occupiedBy !== building.pieceId) {
				const adjacentPlaced = state.placedBuildings.find(
					(pb) => pb.pieceId === cell.occupiedBy && (pb.player === opponentPlayer || pb.player === 'cathedral')
				);
				if (adjacentPlaced) {
					adjacentBuildings.add(adjacentPlaced.pieceId);
				}
			}
		}
	}

	return adjacentBuildings.size;
}

export const { loadGameState, placeCathedral, placeBuilding, resetGame } = gameSlice.actions;
export default gameSlice.reducer;
