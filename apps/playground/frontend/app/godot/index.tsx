import React, { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PLAYGROUND_COLORS } from '../../constants/theme';

// Godot input actions of the bundled demo game (Godot's built-in ui_* actions).
const ACTION_LEFT = 'ui_left';
const ACTION_RIGHT = 'ui_right';
const ACTION_JUMP = 'ui_accept';

type GodotModule = typeof import('@borndotcom/react-native-godot');

// The engine is a process-wide singleton: it is created on the first visit and
// then only paused/resumed, so returning to this screen does not boot a second
// instance (which the native side does not support).
let godotModule: GodotModule | null = null;
let hasCreatedInstance = false;

/**
 * Loads the native module lazily. Importing it at module scope would throw
 * where the native part is missing - on the web and in Expo Go - and take the
 * whole route down with it, so the failure is turned into a message instead.
 */
function loadGodotModule(): { module: GodotModule | null; error: string | null } {
	if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
		return { module: null, error: 'Godot läuft nur auf iOS und Android, nicht im Web.' };
	}
	if (godotModule) {
		return { module: godotModule, error: null };
	}
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		godotModule = require('@borndotcom/react-native-godot') as GodotModule;
		return { module: godotModule, error: null };
	} catch (error) {
		return {
			module: null,
			error:
				'Das native Godot-Modul ist nicht geladen. Die Engine braucht einen Development Build ' +
				`(expo run:ios / expo run:android), Expo Go reicht nicht.\n\n${String(error)}`,
		};
	}
}

/**
 * Boots the engine on its own thread. iOS reads the game from the pack file in
 * the app bundle, Android from the unpacked project in the apk assets - see
 * plugin/withGodotAssets.js for how both get there.
 */
function createGodotInstance(godot: GodotModule) {
	const mainPackUri = Platform.OS === 'ios' ? new File(Paths.bundle, 'main.pck').uri : null;
	const { RTNGodot, runOnGodotThread } = godot;

	runOnGodotThread(() => {
		'worklet';
		const commonArguments = ['--rendering-driver', 'opengl3', '--rendering-method', 'gl_compatibility', '--display-driver', 'embedded'];
		if (mainPackUri) {
			RTNGodot.createInstance(['--verbose', '--main-pack', mainPackUri, ...commonArguments]);
		} else {
			RTNGodot.createInstance(['--verbose', '--path', '/main', ...commonArguments]);
		}
	});
}

/** Presses or releases a Godot input action, on the Godot thread. */
function setActionPressed(godot: GodotModule, action: string, pressed: boolean) {
	const { RTNGodot, runOnGodotThread } = godot;

	runOnGodotThread(() => {
		'worklet';
		const input = RTNGodot.API().Input;
		if (pressed) {
			input.action_press(action);
		} else {
			input.action_release(action);
		}
	});
}

export default function GodotScreen() {
	const router = useRouter();
	const [{ module: godot, error }] = useState(loadGodotModule);
	const [isPaused, setIsPaused] = useState(false);

	useEffect(() => {
		if (!godot) {
			return;
		}
		if (!hasCreatedInstance) {
			hasCreatedInstance = true;
			createGodotInstance(godot);
		} else {
			godot.RTNGodot.resume();
		}
		// Leaving the screen only pauses the engine - the instance stays alive
		// for the next visit.
		return () => godot.RTNGodot.pause();
	}, [godot]);

	const handlePlayPause = useCallback(() => {
		if (!godot) {
			return;
		}
		setIsPaused((paused) => {
			if (paused) {
				godot.RTNGodot.resume();
			} else {
				godot.RTNGodot.pause();
			}
			return !paused;
		});
	}, [godot]);

	if (!godot) {
		return (
			<View style={[styles.container, styles.messageContainer]}>
				<Ionicons name="warning-outline" size={40} color={PLAYGROUND_COLORS.accent} />
				<Text style={styles.messageText}>{error}</Text>
				<Pressable style={styles.messageButton} onPress={() => router.back()}>
					<Text style={styles.messageButtonText}>Zurück</Text>
				</Pressable>
			</View>
		);
	}

	const { RTNGodotView } = godot;

	return (
		<View style={styles.container}>
			<RTNGodotView style={styles.gameView} />

			<View style={styles.topControls}>
				<Pressable style={styles.roundButton} onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={26} color={PLAYGROUND_COLORS.text} />
				</Pressable>
				<Pressable style={styles.roundButton} onPress={handlePlayPause}>
					<Ionicons name={isPaused ? 'play' : 'pause'} size={26} color={PLAYGROUND_COLORS.text} />
				</Pressable>
			</View>

			<View style={styles.leftControls}>
				<Pressable
					style={styles.controlButton}
					onPressIn={() => setActionPressed(godot, ACTION_LEFT, true)}
					onPressOut={() => setActionPressed(godot, ACTION_LEFT, false)}
				>
					<Ionicons name="chevron-back" size={32} color={PLAYGROUND_COLORS.text} />
				</Pressable>
				<Pressable
					style={styles.controlButton}
					onPressIn={() => setActionPressed(godot, ACTION_RIGHT, true)}
					onPressOut={() => setActionPressed(godot, ACTION_RIGHT, false)}
				>
					<Ionicons name="chevron-forward" size={32} color={PLAYGROUND_COLORS.text} />
				</Pressable>
			</View>

			<View style={styles.rightControls}>
				<Pressable
					style={[styles.controlButton, styles.jumpButton]}
					onPressIn={() => setActionPressed(godot, ACTION_JUMP, true)}
					onPressOut={() => setActionPressed(godot, ACTION_JUMP, false)}
				>
					<Ionicons name="arrow-up" size={36} color={PLAYGROUND_COLORS.text} />
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: PLAYGROUND_COLORS.background,
	},
	gameView: {
		flex: 1,
	},
	messageContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: 16,
		padding: 32,
	},
	messageText: {
		color: PLAYGROUND_COLORS.text,
		fontSize: 15,
		lineHeight: 21,
		textAlign: 'center',
	},
	messageButton: {
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 12,
		backgroundColor: PLAYGROUND_COLORS.surface,
		borderWidth: 1,
		borderColor: PLAYGROUND_COLORS.border,
	},
	messageButtonText: {
		color: PLAYGROUND_COLORS.text,
		fontSize: 15,
	},
	topControls: {
		position: 'absolute',
		top: 40,
		right: 30,
		flexDirection: 'row',
		gap: 12,
	},
	roundButton: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		borderWidth: 2,
		borderColor: 'rgba(255, 255, 255, 0.3)',
	},
	leftControls: {
		position: 'absolute',
		bottom: 40,
		left: 30,
		flexDirection: 'row',
		gap: 20,
	},
	rightControls: {
		position: 'absolute',
		bottom: 40,
		right: 30,
	},
	controlButton: {
		width: 70,
		height: 70,
		borderRadius: 35,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		borderWidth: 3,
		borderColor: 'rgba(255, 255, 255, 0.3)',
	},
	jumpButton: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: 'rgba(220, 38, 38, 0.7)',
		borderColor: 'rgba(255, 255, 255, 0.4)',
	},
});
