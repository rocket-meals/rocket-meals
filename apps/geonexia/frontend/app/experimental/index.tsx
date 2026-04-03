import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SettingsList, SettingsListGroupTitle, useTheme } from 'repo-depkit-common-ui';
import { useRouter } from 'expo-router';

const EXPERIMENTAL_COLOR = '#7c3aed';

export default function ExperimentalScreen() {
	const { theme } = useTheme();
	const router = useRouter();

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<ScrollView contentContainerStyle={styles.listContent}>
				<SettingsListGroupTitle title="Onboarding" />
				<SettingsList
					iconBgColor={EXPERIMENTAL_COLOR}
					leftIcon={<Ionicons name="compass-outline" size={22} color="#ffffff" />}
					label="User Onboarding"
					value="Setup-Assistent für neue Nutzer"
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={() => router.push('/experimental/onboarding')}
					groupPosition="single"
				/>

				<SettingsListGroupTitle title="Audio" />
				<SettingsList
					iconBgColor={EXPERIMENTAL_COLOR}
					leftIcon={<MaterialCommunityIcons name="account-voice" size={22} color="#ffffff" />}
					label="Text to Speech Test"
					value="Voice announcements playground"
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={() => router.push('/experimental/tts-test')}
					groupPosition="single"
				/>

				<SettingsListGroupTitle title="Karten" />
				<SettingsList
					iconBgColor={EXPERIMENTAL_COLOR}
					leftIcon={<Ionicons name="hexagon-outline" size={22} color="#ffffff" />}
					label="Hex Tile Info"
					value="Tile-Features für 8a1f10d5061ffff"
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={() => router.push('/experimental/hex-tile-info')}
					groupPosition="single"
				/>

				<SettingsList
					iconBgColor={EXPERIMENTAL_COLOR}
					leftIcon={<Ionicons name="map-outline" size={22} color="#ffffff" />}
					label="Route Switcher"
					value="F1-Style Route-Karussell"
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={() => router.push('/experimental/route-switcher')}
					groupPosition="single"
				/>

				<SettingsListGroupTitle title="UI" />
				<SettingsList
					iconBgColor={EXPERIMENTAL_COLOR}
					leftIcon={<MaterialCommunityIcons name="keyboard-outline" size={22} color="#ffffff" />}
					label="Keyboard Avoid Test"
					value="Test keyboard avoidance in modals"
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={() => router.push('/experimental/keyboard-avoid-test')}
					groupPosition="single"
				/>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	listContent: {
		paddingVertical: 16,
	},
});
