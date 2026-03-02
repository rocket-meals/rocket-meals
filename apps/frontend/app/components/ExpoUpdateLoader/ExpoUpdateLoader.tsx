import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Updates from 'expo-updates';
import usePlatformHelper from '@/helper/platformHelper';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';
import { isInExpoGo } from '@/helper/DeviceRuntimeHelper';

interface ExpoUpdateLoaderProps {
	children?: React.ReactNode;
}

const TIMEOUT_MS = 10000; // 10 Sekunden

const ExpoUpdateLoader: React.FC<ExpoUpdateLoaderProps> = ({ children }) => {
	const { isSmartPhone } = usePlatformHelper();
	const { translate } = useLanguage();
	const [loading, setLoading] = useState<boolean>(isSmartPhone());
	const [status, setStatus] = useState<TranslationKeys>(TranslationKeys.CHECK_FOR_APP_UPDATES);
	const [showCancel, setShowCancel] = useState<boolean>(false);
	const cancelUpdateRef = useRef(false);

	useEffect(() => {
		async function loadUpdates() {
			if (!isSmartPhone() || isInExpoGo()) {
				setLoading(false);
				return;
			}

			const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), TIMEOUT_MS));

			try {
				setStatus(TranslationKeys.CHECK_FOR_APP_UPDATES);
				const update = (await Promise.race([Updates.checkForUpdateAsync(), timeoutPromise])) as Updates.CheckForUpdateResult | null;

				if (cancelUpdateRef.current) {
					return;
				}

				if (!update || !update.isAvailable) {
					setLoading(false);
					return;
				}

				setStatus(TranslationKeys.DOWNLOAD_NEW_APP_UPDATE);
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
			<Image source={require('@/assets/images/company.png')} style={styles.logo} resizeMode="contain" />
			<View style={styles.bottomContainer}>
				{showCancel && (
					<TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
						<Text style={styles.cancelLabel}>{translate(TranslationKeys.cancel)}</Text>
					</TouchableOpacity>
				)}
				<Text style={styles.title}>{translate(status)}</Text>
				<ActivityIndicator size="large" style={styles.spinner} />
			</View>
		</View>
	);
};

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

export default ExpoUpdateLoader;
