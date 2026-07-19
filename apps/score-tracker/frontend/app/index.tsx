import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

// BottomSheetTextInput's blur handler calls RNTextInput.State.currentlyFocusedInput(),
// which react-native-web doesn't implement - it throws when the input loses focus
// (e.g. after tapping "Save"). Fall back to the plain TextInput on web, matching the
// same platform check already used by repo-depkit-common-ui's SettingsListTextInput.
const ResolvedScoreTextInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;
import { Ionicons } from '@expo/vector-icons';
import {
	SettingsList,
	SettingsListTextInput,
	SettingsListGroupTitle,
	SettingsListSelectOptionSingle,
	SettingsListAvatar,
	MyAvatar,
	useMyScrollViewModal,
	useTheme,
	MyColorPicker,
	myContrastColor,
	AvatarStyle,
} from 'repo-depkit-common-ui';
import type { AvatarConfig } from 'repo-depkit-common-ui';
import { MathHelper } from 'repo-depkit-common';
import { useDispatch, useSelector } from 'react-redux';
import { router, useNavigation } from 'expo-router';
import {
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
} from '../store/gameSlice';
import { addFriendFromPlayer } from '../store/friendsSlice';
import { addGameType } from '../store/gameTypesSlice';
import { archiveGame } from '../store/gameHistorySlice';
import { setColumnsPortrait, setColumnsLandscape } from '../store/appSettingsSlice';
import type { AppDispatch, RootState } from '../store/store';
import { PLAYER_COLORS } from '../helpers/GameStorage';
import type { Player } from '../helpers/GameStorage';
import type { GameHistoryEntry } from '../helpers/GameHistoryStorage';
import type { Friend } from '../helpers/FriendsStorage';
import { ComponentIds } from '../constants/ComponentIds';
import { logDebug } from '../helpers/DebugLogger';
import GameTypeIcon from '../components/GameTypeIcon';
import CardScoreEntryModal from '../components/CardScoreEntryModal';
import { computeNextStartingPlayerIndex } from '../helpers/GameRules';

const PRIMARY_COLOR = '#2563eb';
const DANGER_COLOR = '#dc2626';
const WARNING_COLOR = '#f59e0b';
const SUCCESS_COLOR = '#16a34a';

// Avatar preview sizes (50% larger than the original design across the board).
const EDIT_AVATAR_SIZE = 60;
const PICKER_AVATAR_SIZE = 48;

const TILE_GAP = 10;

// Helper to determine groupPosition for list items
function getGroupPosition(index: number, total: number): 'top' | 'middle' | 'bottom' {
	if (total === 1 || index === 0) return 'top';
	if (index === total - 1) return 'bottom';
	return 'middle';
}

function generateHistoryId(): string {
	return Date.now().toString(36) + MathHelper.randomBase36String(6);
}

// ─── Score Input Modal Content ────────────────────────────────────────────────

const QUICK_SCORES = [-5, -1, 0, 1, 5];

