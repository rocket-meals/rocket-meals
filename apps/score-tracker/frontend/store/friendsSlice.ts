import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MathHelper } from 'repo-depkit-common';
import type { AvatarConfig } from 'repo-depkit-common-ui';
import type { Friend } from '../helpers/FriendsStorage';
export type { Friend };

// ─── State type ───────────────────────────────────────────────────────────────

export type FriendsSliceState = {
	friends: Friend[];
};

const initialState: FriendsSliceState = {
	friends: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
	return Date.now().toString(36) + MathHelper.randomBase36String(6);
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const friendsSlice = createSlice({
	name: 'friends',
	initialState,
	reducers: {
		/** Load persisted friends from disk. Called once at startup. */
		loadFriends(state, action: PayloadAction<Friend[]>) {
			state.friends = action.payload;
		},

		/** Create a new friend with a default name/color and no avatar yet. */
		addFriend: {
			reducer(state, action: PayloadAction<Friend>) {
				state.friends.push(action.payload);
			},
			prepare(name: string, color: string) {
				const friend: Friend = { id: generateId(), name, color, createdAt: Date.now() };
				return { payload: friend };
			},
		},

		/**
		 * Save an existing (guest) player to the friends roster, keeping their
		 * name, color and avatar. The prepared payload carries the generated id
		 * so callers can link the player to the new friend afterwards.
		 */
		addFriendFromPlayer: {
			reducer(state, action: PayloadAction<Friend>) {
				state.friends.push(action.payload);
			},
			prepare(input: { name: string; color: string; avatarConfig?: AvatarConfig }) {
				const friend: Friend = {
					id: generateId(),
					name: input.name,
					color: input.color,
					avatarConfig: input.avatarConfig,
					createdAt: Date.now(),
				};
				return { payload: friend };
			},
		},

		renameFriend(state, action: PayloadAction<{ friendId: string; name: string }>) {
			const friend = state.friends.find((f) => f.id === action.payload.friendId);
			if (friend) friend.name = action.payload.name;
		},

		setFriendColor(state, action: PayloadAction<{ friendId: string; color: string }>) {
			const friend = state.friends.find((f) => f.id === action.payload.friendId);
			if (friend) friend.color = action.payload.color;
		},

		setFriendAvatar(state, action: PayloadAction<{ friendId: string; avatarConfig: AvatarConfig }>) {
			const friend = state.friends.find((f) => f.id === action.payload.friendId);
			if (friend) friend.avatarConfig = action.payload.avatarConfig;
		},

		removeFriend(state, action: PayloadAction<string>) {
			state.friends = state.friends.filter((f) => f.id !== action.payload);
		},

		/**
		 * Merge an imported friends list into the roster: fields of an
		 * existing friend are overwritten with the imported ones (via
		 * `Object.assign`, so a key the import omits - e.g. an `avatarConfig`
		 * exported before one was ever set - is left untouched rather than
		 * cleared), new ids are appended. Re-importing the same export is
		 * therefore idempotent.
		 */
		importFriends(state, action: PayloadAction<Friend[]>) {
			for (const imported of action.payload) {
				const existing = state.friends.find((f) => f.id === imported.id);
				if (existing) {
					Object.assign(existing, imported);
				} else {
					state.friends.push(imported);
				}
			}
		},
	},
});

export const {
	loadFriends,
	addFriend,
	addFriendFromPlayer,
	renameFriend,
	setFriendColor,
	setFriendAvatar,
	removeFriend,
	importFriends,
} = friendsSlice.actions;
export default friendsSlice.reducer;
