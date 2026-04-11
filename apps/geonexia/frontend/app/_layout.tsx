import 'setimmediate';
import React, { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, AppDrawer, DrawerItem, ModalProvider, SettingsProvider, useTheme } from 'repo-depkit-common-ui';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, ScrollView, TouchableOpacity, View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Provider, useSelector } from 'react-redux';
import { store } from '../store/store';
import { setDevMode, setDebugMode, loadWalkedEdgesState, setBillboardAtAnchor } from '../store/hexTileSlice';
import { loadSportType as loadSportTypeAction } from '../store/sportTypeSlice';
import { loadThemeMode as loadThemeModeAction } from '../store/themeSlice';
import { loadPersistedBillboardConfig } from '../store/billboardConfigSlice';
import { loadPersistedHexTextureConfig } from '../store/hexTextureConfigSlice';
import { loadGpsIntervalSeconds as loadGpsIntervalSecondsAction } from '../store/gpsIntervalSlice';
import { loadTTSEnabled as loadTTSEnabledAction } from '../store/ttsSlice';
import { loadSpeechSettings as loadSpeechSettingsAction } from '../store/speechSettingsSlice';
import { loadDisplaySettings as loadDisplaySettingsAction } from '../store/displaySettingsSlice';
import { loadReplaySettings as loadReplaySettingsAction } from '../store/replaySettingsSlice';
import { loadPersistedPlayerInformation } from '../store/playerInformationSlice';
import { loadHexTileState, loadDevHexTileState, loadDevModeFlag, loadDebugModeFlag, loadWalkedEdges, loadDevWalkedEdges, loadWorldBuildingId, loadDevWorldBuildingId, saveWorldBuildingId, saveDevWorldBuildingId, saveHexTileState, saveDevHexTileState, saveWalkedEdges, saveDevWalkedEdges, BillboardAnchorPosition } from '../helpers/HexTileStorage';
import { loadSportType } from '../helpers/SportTypeStorage';
import { loadThemeMode } from '../helpers/ThemeStorage';
import { loadBillboardConfig } from '../helpers/BillboardConfigStorage';
import { loadHexTextureConfig } from '../helpers/HexTextureConfigStorage';
import { loadGpsIntervalSeconds } from '../helpers/GpsIntervalStorage';
import { loadTTSEnabled } from '../helpers/TTSStorage';
import { loadSpeechSettings } from '../helpers/SpeechSettingsStorage';
import { loadDisplaySettings } from '../helpers/DisplaySettingsStorage';
import { loadReplaySettings } from '../helpers/ReplaySettingsStorage';
import { loadPlayerInformation } from '../helpers/PlayerInformationStorage';
import { WORLD_BUILDING_ID, rebuildMapFromActivities, applyRouteBenches, hasForestFeature, BILLBOARD_PINE_TREE_LARGE, BILLBOARD_PINE_TREE_SMALL, getSmallTreeAnchorForHexId } from '../helpers/ActivityMapRebuildHelper';
import { loadActivities } from '../helpers/ActivityStorage';
import { loadRoutes } from '../helpers/RouteStorage';
import { loadHexTileFeatureCache, mergeHexTileFeatureCache, type HexTileFeatureCache } from '../helpers/HexTileFeatureStorage';
import { queryTileFeaturesForHexCell } from '../helpers/TileFeatureHelper';
import { isAvailable as isH3Available } from '../helpers/H3Helper';
import type { RootState } from '../store/store';
import { getAppIconInsideExpoLocalSaved } from '../config';

// ─── Error Boundary ───────────────────────────────────────────────────────────

