/**
 * Stable element identifiers for automated testing (Maestro).
 * Rendered as `nativeID` (HTML `id` attribute on web) so Maestro web tests can
 * locate elements without depending on visible text or component hierarchy.
 *
 * Prefix-style ids (ending in `_PREFIX`) are combined with a dynamic suffix
 * (e.g. a player/friend id) at the call site. Maestro's generated `tapOnId`/
 * `assertVisibleId` patterns always append `.*`, so a prefix alone matches any
 * element whose id starts with it.
 */
export const ComponentIds = {
	// Drawer navigation
	DRAWER_ITEM_GAME: 'drawer-item-game',
	DRAWER_ITEM_PLAYERS: 'drawer-item-players',
	DRAWER_ITEM_SETTINGS: 'drawer-item-settings',

	// Game screen header
	GAME_HEADER_EDIT_PLAYERS_BUTTON: 'game-header-edit-players-button',
	GAME_HEADER_SETTINGS_BUTTON: 'game-header-settings-button',

	// Round navigation (active game)
	GAME_ROUND_PREV_BUTTON: 'game-round-prev-button',
	GAME_ROUND_NEXT_BUTTON: 'game-round-next-button',
	GAME_ROUND_LABEL: 'game-round-label',

	// Setup phase (round 0)
	GAME_START_BUTTON: 'game-start-button',

	// Player list (shared between setup and edit-mode)
	GAME_PLAYER_TILE_PREFIX: 'game-player-tile-',
	GAME_PLAYER_ROW_PREFIX: 'game-player-row-',
	GAME_PLAYER_ROW_DELETE_PREFIX: 'game-player-row-delete-',
	GAME_ADD_PLAYER_BUTTON: 'game-add-player-button',
	GAME_ADD_PLAYER_GUEST_BUTTON: 'game-add-player-guest-button',
	GAME_ADD_PLAYER_FRIEND_ROW_PREFIX: 'game-add-player-friend-row-',

	// Score entry modal
	GAME_SCORE_INPUT_SAVE_BUTTON: 'game-score-input-save-button',

	// Settings modal (header gear)
	GAME_SETTINGS_COLUMNS_PORTRAIT_1: 'game-settings-columns-portrait-1',
	GAME_SETTINGS_COLUMNS_PORTRAIT_2: 'game-settings-columns-portrait-2',
	GAME_SETTINGS_COLUMNS_LANDSCAPE_1: 'game-settings-columns-landscape-1',
	GAME_SETTINGS_COLUMNS_LANDSCAPE_2: 'game-settings-columns-landscape-2',
	GAME_SETTINGS_RESET_SCORES: 'game-settings-reset-scores',
	GAME_SETTINGS_NEW_GAME: 'game-settings-new-game',

	// Players (friends) screen
	PLAYERS_SCREEN_ADD_BUTTON: 'players-screen-add-button',
	PLAYERS_SCREEN_ADD_BUTTON_LIST: 'players-screen-add-button-list',
	PLAYERS_SCREEN_SEARCH_INPUT: 'players-screen-search-input',
	PLAYERS_SCREEN_FRIEND_ROW_PREFIX: 'players-screen-friend-row-',
	PLAYER_DETAIL_BACK_BUTTON: 'player-detail-back-button',
	PLAYER_DETAIL_DELETE_BUTTON: 'player-detail-delete-button',
} as const;
