import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getVersionInternalForAppsettingsScreen } from '../config';
import { PLAYGROUND_COLORS } from '../constants/theme';

// One entry per experiment in this app. New experiments get a route under
// app/ and a line here - the playground is meant to grow.
const EXPERIMENTS = [
	{
		href: '/godot' as const,
		icon: 'game-controller-outline' as const,
		title: 'Godot',
		description: 'Die Godot-Engine als React-Native-View, mit Touch-Steuerung über Godots Input-API.',
		// Godot is a native module: Expo Go cannot load it.
		needsDevelopmentBuild: true,
	},
];

export default function Index() {
	const isWeb = Platform.OS === 'web';

	return (
		<SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.intro}>
					Spielwiese für Experimente, die (noch) in keine der anderen Apps gehören.
				</Text>
				{EXPERIMENTS.map((experiment) => (
					<Link key={experiment.href} href={experiment.href} asChild>
						<Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
							<View style={styles.cardIcon}>
								<Ionicons name={experiment.icon} size={26} color={PLAYGROUND_COLORS.accent} />
							</View>
							<View style={styles.cardText}>
								<Text style={styles.cardTitle}>{experiment.title}</Text>
								<Text style={styles.cardDescription}>{experiment.description}</Text>
								{experiment.needsDevelopmentBuild && (
									<Text style={styles.cardHint}>
										{isWeb
											? 'Nur in einem Development Build auf iOS/Android verfügbar.'
											: 'Braucht einen Development Build (nicht Expo Go).'}
									</Text>
								)}
							</View>
							<Ionicons name="chevron-forward" size={20} color={PLAYGROUND_COLORS.textMuted} />
						</Pressable>
					</Link>
				))}
			</ScrollView>
			<Text style={styles.version}>{`v${getVersionInternalForAppsettingsScreen()}`}</Text>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: PLAYGROUND_COLORS.background,
	},
	content: {
		padding: 20,
		gap: 16,
	},
	intro: {
		color: PLAYGROUND_COLORS.textMuted,
		fontSize: 15,
		lineHeight: 21,
	},
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		padding: 16,
		borderRadius: 16,
		backgroundColor: PLAYGROUND_COLORS.surface,
		borderWidth: 1,
		borderColor: PLAYGROUND_COLORS.border,
	},
	cardPressed: {
		opacity: 0.7,
	},
	cardIcon: {
		width: 46,
		height: 46,
		borderRadius: 23,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: PLAYGROUND_COLORS.accentSoft,
	},
	cardText: {
		flex: 1,
		gap: 4,
	},
	cardTitle: {
		color: PLAYGROUND_COLORS.text,
		fontSize: 17,
		fontWeight: '600',
	},
	cardDescription: {
		color: PLAYGROUND_COLORS.textMuted,
		fontSize: 13,
		lineHeight: 18,
	},
	cardHint: {
		color: PLAYGROUND_COLORS.accent,
		fontSize: 12,
	},
	version: {
		paddingBottom: 12,
		textAlign: 'center',
		color: PLAYGROUND_COLORS.textMuted,
		fontSize: 12,
		opacity: 0.8,
	},
});
