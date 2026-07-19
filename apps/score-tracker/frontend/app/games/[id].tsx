import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
	SettingsList,
	SettingsListGroupTitle,
	SettingsListTextInput,
	SettingsListNumberInput,
	SettingsListSelectOptionSingle,
	MyAvatar,
	useMyScrollViewModal,
	useTheme,
} from 'repo-depkit-common-ui';
import { MathHelper } from 'repo-depkit-common';
import * as Clipboard from 'expo-clipboard';
import { useDispatch, useSelector } from 'react-redux';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import {
	renameGameType,
	setGameTypeIcon,
	setGameTypeScoringMode,
	setGameTypeMaxRounds,
	setGameTypeMaxScore,
	setGameTypeRules,
	setGameTypeStartingPlayerMode,
	setGameTypeVersion,
	updateGameTypeFromPreset,
	addGameTypeFromPreset,
	removeGameType,
} from '../../store/gameTypesSlice';
import { resetScores, setGameType } from '../../store/gameSlice';
import { archiveGame } from '../../store/gameHistorySlice';
import type { AppDispatch, RootState } from '../../store/store';
import type { GameHistoryEntry, GameHistoryPlayerEntry } from '../../helpers/GameHistoryStorage';
import { GAME_TYPE_ICONS } from '../../helpers/GameTypesStorage';
import type { ScoringMode, GameType } from '../../helpers/GameTypesStorage';
import type { GamePreset, StartingPlayerMode } from '../../helpers/GameRules';
import { parseGamePreset, STARTING_PLAYER_MODES, ROTATE_PLAYER_ORDER_RULE } from '../../helpers/GameRules';
import { ComponentIds } from '../../constants/ComponentIds';
import GameTypeIcon from '../../components/GameTypeIcon';

const PRIMARY_COLOR = '#2563eb';
const DANGER_COLOR = '#dc2626';
const DEBUG_COLOR = '#7c3aed';

function generateHistoryId(): string {
	return Date.now().toString(36) + MathHelper.randomBase36String(6);
}

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Strip the instance-specific id/createdAt so a game type can be shared/re-imported as a template. */
function gameTypeToPreset(gameType: GameType): GamePreset {
	return {
		name: gameType.name,
		icon: gameType.icon,
		scoringMode: gameType.scoringMode,
		maxRounds: gameType.maxRounds ?? null,
		maxScore: gameType.maxScore ?? null,
		rules: gameType.rules ?? null,
		startingPlayerMode: gameType.startingPlayerMode ?? 'fixed',
		version: gameType.version ?? 1,
	};
}

// ─── Icon picker modal content ────────────────────────────────────────────────

