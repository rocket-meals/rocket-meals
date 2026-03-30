import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ImageSourcePropType, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Updates from 'expo-updates';

const TIMEOUT_MS = 10000;

const isSmartPhone = () => Platform.OS === 'android' || Platform.OS === 'ios';

export interface ExpoUpdateLoaderLabels {
	checkForUpdate: string;
	downloadUpdate: string;
	cancel: string;
}

export interface ExpoUpdateLoaderProps {
	children?: React.ReactNode;
	/** App logo shown on the loading screen */
	logoSource: ImageSourcePropType;
	/** Localised labels for the loading screen */
	labels: ExpoUpdateLoaderLabels;
	/**
	 * Set to true to skip the update check entirely (e.g. when running inside Expo Go).
	 * Defaults to false.
	 */
	disabled?: boolean;
}

const ExpoUpdateLoader: React.FC<ExpoUpdateLoaderProps> = ({ children, logoSource, labels, disabled = false }) => {
	const [loading, setLoading] = useState<boolean>(isSmartPhone() && !disabled);
	const [statusLabel, setStatusLabel] = useState<string>(labels.checkForUpdate);
	const [showCancel, setShowCancel] = useState<boolean>(false);
	const cancelUpdateRef = useRef(false);

	useEffect(() => {
		async function loadUpdates() {
			if (!isSmartPhone() || disabled) {
				setLoading(false);
				return;
			}

			const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), TIMEOUT_MS));

			try {
				setStatusLabel(labels.checkForUpdate);
				const update = (await Promise.race([Updates.checkForUpdateAsync(), timeoutPromise])) as Awaited<
					ReturnType<typeof Updates.checkForUpdateAsync>
				> | null;

				if (cancelUpdateRef.current) return;

				if (!update || !update.isAvailable) {
					setLoading(false);
					return;
				}

				setStatusLabel(labels.downloadUpdate);
				const fetchResult = await Promise.race([Updates.fetchUpdateAsync(), timeoutPromise]);

				if (cancelUpdateRef.current) return;

				if (fetchResult) {
					await Updates.reloadAsync();
				}
			} catch (e) {
				console.error('Error while applying updates', e);
			} finally {
				setLoading(false);
			}
		}

		loadUpdates();
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => setShowCancel(true), 3000);
		return () => clearTimeout(timer);
	}, []);

	const handleCancel = () => {
		cancelUpdateRef.current = true;
		setLoading(false);
	};

	if (!loading) {
		return <>{children}</>;
	}

	return (
		<View style={styles.container}>
			<Image source={logoSource} style={styles.logo} resizeMode="contain" />
			<View style={styles.bottomContainer}>
				{showCancel && (
					<TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
						<Text style={styles.cancelLabel}>{labels.cancel}</Text>
					</TouchableOpacity>
				)}
				<Text style={styles.title}>{statusLabel}</Text>
				<ActivityIndicator size="large" style={styles.spinner} />
			</View>
		</View>
	);
};

export default ExpoUpdateLoader;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
	logo: {
		width: 200,
		height: 200,
		marginBottom: 20,
	},
	bottomContainer: {
		position: 'absolute',
		bottom: 40,
		left: 0,
		right: 0,
		flexDirection: 'column-reverse',
		alignItems: 'center',
	},
	spinner: {
		marginBottom: 15,
	},
	title: {
		fontSize: 18,
		marginBottom: 10,
	},
	cancelButton: {
		width: 200,
		height: 45,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 10,
		marginTop: 20,
	},
	cancelLabel: {
		fontSize: 16,
	},
});
