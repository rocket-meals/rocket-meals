import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PLAYGROUND_COLORS } from '../constants/theme';

export default function Layout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<StatusBar style="light" />
			<Stack
				screenOptions={{
					headerStyle: { backgroundColor: PLAYGROUND_COLORS.background },
					headerTintColor: PLAYGROUND_COLORS.text,
					headerShadowVisible: false,
					contentStyle: { backgroundColor: PLAYGROUND_COLORS.background },
				}}
			>
				<Stack.Screen name="index" options={{ title: 'Playground' }} />
				{/* The Godot view fills the screen - its own overlay carries the back button. */}
				<Stack.Screen name="godot/index" options={{ title: 'Godot', headerShown: false }} />
			</Stack>
		</GestureHandlerRootView>
	);
}
