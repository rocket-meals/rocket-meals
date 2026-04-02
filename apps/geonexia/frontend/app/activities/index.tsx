import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
	Alert,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { SettingsListGroupTitle, useMyScrollViewModal, useTheme } from 'repo-depkit-common-ui';

import SettingsListActivity from '../../components/SettingsListActivity';
import { useDispatch } from 'react-redux';

import { loadActivities, saveActivity, SavedActivity } from '../../helpers/ActivityStorage';
import { loadRoutes, SavedRoute } from '../../helpers/RouteStorage';
import { isAvailable as isH3Available, latLngToCell } from '../../helpers/H3Helper';
import { rebuildMapFromActivities, computeActivityData, findEnclosedCellsFromHexTiles, H3_RESOLUTION_FALLBACK, hasForestFeature, BILLBOARD_PINE_TREE_LARGE } from '../../helpers/ActivityMapRebuildHelper';
import { loadHexTileFeatureCache, mergeHexTileFeatureCache, type HexTileFeatureCache } from '../../helpers/HexTileFeatureStorage';
import { queryTileFeaturesForHexCell } from '../../helpers/TileFeatureHelper';
import { BillboardAnchorColor } from '../../helpers/HexTileStorage';
import { startRun, markVisited, loadPersistedState, loadWalkedEdgesState, setBillboardAtAnchor } from '../../store/hexTileSlice';
import { AppDispatch } from '../../store/store';

const PRIMARY_COLOR = '#2563eb';

// ─── Import Content (shown inside bottom sheet modal) ─────────────────────────

const H3_IMPORT_RESOLUTION = 10;

function ImportContent({
	onImport,
	onCancel,
	theme,
}: {
	onImport: (code: string) => void;
	onCancel: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
}) {
	const [code, setCode] = useState('');
	return (
		<View style={styles.importContainer}>
			<Text style={[styles.importDescription, { color: theme.screen.text }]}>
				Paste the export code from the "Share Activity" button of another run.
			</Text>
			<TextInput
				style={[styles.importInput, { color: theme.screen.text, borderColor: theme.screen.text + '33', backgroundColor: theme.screen.background }]}
				placeholder="Paste export code here…"
				placeholderTextColor={theme.screen.icon}
				value={code}
				onChangeText={setCode}
				multiline
				numberOfLines={5}
				autoCapitalize="none"
				autoCorrect={false}
			/>
			<TouchableOpacity
				style={[styles.importConfirmButton, { backgroundColor: PRIMARY_COLOR, opacity: code.trim().length === 0 ? 0.4 : 1 }]}
				onPress={() => onImport(code.trim())}
				disabled={code.trim().length === 0}
				activeOpacity={0.8}
			>
				<MaterialIcons name="file-download" size={18} color="#ffffff" />
				<Text style={styles.importConfirmButtonText}>Import Run</Text>
			</TouchableOpacity>
			<TouchableOpacity style={styles.importCancelButton} onPress={onCancel} activeOpacity={0.8}>
				<Text style={[styles.importCancelButtonText, { color: theme.screen.text }]}>Cancel</Text>
			</TouchableOpacity>
		</View>
	);
}

// ─── Activities Screen ────────────────────────────────────────────────────────