type ErrorBoundaryState = { hasError: boolean; error: Error | null; copied: boolean };

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false, error: null, copied: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error('[AppErrorBoundary] Caught error:', error);
		console.error('[AppErrorBoundary] Component stack:', info.componentStack);
	}

	render() {
		if (this.state.hasError) {
			const { error, copied } = this.state;
			return (
				<View style={styles.errorContainer}>
					<Modal visible transparent animationType="slide" accessibilityViewIsModal>
						<View style={styles.errorOverlay}>
							<View style={styles.errorSheet}>
								<Text style={styles.errorTitle}>🚨 App Error</Text>
								<Text style={styles.errorSubtitle}>{error?.name ?? 'Error'}</Text>
								<ScrollView style={styles.errorScroll}>
									<Text style={styles.errorMessage}>{error?.message ?? 'An unexpected error occurred.'}</Text>
									{Boolean(error?.stack) && (
										<Text style={styles.errorStack}>{error?.stack}</Text>
									)}
								</ScrollView>
								<TouchableOpacity
									accessibilityRole="button"
									accessibilityLabel="Copy problem to clipboard"
									style={styles.errorCopyButton}
									onPress={() => {
										const text = [
											`Error: ${error?.name ?? 'Unknown'}`,
											`Message: ${error?.message ?? ''}`,
											error?.stack ? `Stack:\n${error.stack}` : '',
										].filter(Boolean).join('\n\n');
										Clipboard.setStringAsync(text);
										this.setState({ copied: true });
										setTimeout(() => this.setState({ copied: false }), 2000);
									}}
								>
									<Text style={styles.errorCopyButtonText}>{copied ? '✅ Kopiert!' : '📋 Problem kopieren'}</Text>
								</TouchableOpacity>
								<TouchableOpacity
									accessibilityRole="button"
									accessibilityLabel="Dismiss error"
									style={styles.errorButton}
									onPress={() => this.setState({ hasError: false, error: null, copied: false })}
								>
									<Text style={styles.errorButtonText}>Dismiss</Text>
								</TouchableOpacity>
							</View>
						</View>
					</Modal>
				</View>
			);
		}
		return this.props.children;
	}
}

// Syncs the persisted theme from Redux into the common-ui ThemeContext
function ThemeSyncBridge() {
	const selectedMode = useSelector((state: RootState) => state.theme.selectedMode);
	const { setThemeMode } = useTheme();

	useEffect(() => {
		setThemeMode(selectedMode);
	}, [selectedMode, setThemeMode]);

	return null;
}