function IconPickerContent({ selectedIcon, onSelect }: { selectedIcon: string; onSelect: (icon: string) => void }) {
	const { theme } = useTheme();
	return (
		<View style={styles.iconGrid}>
			{GAME_TYPE_ICONS.map((icon) => {
				const isSelected = icon === selectedIcon;
				return (
					<TouchableOpacity
						key={icon}
						style={[
							styles.iconGridItem,
							{ borderColor: isSelected ? PRIMARY_COLOR : theme.screen.border, backgroundColor: isSelected ? PRIMARY_COLOR + '20' : 'transparent' },
						]}
						onPress={() => onSelect(icon)}
						activeOpacity={0.7}
					>
						<Text style={styles.iconGridEmoji}>{icon}</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

// ─── Scoring mode modal content (live-updating, subscribes to the store) ─────

function ScoringModeSection({ gameTypeId }: { gameTypeId: string }) {
	const dispatch = useDispatch<AppDispatch>();
	const gameType = useSelector((state: RootState) => state.gameTypes.gameTypes.find((g) => g.id === gameTypeId));
	if (!gameType) return null;

	const options: { mode: ScoringMode; label: string; icon: React.ReactNode }[] = [
		{ mode: 'highWins', label: 'Viele Punkte gewinnen', icon: <Ionicons name="trending-up-outline" size={20} color="#ffffff" /> },
		{ mode: 'lowWins', label: 'Wenige Punkte gewinnen', icon: <Ionicons name="trending-down-outline" size={20} color="#ffffff" /> },
	];

	return (
		<View style={styles.modalContent}>
			{options.map((option, index) => (
				<SettingsListSelectOptionSingle
					key={option.mode}
					label={option.label}
					leftIcon={option.icon}
					iconBgColor={PRIMARY_COLOR}
					isSelected={gameType.scoringMode === option.mode}
					onPress={() => dispatch(setGameTypeScoringMode({ gameTypeId, scoringMode: option.mode }))}
					groupPosition={index === 0 ? 'top' : 'bottom'}
				/>
			))}
		</View>
	);
}

// ─── Starting-player mode modal content (live-updating, subscribes to the store) ──
//
// Three built-in modes (see GameRules `computeNextStartingPlayerIndex`) plus a
// "custom" escape hatch that hands the decision to `rules.playerOrder`, a
// small JSON expression tree edited via the "Code bearbeiten" field below -
// same reasoning as the score-entry rules above.

const STARTING_PLAYER_MODE_INFO: Record<StartingPlayerMode, { label: string; icon: React.ReactNode }> = {
	fixed: {
		label: 'Reihenfolge bleibt gleich',
		icon: <Ionicons name="reorder-three-outline" size={20} color="#ffffff" />,
	},
	previousWinner: {
		label: 'Bester der letzten Runde beginnt',
		icon: <Ionicons name="trophy-outline" size={20} color="#ffffff" />,
	},
	rotate: {
		label: 'Startspieler rotiert reihum',
		icon: <Ionicons name="sync-outline" size={20} color="#ffffff" />,
	},
	custom: {
		label: 'Benutzerdefiniert (JSON-Regel)',
		icon: <MaterialCommunityIcons name="code-json" size={20} color="#ffffff" />,
	},
};

function StartingPlayerModeSection({ gameTypeId }: { gameTypeId: string }) {
	const dispatch = useDispatch<AppDispatch>();
	const gameType = useSelector((state: RootState) => state.gameTypes.gameTypes.find((g) => g.id === gameTypeId));
	if (!gameType) return null;
	const mode: StartingPlayerMode = gameType.startingPlayerMode ?? 'fixed';

	return (
		<View style={styles.modalContent}>
			{STARTING_PLAYER_MODES.map((candidate, index) => (
				<SettingsListSelectOptionSingle
					key={candidate}
					nativeID={`${ComponentIds.GAME_STARTING_PLAYER_MODE_ROW_PREFIX}${candidate}`}
					label={STARTING_PLAYER_MODE_INFO[candidate].label}
					leftIcon={STARTING_PLAYER_MODE_INFO[candidate].icon}
					iconBgColor={PRIMARY_COLOR}
					isSelected={mode === candidate}
					onPress={() => {
						dispatch(setGameTypeStartingPlayerMode({ gameTypeId, startingPlayerMode: candidate }));
						// Seed a working default so "custom" is never left without a rule to evaluate.
						if (candidate === 'custom' && !gameType.rules?.playerOrder) {
							dispatch(
								setGameTypeRules({
									gameTypeId,
									rules: { version: 1, scoreEntry: gameType.rules?.scoreEntry, playerOrder: ROTATE_PLAYER_ORDER_RULE },
								}),
							);
						}
					}}
					groupPosition={index === 0 ? 'top' : index === STARTING_PLAYER_MODES.length - 1 ? 'bottom' : 'middle'}
				/>
			))}
			{mode === 'custom' && (
				<Text style={styles.startingPlayerHint}>
					Die Regel wird als „playerOrder“ im JSON unter „Code bearbeiten“ gepflegt (Felder: startIndex, nextState, initialState).
				</Text>
			)}
		</View>
	);
}

// ─── Match row (one archived game of this game type) ─────────────────────────

const MATCH_AVATAR_SIZE = 28;
const MAX_MATCH_AVATARS = 5;

function MatchParticipants({ players }: { players: GameHistoryPlayerEntry[] }) {
	const shown = players.slice(0, MAX_MATCH_AVATARS);
	const extra = players.length - shown.length;
	return (
		<View style={styles.matchAvatarsRow}>
			{shown.map((player, index) => (
				<View
					key={player.playerId}
					style={[
						styles.matchAvatarWrapper,
						{ marginLeft: index === 0 ? 0 : -MATCH_AVATAR_SIZE * 0.35, zIndex: shown.length - index },
					]}
				>
					<MyAvatar
						style={player.avatarConfig?.style}
						options={player.avatarConfig?.options}
						size={MATCH_AVATAR_SIZE}
						rounded
						backgroundColor={player.color || '#ffffff'}
					/>
				</View>
			))}
			{extra > 0 && <Text style={styles.matchAvatarsExtra}>+{extra}</Text>}
		</View>
	);
}

// ─── Game detail screen ───────────────────────────────────────────────────────

export default function GameTypeDetailScreen() {
	const { theme } = useTheme();
	const insets = useSafeAreaInsets();
	const dispatch = useDispatch<AppDispatch>();
	const navigation = useNavigation();
	const { id } = useLocalSearchParams<{ id: string }>();
	const gameType = useSelector((state: RootState) => state.gameTypes.gameTypes.find((g) => g.id === id));
	const historyEntries = useSelector((state: RootState) => state.gameHistory.entries);
	const activeGame = useSelector((state: RootState) => state.game);
	const debugMode = useSelector((state: RootState) => state.debug.debugMode);
	const { show: showModal, close: closeModal } = useMyScrollViewModal();

	// Header: back arrow to the games list (drawer navigators have no reliable
	// push history, so navigate explicitly - same reasoning as the old friend
	// detail screen).
	useLayoutEffect(() => {
		navigation.setOptions({
			title: gameType ? `${gameType.icon} ${gameType.name}` : 'Spiel',
			headerLeft: () => (
				<TouchableOpacity
					nativeID={ComponentIds.GAME_DETAIL_BACK_BUTTON}
					onPress={() => router.replace('/games')}
					style={styles.headerBackButton}
				>
					<Ionicons name="arrow-back" size={24} color={theme.header.text} />
				</TouchableOpacity>
			),
		});
	}, [navigation, theme.header.text, gameType]);

	const matches = useMemo(() => {
		if (!gameType) return [];
		return historyEntries
			.filter((entry) => entry.gameTypeId === gameType.id)
			.map((entry) => {
				const ranked = [...entry.players].sort((a, b) => {
					const scoreA = entry.finalScores[a.playerId] ?? 0;
					const scoreB = entry.finalScores[b.playerId] ?? 0;
					return gameType.scoringMode === 'lowWins' ? scoreA - scoreB : scoreB - scoreA;
				});
				const winner = ranked[0];
				return {
					id: entry.id,
					endedAt: entry.endedAt,
					roundsCount: entry.roundsCount,
					players: entry.players,
					winnerName: winner ? winner.name : undefined,
					winnerScore: winner ? entry.finalScores[winner.playerId] ?? 0 : 0,
				};
			})
			.sort((a, b) => b.endedAt - a.endedAt);
	}, [historyEntries, gameType]);

	const handleOpenIconModal = useCallback(() => {
		if (!gameType) return;
		showModal({
			title: 'Bild wählen',
			children: (
				<IconPickerContent
					selectedIcon={gameType.icon}
					onSelect={(icon) => {
						dispatch(setGameTypeIcon({ gameTypeId: gameType.id, icon }));
						closeModal();
					}}
				/>
			),
		});
	}, [showModal, closeModal, gameType, dispatch]);

	const handleOpenScoringModal = useCallback(() => {
		if (!gameType) return;
		showModal({
			title: 'Wertung',
			children: <ScoringModeSection gameTypeId={gameType.id} />,
		});
	}, [showModal, gameType]);

	const handleOpenStartingPlayerModal = useCallback(() => {
		if (!gameType) return;
		showModal({
			title: 'Startspieler',
			children: <StartingPlayerModeSection gameTypeId={gameType.id} />,
		});
	}, [showModal, gameType]);

	const handleDelete = useCallback(() => {
		if (!gameType) return;
		dispatch(removeGameType(gameType.id));
		router.replace('/games');
	}, [gameType, dispatch]);

	// Start a new match of this game: archive a still-running match first (it
	// keeps its own game type), then reuse the current player list in the setup
	// phase with this game type preselected.
	const handleStartMatch = useCallback(() => {
		if (!gameType) return;
		if (activeGame.status === 'active' && activeGame.players.length > 0) {
			const totals: Record<string, number> = {};
			for (const player of activeGame.players) {
				let total = 0;
				for (const round of activeGame.rounds) {
					const score = round.scores[player.id];
					if (score != null) total += score;
				}
				totals[player.id] = total;
			}
			const entry: GameHistoryEntry = {
				id: generateHistoryId(),
				endedAt: Date.now(),
				roundsCount: activeGame.rounds.length,
				players: activeGame.players.map((p) => ({
					playerId: p.id,
					friendId: p.friendId,
					name: p.name,
					color: p.color,
					avatarConfig: p.avatarConfig,
				})),
				finalScores: totals,
				gameTypeId: activeGame.gameTypeId,
			};
			dispatch(archiveGame(entry));
		}
		dispatch(resetScores());
		dispatch(setGameType(gameType.id));
		router.push('/');
	}, [gameType, activeGame, dispatch]);

	const handleCopyId = useCallback(async () => {
		if (!gameType) return;
		await Clipboard.setStringAsync(gameType.id);
	}, [gameType]);

	const handleExportPreset = useCallback(async () => {
		if (!gameType) return;
		await Clipboard.setStringAsync(JSON.stringify(gameTypeToPreset(gameType), null, 2));
	}, [gameType]);

	const handleImportPreset = useCallback(
		(value: string) => {
			const preset = parseGamePreset(value);
			if (!preset) return;
			const action = dispatch(addGameTypeFromPreset(preset));
			router.push({ pathname: '/games/[id]', params: { id: action.payload.id } });
		},
		[dispatch],
	);

	// Only clears the score-entry rules (card picker) - a custom player-order
	// rule living in the same `rules` object, if any, is kept intact.
	const handleRemoveRules = useCallback(() => {
		if (!gameType) return;
		if (gameType.rules?.playerOrder) {
			dispatch(setGameTypeRules({ gameTypeId: gameType.id, rules: { version: 1, playerOrder: gameType.rules.playerOrder } }));
		} else {
			dispatch(setGameTypeRules({ gameTypeId: gameType.id, rules: null }));
		}
	}, [gameType, dispatch]);

	const handleEditCode = useCallback(
		(value: string) => {
			if (!gameType) return;
			const preset = parseGamePreset(value);
			if (!preset) return;
			dispatch(updateGameTypeFromPreset({ gameTypeId: gameType.id, preset }));
		},
		[gameType, dispatch],
	);

	if (!gameType) {
		return (
			<View style={[styles.emptyContainer, { backgroundColor: theme.screen.background }]}>
				<Text style={{ color: theme.screen.text }}>Spiel nicht gefunden.</Text>
			</View>
		);
	}

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<ScrollView
				contentContainerStyle={[
					styles.listContent,
					{ paddingBottom: insets.bottom + 32, paddingLeft: insets.left, paddingRight: insets.right },
				]}
			>
				<SettingsList
					label="Bild"
					leftIconComponent={
						<View style={styles.gameIconWrapper}>
							<GameTypeIcon icon={gameType.icon} size={48} />
						</View>
					}
					rightIcon={<MaterialCommunityIcons name="pencil" size={20} color="#ffffff" />}
					handleFunction={handleOpenIconModal}
					groupPosition="top"
				/>
				<SettingsListTextInput
					label="Name"
					placeholder="Name eingeben"
					initialValue={gameType.name}
					value={gameType.name}
					onSave={(name) => {
						dispatch(renameGameType({ gameTypeId: gameType.id, name }));
					}}
					groupPosition="middle"
				/>
				<SettingsList
					label="Wertung"
					value={gameType.scoringMode === 'lowWins' ? 'Wenige Punkte gewinnen' : 'Viele Punkte gewinnen'}
					leftIcon={
						<Ionicons
							name={gameType.scoringMode === 'lowWins' ? 'trending-down-outline' : 'trending-up-outline'}
							size={20}
							color="#ffffff"
						/>
					}
					iconBgColor={PRIMARY_COLOR}
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={handleOpenScoringModal}
					groupPosition="middle"
				/>
				<SettingsListNumberInput
					label="Max. Runden pro Partie"
					value={gameType.maxRounds ? String(gameType.maxRounds) : 'Unbegrenzt'}
					leftIcon={<Ionicons name="repeat-outline" size={20} color="#ffffff" />}
					iconBgColor={PRIMARY_COLOR}
					modalTitle="Max. Runden pro Partie"
					placeholder="z.B. 10"
					initialValue={gameType.maxRounds ?? undefined}
					min={1}
					max={99}
					onSave={(value) => {
						dispatch(setGameTypeMaxRounds({ gameTypeId: gameType.id, maxRounds: value }));
					}}
					allowDisable
					disableLabel="Unbegrenzt"
					onDisable={() => {
						dispatch(setGameTypeMaxRounds({ gameTypeId: gameType.id, maxRounds: null }));
					}}
					groupPosition="middle"
				/>
				<SettingsListNumberInput
					label="Maximale Punktzahl"
					value={gameType.maxScore ? String(gameType.maxScore) : 'Unbegrenzt'}
					leftIcon={<Ionicons name="flag-outline" size={20} color="#ffffff" />}
					iconBgColor={PRIMARY_COLOR}
					modalTitle="Maximale Punktzahl"
					placeholder="z.B. 100"
					initialValue={gameType.maxScore ?? undefined}
					min={1}
					max={999999}
					onSave={(value) => {
						dispatch(setGameTypeMaxScore({ gameTypeId: gameType.id, maxScore: value }));
					}}
					allowDisable
					disableLabel="Unbegrenzt"
					onDisable={() => {
						dispatch(setGameTypeMaxScore({ gameTypeId: gameType.id, maxScore: null }));
					}}
					groupPosition="middle"
				/>
				<SettingsListNumberInput
					nativeID={ComponentIds.GAME_DETAIL_VERSION_ROW}
					label="Version"
					value={String(gameType.version ?? 1)}
					leftIcon={<MaterialCommunityIcons name="tag-outline" size={20} color="#ffffff" />}
					iconBgColor={PRIMARY_COLOR}
					modalTitle="Version"
					placeholder="z.B. 1"
					initialValue={gameType.version ?? 1}
					min={1}
					max={999999}
					onSave={(value) => {
						dispatch(setGameTypeVersion({ gameTypeId: gameType.id, version: value }));
					}}
					groupPosition="middle"
				/>
				<SettingsList
					nativeID={ComponentIds.GAME_DETAIL_DELETE_BUTTON}
					label="Spiel löschen"
					leftIcon={<Ionicons name="trash-outline" size={20} color="#ffffff" />}
					iconBgColor={DANGER_COLOR}
					handleFunction={handleDelete}
					groupPosition="bottom"
				/>

				<SettingsListGroupTitle title="Spielregeln" />
				<SettingsList
					label="Punkte-Eingabe"
					value={gameType.rules?.scoreEntry ? 'Kartenauswahl' : 'Zahleneingabe (Standard)'}
					leftIcon={<MaterialCommunityIcons name={gameType.rules?.scoreEntry ? 'cards-outline' : 'numeric'} size={20} color="#ffffff" />}
					iconBgColor={PRIMARY_COLOR}
					groupPosition="top"
				/>
				<SettingsList
					nativeID={ComponentIds.GAME_DETAIL_STARTING_PLAYER_ROW}
					label="Startspieler"
					value={STARTING_PLAYER_MODE_INFO[gameType.startingPlayerMode ?? 'fixed'].label}
					leftIcon={<Ionicons name="person-outline" size={20} color="#ffffff" />}
					iconBgColor={PRIMARY_COLOR}
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={handleOpenStartingPlayerModal}
					groupPosition={gameType.rules?.scoreEntry ? 'middle' : 'bottom'}
				/>
				{gameType.rules?.scoreEntry && (
					<SettingsList
						label="Regeln entfernen"
						value="Zurück zur Zahleneingabe"
						leftIcon={<Ionicons name="close-circle-outline" size={20} color="#ffffff" />}
						iconBgColor={DANGER_COLOR}
						handleFunction={handleRemoveRules}
						groupPosition="bottom"
					/>
				)}

				<SettingsListGroupTitle title="Code" />
				<SettingsListTextInput
					nativeID={ComponentIds.GAME_DETAIL_CODE_EDIT_ROW}
					label="Code bearbeiten"
					leftIcon={<MaterialCommunityIcons name="code-json" size={20} color="#ffffff" />}
					iconBgColor={PRIMARY_COLOR}
					modalTitle="Code bearbeiten"
					placeholder='{"name": "...", "icon": "🃏", "scoringMode": "highWins", "rules": {...}}'
					initialValue={JSON.stringify(gameTypeToPreset(gameType), null, 2)}
					saveLabel="Übernehmen"
					multiline
					numberOfLines={16}
					textAlignVertical="top"
					checkTextInput={(value) => ({ isValid: parseGamePreset(value) !== null, value })}
					onSave={handleEditCode}
					groupPosition="single"
				/>

				<SettingsListGroupTitle title="Spiel als Vorlage teilen" />
				<SettingsList
					nativeID={ComponentIds.GAME_DETAIL_EXPORT_ROW}
					label="Dieses Spiel exportieren"
					value={gameType.name}
					leftIcon={<Ionicons name="share-outline" size={20} color="#ffffff" />}
					iconBgColor={PRIMARY_COLOR}
					handleFunction={handleExportPreset}
					groupPosition="top"
				/>
				<SettingsListTextInput
					nativeID={ComponentIds.GAMES_IMPORT_PRESET_ROW}
					label="Spiel importieren"
					leftIcon={<Ionicons name="download-outline" size={20} color="#ffffff" />}
					iconBgColor={PRIMARY_COLOR}
					modalTitle="Spiel importieren"
					placeholder='{"name": "...", "icon": "🃏", "scoringMode": "highWins", "rules": {...}}'
					saveLabel="Importieren"
					multiline
					numberOfLines={10}
					textAlignVertical="top"
					checkTextInput={(value) => ({ isValid: parseGamePreset(value) !== null, value })}
					onSave={handleImportPreset}
					groupPosition="bottom"
				/>

				{debugMode && (
					<>
						<SettingsListGroupTitle title="Debug" />
						<SettingsList
							nativeID={ComponentIds.GAME_DETAIL_ID_ROW}
							label="ID"
							value={gameType.id}
							leftIcon={<MaterialCommunityIcons name="identifier" size={20} color="#ffffff" />}
							iconBgColor={DEBUG_COLOR}
							rightIcon={<MaterialCommunityIcons name="content-copy" size={18} color="#9ca3af" />}
							handleFunction={handleCopyId}
							groupPosition="single"
						/>
					</>
				)}

				<SettingsListGroupTitle title={`Partien (${matches.length})`} />
				<SettingsList
					nativeID={ComponentIds.GAME_DETAIL_START_MATCH_BUTTON}
					label="Neue Partie starten"
					leftIcon={<Ionicons name="play-outline" size={20} color="#ffffff" />}
					iconBgColor={PRIMARY_COLOR}
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={handleStartMatch}
					groupPosition="single"
				/>
				{matches.length === 0 ? (
					<Text style={[styles.emptyHint, { color: theme.screen.placeholder }]}>
						Noch keine Partien gespielt.
					</Text>
				) : (
					matches.map((match, index) => (
						<SettingsList
							key={match.id}
							nativeID={`${ComponentIds.GAME_DETAIL_MATCH_ROW_PREFIX}${match.id}`}
							label={formatDate(match.endedAt)}
							value={
								match.winnerName
									? `🏆 ${match.winnerName} (${match.winnerScore} Punkte) · ${match.roundsCount} Runden`
									: `${match.roundsCount} Runden`
							}
							stackedValue
							leftIcon={<Ionicons name="calendar-outline" size={20} color="#ffffff" />}
							iconBgColor={PRIMARY_COLOR}
							rightElement={<MatchParticipants players={match.players} />}
							groupPosition={index === 0 ? 'top' : index === matches.length - 1 ? 'bottom' : 'middle'}
						/>
					))
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	headerBackButton: {
		padding: 4,
		marginLeft: 8,
		marginRight: 8,
	},
	listContent: {
		padding: 12,
	},
	gameIconWrapper: {
		marginRight: 12,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyHint: {
		fontSize: 13,
		textAlign: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	modalContent: {
		padding: 10,
	},
	startingPlayerHint: {
		fontSize: 12,
		color: '#9ca3af',
		paddingHorizontal: 10,
		paddingTop: 10,
	},
	iconGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		padding: 10,
		justifyContent: 'center',
	},
	iconGridItem: {
		width: 56,
		height: 56,
		borderRadius: 12,
		borderWidth: 2,
		justifyContent: 'center',
		alignItems: 'center',
	},
	iconGridEmoji: {
		fontSize: 28,
	},
	matchAvatarsRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	matchAvatarWrapper: {
		borderRadius: MATCH_AVATAR_SIZE / 2,
	},
	matchAvatarsExtra: {
		marginLeft: 4,
		fontSize: 12,
		fontWeight: '600',
		color: '#9ca3af',
	},
});