export default function ActivitiesScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const navigation = useNavigation();
	const dispatch = useDispatch<AppDispatch>();
	const { show: showImportModal, close: closeImportModal } = useMyScrollViewModal();
	const [activities, setActivities] = useState<SavedActivity[]>([]);
	const [routes, setRoutes] = useState<SavedRoute[]>([]);
	const [loading, setLoading] = useState(true);

	const loadData = useCallback(() => {
		setLoading(true);
		Promise.all([loadActivities(), loadRoutes()])
			.then(([acts, rts]) => {
				setActivities(acts);
				setRoutes(rts);
			})
			.finally(() => setLoading(false));
	}, []);

	// Reload when screen comes into focus (e.g. after returning from detail or record)
	useFocusEffect(loadData);

	const applyImportedHexTiles = useCallback((activity: SavedActivity) => {
		if (!isH3Available()) return;
		dispatch(startRun());
		const h3Set = new Set<string>();
		for (const point of activity.routePoints) {
			try {
				const cell = latLngToCell(point.lat, point.lng, H3_IMPORT_RESOLUTION);
				if (cell && !h3Set.has(cell)) {
					h3Set.add(cell);
					dispatch(markVisited({ h3Indices: [cell], timestamp: point.timestamp }));
				}
			} catch {
				// Skip invalid points
			}
		}
	}, [dispatch]);

	const handleImport = useCallback((code: string) => {
		let parsed: unknown;
		try {
			parsed = JSON.parse(code);
		} catch {
			Alert.alert('Import Failed', 'The code is not valid JSON.');
			return;
		}

		// Support both a single activity object and an array of activities.
		const rawActivities: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
		const validActivities: SavedActivity[] = [];
		for (const item of rawActivities) {
			const activity = item as SavedActivity;
			if (
				typeof activity.id !== 'string' ||
				typeof activity.startedAt !== 'number' ||
				!Array.isArray(activity.routePoints)
			) {
				Alert.alert('Import Failed', 'One or more entries do not look like valid activities.');
				return;
			}
			validActivities.push(activity);
		}
		for (const activity of validActivities) {
			saveActivity(activity);
			applyImportedHexTiles(activity);
		}
		closeImportModal();
		loadData();
		const count = validActivities.length;
		Alert.alert('Imported', count === 1 ? 'The run has been imported successfully.' : `${count} runs have been imported successfully.`);
	}, [applyImportedHexTiles, closeImportModal, loadData]);

	const handleExportAll = useCallback(async () => {
		const allActivities = await loadActivities();
		if (allActivities.length === 0) {
			Alert.alert('Nothing to Export', 'There are no activities to export.');
			return;
		}
		const json = JSON.stringify(allActivities, null, 2);
		await Clipboard.setStringAsync(json);
		const count = allActivities.length;
		Alert.alert('Exported', `${count} ${count === 1 ? 'activity' : 'activities'} copied to clipboard as JSON.`);
	}, []);

	const handleRebuildMap = useCallback(() => {
		Alert.alert(
			'Rebuild Map from Activities',
			'This will recalculate the explored map from all your saved activities. All tile customizations (including manually set tiles) will be reset. Continue?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Rebuild',
					style: 'destructive',
					onPress: async () => {
						if (!isH3Available()) {
							Alert.alert('Not Available', 'H3 library is not available on this device.');
							return;
						}
						const allActivities = await loadActivities();
						if (allActivities.length === 0) {
							Alert.alert('No Activities', 'There are no activities to rebuild the map from.');
							return;
						}

						// Migrate activities that are missing computed.enclosedHexTiles.
						// The canonical home for enclosed-tile data is computed.enclosedHexTiles.
						// The top-level fields enclosedHexTiles / hexTilesEnclosed are legacy and
						// must never be written; they are only kept for reading old activity files.
						for (const activity of allActivities) {
							let updated = false;

							// Determine enclosed tiles: prefer computed, then fall back to legacy fields.
							let enclosedTiles: string[] =
								activity.computed?.enclosedHexTiles ??
								activity.enclosedHexTiles ??
								activity.hexTilesEnclosed ??
								[];

							// Recompute from visited hex tiles when enclosed tiles are still unavailable.
							// Using hex-tile centroids is faster than raw GPS points (fewer vertices).
							if (enclosedTiles.length === 0 && activity.hexTilesOrdered?.length) {
								enclosedTiles = findEnclosedCellsFromHexTiles(
									activity.hexTilesOrdered,
									activity.h3Resolution ?? H3_RESOLUTION_FALLBACK,
								);
							}

							if (!activity.computed) {
								activity.computed = computeActivityData(activity, enclosedTiles);
								if (activity.enclosedTileCount == null) {
									activity.enclosedTileCount = enclosedTiles.length;
								}
								updated = true;
							} else if (
								!Array.isArray(activity.computed.enclosedHexTiles) ||
								(activity.computed.enclosedHexTiles.length === 0 && enclosedTiles.length > 0)
							) {
								activity.computed = { ...activity.computed, enclosedHexTiles: enclosedTiles };
								if (activity.enclosedTileCount == null) {
									activity.enclosedTileCount = enclosedTiles.length;
								}
								updated = true;
							}

							if (updated) {
								try { saveActivity(activity); } catch (err) { console.warn('[Rebuild] Failed to save migrated activity:', activity.id, err); }
							}
						}

						// Rebuild from activity data (hexTilesVisited + enclosedHexTiles),
						// applying dirt/grass terrain automatically after counting visits.
						// All existing tile state (including manual customizations) is discarded.
						const sorted = [...allActivities].sort((a, b) => a.startedAt - b.startedAt);
						const hexTileFeatureCache = await loadHexTileFeatureCache();
						const { records, walkedEdges } = rebuildMapFromActivities(sorted, hexTileFeatureCache);
						dispatch(loadPersistedState(records));
						dispatch(loadWalkedEdgesState(walkedEdges));

						// For enclosed tiles without cached features, fetch features and apply
						// pine tree billboard on forest tiles asynchronously (fire-and-forget).
						const uncachedEnclosedTiles = Object.entries(records)
							.filter(([hexId, rec]) => rec.enclosedCount > 0 && rec.visitCount === 0 && !hexTileFeatureCache[hexId])
							.map(([hexId]) => hexId);

						if (uncachedEnclosedTiles.length > 0) {
							void (async () => {
								try {
									const newEntries: HexTileFeatureCache = {};
									for (const hexId of uncachedEnclosedTiles) {
										try {
											const features = await queryTileFeaturesForHexCell(hexId);
											newEntries[hexId] = features;
											if (hasForestFeature(features)) {
												dispatch(setBillboardAtAnchor({
													h3Index: hexId,
													anchorColor: BillboardAnchorColor.Purple,
													billboard: BILLBOARD_PINE_TREE_LARGE,
												}));
											}
										} catch {
											// ignore per-cell errors
										}
									}
									await mergeHexTileFeatureCache(newEntries);
								} catch (err) {
									console.warn('[Rebuild] Feature cache update failed:', err);
								}
							})();
						}

						const count = allActivities.length;
						Alert.alert('Map Rebuilt', `Map rebuilt from ${count} ${count === 1 ? 'activity' : 'activities'}.`);
					},
				},
			],
		);
	}, [dispatch]);

	const openImportModal = useCallback(() => {
		showImportModal({
			title: '📥 Import Run',
			children: (
				<ImportContent
					onImport={handleImport}
					onCancel={closeImportModal}
					theme={theme}
				/>
			),
			keyboardShouldPersistTaps: 'handled',
		});
	}, [showImportModal, handleImport, closeImportModal, theme]);

	// Show import, export, and rebuild buttons in the header
	useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<View style={styles.headerButtons}>
					<TouchableOpacity onPress={handleRebuildMap} style={styles.headerImportButton} activeOpacity={0.7}>
						<MaterialIcons name="refresh" size={24} color={PRIMARY_COLOR} />
					</TouchableOpacity>
					<TouchableOpacity onPress={handleExportAll} style={styles.headerImportButton} activeOpacity={0.7}>
						<MaterialIcons name="file-upload" size={24} color={PRIMARY_COLOR} />
					</TouchableOpacity>
					<TouchableOpacity onPress={openImportModal} style={styles.headerImportButton} activeOpacity={0.7}>
						<MaterialIcons name="file-download" size={24} color={PRIMARY_COLOR} />
					</TouchableOpacity>
				</View>
			),
		});
	}, [navigation, openImportModal, handleExportAll, handleRebuildMap]);

	const handleActivityPress = useCallback((id: string) => {
		router.push(`/activities/${id}`);
	}, [router]);

	if (!loading && activities.length === 0) {
		return (
			<View style={[styles.emptyContainer, { backgroundColor: theme.screen.background }]}>
				<Ionicons name="fitness-outline" size={64} color={theme.screen.icon} />
				<Text style={[styles.emptyTitle, { color: theme.screen.text }]}>No activities yet</Text>
				<Text style={[styles.emptySubtitle, { color: theme.screen.icon }]}>
					Start recording to see your activities here.
				</Text>
			</View>
		);
	}

	// Build a map from routeId → SavedRoute for quick lookups
	const routeMap = new Map<string, SavedRoute>(routes.map((r) => [r.id, r]));

	// Group activities by routeId; undefined/null go into the 'unassigned' bucket
	const groupMap = new Map<string | null, SavedActivity[]>();
	for (const activity of activities) {
		const key = activity.routeId ?? null;
		if (!groupMap.has(key)) groupMap.set(key, []);
		groupMap.get(key)!.push(activity);
	}

	// Sort groups: named routes first (by name), then unassigned last
	const assignedRouteIds = [...groupMap.keys()]
		.filter((k): k is string => k !== null)
		.sort((a, b) => {
			const nameA = routeMap.get(a)?.name ?? a;
			const nameB = routeMap.get(b)?.name ?? b;
			return nameA.localeCompare(nameB);
		});
	const groupOrder: Array<string | null> = [...assignedRouteIds];
	if (groupMap.has(null)) groupOrder.push(null);

	return (
		<ScrollView style={[styles.container, { backgroundColor: theme.screen.background }]} contentContainerStyle={styles.listContent}>
			{groupOrder.map((routeId) => {
				const groupActivities = groupMap.get(routeId) ?? [];
				const routeName = routeId !== null ? (routeMap.get(routeId)?.name ?? routeId) : 'Ohne Route';
				return (
					<View key={routeId ?? '__unassigned__'}>
						<SettingsListGroupTitle title={routeName} />
						{groupActivities.map((item, idx) => {
							const count = groupActivities.length;
							const groupPosition =
								count === 1 ? 'single' : idx === 0 ? 'top' : idx === count - 1 ? 'bottom' : 'middle';
							return (
								<SettingsListActivity
									key={item.id}
									activity={item}
									groupPosition={groupPosition}
									showSeparator={idx < count - 1}
									onPress={() => handleActivityPress(item.id)}
								/>
							);
						})}
					</View>
				);
			})}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 24,
		gap: 10,
	},
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 32,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: '700',
	},
	emptySubtitle: {
		fontSize: 14,
		textAlign: 'center',
		lineHeight: 20,
	},
	headerImportButton: {
		marginRight: 4,
		padding: 4,
	},
	headerButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: 8,
		gap: 4,
	},
	importContainer: {
		paddingTop: 4,
		gap: 12,
	},
	importDescription: {
		fontSize: 14,
		lineHeight: 20,
	},
	importInput: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 10,
		fontSize: 12,
		fontFamily: 'monospace',
		minHeight: 100,
		textAlignVertical: 'top',
	},
	importConfirmButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		borderRadius: 10,
		gap: 8,
	},
	importConfirmButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
	},
	importCancelButton: {
		alignItems: 'center',
		paddingVertical: 10,
		borderRadius: 10,
	},
	importCancelButtonText: {
		fontSize: 15,
		fontWeight: '500',
	},
});
