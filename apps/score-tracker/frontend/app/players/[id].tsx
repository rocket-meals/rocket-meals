import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
	SettingsList,
	SettingsListGroupTitle,
	SettingsListTextInput,
	SettingsListAvatar,
	MyColorPicker,
	useMyScrollViewModal,
	useTheme,
	AvatarStyle,
} from 'repo-depkit-common-ui';
import { useDispatch, useSelector } from 'react-redux';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { renameFriend, setFriendColor, setFriendAvatar, removeFriend } from '../../store/friendsSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { PLAYER_COLORS } from '../../helpers/GameStorage';
import { ComponentIds } from '../../constants/ComponentIds';

const DANGER_COLOR = '#dc2626';

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PlayerDetailScreen() {
	const { theme } = useTheme();
	const insets = useSafeAreaInsets();
	const dispatch = useDispatch<AppDispatch>();
	const { id } = useLocalSearchParams<{ id: string }>();
	const friend = useSelector((state: RootState) => state.friends.friends.find((f) => f.id === id));
	const historyEntries = useSelector((state: RootState) => state.gameHistory.entries);
	const { show: showColorModal, close: closeColorModal } = useMyScrollViewModal();
	const navigation = useNavigation();

	// This screen is a top-level Drawer.Screen (see app/_layout.tsx), so by default its
	// header shows the hamburger/drawer-toggle icon instead of a back arrow. Override it
	// with an explicit back button so users can return to the Players list without having
	// to open the side menu.
	React.useLayoutEffect(() => {
		navigation.setOptions({
			headerLeft: () => (
				<TouchableOpacity
					nativeID={ComponentIds.PLAYER_DETAIL_BACK_BUTTON}
					onPress={() => router.navigate('/players')}
					style={styles.headerButton}
					hitSlop={8}
				>
					<Ionicons name="arrow-back" size={22} color={theme.header.text} />
				</TouchableOpacity>
			),
		});
	}, [navigation, theme.header.text]);

	const friendGames = useMemo(() => {
		if (!friend) return [];
		return historyEntries
			.filter((entry) => entry.players.some((p) => p.friendId === friend.id))
			.map((entry) => {
				const sorted = [...entry.players].sort(
					(a, b) => (entry.finalScores[b.playerId] ?? 0) - (entry.finalScores[a.playerId] ?? 0),
				);
				const playerEntry = entry.players.find((p) => p.friendId === friend.id)!;
				const rank = sorted.findIndex((p) => p.playerId === playerEntry.playerId) + 1;
				return {
					id: entry.id,
					endedAt: entry.endedAt,
					roundsCount: entry.roundsCount,
					score: entry.finalScores[playerEntry.playerId] ?? 0,
					rank,
					totalPlayers: entry.players.length,
				};
			})
			.sort((a, b) => b.endedAt - a.endedAt);
	}, [historyEntries, friend]);

	const handleOpenColorModal = useCallback(() => {
		if (!friend) return;
		showColorModal({
			title: 'Farbe wählen',
			children: (
				<MyColorPicker
					colors={PLAYER_COLORS}
					selectedColor={friend.color}
					onSelect={(color) => {
						dispatch(setFriendColor({ friendId: friend.id, color }));
						closeColorModal();
					}}
				/>
			),
		});
	}, [showColorModal, closeColorModal, friend, dispatch]);

	const handleDelete = useCallback(() => {
		if (!friend) return;
		dispatch(removeFriend(friend.id));
		router.back();
	}, [friend, dispatch]);

	if (!friend) {
		return (
			<View style={[styles.emptyContainer, { backgroundColor: theme.screen.background }]}>
				<Text style={{ color: theme.screen.text }}>Freund nicht gefunden.</Text>
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
				<SettingsListAvatar
					config={friend.avatarConfig}
					onChange={(config) => dispatch(setFriendAvatar({ friendId: friend.id, avatarConfig: config }))}
					label="Avatar"
					previewSize={72}
					avatarBackgroundColor={friend.color}
					groupPosition="top"
					editorOptions={{ title: 'Avatar', allowedStyles: [AvatarStyle.AVATAAARS], enablePhotoImport: true }}
				/>
				<SettingsListTextInput
					label="Name"
					placeholder="Name eingeben"
					initialValue={friend.name}
					value={friend.name}
					onSave={(name) => {
						dispatch(renameFriend({ friendId: friend.id, name }));
					}}
					groupPosition="middle"
				/>
				<SettingsList
					label="Farbe"
					leftIcon={<Ionicons name="color-palette-outline" size={20} color="#ffffff" />}
					iconBgColor={friend.color}
					handleFunction={handleOpenColorModal}
					groupPosition="middle"
				/>
				<SettingsList
					nativeID={ComponentIds.PLAYER_DETAIL_DELETE_BUTTON}
					label="Freund löschen"
					leftIcon={<Ionicons name="trash-outline" size={20} color="#ffffff" />}
					iconBgColor={DANGER_COLOR}
					handleFunction={handleDelete}
					groupPosition="bottom"
				/>

				<SettingsListGroupTitle title="Gespielte Spiele" />
				{friendGames.length === 0 ? (
					<Text style={[styles.emptyHint, { color: theme.screen.placeholder }]}>
						Noch keine gespielten Spiele.
					</Text>
				) : (
					friendGames.map((game, index) => (
						<SettingsList
							key={game.id}
							label={formatDate(game.endedAt)}
							value={`${game.score} Punkte · Platz ${game.rank}/${game.totalPlayers} · ${game.roundsCount} Runden`}
							leftIcon={<Ionicons name="trophy-outline" size={20} color="#ffffff" />}
							iconBgColor={friend.color}
							groupPosition={index === 0 ? 'top' : index === friendGames.length - 1 ? 'bottom' : 'middle'}
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
	headerButton: {
		padding: 4,
		marginLeft: 8,
	},
	listContent: {
		padding: 12,
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
});
