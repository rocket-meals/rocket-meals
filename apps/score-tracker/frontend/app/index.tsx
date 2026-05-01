import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import {
	SettingsList,
	SettingsListTextInput,
	useMyScrollViewModal,
	useTheme,
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
	PLAYER_COLORS,
} from '../store/gameSlice';
import type { AppDispatch, RootState } from '../store/store';

const PRIMARY_COLOR = '#2563eb';
const DANGER_COLOR = '#dc2626';
const HEADER_HEIGHT_APPROX = 56;
const BOTTOM_BAR_HEIGHT = 68;
const MIN_TILE_HEIGHT = 140;
const TILE_SPACING = 12;

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
				<Text style={styles.scoreInputSaveText}>Speichern</Text>
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

// ─── Color Picker Row ─────────────────────────────────────────────────────────

function ColorPickerRow({
	selectedColor,
	onSelect,
}: {
	selectedColor: string;
	onSelect: (color: string) => void;
}) {
	return (
		<View style={styles.colorPickerRow}>
			{PLAYER_COLORS.map((color) => (
				<TouchableOpacity
					key={color}
					style={[
						styles.colorCircle,
						{ backgroundColor: color },
						selectedColor === color && styles.colorCircleSelected,
					]}
					onPress={() => onSelect(color)}
					activeOpacity={0.7}
				>
					{selectedColor === color && (
						<Ionicons name="checkmark" size={20} color="#ffffff" />
					)}
				</TouchableOpacity>
			))}
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
	tileHeight,
}: {
	name: string;
	score: number;
	color: string;
	isLeader: boolean;
	onPress: () => void;
	tileHeight: number;
}) {
	return (
		<TouchableOpacity
			style={[styles.playerTile, { backgroundColor: color, height: tileHeight }]}
			onPress={onPress}
			activeOpacity={0.8}
		>
			{isLeader && (
				<View style={styles.leaderBadge}>
					<Ionicons name="trophy" size={28} color="#fbbf24" />
				</View>
			)}
			<Text style={styles.playerTileName} numberOfLines={2}>
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
	const { height: windowHeight } = useWindowDimensions();
	const dispatch = useDispatch<AppDispatch>();
	const players = useSelector((state: RootState) => state.game.players);
	const rounds = useSelector((state: RootState) => state.game.rounds);
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const { show: showDeleteModal, close: closeDeleteModal } = useMyScrollViewModal();
	const { show: showScoreModal, close: closeScoreModal } = useMyScrollViewModal();

	const navigation = useNavigation();

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

	// Find the leader (player with the highest score)
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
		// Only show leader if at least one player has > 0 points
		if (maxScore <= 0) return null;
		return maxId;
	}, [players, totals]);

	// Rounds reversed (newest first)
	const reversedRounds = useMemo(() => [...rounds].reverse(), [rounds]);

	// ─── Header buttons ───────────────────────────────────────────────────────

	React.useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<View style={styles.headerButtons}>
					<TouchableOpacity onPress={handleOpenDeleteModal} style={styles.headerButton}>
						<Ionicons name="trash-outline" size={22} color={theme.header.text} />
					</TouchableOpacity>
					<TouchableOpacity onPress={handleAddPlayer} style={styles.headerButton}>
						<Ionicons name="person-add-outline" size={22} color={theme.header.text} />
					</TouchableOpacity>
				</View>
			),
		});
	}, [navigation, theme.header.text]);

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
						<View style={styles.colorPickerSection}>
							<Text style={[styles.colorPickerLabel, { color: theme.screen.text }]}>Farbe ändern</Text>
							<ColorPickerRow
								selectedColor={playerColor}
								onSelect={(color) => {
									dispatch(setPlayerColor({ playerId, color }));
									closeModal();
								}}
							/>
						</View>
						<SettingsList
							label="Punkte eintragen"
							leftIcon={<Ionicons name="add-circle-outline" size={20} color="#ffffff" />}
							iconBgColor={PRIMARY_COLOR}
							handleFunction={() => {
								closeModal();
								// Open score input for the latest round, or create a round first
								if (rounds.length === 0) {
									dispatch(addRound());
								}
								const latestRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
								if (latestRound) {
									handleOpenScoreInput(latestRound.id, playerId, latestRound.scores[playerId] ?? null);
								}
							}}
							groupPosition="top"
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
		[showModal, closeModal, dispatch, rounds, theme.screen.text],
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

	const handleOpenScoreInput = useCallback(
		(roundId: string, playerId: string, currentScore: number | null) => {
			showScoreModal({
				title: 'Punkte eingeben',
				children: (
					<ScoreInputContent
						initialValue={currentScore}
						onSave={(value) => {
							dispatch(setScore({ roundId, playerId, score: value }));
							closeScoreModal();
						}}
					/>
				),
			});
		},
		[showScoreModal, closeScoreModal, dispatch],
	);

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

	// ─── Compute tile height so tiles fill the screen ─────────────────────────

	const availableHeight = windowHeight - insets.top - insets.bottom - BOTTOM_BAR_HEIGHT - HEADER_HEIGHT_APPROX;
	const tileHeight = Math.max(MIN_TILE_HEIGHT, Math.floor(availableHeight / Math.max(players.length, 1)) - TILE_SPACING);

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background, paddingLeft: insets.left, paddingRight: insets.right }]}>
			<ScrollView
				contentContainerStyle={styles.tilesContainer}
				showsVerticalScrollIndicator={false}
			>
				{players.map((player) => (
					<PlayerTile
						key={player.id}
						name={player.name}
						score={totals[player.id] ?? 0}
						color={player.color || PRIMARY_COLOR}
						isLeader={player.id === leaderId}
						onPress={() => handleOpenPlayerModal(player.id, player.name, player.color || PRIMARY_COLOR)}
						tileHeight={tileHeight}
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
	tilesContainer: {
		padding: 12,
		gap: 12,
	},
	playerTile: {
		borderRadius: 20,
		padding: 24,
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative',
	},
	leaderBadge: {
		position: 'absolute',
		top: 16,
		right: 16,
	},
	playerTileName: {
		fontSize: 26,
		fontWeight: '700',
		color: '#ffffff',
		textAlign: 'center',
		marginBottom: 8,
	},
	playerTileScore: {
		fontSize: 52,
		fontWeight: '800',
		color: '#ffffff',
	},
	playerTileLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: 'rgba(255,255,255,0.8)',
		marginTop: 4,
	},
	bottomBar: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		gap: 12,
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
	colorPickerSection: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	colorPickerLabel: {
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 10,
	},
	colorPickerRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	colorCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
	colorCircleSelected: {
		borderWidth: 3,
		borderColor: '#ffffff',
	},
	scoreInputContainer: {
		padding: 16,
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