function ThemedDrawerNavigator() {
	const { theme } = useTheme();

	return (
		<>
		<StatusBar style="auto" />
		<Drawer
			drawerContent={(props) => <CustomDrawerContent {...props} />}
			screenOptions={{
				drawerActiveTintColor: '#2563eb',
				headerStyle: { backgroundColor: theme.header.background },
				headerTintColor: theme.header.text,
			}}
		>
			<Drawer.Screen
				name="index"
				options={{
					title: 'Record',
					drawerIcon: ({ color, size }) => (
						<Ionicons name="radio-button-on-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="activities/index"
				options={{
					title: 'Activities',
					drawerIcon: ({ color, size }) => (
						<Ionicons name="list-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="activities/[id]"
				options={{
					title: 'Activity',
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="statistics/index"
				options={{
					title: 'Statistics',
					drawerIcon: ({ color, size }) => (
						<Ionicons name="bar-chart-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="achievements/index"
				options={{
					title: 'Achievements',
					drawerIcon: ({ color, size }) => (
						<Ionicons name="trophy-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="challenges/index"
				options={{
					title: 'Challenges',
					drawerIcon: ({ color, size }) => (
						<MaterialCommunityIcons name="sword-cross" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="feature-wishes/index"
				options={{
					title: 'Feature Wishes',
					drawerIcon: ({ color, size }) => (
						<Ionicons name="bulb-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="routes/index"
				options={{
					title: 'Routes',
					drawerIcon: ({ color, size }) => (
						<Ionicons name="map-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="routes/[id]"
				options={{
					title: 'Route',
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="billboard-config/index"
				options={{
					title: 'Billboard Config',
					drawerIcon: ({ color, size }) => (
						<Ionicons name="build-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="hex-texture-config/index"
				options={{
					title: 'Hex Texture Config',
					drawerIcon: ({ color, size }) => (
						<Ionicons name="grid-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="experimental/index"
				options={{
					title: 'Experimental',
					drawerIcon: ({ color, size }) => (
						<Ionicons name="flask-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="experimental/tts-test/index"
				options={{
					title: 'Text to Speech Test',
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="experimental/hex-tile-info/index"
				options={{
					title: 'Hex Tile Info',
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="experimental/keyboard-avoid-test/index"
				options={{
					title: 'Keyboard Avoid Test',
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="experimental/route-switcher/index"
				options={{
					title: 'Route Switcher',
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="experimental/onboarding/index"
				options={{
					title: 'Onboarding',
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="settings/index"
				options={{
					title: 'Settings',
					drawerIcon: ({ color, size }) => (
						<Ionicons name="settings-outline" size={size} color={color} />
					),
				}}
			/>
		</Drawer>
		</>
	);
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
	const activeKey = props.state.routes[props.state.index].name;
	const isDebugMode = useSelector((state: RootState) => state.hexTiles.isDebugMode);

	const items: DrawerItem[] = [
		{
			key: 'index',
			label: 'Record',
			renderIcon: (_, color) => <Ionicons name="radio-button-on-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('index'),
		},
		{
			key: 'activities/index',
			label: 'Activities',
			renderIcon: (_, color) => <Ionicons name="list-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('activities/index'),
		},
		{
			key: 'routes/index',
			label: 'Routes',
			renderIcon: (_, color) => <Ionicons name="map-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('routes/index'),
		},
		{
			key: 'statistics/index',
			label: 'Statistics',
			renderIcon: (_, color) => <Ionicons name="bar-chart-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('statistics/index'),
		},
		{
			key: 'achievements/index',
			label: 'Achievements',
			renderIcon: (_, color) => <Ionicons name="trophy-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('achievements/index'),
		},
		{
			key: 'challenges/index',
			label: 'Challenges',
			renderIcon: (_, color) => <MaterialCommunityIcons name="sword-cross" size={24} color={color} />,
			onPress: () => props.navigation.navigate('challenges/index'),
		},
		{
			key: 'feature-wishes/index',
			label: 'Feature Wishes',
			renderIcon: (_, color) => <Ionicons name="bulb-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('feature-wishes/index'),
		},
		...(isDebugMode ? [
			{
				key: 'billboard-config/index',
				label: 'Billboard Config',
				renderIcon: (_, color) => <Ionicons name="build-outline" size={24} color={color} />,
				onPress: () => props.navigation.navigate('billboard-config/index'),
			},
			{
				key: 'hex-texture-config/index',
				label: 'Hex Texture Config',
				renderIcon: (_, color) => <Ionicons name="grid-outline" size={24} color={color} />,
				onPress: () => props.navigation.navigate('hex-texture-config/index'),
			},
			{
				key: 'experimental/index',
				label: 'Experimental',
				renderIcon: (_, color) => <Ionicons name="flask-outline" size={24} color={color} />,
				onPress: () => props.navigation.navigate('experimental/index'),
			},
		] : []),
		{
			key: 'settings/index',
			label: 'Settings',
			renderIcon: (_, color) => <Ionicons name="settings-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('settings/index'),
		},
	];

	return (
		<AppDrawer
			logoSource={getAppIconInsideExpoLocalSaved()}
			title="Geonexia"
			items={items}
			activeKey={activeKey}
			primaryColor="#2563eb"
			onLogoPress={() => props.navigation.navigate('index')}
		/>
	);
}

export default function Layout() {
	useEffect(() => {
		(async () => {
			const isDevMode = await loadDevModeFlag();
			const [records, walkedEdges, storedBuildingId, playerInfo] = await Promise.all([
				isDevMode ? loadDevHexTileState() : loadHexTileState(),
				isDevMode ? loadDevWalkedEdges() : loadWalkedEdges(),
				isDevMode ? loadDevWorldBuildingId() : loadWorldBuildingId(),
				loadPlayerInformation(),
			]);

			store.dispatch(loadPersistedPlayerInformation(playerInfo));

			if (storedBuildingId !== WORLD_BUILDING_ID && isH3Available()) {
				try {
					const allActivities = await loadActivities();
					if (allActivities.length > 0) {
						const sorted = [...allActivities].sort((a, b) => a.startedAt - b.startedAt);
						const hexTileFeatureCache = await loadHexTileFeatureCache();
						const { records: rebuiltRecords, walkedEdges: rebuiltEdges } = rebuildMapFromActivities(sorted, hexTileFeatureCache, playerInfo.homeHexTile);
						const routes = await loadRoutes();
						applyRouteBenches(rebuiltRecords, sorted, routes);
						if (isDevMode) {
							saveDevHexTileState(rebuiltRecords);
							saveDevWalkedEdges(rebuiltEdges);
							saveDevWorldBuildingId(WORLD_BUILDING_ID);
						} else {
							saveHexTileState(rebuiltRecords);
							saveWalkedEdges(rebuiltEdges);
							saveWorldBuildingId(WORLD_BUILDING_ID);
						}
						store.dispatch(setDevMode({ isDevMode, records: rebuiltRecords, walkedEdges: rebuiltEdges }));
						// Fire-and-forget: fetch features for enclosed tiles
						// that are not yet in the feature cache, then apply forest trees.
						void (async () => {
							try {
								const tilesWithoutCache = Object.entries(rebuiltRecords)
									.filter(([hexId, rec]) =>
										rec.enclosedCount > 0 &&
										!rec.walkedOn &&
										!hexTileFeatureCache[hexId],
									)
									.map(([hexId]) => hexId);
								if (tilesWithoutCache.length === 0) return;
								const newEntries: HexTileFeatureCache = {};
								for (const hexId of tilesWithoutCache) {
									try {
										const features = await queryTileFeaturesForHexCell(hexId);
										newEntries[hexId] = features;
										if (hasForestFeature(features)) {
											store.dispatch(setBillboardAtAnchor({
												h3Index: hexId,
												anchorColor: BillboardAnchorPosition.CENTER,
												billboard: BILLBOARD_PINE_TREE_LARGE,
											}));
											// Also place the small tree at a MIDDLE ring position,
											// matching the full checkAndApplyForest behaviour.
											store.dispatch(setBillboardAtAnchor({
												h3Index: hexId,
												anchorColor: getSmallTreeAnchorForHexId(hexId),
												billboard: BILLBOARD_PINE_TREE_SMALL,
											}));
										}
									} catch {
										// ignore per-cell errors
									}
								}
								await mergeHexTileFeatureCache(newEntries);
							} catch (err) {
								console.warn('[Layout] Feature cache update after rebuild failed:', err);
							}
						})();
						return;
					}
				} catch (err) {
					console.warn('[Layout] Failed to rebuild world from activities:', err);
				}
				// No activities or rebuild failed – still update the stored ID so we
				// don't attempt a rebuild on every subsequent launch.
				if (isDevMode) {
					saveDevWorldBuildingId(WORLD_BUILDING_ID);
				} else {
					saveWorldBuildingId(WORLD_BUILDING_ID);
				}
			}

			store.dispatch(setDevMode({ isDevMode, records, walkedEdges }));
			// Fire-and-forget: apply forest trees to enclosed/adjacent tiles that are
			// missing them. This covers cases where a recording ended before the
			// in-session tree dispatch completed (e.g. app was killed mid-run).
			void (async () => {
				try {
					const hexTileFeatureCache = await loadHexTileFeatureCache();
					const newEntries: HexTileFeatureCache = {};
					for (const [hexId, rec] of Object.entries(records)) {
						const needsTrees = !rec.walkedOn && rec.enclosedCount > 0;
						if (!needsTrees) continue;
						const smallTreeAnchor = getSmallTreeAnchorForHexId(hexId);
						const hasCenterTree = rec.billboards?.[BillboardAnchorPosition.CENTER] === BILLBOARD_PINE_TREE_LARGE;
						const hasSmallTree = rec.billboards?.[smallTreeAnchor] === BILLBOARD_PINE_TREE_SMALL;
						if (hasCenterTree && hasSmallTree) continue;
						const cached = hexTileFeatureCache[hexId];
						if (cached) {
							if (hasForestFeature(cached)) {
								if (!hasCenterTree) {
									store.dispatch(setBillboardAtAnchor({
										h3Index: hexId,
										anchorColor: BillboardAnchorPosition.CENTER,
										billboard: BILLBOARD_PINE_TREE_LARGE,
									}));
								}
								if (!hasSmallTree) {
									store.dispatch(setBillboardAtAnchor({
										h3Index: hexId,
										anchorColor: smallTreeAnchor,
										billboard: BILLBOARD_PINE_TREE_SMALL,
									}));
								}
							}
						} else {
							try {
								const features = await queryTileFeaturesForHexCell(hexId);
								newEntries[hexId] = features;
								if (hasForestFeature(features)) {
									if (!hasCenterTree) {
										store.dispatch(setBillboardAtAnchor({
											h3Index: hexId,
											anchorColor: BillboardAnchorPosition.CENTER,
											billboard: BILLBOARD_PINE_TREE_LARGE,
										}));
									}
									if (!hasSmallTree) {
										store.dispatch(setBillboardAtAnchor({
											h3Index: hexId,
											anchorColor: smallTreeAnchor,
											billboard: BILLBOARD_PINE_TREE_SMALL,
										}));
									}
								}
							} catch {
								// ignore per-cell errors
							}
						}
					}
					if (Object.keys(newEntries).length > 0) {
						await mergeHexTileFeatureCache(newEntries);
					}
				} catch (err) {
					console.warn('[Layout] Feature cache update on startup failed:', err);
				}
			})();
		})().catch((err) => {
			console.warn('[Layout] Failed to load persisted hex tile state:', err);
		});
		loadDebugModeFlag()
			.then((isDebugMode) => {
				store.dispatch(setDebugMode(isDebugMode));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted debug mode flag:', err);
			});
		loadSportType()
			.then((type) => {
				store.dispatch(loadSportTypeAction(type));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted sport type:', err);
			});
		loadThemeMode()
			.then((mode) => {
				store.dispatch(loadThemeModeAction(mode));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted theme mode:', err);
			});
		loadBillboardConfig()
			.then((config) => {
				store.dispatch(loadPersistedBillboardConfig(config));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted billboard config:', err);
			});
		loadHexTextureConfig()
			.then((config) => {
				store.dispatch(loadPersistedHexTextureConfig(config));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted hex texture config:', err);
			});
		loadGpsIntervalSeconds()
			.then((seconds) => {
				store.dispatch(loadGpsIntervalSecondsAction(seconds));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted GPS interval seconds:', err);
			});
		loadTTSEnabled()
			.then((enabled) => {
				store.dispatch(loadTTSEnabledAction(enabled));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted TTS enabled flag:', err);
			});
		loadSpeechSettings()
			.then((settings) => {
				store.dispatch(loadSpeechSettingsAction(settings));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted speech settings:', err);
			});
		loadDisplaySettings()
			.then((settings) => {
				store.dispatch(loadDisplaySettingsAction(settings));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted display settings:', err);
			});
		loadReplaySettings()
			.then((settings) => {
				store.dispatch(loadReplaySettingsAction(settings));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted replay settings:', err);
			});
	}, []);

	return (
		<Provider store={store}>
		<AppErrorBoundary>
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<ThemeProvider>
					<ThemeSyncBridge />
					<SettingsProvider primaryColor="#2563eb">
						<ModalProvider>
						<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
						<ThemedDrawerNavigator />
						</KeyboardAvoidingView>
						</ModalProvider>
					</SettingsProvider>
				</ThemeProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
		</AppErrorBoundary>
		</Provider>
	);
}

const styles = StyleSheet.create({
	keyboardAvoidingView: {
		flex: 1,
	},
	errorContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	errorOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'flex-end',
	},
	errorSheet: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		padding: 20,
		maxHeight: '80%',
	},
	errorTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#b91c1c',
		marginBottom: 4,
	},
	errorSubtitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 12,
	},
	errorScroll: {
		maxHeight: 300,
		marginBottom: 16,
	},
	errorMessage: {
		fontSize: 14,
		color: '#374151',
		marginBottom: 8,
	},
	errorStack: {
		fontSize: 11,
		color: '#6b7280',
		fontFamily: 'monospace',
	},
	errorButton: {
		backgroundColor: '#2563eb',
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	errorButtonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 15,
	},
	errorCopyButton: {
		backgroundColor: '#f3f4f6',
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
		marginBottom: 8,
	},
	errorCopyButtonText: {
		color: '#374151',
		fontWeight: '600',
		fontSize: 15,
	},
});
