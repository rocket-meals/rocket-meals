import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MathHelper } from 'repo-depkit-common';
import type { AvatarConfig } from 'repo-depkit-common-ui';
import type { Player, Round, GameState, GameStatus } from '../helpers/GameStorage';
import { PLAYER_COLORS } from '../helpers/GameStorage';
import type { Friend } from '../helpers/FriendsStorage';
import { renameFriend, setFriendColor, setFriendAvatar } from './friendsSlice';
import { removeGameType } from './gameTypesSlice';
export type { Player, Round, GameState, GameStatus };

// ─── State type ───────────────────────────────────────────────────────────────

export type GameSliceState = {
	players: Player[];
	rounds: Round[];
	status: GameStatus;
	currentRoundIndex: number;
	/** Set when the current match is played as a specific game type. */
	gameTypeId?: string;
	/** Numeric state carried between rounds for a `startingPlayerMode: 'custom'` rule (see GameRules). */
	playerOrderState?: number;
};

const initialState: GameSliceState = {
	players: [],
	rounds: [],
	status: 'setup',
	currentRoundIndex: 0,
	gameTypeId: undefined,
	playerOrderState: undefined,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
	return Date.now().toString(36) + MathHelper.randomBase36String(6);
}

function emptyScoresFor(players: Player[]): Record<string, number | null> {
	const scores: Record<string, number | null> = {};
	for (const player of players) {
		scores[player.id] = null;
	}
	return scores;
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const gameSlice = createSlice({
	name: 'game',
	initialState,
	reducers: {
		/** Load persisted game state from disk. Called once at startup. */
		loadGameState(_state, action: PayloadAction<GameState>) {
			const players = action.payload.players.map((p, i) => ({
				...p,
				color: p.color || PLAYER_COLORS[i % PLAYER_COLORS.length],
			}));
			return {
				players,
				rounds: action.payload.rounds,
				status: action.payload.status,
				currentRoundIndex: action.payload.currentRoundIndex,
				gameTypeId: action.payload.gameTypeId,
				playerOrderState: action.payload.playerOrderState,
			};
		},

		/** Add a new guest player (not linked to any friend) with a default name. */
		addGuestPlayer(state) {
			const playerNumber = state.players.length + 1;
			const color = PLAYER_COLORS[state.players.length % PLAYER_COLORS.length];
			const newPlayer: Player = { id: generateId(), name: `Spieler ${playerNumber}`, color };
			state.players.push(newPlayer);
			for (const round of state.rounds) {
				round.scores[newPlayer.id] = null;
			}
		},

		/** Add a player snapshotted from an existing friend (name/color/avatar copied at add-time). */
		addFriendPlayer(state, action: PayloadAction<Friend>) {
			const friend = action.payload;
			const newPlayer: Player = {
				id: generateId(),
				name: friend.name,
				color: friend.color,
				avatarConfig: friend.avatarConfig,
				friendId: friend.id,
			};
			state.players.push(newPlayer);
			for (const round of state.rounds) {
				round.scores[newPlayer.id] = null;
			}
		},

		/** Rename a player. */
		renamePlayer(state, action: PayloadAction<{ playerId: string; name: string }>) {
			const player = state.players.find((p) => p.id === action.payload.playerId);
			if (player) {
				player.name = action.payload.name;
			}
		},

		/** Change a player's tile color. */
		setPlayerColor(state, action: PayloadAction<{ playerId: string; color: string }>) {
			const player = state.players.find((p) => p.id === action.payload.playerId);
			if (player) {
				player.color = action.payload.color;
			}
		},

		/** Change a player's avatar. */
		setPlayerAvatar(state, action: PayloadAction<{ playerId: string; avatarConfig: AvatarConfig }>) {
			const player = state.players.find((p) => p.id === action.payload.playerId);
			if (player) {
				player.avatarConfig = action.payload.avatarConfig;
			}
		},

		/**
		 * Link an existing (guest) player to a friend, e.g. right after the guest
		 * was saved to the friends roster via "Als Freund speichern".
		 */
		linkPlayerToFriend(state, action: PayloadAction<{ playerId: string; friendId: string }>) {
			const player = state.players.find((p) => p.id === action.payload.playerId);
			if (player) {
				player.friendId = action.payload.friendId;
			}
		},

		/** Select (or clear) the game type the current match is played as. */
		setGameType(state, action: PayloadAction<string | undefined>) {
			state.gameTypeId = action.payload;
		},

		/** Move a player one seat up/down in the table order (manual seating adjustment). No-op at either edge. */
		movePlayer(state, action: PayloadAction<{ playerId: string; direction: 'up' | 'down' }>) {
			const { playerId, direction } = action.payload;
			const index = state.players.findIndex((p) => p.id === playerId);
			if (index === -1) return;
			const targetIndex = direction === 'up' ? index - 1 : index + 1;
			if (targetIndex < 0 || targetIndex >= state.players.length) return;
			const [player] = state.players.splice(index, 1);
			state.players.splice(targetIndex, 0, player);
		},

		/** Remove a player and their scores from all rounds. */
		removePlayer(state, action: PayloadAction<string>) {
			state.players = state.players.filter((p) => p.id !== action.payload);
			for (const round of state.rounds) {
				delete round.scores[action.payload];
				if (round.cardSelections) delete round.cardSelections[action.payload];
			}
		},

		/** Set the score for a player in a specific round. */
		setScore(state, action: PayloadAction<{ roundId: string; playerId: string; score: number | null }>) {
			const round = state.rounds.find((r) => r.id === action.payload.roundId);
			if (round) {
				round.scores[action.payload.playerId] = action.payload.score;
			}
		},

		/**
		 * Set a player's card selection for a round (card-based score entry, see
		 * GameRules) together with the score already computed from it via the
		 * game type's rule formula.
		 */
		setCardSelection(
			state,
			action: PayloadAction<{ roundId: string; playerId: string; cardIds: string[]; score: number }>,
		) {
			const round = state.rounds.find((r) => r.id === action.payload.roundId);
			if (!round) return;
			round.scores[action.payload.playerId] = action.payload.score;
			if (!round.cardSelections) round.cardSelections = {};
			round.cardSelections[action.payload.playerId] = action.payload.cardIds;
		},

		/** Leave the setup phase (round 0) and start round 1. Round 1 always starts with the first seat. */
		startGame(state) {
			if (state.status === 'active') return;
			state.status = 'active';
			state.rounds = [{ id: generateId(), scores: emptyScoresFor(state.players), startingPlayerId: state.players[0]?.id }];
			state.currentRoundIndex = 0;
			state.playerOrderState = undefined;
		},

		/** Move to the previous round (view/edit its scores). No-op at round 1. */
		goToPreviousRound(state) {
			state.currentRoundIndex = Math.max(0, state.currentRoundIndex - 1);
		},

		/**
		 * Move to the next round, creating it first if it doesn't exist yet. When
		 * creating a new round, the caller (which alone knows the selected game
		 * type's `startingPlayerMode`) supplies who starts it and the resulting
		 * custom-rule state - see `computeNextStartingPlayerIndex` in GameRules.
		 */
		goToNextRound(state, action: PayloadAction<{ startingPlayerId?: string; nextOrderState?: number } | undefined>) {
			if (state.currentRoundIndex >= state.rounds.length - 1) {
				state.rounds.push({
					id: generateId(),
					scores: emptyScoresFor(state.players),
					startingPlayerId: action.payload?.startingPlayerId,
				});
				state.playerOrderState = action.payload?.nextOrderState;
			}
			state.currentRoundIndex = Math.min(state.rounds.length - 1, state.currentRoundIndex + 1);
		},

		/** Clear all rounds and return to the setup phase (keeps players). */
		resetScores(state) {
			state.rounds = [];
			state.status = 'setup';
			state.currentRoundIndex = 0;
			state.playerOrderState = undefined;
		},

		/** Delete everything (players and rounds) and return to the setup phase. */
		resetAll() {
			return { players: [], rounds: [], status: 'setup', currentRoundIndex: 0, gameTypeId: undefined };
		},
	},
	// Players added from a friend are linked via friendId. When the friend is
	// edited in the players screen, mirror the change onto the linked player(s)
	// of the current game so both screens stay in sync.
	extraReducers: (builder) => {
		builder
			.addCase(renameFriend, (state, action) => {
				for (const player of state.players) {
					if (player.friendId === action.payload.friendId) {
						player.name = action.payload.name;
					}
				}
			})
			.addCase(setFriendColor, (state, action) => {
				for (const player of state.players) {
					if (player.friendId === action.payload.friendId) {
						player.color = action.payload.color;
					}
				}
			})
			.addCase(setFriendAvatar, (state, action) => {
				for (const player of state.players) {
					if (player.friendId === action.payload.friendId) {
						player.avatarConfig = action.payload.avatarConfig;
					}
				}
			})
			// A deleted game type must not leave a dangling reference on the
			// current match - fall back to "no specific game".
			.addCase(removeGameType, (state, action) => {
				if (state.gameTypeId === action.payload) {
					state.gameTypeId = undefined;
				}
			});
	},
});

export const {
	loadGameState,
	addGuestPlayer,
	addFriendPlayer,
	renamePlayer,
	setPlayerColor,
	setPlayerAvatar,
	linkPlayerToFriend,
	setGameType,
	movePlayer,
	removePlayer,
	setScore,
	setCardSelection,
	startGame,
	goToPreviousRound,
	goToNextRound,
	resetScores,
	resetAll,
} = gameSlice.actions;
export default gameSlice.reducer;
