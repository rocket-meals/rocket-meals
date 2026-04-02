import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ImageSourcePropType, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Updates from 'expo-updates';

export interface ExpoUpdateLoaderTexts {
	checkingForUpdates?: string;
	downloadingUpdate?: string;
	cancelLabel?: string;
}

const DEFAULT_TEXTS: Required<ExpoUpdateLoaderTexts> = {
	checkingForUpdates: 'Check for App Updates',
	downloadingUpdate: 'Download New App Update',
	cancelLabel: 'Cancel',
};

export interface ExpoUpdateLoaderProps {
	children?: React.ReactNode;
	logoSource: ImageSourcePropType;
	texts?: ExpoUpdateLoaderTexts;
	isExpoGo?: boolean;
}

const TIMEOUT_MS = 10000;

const ExpoUpdateLoader: React.FC<ExpoUpdateLoaderProps> = ({ children, logoSource, texts, isExpoGo = false }) => {
	const t = { ...DEFAULT_TEXTS, ...texts };
	const isSmartPhone = Platform.OS !== 'web';
	const [loading, setLoading] = useState<boolean>(isSmartPhone);
	const [status, setStatus] = useState<string>(t.checkingForUpdates);
	const [showCancel, setShowCancel] = useState<boolean>(false);
	const cancelUpdateRef = useRef(false);

	useEffect(() => {
		async function loadUpdates() {
			if (!isSmartPhone || isExpoGo) {
				setLoading(false);
				return;
			}

			const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), TIMEOUT_MS));

			try {
				setStatus(t.checkingForUpdates);
				const update = (await Promise.race([Updates.checkForUpdateAsync(), timeoutPromise])) as Awaited<
					ReturnType<typeof Updates.checkForUpdateAsync>
				> | null;

				if (cancelUpdateRef.current) {
					return;
				}

				if (!update || !update.isAvailable) {
					setLoading(false);
					return;
				}

				setStatus(t.downloadingUpdate);
				const fetchResult = await Promise.race([Updates.fetchUpdateAsync(), timeoutPromise]);

				if (cancelUpdateRef.current) {
					return;
				}

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
						<Text style={styles.cancelLabel}>{t.cancelLabel}</Text>
					</TouchableOpacity>
				)}
				<Text style={styles.title}>{status}</Text>
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
