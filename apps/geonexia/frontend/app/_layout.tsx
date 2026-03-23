import 'setimmediate';
import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, AppDrawer, DrawerItem } from 'repo-depkit-common-ui';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

function CustomDrawerContent(props: DrawerContentComponentProps) {
	const activeKey = props.state.routes[props.state.index].name;

	const items: DrawerItem[] = [
		{
			key: 'index',
			label: 'Home',
			renderIcon: (_, color) => <Ionicons name="home-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('index'),
		},
		{
			key: 'map/index',
			label: 'Map',
			renderIcon: (_, color) => <Ionicons name="map-outline" size={24} color={color} />,
			onPress: () => props.navigation.navigate('map/index'),
		},
		{
			key: 'lauf-oberland/index',
			label: 'Lauf Oberland',
			renderIcon: (_, color) => <MaterialCommunityIcons name="run-fast" size={24} color={color} />,
			onPress: () => props.navigation.navigate('lauf-oberland/index'),
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
			renderLogo={() => (
				<View style={styles.logoRow}>
					<Ionicons name="location-sharp" size={32} color="#2563eb" />
					<Text style={styles.logoTitle}>Geonexia</Text>
				</View>
			)}
			items={items}
			activeKey={activeKey}
			primaryColor="#2563eb"
		/>
	);
}

export default function Layout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<ThemeProvider>
					<StatusBar style="auto" />
					<Drawer
						drawerContent={(props) => <CustomDrawerContent {...props} />}
						screenOptions={{
							drawerActiveTintColor: '#2563eb',
						}}
					>
						<Drawer.Screen
							name="index"
							options={{
								title: 'Home',
								drawerIcon: ({ color, size }) => (
									<Ionicons name="home-outline" size={size} color={color} />
								),
							}}
						/>
						<Drawer.Screen
							name="map/index"
							options={{
								title: 'Map',
								drawerIcon: ({ color, size }) => (
									<Ionicons name="map-outline" size={size} color={color} />
								),
							}}
						/>
						<Drawer.Screen
							name="lauf-oberland/index"
							options={{
								title: 'Lauf Oberland',
								drawerIcon: ({ color, size }) => (
									<MaterialCommunityIcons name="run-fast" size={size} color={color} />
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
				</ThemeProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	logoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	logoTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#111111',
	},
});
