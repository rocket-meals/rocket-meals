import 'setimmediate';
import React, { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, AppDrawer, DrawerItem, ModalProvider, SettingsProvider, useTheme, ExpoUpdateChecker, ExpoUpdateLoader } from 'repo-depkit-common-ui';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, TouchableOpacity, View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Provider, useSelector } from 'react-redux';
import { store } from '../store/store';
import { setDevMode, setDebugMode, loadWalkedEdgesState } from '../store/hexTileSlice';
import { loadSportType as loadSportTypeAction } from '../store/sportTypeSlice';
import { loadThemeMode as loadThemeModeAction } from '../store/themeSlice';
import { loadPersistedBillboardConfig } from '../store/billboardConfigSlice';
import { loadGpsIntervalMode as loadGpsIntervalModeAction } from '../store/gpsIntervalSlice';
import { loadTTSEnabled as loadTTSEnabledAction } from '../store/ttsSlice';
import { loadSpeechSettings as loadSpeechSettingsAction } from '../store/speechSettingsSlice';
import { loadDisplaySettings as loadDisplaySettingsAction } from '../store/displaySettingsSlice';
import { loadHexTileState, loadDevHexTileState, loadDevModeFlag, loadDebugModeFlag, loadWalkedEdges, loadDevWalkedEdges, loadWorldBuildingId, loadDevWorldBuildingId, saveWorldBuildingId, saveDevWorldBuildingId, saveHexTileState, saveDevHexTileState, saveWalkedEdges, saveDevWalkedEdges } from '../helpers/HexTileStorage';
import { loadSportType } from '../helpers/SportTypeStorage';
import { loadThemeMode } from '../helpers/ThemeStorage';
import { loadBillboardConfig } from '../helpers/BillboardConfigStorage';
import { loadGpsIntervalMode } from '../helpers/GpsIntervalStorage';
import { loadTTSEnabled } from '../helpers/TTSStorage';
import { loadSpeechSettings } from '../helpers/SpeechSettingsStorage';
import { loadDisplaySettings } from '../helpers/DisplaySettingsStorage';
import { WORLD_BUILDING_ID, rebuildMapFromActivities } from '../helpers/ActivityMapRebuildHelper';
import { loadActivities } from '../helpers/ActivityStorage';
import { loadHexTileFeatureCache } from '../helpers/HexTileFeatureStorage';
import { isAvailable as isH3Available } from '../helpers/H3Helper';
import type { RootState } from '../store/store';
import { getAppIconInsideExpoLocalSaved, getCompanyLogoLocalSaved } from '../config';
import { useTranslation } from '../hooks/useTranslation';
import { GeonexiaTranslationKeys } from '../locales/keys';

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
	const { translate } = useTranslation();

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
					title: translate(GeonexiaTranslationKeys.nav_record),
					drawerIcon: ({ color, size }) => (
						<Ionicons name="radio-button-on-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="activities/index"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_activities),
					drawerIcon: ({ color, size }) => (
						<Ionicons name="list-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="activities/[id]"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_activity),
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="statistics/index"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_statistics),
					drawerIcon: ({ color, size }) => (
						<Ionicons name="bar-chart-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="achievements/index"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_achievements),
					drawerIcon: ({ color, size }) => (
						<Ionicons name="trophy-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="feature-wishes/index"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_feature_wishes),
					drawerIcon: ({ color, size }) => (
						<Ionicons name="bulb-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="routes/index"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_routes),
					drawerIcon: ({ color, size }) => (
						<Ionicons name="map-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="routes/[id]"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_route),
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="billboard-config/index"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_billboard_config),
					drawerIcon: ({ color, size }) => (
						<Ionicons name="build-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="experimental/index"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_experimental),
					drawerIcon: ({ color, size }) => (
						<Ionicons name="flask-outline" size={size} color={color} />
					),
				}}
			/>
			<Drawer.Screen
				name="experimental/tts-test/index"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_tts_test),
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="experimental/hex-tile-info/index"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_hex_tile_info),
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="experimental/keyboard-avoid-test/index"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_keyboard_avoid_test),
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="experimental/route-switcher/index"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_route_switcher),
					drawerItemStyle: { display: 'none' },
				}}
			/>
			<Drawer.Screen
				name="settings/index"
				options={{
					title: translate(GeonexiaTranslationKeys.nav_settings),
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
	const isDevMode = useSelector((state: RootState) => state.hexTiles.isDevMode);
	const { translate } = useTranslation();

	const items: DrawerItem[] = [
		{
			key: 'index',
			label: translate(GeonexiaTranslationKeys.nav_record),
			renderIcon: (_, color) => <Ionicons name="radio-button-on-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('index'),
		},
		{
			key: 'activities/index',
			label: translate(GeonexiaTranslationKeys.nav_activities),
			renderIcon: (_, color) => <Ionicons name="list-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('activities/index'),
		},
		{
			key: 'routes/index',
			label: translate(GeonexiaTranslationKeys.nav_routes),
			renderIcon: (_, color) => <Ionicons name="map-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('routes/index'),
		},
		{
			key: 'statistics/index',
			label: translate(GeonexiaTranslationKeys.nav_statistics),
			renderIcon: (_, color) => <Ionicons name="bar-chart-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('statistics/index'),
		},
		{
			key: 'achievements/index',
			label: translate(GeonexiaTranslationKeys.nav_achievements),
			renderIcon: (_, color) => <Ionicons name="trophy-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('achievements/index'),
		},
		{
			key: 'feature-wishes/index',
			label: translate(GeonexiaTranslationKeys.nav_feature_wishes),
			renderIcon: (_, color) => <Ionicons name="bulb-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('feature-wishes/index'),
		},
		...(isDevMode ? [
			{
				key: 'billboard-config/index',
				label: translate(GeonexiaTranslationKeys.nav_billboard_config),
				renderIcon: (_, color) => <Ionicons name="build-outline" size={24} color={color} />,
				onPress: () => props.navigation.navigate('billboard-config/index'),
			},
			{
				key: 'experimental/index',
				label: translate(GeonexiaTranslationKeys.nav_experimental),
				renderIcon: (_, color) => <Ionicons name="flask-outline" size={24} color={color} />,
				onPress: () => props.navigation.navigate('experimental/index'),
			},
		] : []),
		{
			key: 'settings/index',
			label: translate(GeonexiaTranslationKeys.nav_settings),
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
			const [records, walkedEdges, storedBuildingId] = await Promise.all([
				isDevMode ? loadDevHexTileState() : loadHexTileState(),
				isDevMode ? loadDevWalkedEdges() : loadWalkedEdges(),
				isDevMode ? loadDevWorldBuildingId() : loadWorldBuildingId(),
			]);

			if (storedBuildingId !== WORLD_BUILDING_ID && isH3Available()) {
				try {
					const allActivities = await loadActivities();
					if (allActivities.length > 0) {
						const sorted = [...allActivities].sort((a, b) => a.startedAt - b.startedAt);
						const hexTileFeatureCache = await loadHexTileFeatureCache();
						const { records: rebuiltRecords, walkedEdges: rebuiltEdges } = rebuildMapFromActivities(sorted, hexTileFeatureCache);
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
		loadGpsIntervalMode()
			.then((mode) => {
				store.dispatch(loadGpsIntervalModeAction(mode));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted GPS interval mode:', err);
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
	}, []);

	return (
		<Provider store={store}>
		<AppErrorBoundary>
		<ExpoUpdateLoader logoSource={getCompanyLogoLocalSaved()}>
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<ThemeProvider>
					<ThemeSyncBridge />
					<SettingsProvider primaryColor="#2563eb">
						<ModalProvider>
						<ExpoUpdateChecker>
						<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
						<ThemedDrawerNavigator />
						</KeyboardAvoidingView>
						</ExpoUpdateChecker>
						</ModalProvider>
					</SettingsProvider>
				</ThemeProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
		</ExpoUpdateLoader>
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
