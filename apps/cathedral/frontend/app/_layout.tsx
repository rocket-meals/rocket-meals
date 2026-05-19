import 'setimmediate';
import React, { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, AppDrawer, DrawerItem, ModalProvider, SettingsProvider, useTheme } from 'repo-depkit-common-ui';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Provider, useSelector } from 'react-redux';
import { store } from '../store/store';
import { loadThemeMode as loadThemeModeAction } from '../store/themeSlice';
import { loadGameState as loadGameStateAction } from '../store/gameSlice';
import { loadThemeMode } from '../helpers/ThemeStorage';
import { loadGameState } from '../helpers/GameStorage';
import type { RootState } from '../store/store';
import { getAppIconInsideExpoLocalSaved } from '../config';

const PRIMARY_COLOR = '#7c3aed';

// ─── Theme sync bridge ────────────────────────────────────────────────────────

function ThemeSyncBridge() {
	const selectedMode = useSelector((state: RootState) => state.theme.selectedMode);
	const { setThemeMode } = useTheme();

	useEffect(() => {
		setThemeMode(selectedMode);
	}, [selectedMode, setThemeMode]);

	return null;
}

// ─── Drawer navigator ─────────────────────────────────────────────────────────

function ThemedDrawerNavigator() {
	const { theme } = useTheme();

	return (
		<>
			<StatusBar style="auto" />
			<Drawer
				drawerContent={(props) => <CustomDrawerContent {...props} />}
				screenOptions={{
					drawerActiveTintColor: PRIMARY_COLOR,
					headerStyle: { backgroundColor: theme.header.background },
					headerTintColor: theme.header.text,
				}}
			>
				<Drawer.Screen
					name="index"
					options={{
						title: 'Cathedral',
						drawerIcon: ({ color, size }) => (
							<MaterialCommunityIcons name="chess-rook" size={size} color={color} />
						),
					}}
				/>
				<Drawer.Screen
					name="rules/index"
					options={{
						title: 'Rules',
						drawerIcon: ({ color, size }) => (
							<Ionicons name="book-outline" size={size} color={color} />
						),
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

// ─── Drawer content ───────────────────────────────────────────────────────────

function CustomDrawerContent(props: DrawerContentComponentProps) {
	const activeKey = props.state.routes[props.state.index].name;

	const items: DrawerItem[] = [
		{
			key: 'index',
			label: 'Cathedral',
			renderIcon: (_, color) => <MaterialCommunityIcons name="chess-rook" size={24} color={color} />,
			onPress: () => props.navigation.navigate('index'),
		},
		{
			key: 'rules/index',
			label: 'Rules',
			renderIcon: (_, color) => <Ionicons name="book-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('rules/index'),
		},
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
			title="Cathedral"
			items={items}
			activeKey={activeKey}
			primaryColor={PRIMARY_COLOR}
			onLogoPress={() => props.navigation.navigate('index')}
		/>
	);
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function Layout() {
	useEffect(() => {
		loadThemeMode()
			.then((mode) => {
				store.dispatch(loadThemeModeAction(mode));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted theme mode:', err);
			});
		loadGameState()
			.then((state) => {
				store.dispatch(loadGameStateAction(state));
			})
			.catch((err) => {
				console.warn('[Layout] Failed to load persisted game state:', err);
			});
	}, []);

	return (
		<Provider store={store}>
			<GestureHandlerRootView style={{ flex: 1 }}>
				<SafeAreaProvider>
					<ThemeProvider>
						<ThemeSyncBridge />
						<SettingsProvider primaryColor={PRIMARY_COLOR}>
							<ModalProvider>
								<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
									<ThemedDrawerNavigator />
								</KeyboardAvoidingView>
							</ModalProvider>
						</SettingsProvider>
					</ThemeProvider>
				</SafeAreaProvider>
			</GestureHandlerRootView>
		</Provider>
	);
}

const styles = StyleSheet.create({
	keyboardAvoidingView: {
		flex: 1,
	},
});
