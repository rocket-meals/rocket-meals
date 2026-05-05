import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import {
	SettingsList,
	SettingsListTextInput,
	useMyScrollViewModal,
	useTheme,
	MyColorPicker,
} from 'repo-depkit-common-ui';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from 'expo-router';
import {
	addPlayer,
	renamePlayer,
	setPlayerColor,
	removePlayer,
	setScore,
	addRound,
	resetScores,
	resetAll,
} from '../store/gameSlice';
import type { AppDispatch, RootState } from '../store/store';
import { PLAYER_COLORS } from '../helpers/GameStorage';

const PRIMARY_COLOR = '#2563eb';
const DANGER_COLOR = '#dc2626';

const TILE_BORDER_RADIUS = 16;
const TILE_GAP = 12;
const MIN_TILE_HEIGHT = 120;

// Helper to determine groupPosition for list items
function getGroupPosition(index: number, total: number): 'top' | 'middle' | 'bottom' {
	if (total === 1 || index === 0) return 'top';
	if (index === total - 1) return 'bottom';
	return 'middle';
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
		const num = parseInt(text, 10);
		if (isNaN(num)) {
			onSave(null);
			return;
		}
		onSave(signMode === 'minus' ? -Math.abs(num) : Math.abs(num));
	}, [text, signMode, onSave]);

	const handleQuickScore = useCallback(
		(delta: number) => {
			const currentNum = text.trim() === '' ? 0 : parseInt(text, 10) || 0;
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
					<BottomSheetTextInput
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

// ─── Player Tile ──────────────────────────────────────────────────────────────

function PlayerTile({
	name,
	score,
	color,
	isLeader,
	onPress,
	onLongPress,
	tileHeight,
	tileWidth,
}: {
	name: string;
	score: number;
	color: string;
	isLeader: boolean;
	onPress: () => void;
	onLongPress: () => void;
	tileHeight: number;
	tileWidth?: number;
}) {
	return (
		<TouchableOpacity
			style={[
				styles.playerTile,
				{
					backgroundColor: color,
					height: tileHeight,
					width: tileWidth,
				},
			]}
			onPress={onPress}
			onLongPress={onLongPress}
			activeOpacity={0.8}
		>
			{isLeader && (
				<View style={styles.leaderBadge}>
					<Ionicons name="trophy" size={28} color="#fbbf24" />
				</View>
			)}
			<Text style={styles.playerTileName} numberOfLines={2} adjustsFontSizeToFit>
				{name}
			</Text>
			<Text style={styles.playerTileScore}>{score}</Text>
			<Text style={styles.playerTileLabel}>Punkte</Text>
		</TouchableOpacity>
	);
}

// ─── Game Screen ──────────────────────────────────────────────────────────────

export default function GameScreen() {
	const { theme } = useTheme();
	const insets = useSafeAreaInsets();
	const dispatch = useDispatch<AppDispatch>();
	const players = useSelector((state: RootState) => state.game.players);
	const rounds = useSelector((state: RootState) => state.game.rounds);
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const { show: showDeleteModal, close: closeDeleteModal } = useMyScrollViewModal();
	const { show: showScoreModal, close: closeScoreModal } = useMyScrollViewModal();
	const { show: showEditModal, close: closeEditModal } = useMyScrollViewModal();
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();

	const navigation = useNavigation();

	// Landscape detection and column count
	const isLandscape = windowWidth > windowHeight;
	const columnCount = (players.length === 4 || (isLandscape && players.length >= 2)) ? 2 : 1;

	// Keep a ref to players so the header handler always has fresh data
	const playersRef = useRef(players);
	playersRef.current = players;

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

	// Find leader (player with highest score)
	const leaderId = useMemo(() => {
		if (players.length === 0) return null;
		let maxScore = -Infinity;
		let maxId: string | null = null;
		for (const player of players) {
			const total = totals[player.id] ?? 0;
			if (total > maxScore) {
				maxScore = total;
				maxId = player.id;
			}
		}
		// Only show leader if at least one player has a score > 0
		if (maxScore <= 0) return null;
		return maxId;
	}, [players, totals]);

	// Compute tile height to fill screen
	const tileHeight = useMemo(() => {
		const count = players.length;
		if (count === 0) return 200;
		// Available height: window minus header (~56), bottom bar (~80), safe areas, gaps
		const rows = Math.ceil(count / columnCount);
		const availableHeight = windowHeight - 56 - 80 - insets.top - insets.bottom - TILE_GAP * (rows + 1);
		const minHeight = MIN_TILE_HEIGHT;
		return Math.max(minHeight, Math.floor(availableHeight / rows));
	}, [players.length, windowHeight, insets.top, insets.bottom, columnCount]);

	// Tile width for multi-column grid layout
	const tileWidth = useMemo(() => {
		if (columnCount === 1) return undefined;
		const availableWidth = windowWidth - insets.left - insets.right;
		return Math.floor((availableWidth - TILE_GAP * (columnCount + 1)) / columnCount);
	}, [columnCount, windowWidth, insets.left, insets.right]);

	// ─── Header buttons ───────────────────────────────────────────────────────

	const handleOpenEditNamesModal = useCallback(() => {
		const currentPlayers = playersRef.current;
		showEditModal({
			title: '✏️ Namen bearbeiten',
			children: (
				<View style={styles.modalContent}>
					{currentPlayers.map((player, index) => (
						<SettingsListTextInput
							key={player.id}
							label={player.name}
							placeholder="Name eingeben"
							initialValue={player.name}
							onSave={(newName) => {
								dispatch(renamePlayer({ playerId: player.id, name: newName }));
							}}
							groupPosition={getGroupPosition(index, currentPlayers.length)}
						/>
					))}
				</View>
			),
		});
	}, [showEditModal, dispatch]);

	React.useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<View style={styles.headerButtons}>
					<TouchableOpacity onPress={handleOpenEditNamesModal} style={styles.headerButton}>
						<Ionicons name="create-outline" size={22} color={theme.header.text} />
					</TouchableOpacity>
					<TouchableOpacity onPress={handleOpenDeleteModal} style={styles.headerButton}>
						<Ionicons name="trash-outline" size={22} color={theme.header.text} />
					</TouchableOpacity>
					<TouchableOpacity onPress={handleAddPlayer} style={styles.headerButton}>
						<Ionicons name="person-add-outline" size={22} color={theme.header.text} />
					</TouchableOpacity>
				</View>
			),
		});
	}, [navigation, theme.header.text, handleOpenEditNamesModal]);

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const handleAddPlayer = useCallback(() => {
		dispatch(addPlayer());
	}, [dispatch]);

	const handleOpenPlayerModal = useCallback(
		(playerId: string, playerName: string, playerColor: string) => {
			showModal({
				title: playerName,
				children: (
					<View style={styles.modalContent}>
						<SettingsListTextInput
							label="Name ändern"
							placeholder="Name eingeben"
							initialValue={playerName}
							onSave={(newName) => {
								dispatch(renamePlayer({ playerId, name: newName }));
								closeModal();
							}}
							groupPosition="top"
						/>
						<SettingsList
							label="Farbe ändern"
							leftIcon={<Ionicons name="color-palette-outline" size={20} color="#ffffff" />}
							iconBgColor={playerColor}
							groupPosition="middle"
						/>
						<MyColorPicker
							colors={PLAYER_COLORS}
							selectedColor={playerColor}
							onSelect={(color) => {
								dispatch(setPlayerColor({ playerId, color }));
							}}
						/>
						<SettingsList
							label="Spieler löschen"
							leftIcon={<Ionicons name="trash-outline" size={20} color="#ffffff" />}
							iconBgColor={DANGER_COLOR}
							handleFunction={() => {
								dispatch(removePlayer(playerId));
								closeModal();
							}}
							groupPosition="bottom"
						/>
					</View>
				),
			});
		},
		[showModal, closeModal, dispatch],
	);

	const handleOpenDeleteModal = useCallback(() => {
		showDeleteModal({
			title: '🗑️ Daten verwalten',
			children: (
				<View style={styles.modalContent}>
					<SettingsList
						label="Alle Punkte zurücksetzen"
						leftIcon={<Ionicons name="refresh-outline" size={20} color="#ffffff" />}
						iconBgColor="#f59e0b"
						handleFunction={() => {
							dispatch(resetScores());
							closeDeleteModal();
						}}
						groupPosition="top"
					/>
					<SettingsList
						label="Alle Spieler & Punkte löschen"
						leftIcon={<Ionicons name="trash-outline" size={20} color="#ffffff" />}
						iconBgColor={DANGER_COLOR}
						handleFunction={() => {
							dispatch(resetAll());
							closeDeleteModal();
						}}
						groupPosition="bottom"
					/>
				</View>
			),
		});
	}, [showDeleteModal, closeDeleteModal, dispatch]);

	const handleTilePress = useCallback(
		(playerId: string) => {
			// If there are no rounds yet, add one first — the score modal
			// will open on next render via the effect below.
			if (rounds.length === 0) {
				dispatch(addRound());
				// Rounds state will update on next render; schedule modal open
				pendingScorePlayerRef.current = playerId;
				return;
			}
			openScoreModalForPlayer(playerId);
		},
		[rounds, dispatch],
	);

	const pendingScorePlayerRef = React.useRef<string | null>(null);

	const openScoreModalForPlayer = useCallback(
		(playerId: string) => {
			const latestRound = rounds[rounds.length - 1];
			if (!latestRound) return;
			showScoreModal({
				title: 'Punkte eingeben',
				children: (
					<ScoreInputContent
						initialValue={latestRound.scores[playerId] ?? null}
						onSave={(value) => {
							dispatch(setScore({ roundId: latestRound.id, playerId, score: value }));
							closeScoreModal();
						}}
					/>
				),
			});
		},
		[rounds, showScoreModal, closeScoreModal, dispatch],
	);

	// Open score modal after a round was auto-created
	React.useEffect(() => {
		if (pendingScorePlayerRef.current && rounds.length > 0) {
			const playerId = pendingScorePlayerRef.current;
			pendingScorePlayerRef.current = null;
			openScoreModalForPlayer(playerId);
		}
	}, [rounds, openScoreModalForPlayer]);

	const handleAddRound = useCallback(() => {
		dispatch(addRound());
	}, [dispatch]);

	// ─── Empty state ──────────────────────────────────────────────────────────

	if (players.length === 0) {
		return (
			<View style={[styles.emptyContainer, { backgroundColor: theme.screen.background, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
				<Ionicons name="people-outline" size={64} color={theme.screen.icon} />
				<Text style={[styles.emptyText, { color: theme.screen.text }]}>
					Noch keine Spieler
				</Text>
				<Text style={[styles.emptySubtext, { color: theme.screen.placeholder }]}>
					Füge einen Spieler über den + Button im Header hinzu
				</Text>
			</View>
		);
	}

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background, paddingLeft: insets.left, paddingRight: insets.right }]}>
			<ScrollView
				style={styles.tilesScroll}
				contentContainerStyle={[
					styles.tilesContainer,
					columnCount > 1 && styles.tilesContainerGrid,
					{ paddingBottom: insets.bottom + 80 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{players.map((player) => (
					<PlayerTile
						key={player.id}
						name={player.name}
						score={totals[player.id] ?? 0}
						color={player.color}
						isLeader={player.id === leaderId}
						onPress={() => handleTilePress(player.id)}
						onLongPress={() => handleOpenPlayerModal(player.id, player.name, player.color)}
						tileHeight={tileHeight}
						tileWidth={tileWidth}
					/>
				))}
			</ScrollView>

			{/* Bottom bar: "Nächste Runde" button */}
			<View style={[styles.bottomBar, { borderTopColor: theme.screen.border, paddingBottom: insets.bottom + 12 }]}>
				<TouchableOpacity
					style={[styles.nextRoundButton, { backgroundColor: PRIMARY_COLOR }]}
					onPress={handleAddRound}
					activeOpacity={0.8}
				>
					<Text style={styles.nextRoundText}>Nächste Runde</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
	},
	emptyText: {
		fontSize: 18,
		fontWeight: '600',
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: 14,
		marginTop: 8,
		textAlign: 'center',
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
	playerTile: {
		borderRadius: TILE_BORDER_RADIUS,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		position: 'relative',
	},
	leaderBadge: {
		position: 'absolute',
		top: 12,
		right: 12,
		backgroundColor: 'rgba(0,0,0,0.25)',
		borderRadius: 20,
		width: 40,
		height: 40,
		justifyContent: 'center',
		alignItems: 'center',
	},
	playerTileName: {
		fontSize: 28,
		fontWeight: '700',
		color: '#ffffff',
		textAlign: 'center',
		marginBottom: 8,
	},
	playerTileScore: {
		fontSize: 56,
		fontWeight: '800',
		color: '#ffffff',
		textAlign: 'center',
	},
	playerTileLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: 'rgba(255,255,255,0.75)',
		textAlign: 'center',
		marginTop: 4,
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