function ScoreInputContent({
	initialValue,
	onSave,
}: {
	initialValue: number | null;
	onSave: (value: number | null) => void;
}) {
	const { theme } = useTheme();
	const [signMode, setSignMode] = useState<'plus' | 'minus'>(
		initialValue != null && initialValue < 0 ? 'minus' : 'plus',
	);
	const [text, setText] = useState(initialValue != null ? String(Math.abs(initialValue)) : '');

	const handleSave = useCallback(() => {
		if (text.trim() === '') {
			onSave(null);
			return;
		}
		const num = Number.parseInt(text, 10);
		if (Number.isNaN(num)) {
			onSave(null);
			return;
		}
		onSave(signMode === 'minus' ? -Math.abs(num) : Math.abs(num));
	}, [text, signMode, onSave]);

	const handleQuickScore = useCallback(
		(delta: number) => {
			const currentNum = text.trim() === '' ? 0 : Number.parseInt(text, 10) || 0;
			const currentSigned = signMode === 'minus' ? -Math.abs(currentNum) : Math.abs(currentNum);
			const newValue = delta === 0 ? 0 : currentSigned + delta;
			if (newValue < 0) {
				setSignMode('minus');
				setText(String(Math.abs(newValue)));
			} else {
				setSignMode('plus');
				setText(String(newValue));
			}
		},
		[text, signMode],
	);

	return (
		<View style={styles.scoreInputContainer}>
			<View style={styles.signToggle}>
				<TouchableOpacity
					style={[
						styles.signButton,
						{
							backgroundColor: signMode === 'plus' ? PRIMARY_COLOR : theme.screen.background,
							borderColor: PRIMARY_COLOR,
						},
					]}
					onPress={() => setSignMode('plus')}
					activeOpacity={0.7}
				>
					<Text style={[styles.signButtonText, { color: signMode === 'plus' ? '#ffffff' : PRIMARY_COLOR }]}>+</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.signButton,
						{
							backgroundColor: signMode === 'minus' ? DANGER_COLOR : theme.screen.background,
							borderColor: DANGER_COLOR,
						},
					]}
					onPress={() => setSignMode('minus')}
					activeOpacity={0.7}
				>
					<Text style={[styles.signButtonText, { color: signMode === 'minus' ? '#ffffff' : DANGER_COLOR }]}>−</Text>
				</TouchableOpacity>
			</View>
			<View style={[styles.scoreInputField, { backgroundColor: theme.screen.background, borderColor: theme.screen.border }]}>
				<Text style={[styles.scoreInputSign, { color: signMode === 'minus' ? DANGER_COLOR : PRIMARY_COLOR }]}>
					{signMode === 'minus' ? '−' : '+'}
				</Text>
				<View style={styles.scoreInputTextWrapper}>
					<ResolvedScoreTextInput
						style={[styles.scoreInputNative, { color: theme.screen.text }]}
						value={text}
						onChangeText={setText}
						keyboardType="number-pad"
						autoFocus
						placeholder="0"
						placeholderTextColor={theme.screen.border}
						returnKeyType="done"
						onSubmitEditing={handleSave}
					/>
				</View>
			</View>
			<TouchableOpacity
				nativeID={ComponentIds.GAME_SCORE_INPUT_SAVE_BUTTON}
				style={[styles.scoreInputSaveButton, { backgroundColor: PRIMARY_COLOR }]}
				onPress={handleSave}
				activeOpacity={0.8}
			>
				<Text style={styles.scoreInputSaveText}>Save</Text>
			</TouchableOpacity>
			<View style={styles.quickButtonsRow}>
				{QUICK_SCORES.map((v) => (
					<TouchableOpacity
						key={v}
						style={[
							styles.quickButton,
							{
								backgroundColor: v < 0 ? DANGER_COLOR + '20' : v > 0 ? PRIMARY_COLOR + '20' : theme.screen.border + '40',
								borderColor: v < 0 ? DANGER_COLOR : v > 0 ? PRIMARY_COLOR : theme.screen.border,
							},
						]}
						onPress={() => handleQuickScore(v)}
						activeOpacity={0.7}
					>
						<Text style={[styles.quickButtonText, { color: v < 0 ? DANGER_COLOR : v > 0 ? PRIMARY_COLOR : theme.screen.text }]}>
							{v > 0 ? `+${v}` : String(v)}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);
}

// ─── Player score row (active game, scoreboard view) ──────────────────────────
//
// Single column: full screen width, so the shared SettingsListAvatar row
// (avatar left, name+score stacked to its right) has plenty of room.
//
// Multi-column: that same row layout squeezes the name into a narrow column
// next to the large avatar, wrapping awkwardly (or even character-by-
// character - see the SettingsList minWidth:0 fix). Stacking the avatar on
// top of the name instead gives the name the tile's *full* width to wrap
// into, so this renders a bespoke vertical "card" layout instead of going
// through SettingsListAvatar once a tileWidth is set.

const TILE_AVATAR_SIZE = 84;
const MISSING_SCORE_BORDER = 'rgba(255,255,255,0.85)';

function PlayerTile({
	playerId,
	name,
	score,
	color,
	avatarConfig,
	isLeader,
	isRoundStarter,
	hasScore,
	onPress,
	tileWidth,
}: {
	playerId: string;
	name: string;
	score: number;
	color: string;
	avatarConfig?: AvatarConfig;
	isLeader: boolean;
	/** Whether this player starts the currently viewed round (see GameRules `startingPlayerMode`). */
	isRoundStarter: boolean;
	hasScore: boolean;
	onPress: () => void;
	tileWidth?: number;
}) {
	const { theme, isDark } = useTheme();
	const textColor = myContrastColor(color, theme, isDark);
	const nativeID = `${ComponentIds.GAME_PLAYER_TILE_PREFIX}${playerId}`;

	if (tileWidth === undefined) {
		return (
			<View style={styles.tileWrapper}>
				<SettingsListAvatar
					nativeID={nativeID}
					config={avatarConfig}
					onPressOverride={onPress}
					label={name}
					value={String(score)}
					stackedValue
					previewSize={TILE_AVATAR_SIZE}
					avatarBackgroundColor="#ffffff"
					backgroundColor={color}
					titleColor={textColor}
					valueColor={textColor}
					titleFontSize={20}
					valueFontSize={26}
					borderColor={hasScore ? undefined : MISSING_SCORE_BORDER}
					borderWidth={hasScore ? undefined : 2.5}
					borderStyle="dashed"
					rightIcon={isLeader ? <Ionicons name="trophy" size={24} color="#fbbf24" /> : <View style={styles.rightIconPlaceholder} />}
					groupPosition="single"
					showSeparator={false}
				/>
				{isRoundStarter && (
					<View style={styles.starterBadge}>
						<Ionicons name="play" size={12} color="#ffffff" />
					</View>
				)}
			</View>
		);
	}

	return (
		<TouchableOpacity
			nativeID={nativeID}
			onPress={onPress}
			activeOpacity={0.8}
			style={[
				styles.verticalTile,
				{ width: tileWidth, backgroundColor: color },
				!hasScore && styles.verticalTileMissingScore,
			]}
		>
			{isLeader && (
				<View style={styles.verticalTileTrophy}>
					<Ionicons name="trophy" size={20} color="#fbbf24" />
				</View>
			)}
			{isRoundStarter && (
				<View style={styles.starterBadge}>
					<Ionicons name="play" size={12} color="#ffffff" />
				</View>
			)}
			<MyAvatar style={avatarConfig?.style} options={avatarConfig?.options} size={TILE_AVATAR_SIZE} rounded backgroundColor="#ffffff" />
			<Text style={[styles.verticalTileName, { color: textColor }]} numberOfLines={2} ellipsizeMode="tail">
				{name}
			</Text>
			<Text style={[styles.verticalTileScore, { color: textColor }]}>{score}</Text>
		</TouchableOpacity>
	);
}

// ─── Player edit row group (setup phase + header "Spieler bearbeiten" mode) ───

function PlayerEditGroup({
	player,
	onRename,
	onColorChange,
	onAvatarChange,
	onSaveAsFriend,
	onDelete,
	onMoveUp,
	onMoveDown,
	canMoveUp,
	canMoveDown,
}: {
	player: Player;
	onRename: (name: string) => void;
	onColorChange: (color: string) => void;
	onAvatarChange: (config: AvatarConfig) => void;
	/** Only set for guest players (no friendId yet): saves them to the friends roster. */
	onSaveAsFriend?: () => void;
	onDelete: () => void;
	/** Manual seating-order adjustment (see GameRules `startingPlayerMode`). */
	onMoveUp: () => void;
	onMoveDown: () => void;
	canMoveUp: boolean;
	canMoveDown: boolean;
}) {
	const { theme } = useTheme();
	const { show: showColorModal, close: closeColorModal } = useMyScrollViewModal();
	const debugMode = useSelector((state: RootState) => state.debug.debugMode);

	const handleOpenColorModal = useCallback(() => {
		showColorModal({
			title: 'Farbe wählen',
			children: (
				<MyColorPicker
					colors={PLAYER_COLORS}
					selectedColor={player.color}
					onSelect={(color) => {
						onColorChange(color);
						closeColorModal();
					}}
				/>
			),
		});
	}, [showColorModal, closeColorModal, player.color, onColorChange]);

	return (
		<View style={styles.playerEditGroup} nativeID={`${ComponentIds.GAME_PLAYER_ROW_PREFIX}${player.id}`}>
			<SettingsList
				label="Reihenfolge"
				leftIcon={<Ionicons name="swap-vertical-outline" size={20} color="#ffffff" />}
				iconBgColor={PRIMARY_COLOR}
				rightElement={
					<View style={styles.reorderButtons}>
						<TouchableOpacity
							nativeID={`${ComponentIds.GAME_PLAYER_ROW_MOVE_UP_PREFIX}${player.id}`}
							onPress={onMoveUp}
							disabled={!canMoveUp}
							hitSlop={8}
							style={styles.reorderButton}
						>
							<Ionicons name="chevron-up" size={20} color={canMoveUp ? theme.screen.text : theme.screen.border} />
						</TouchableOpacity>
						<TouchableOpacity
							nativeID={`${ComponentIds.GAME_PLAYER_ROW_MOVE_DOWN_PREFIX}${player.id}`}
							onPress={onMoveDown}
							disabled={!canMoveDown}
							hitSlop={8}
							style={styles.reorderButton}
						>
							<Ionicons name="chevron-down" size={20} color={canMoveDown ? theme.screen.text : theme.screen.border} />
						</TouchableOpacity>
					</View>
				}
				groupPosition="top"
			/>
			<SettingsListAvatar
				config={player.avatarConfig}
				onChange={(config) => {
					logDebug(`game: avatar onChange player=${player.id} style=${config.style}`);
					onAvatarChange(config);
				}}
				label={player.name}
				previewSize={EDIT_AVATAR_SIZE}
				avatarBackgroundColor={player.color}
				groupPosition="middle"
				editorOptions={{
					title: 'Avatar',
					allowedStyles: [AvatarStyle.AVATAAARS],
					// Debug-Modus (Settings → 5x auf Version tippen) blendet im QuickStart
					// zusätzliche Touch-Test-Buttons ein (siehe QuickstartDebugSection).
					debugMode,
					onDebugEvent: (event) => logDebug(`game: avatar-editor ${event} player=${player.id}`),
				}}
			/>
			<SettingsListTextInput
				label="Name"
				placeholder="Name eingeben"
				initialValue={player.name}
				value={player.name}
				onSave={onRename}
				groupPosition="middle"
			/>
			<SettingsList
				label="Farbe"
				leftIcon={<Ionicons name="color-palette-outline" size={20} color="#ffffff" />}
				iconBgColor={player.color}
				handleFunction={handleOpenColorModal}
				groupPosition="middle"
			/>
			{onSaveAsFriend && (
				<SettingsList
					nativeID={`${ComponentIds.GAME_PLAYER_ROW_SAVE_FRIEND_PREFIX}${player.id}`}
					label="Als Freund speichern"
					leftIcon={<Ionicons name="person-add-outline" size={20} color="#ffffff" />}
					iconBgColor={SUCCESS_COLOR}
					handleFunction={onSaveAsFriend}
					groupPosition="middle"
				/>
			)}
			<SettingsList
				nativeID={`${ComponentIds.GAME_PLAYER_ROW_DELETE_PREFIX}${player.id}`}
				label="Spieler löschen"
				leftIcon={<Ionicons name="trash-outline" size={20} color="#ffffff" />}
				iconBgColor={DANGER_COLOR}
				handleFunction={onDelete}
				groupPosition="bottom"
			/>
		</View>
	);
}

// ─── Columns settings section (settings modal) ────────────────────────────────
//
// Rendered as its own component (rather than JSX built inline in a callback)
// so it re-renders from its own `useSelector` subscription and the selected
// option updates live while the modal stays open - a plain closure-captured
// JSX tree would keep showing the option that was selected at open-time.

function ColumnsSettingsSection() {
	const dispatch = useDispatch<AppDispatch>();
	const columnsPortrait = useSelector((state: RootState) => state.appSettings.columnsPortrait);
	const columnsLandscape = useSelector((state: RootState) => state.appSettings.columnsLandscape);

	return (
		<>
			<SettingsListGroupTitle title="Spalten (Hochformat)" />
			<SettingsListSelectOptionSingle
				nativeID={ComponentIds.GAME_SETTINGS_COLUMNS_PORTRAIT_1}
				label="1 Spalte"
				leftIcon={<Ionicons name="reorder-four-outline" size={20} color="#ffffff" />}
				iconBgColor={PRIMARY_COLOR}
				isSelected={columnsPortrait === 1}
				onPress={() => dispatch(setColumnsPortrait(1))}
				groupPosition="top"
			/>
			<SettingsListSelectOptionSingle
				nativeID={ComponentIds.GAME_SETTINGS_COLUMNS_PORTRAIT_2}
				label="2 Spalten"
				leftIcon={<Ionicons name="grid-outline" size={20} color="#ffffff" />}
				iconBgColor={PRIMARY_COLOR}
				isSelected={columnsPortrait === 2}
				onPress={() => dispatch(setColumnsPortrait(2))}
				groupPosition="bottom"
			/>
			<SettingsListGroupTitle title="Spalten (Querformat)" />
			<SettingsListSelectOptionSingle
				nativeID={ComponentIds.GAME_SETTINGS_COLUMNS_LANDSCAPE_1}
				label="1 Spalte"
				leftIcon={<Ionicons name="reorder-four-outline" size={20} color="#ffffff" />}
				iconBgColor={PRIMARY_COLOR}
				isSelected={columnsLandscape === 1}
				onPress={() => dispatch(setColumnsLandscape(1))}
				groupPosition="top"
			/>
			<SettingsListSelectOptionSingle
				nativeID={ComponentIds.GAME_SETTINGS_COLUMNS_LANDSCAPE_2}
				label="2 Spalten"
				leftIcon={<Ionicons name="grid-outline" size={20} color="#ffffff" />}
				iconBgColor={PRIMARY_COLOR}
				isSelected={columnsLandscape === 2}
				onPress={() => dispatch(setColumnsLandscape(2))}
				groupPosition="bottom"
			/>
		</>
	);
}

// ─── Game type selector (setup phase modal) ───────────────────────────────────
//
// Rendered as its own component so it re-renders from its own `useSelector`
// subscription and the selected option updates live while the modal is open
// (same pattern as ColumnsSettingsSection).

function GameTypeSelectSection({ onDone }: { onDone: () => void }) {
	const dispatch = useDispatch<AppDispatch>();
	const gameTypes = useSelector((state: RootState) => state.gameTypes.gameTypes);
	const gameTypeId = useSelector((state: RootState) => state.game.gameTypeId);

	const handleCreateGameType = useCallback(() => {
		const action = dispatch(addGameType(`Spiel ${gameTypes.length + 1}`));
		dispatch(setGameType(action.payload.id));
		onDone();
		// Jump straight into the new game's detail screen so name/icon/rules
		// can be filled in right away.
		router.push({ pathname: '/games/[id]', params: { id: action.payload.id } });
	}, [dispatch, gameTypes.length, onDone]);

	return (
		<View style={styles.modalContent}>
			<SettingsListSelectOptionSingle
				nativeID={ComponentIds.GAME_TYPE_SELECT_NONE}
				label="Kein bestimmtes Spiel"
				leftIcon={<Ionicons name="game-controller-outline" size={20} color="#ffffff" />}
				iconBgColor={PRIMARY_COLOR}
				isSelected={!gameTypeId}
				onPress={() => {
					dispatch(setGameType(undefined));
					onDone();
				}}
				groupPosition={gameTypes.length === 0 ? 'single' : 'top'}
			/>
			{gameTypes.map((gameType, index) => (
				<SettingsListSelectOptionSingle
					key={gameType.id}
					nativeID={`${ComponentIds.GAME_TYPE_SELECT_ROW_PREFIX}${gameType.id}`}
					label={gameType.name}
					leftIcon={<Text style={styles.gameTypeOptionEmoji}>{gameType.icon}</Text>}
					iconBgColor="#ffffff"
					selectionColor={PRIMARY_COLOR}
					isSelected={gameTypeId === gameType.id}
					onPress={() => {
						dispatch(setGameType(gameType.id));
						onDone();
					}}
					groupPosition={index === gameTypes.length - 1 ? 'bottom' : 'middle'}
				/>
			))}
			<SettingsListGroupTitle title="Neu" />
			<SettingsList
				nativeID={ComponentIds.GAME_TYPE_SELECT_CREATE}
				label="Neues Spiel erstellen"
				leftIcon={<Ionicons name="add-outline" size={20} color="#ffffff" />}
				iconBgColor={PRIMARY_COLOR}
				handleFunction={handleCreateGameType}
				groupPosition="single"
			/>
		</View>
	);
}

// ─── Game Screen ──────────────────────────────────────────────────────────────

export default function GameScreen() {
	const { theme } = useTheme();
	const insets = useSafeAreaInsets();
	const dispatch = useDispatch<AppDispatch>();
	const players = useSelector((state: RootState) => state.game.players);
	const rounds = useSelector((state: RootState) => state.game.rounds);
	const status = useSelector((state: RootState) => state.game.status);
	const currentRoundIndex = useSelector((state: RootState) => state.game.currentRoundIndex);
	const friends = useSelector((state: RootState) => state.friends.friends);
	const gameTypes = useSelector((state: RootState) => state.gameTypes.gameTypes);
	const gameTypeId = useSelector((state: RootState) => state.game.gameTypeId);
	const playerOrderState = useSelector((state: RootState) => state.game.playerOrderState);
	const columnsPortrait = useSelector((state: RootState) => state.appSettings.columnsPortrait);
	const columnsLandscape = useSelector((state: RootState) => state.appSettings.columnsLandscape);

	const { show: showScoreModal, close: closeScoreModal } = useMyScrollViewModal();
	const { show: showAddPlayerModal, close: closeAddPlayerModal } = useMyScrollViewModal();
	const { show: showSettingsModal, close: closeSettingsModal } = useMyScrollViewModal();
	const { show: showGameTypeModal, close: closeGameTypeModal } = useMyScrollViewModal();
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();

	const navigation = useNavigation();

	const [isEditingPlayers, setIsEditingPlayers] = useState(false);

	// Leaving the setup phase always drops back into the scoreboard view.
	const prevStatusRef = useRef(status);
	useEffect(() => {
		if (prevStatusRef.current === 'setup' && status === 'active') {
			setIsEditingPlayers(false);
		}
		prevStatusRef.current = status;
	}, [status]);

	const showEditRows = status === 'setup' || isEditingPlayers;

	const selectedGameType = useMemo(
		() => (gameTypeId ? gameTypes.find((g) => g.id === gameTypeId) : undefined),
		[gameTypes, gameTypeId],
	);
	const maxRounds = selectedGameType?.maxRounds ?? null;
	const maxScore = selectedGameType?.maxScore ?? null;
	const scoringMode = selectedGameType?.scoringMode ?? 'highWins';

	// Landscape detection and column count (independently configurable per orientation)
	const isLandscape = windowWidth > windowHeight;
	const columnCount = isLandscape ? columnsLandscape : columnsPortrait;

	// Compute totals per player
	const totals = useMemo(() => {
		const result: Record<string, number> = {};
		for (const player of players) {
			let total = 0;
			for (const round of rounds) {
				const score = round.scores[player.id];
				if (score != null) total += score;
			}
			result[player.id] = total;
		}
		return result;
	}, [players, rounds]);

	// Find leader. With the default "highWins" scoring the highest total leads;
	// game types with "lowWins" (e.g. golf-style card games) invert this.
	const leaderId = useMemo(() => {
		if (players.length === 0) return null;
		const anyScoreEntered = rounds.some((round) => players.some((p) => round.scores[p.id] != null));
		if (!anyScoreEntered) return null;
		let bestScore = scoringMode === 'lowWins' ? Infinity : -Infinity;
		let bestId: string | null = null;
		for (const player of players) {
			const total = totals[player.id] ?? 0;
			const isBetter = scoringMode === 'lowWins' ? total < bestScore : total > bestScore;
			if (isBetter) {
				bestScore = total;
				bestId = player.id;
			}
		}
		// With "highWins", keep the crown hidden until someone is actually in
		// the plus (matches the previous behavior).
		if (scoringMode === 'highWins' && bestScore <= 0) return null;
		return bestId;
	}, [players, rounds, totals, scoringMode]);

	// A match is over once any player's total reaches the game type's optional
	// max score - independent of scoringMode (both "first to X" and
	// "bust at X" games use a target/limit score this way).
	const matchFinished = useMemo(() => {
		if (maxScore == null) return false;
		return players.some((player) => (totals[player.id] ?? 0) >= maxScore);
	}, [maxScore, players, totals]);

	const currentRound = rounds[currentRoundIndex] ?? null;
	const currentRoundNumber = currentRoundIndex + 1;
	// A finished match only blocks *advancing past the end* - paging forward
	// through already-played rounds (after having gone back) must keep working.
	const isLastPossibleRound =
		(matchFinished && currentRoundIndex >= rounds.length - 1) || (maxRounds != null && currentRoundNumber >= maxRounds);

	// Tile width, only needed once a multi-column layout is active
	const tileWidth = useMemo(() => {
		if (columnCount === 1) return undefined;
		const availableWidth = windowWidth - insets.left - insets.right;
		return Math.floor((availableWidth - TILE_GAP * (columnCount + 1)) / columnCount);
	}, [columnCount, windowWidth, insets.left, insets.right]);

	// ─── Add-player chooser (friend roster or guest) ─────────────────────────

	const handleOpenAddPlayerModal = useCallback(() => {
		const existingFriendIds = new Set(players.map((p) => p.friendId).filter((id): id is string => !!id));
		const availableFriends = friends.filter((f) => !existingFriendIds.has(f.id));

		showAddPlayerModal({
			title: 'Spieler hinzufügen',
			children: (
				<View style={styles.modalContent}>
					<SettingsListGroupTitle title="Freunde" />
					{availableFriends.length === 0 ? (
						<Text style={[styles.emptyHint, { color: theme.screen.placeholder }]}>
							Keine Freunde verfügbar. Lege welche im Spieler-Bereich an oder füge einen Gast hinzu.
						</Text>
					) : (
						availableFriends.map((friend: Friend, index) => (
							<SettingsListAvatar
								key={friend.id}
								nativeID={`${ComponentIds.GAME_ADD_PLAYER_FRIEND_ROW_PREFIX}${friend.id}`}
								config={friend.avatarConfig}
								avatarBackgroundColor={friend.color}
								previewSize={PICKER_AVATAR_SIZE}
								label={friend.name}
								rightIcon={<Ionicons name="add-circle-outline" size={22} color="#ffffff" />}
								onPressOverride={() => {
									dispatch(addFriendPlayer(friend));
									closeAddPlayerModal();
								}}
								groupPosition={getGroupPosition(index, availableFriends.length)}
							/>
						))
					)}
					<SettingsListGroupTitle title="Sonstige" />
					<SettingsList
						nativeID={ComponentIds.GAME_ADD_PLAYER_GUEST_BUTTON}
						label="Gast hinzufügen"
						leftIcon={<Ionicons name="person-add-outline" size={20} color="#ffffff" />}
						iconBgColor={PRIMARY_COLOR}
						handleFunction={() => {
							dispatch(addGuestPlayer());
							closeAddPlayerModal();
						}}
						groupPosition="single"
					/>
				</View>
			),
		});
	}, [players, friends, showAddPlayerModal, closeAddPlayerModal, dispatch, theme]);

	// ─── Settings modal (header gear) ────────────────────────────────────────

	const handleStartNewGame = useCallback(() => {
		if (players.length > 0) {
			const entry: GameHistoryEntry = {
				id: generateHistoryId(),
				endedAt: Date.now(),
				roundsCount: rounds.length,
				players: players.map((p) => ({
					playerId: p.id,
					friendId: p.friendId,
					name: p.name,
					color: p.color,
					avatarConfig: p.avatarConfig,
				})),
				finalScores: Object.fromEntries(players.map((p) => [p.id, totals[p.id] ?? 0])),
				gameTypeId,
			};
			dispatch(archiveGame(entry));
		}
		dispatch(resetAll());
		closeSettingsModal();
	}, [players, rounds, totals, gameTypeId, dispatch, closeSettingsModal]);

	// ─── Game type selection (setup phase) ───────────────────────────────────

	const handleOpenGameTypeModal = useCallback(() => {
		showGameTypeModal({
			title: 'Spiel auswählen',
			children: <GameTypeSelectSection onDone={closeGameTypeModal} />,
		});
	}, [showGameTypeModal, closeGameTypeModal]);

	// Save a guest player to the friends roster and link them, so future edits
	// stay in sync and the player can be re-added from the roster next time.
	const handleSaveGuestAsFriend = useCallback(
		(player: Player) => {
			const action = dispatch(
				addFriendFromPlayer({ name: player.name, color: player.color, avatarConfig: player.avatarConfig }),
			);
			dispatch(linkPlayerToFriend({ playerId: player.id, friendId: action.payload.id }));
		},
		[dispatch],
	);

	const handleOpenSettingsModal = useCallback(() => {
		showSettingsModal({
			title: '⚙️ Einstellungen',
			children: (
				<View style={styles.modalContent}>
					<ColumnsSettingsSection />

					{status === 'active' && (
						<>
							<SettingsListGroupTitle title="Spiel" />
							<SettingsList
								nativeID={ComponentIds.GAME_SETTINGS_RESET_SCORES}
								label="Alle Punkte zurücksetzen"
								leftIcon={<Ionicons name="refresh-outline" size={20} color="#ffffff" />}
								iconBgColor={WARNING_COLOR}
								handleFunction={() => {
									dispatch(resetScores());
									closeSettingsModal();
								}}
								groupPosition="top"
							/>
							<SettingsList
								nativeID={ComponentIds.GAME_SETTINGS_NEW_GAME}
								label="Neues Spiel"
								leftIcon={<Ionicons name="trash-outline" size={20} color="#ffffff" />}
								iconBgColor={DANGER_COLOR}
								handleFunction={handleStartNewGame}
								groupPosition="bottom"
							/>
						</>
					)}
				</View>
			),
		});
	}, [status, dispatch, closeSettingsModal, handleStartNewGame]);

	// ─── Header buttons ───────────────────────────────────────────────────────

	useLayoutEffect(() => {
		navigation.setOptions({
			// Show which game is being played right in the header
			title: selectedGameType ? `${selectedGameType.icon} ${selectedGameType.name}` : 'Game',
			headerRight: () => (
				<View style={styles.headerButtons}>
					{status === 'active' && (
						<TouchableOpacity
							nativeID={ComponentIds.GAME_HEADER_EDIT_PLAYERS_BUTTON}
							onPress={() => setIsEditingPlayers((v) => !v)}
							style={styles.headerButton}
						>
							<Ionicons
								name={isEditingPlayers ? 'checkmark-circle-outline' : 'people-outline'}
								size={22}
								color={theme.header.text}
							/>
						</TouchableOpacity>
					)}
					<TouchableOpacity
						nativeID={ComponentIds.GAME_HEADER_SETTINGS_BUTTON}
						onPress={handleOpenSettingsModal}
						style={styles.headerButton}
					>
						<Ionicons name="settings-outline" size={22} color={theme.header.text} />
					</TouchableOpacity>
				</View>
			),
		});
	}, [navigation, theme.header.text, status, isEditingPlayers, handleOpenSettingsModal, selectedGameType]);

	// ─── Score entry ──────────────────────────────────────────────────────────

	const handleTilePress = useCallback(
		(playerId: string) => {
			if (!currentRound) return;
			const scoreEntryRules = selectedGameType?.rules?.scoreEntry;
			if (scoreEntryRules) {
				showScoreModal({
					title: 'Punkte eingeben',
					children: (
						<CardScoreEntryModal
							items={scoreEntryRules.items}
							scoreFormula={scoreEntryRules.scoreFormula}
							bonusAtNumberCount={scoreEntryRules.bonusAtNumberCount}
							bonusPoints={scoreEntryRules.bonusPoints}
							initialSelection={currentRound.cardSelections?.[playerId] ?? []}
							onSave={(cardIds, score) => {
								dispatch(setCardSelection({ roundId: currentRound.id, playerId, cardIds, score }));
								closeScoreModal();
							}}
						/>
					),
				});
				return;
			}
			showScoreModal({
				title: 'Punkte eingeben',
				children: (
					<ScoreInputContent
						initialValue={currentRound.scores[playerId] ?? null}
						onSave={(value) => {
							dispatch(setScore({ roundId: currentRound.id, playerId, score: value }));
							closeScoreModal();
						}}
					/>
				),
			});
		},
		[currentRound, selectedGameType, showScoreModal, closeScoreModal, dispatch],
	);

	const handlePrevRound = useCallback(() => dispatch(goToPreviousRound()), [dispatch]);

	// Only a brand-new round needs a computed starting player - paging forward
	// through already-played rounds must keep their originally recorded one.
	const handleNextRound = useCallback(() => {
		const isCreatingNewRound = currentRoundIndex >= rounds.length - 1;
		if (!isCreatingNewRound || !currentRound) {
			dispatch(goToNextRound());
			return;
		}
		const { startIndex, nextState } = computeNextStartingPlayerIndex({
			mode: selectedGameType?.startingPlayerMode ?? 'fixed',
			customRule: selectedGameType?.rules?.playerOrder,
			playerCount: players.length,
			previousStartIndex: players.findIndex((p) => p.id === currentRound.startingPlayerId),
			previousRoundScores: players.map((p) => currentRound.scores[p.id] ?? null),
			scoringMode,
			state: playerOrderState ?? selectedGameType?.rules?.playerOrder?.initialState ?? 0,
		});
		dispatch(goToNextRound({ startingPlayerId: players[startIndex]?.id, nextOrderState: nextState }));
	}, [currentRoundIndex, rounds.length, currentRound, selectedGameType, players, scoringMode, playerOrderState, dispatch]);

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background, paddingLeft: insets.left, paddingRight: insets.right }]}>
			<ScrollView
				style={styles.tilesScroll}
				contentContainerStyle={[
					styles.tilesContainer,
					!showEditRows && columnCount > 1 && styles.tilesContainerGrid,
					{ paddingBottom: insets.bottom + 96 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{showEditRows ? (
					<>
						{status === 'setup' && (
							<View style={styles.gameTypeRow}>
								<SettingsList
									nativeID={ComponentIds.GAME_SETUP_GAME_TYPE_ROW}
									label="Spiel"
									value={selectedGameType ? selectedGameType.name : 'Kein bestimmtes Spiel'}
									leftIconComponent={
										selectedGameType ? (
											<View style={styles.gameTypeIconWrapper}>
												<GameTypeIcon icon={selectedGameType.icon} size={40} />
											</View>
										) : undefined
									}
									leftIcon={
										selectedGameType ? undefined : <Ionicons name="game-controller-outline" size={20} color="#ffffff" />
									}
									iconBgColor={PRIMARY_COLOR}
									rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
									handleFunction={handleOpenGameTypeModal}
									groupPosition="single"
								/>
							</View>
						)}
						{players.map((player, index) => (
							<PlayerEditGroup
								key={player.id}
								player={player}
								onRename={(name) => dispatch(renamePlayer({ playerId: player.id, name }))}
								onColorChange={(color) => dispatch(setPlayerColor({ playerId: player.id, color }))}
								onAvatarChange={(config) => dispatch(setPlayerAvatar({ playerId: player.id, avatarConfig: config }))}
								onSaveAsFriend={player.friendId ? undefined : () => handleSaveGuestAsFriend(player)}
								onDelete={() => dispatch(removePlayer(player.id))}
								onMoveUp={() => dispatch(movePlayer({ playerId: player.id, direction: 'up' }))}
								onMoveDown={() => dispatch(movePlayer({ playerId: player.id, direction: 'down' }))}
								canMoveUp={index > 0}
								canMoveDown={index < players.length - 1}
							/>
						))}
						<TouchableOpacity
							nativeID={ComponentIds.GAME_ADD_PLAYER_BUTTON}
							style={[styles.addPlayerButton, { borderColor: PRIMARY_COLOR }]}
							onPress={handleOpenAddPlayerModal}
							activeOpacity={0.7}
						>
							<Ionicons name="add-circle-outline" size={22} color={PRIMARY_COLOR} />
							<Text style={[styles.addPlayerButtonText, { color: PRIMARY_COLOR }]}>Spieler hinzufügen</Text>
						</TouchableOpacity>
						{players.length === 0 && status === 'setup' && (
							<Text style={[styles.emptyHint, { color: theme.screen.placeholder }]}>
								Noch keine Spieler. Füge Freunde oder Gäste hinzu, um zu starten.
							</Text>
						)}
					</>
				) : (
					<>
						{matchFinished && (
							<View nativeID={ComponentIds.GAME_FINISHED_BANNER} style={[styles.finishedBanner, { backgroundColor: SUCCESS_COLOR }]}>
								<Ionicons name="trophy-outline" size={18} color="#ffffff" />
								<Text style={styles.finishedBannerText}>
									Spiel beendet - Zielscore {maxScore} erreicht
									{leaderId ? ` von ${players.find((p) => p.id === leaderId)?.name}` : ''}
								</Text>
							</View>
						)}
						{players.map((player) => (
							<PlayerTile
								key={player.id}
								playerId={player.id}
								name={player.name}
								score={totals[player.id] ?? 0}
								color={player.color}
								avatarConfig={player.avatarConfig}
								isLeader={player.id === leaderId}
								isRoundStarter={currentRound?.startingPlayerId === player.id}
								hasScore={currentRound ? currentRound.scores[player.id] != null : false}
								onPress={() => handleTilePress(player.id)}
								tileWidth={tileWidth}
							/>
						))}
					</>
				)}
			</ScrollView>

			{(status === 'setup' || !isEditingPlayers) && (
				<View style={[styles.bottomBar, { borderTopColor: theme.screen.border, paddingBottom: insets.bottom + 12 }]}>
					{status === 'setup' ? (
						<TouchableOpacity
							nativeID={ComponentIds.GAME_START_BUTTON}
							style={[styles.nextRoundButton, { backgroundColor: PRIMARY_COLOR, opacity: players.length === 0 ? 0.5 : 1 }]}
							onPress={() => dispatch(startGame())}
							disabled={players.length === 0}
							activeOpacity={0.8}
						>
							<Text style={styles.nextRoundText}>Spiel starten</Text>
						</TouchableOpacity>
					) : (
						<>
							<TouchableOpacity
								nativeID={ComponentIds.GAME_ROUND_PREV_BUTTON}
								style={[styles.roundNavButton, { backgroundColor: theme.screen.border, opacity: currentRoundIndex === 0 ? 0.4 : 1 }]}
								onPress={handlePrevRound}
								disabled={currentRoundIndex === 0}
								activeOpacity={0.8}
							>
								<Ionicons name="chevron-back" size={18} color={theme.screen.text} />
								{currentRoundNumber > 1 && (
									<Text style={[styles.roundNavText, { color: theme.screen.text }]}>Runde {currentRoundNumber - 1}</Text>
								)}
							</TouchableOpacity>
							<Text nativeID={ComponentIds.GAME_ROUND_LABEL} style={[styles.roundLabel, { color: theme.screen.text }]}>
								Runde {currentRoundNumber}
								{maxRounds != null ? ` / ${maxRounds}` : ''}
							</Text>
							<TouchableOpacity
								nativeID={ComponentIds.GAME_ROUND_NEXT_BUTTON}
								style={[
									styles.roundNavButton,
									{ backgroundColor: PRIMARY_COLOR, opacity: isLastPossibleRound ? 0.4 : 1 },
								]}
								onPress={handleNextRound}
								disabled={isLastPossibleRound}
								activeOpacity={0.8}
							>
								<Text style={styles.roundNavText}>
									{matchFinished
										? 'Spiel beendet'
										: maxRounds != null && currentRoundNumber >= maxRounds
											? 'Letzte Runde'
											: `Runde ${currentRoundNumber + 1}`}
								</Text>
								<Ionicons name="chevron-forward" size={18} color="#ffffff" />
							</TouchableOpacity>
						</>
					)}
				</View>
			)}
		</View>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	headerButtons: {
		flexDirection: 'row',
		gap: 12,
		marginRight: 8,
	},
	headerButton: {
		padding: 4,
	},
	tilesScroll: {
		flex: 1,
	},
	tilesContainer: {
		padding: TILE_GAP,
		gap: TILE_GAP,
	},
	tilesContainerGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	rightIconPlaceholder: {
		width: 24,
		height: 24,
	},
	tileWrapper: {
		position: 'relative',
	},
	starterBadge: {
		position: 'absolute',
		top: 8,
		left: 8,
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: 'rgba(0,0,0,0.55)',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 2,
	},
	verticalTile: {
		alignItems: 'center',
		borderRadius: 14,
		paddingVertical: 16,
		paddingHorizontal: 8,
	},
	verticalTileMissingScore: {
		borderColor: MISSING_SCORE_BORDER,
		borderWidth: 2.5,
		borderStyle: 'dashed',
	},
	verticalTileTrophy: {
		position: 'absolute',
		top: 8,
		right: 8,
	},
	verticalTileName: {
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center',
		marginTop: 10,
	},
	verticalTileScore: {
		fontSize: 22,
		fontWeight: '700',
		marginTop: 2,
	},
	playerEditGroup: {
		marginBottom: 4,
	},
	reorderButtons: {
		flexDirection: 'row',
		gap: 4,
	},
	reorderButton: {
		width: 32,
		height: 32,
		justifyContent: 'center',
		alignItems: 'center',
	},
	gameTypeRow: {
		marginBottom: 8,
	},
	gameTypeIconWrapper: {
		marginRight: 12,
	},
	gameTypeOptionEmoji: {
		fontSize: 18,
	},
	addPlayerButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderRadius: 12,
		paddingVertical: 14,
		marginTop: 4,
	},
	addPlayerButtonText: {
		fontSize: 15,
		fontWeight: '600',
	},
	emptyHint: {
		fontSize: 13,
		textAlign: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	finishedBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 16,
		marginBottom: 12,
	},
	finishedBannerText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '700',
		textAlign: 'center',
		flexShrink: 1,
	},
	bottomBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		gap: 12,
	},
	roundNavButton: {
		flex: 1,
		height: 44,
		borderRadius: 8,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 4,
	},
	roundNavText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	roundLabel: {
		fontSize: 13,
		fontWeight: '600',
		paddingHorizontal: 4,
	},
	signToggle: {
		flexDirection: 'row',
		gap: 4,
	},
	signButton: {
		width: 44,
		height: 44,
		borderRadius: 8,
		borderWidth: 2,
		justifyContent: 'center',
		alignItems: 'center',
	},
	signButtonText: {
		fontSize: 22,
		fontWeight: '700',
	},
	nextRoundButton: {
		flex: 1,
		height: 44,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	nextRoundText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
	modalContent: {
		padding: 10,
	},
	scoreInputContainer: {
		padding: 16,
		gap: 12,
	},
	scoreInputField: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 8,
		height: 56,
		paddingHorizontal: 16,
	},
	scoreInputSign: {
		fontSize: 24,
		fontWeight: '700',
		marginRight: 8,
	},
	scoreInputTextWrapper: {
		flex: 1,
	},
	scoreInputNative: {
		fontSize: 18,
		height: 48,
	},
	scoreInputSaveButton: {
		height: 48,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	scoreInputSaveText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
	quickButtonsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 8,
		marginTop: 4,
	},
	quickButton: {
		flex: 1,
		height: 44,
		borderRadius: 8,
		borderWidth: 1.5,
		justifyContent: 'center',
		alignItems: 'center',
	},
	quickButtonText: {
		fontSize: 15,
		fontWeight: '700',
	},
});
