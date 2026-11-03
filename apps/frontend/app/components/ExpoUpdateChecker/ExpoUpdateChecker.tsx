import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import * as Updates from 'expo-updates';
import ModalSheet from '../BaseBottomModal';
import usePlatformHelper from '@/helper/platformHelper';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import { myContrastColor } from '@/helper/ColorHelper';
import { isExpoUpdatesUnavailableError } from 'repo-depkit-common-ui';
import { areExpoUpdatesAvailable } from '@/helper/DeviceRuntimeHelper';

interface ExpoUpdateCheckerProps {
	children?: ReactNode;
}

interface UpdateCheckerContextType {
	manualCheck: () => void;
}

const UpdateCheckerContext = createContext<UpdateCheckerContextType | null>(null);

const ExpoUpdateChecker: React.FC<ExpoUpdateCheckerProps> = ({ children }) => {
	const appState = useRef<AppStateStatus>(AppState.currentState);
	const { isSmartPhone } = usePlatformHelper();
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { primaryColor, selectedTheme: mode } = useAppSelector(state => state.settings);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');

	const [modalVisible, setModalVisible] = useState(false);
	const [updating, setUpdating] = useState(false);
	const [updateAvailable, setUpdateAvailable] = useState(false);
	const [titleKey, setTitleKey] = useState<TranslationKeys>(TranslationKeys.update_available);
	const [messageKey, setMessageKey] = useState<TranslationKeys>(TranslationKeys.update_available_message);

	const checkForUpdates = useCallback(async (showUpToDate = false) => {
		if (!isSmartPhone()) return;
		if (!areExpoUpdatesAvailable()) return;
		try {
			const update = await Updates.checkForUpdateAsync();
			if (update.isAvailable) {
				setUpdateAvailable(true);
				setTitleKey(TranslationKeys.update_available);
				setMessageKey(TranslationKeys.update_available_message);
				setModalVisible(true);
			} else if (showUpToDate) {
				setUpdateAvailable(false);
				setTitleKey(TranslationKeys.updates);
				setMessageKey(TranslationKeys.no_updates_available);
				setModalVisible(true);
			}
		} catch (e) {
			if (isExpoUpdatesUnavailableError(e)) {
				console.info('Skipping update check: OTA updates are unavailable in this runtime', e);
			} else {
				console.error('Error while checking updates', e);
			}
		}
	}, [isSmartPhone]);

	useEffect(() => {
		if (!isSmartPhone()) return;
		const subscription = AppState.addEventListener('change', nextState => {
			if (appState.current.match(/inactive|background/) && nextState === 'active') {
				checkForUpdates();
			}
			appState.current = nextState;
		});
		return () => {
			subscription.remove();
		};
	}, []);

	const applyUpdate = async () => {
		try {
			setUpdating(true);
			await Updates.fetchUpdateAsync();
			await Updates.reloadAsync();
		} catch (e) {
			if (isExpoUpdatesUnavailableError(e)) {
				console.info('Skipping update install: OTA updates are unavailable in this runtime', e);
			} else {
				console.error('Error while applying updates', e);
			}
		}
	};

	const contextValue = useMemo(
		() => ({ manualCheck: () => checkForUpdates(true) }),
		[checkForUpdates]
	);

	return (
		<UpdateCheckerContext.Provider value={contextValue}>
			{children}
			{modalVisible && (
				<ModalSheet visible={modalVisible} onClose={() => setModalVisible(false)} title={translate(titleKey)}>
					<View style={{ padding: 20 }}>
						<Text style={{ color: theme.screen.text, textAlign: 'center' }}>{translate(messageKey)}</Text>
					</View>
					<View style={modalStyles.buttonContainer}>
						<TouchableOpacity onPress={() => setModalVisible(false)} style={[modalStyles.cancelButton, { borderColor: primaryColor }]}>
							<Text style={[modalStyles.buttonText, { color: theme.screen.text }]}>{translate(updateAvailable ? TranslationKeys.cancel : TranslationKeys.okay)}</Text>
						</TouchableOpacity>
						{updateAvailable && (
							<TouchableOpacity onPress={applyUpdate} style={[modalStyles.saveButton, { backgroundColor: primaryColor }]}>
								{updating ? <LoadingIndicator color={contrastColor} /> : <Text style={[modalStyles.buttonText, { color: contrastColor }]}>{translate(TranslationKeys.to_update)}</Text>}
							</TouchableOpacity>
						)}
					</View>
				</ModalSheet>
			)}
		</UpdateCheckerContext.Provider>
	);
};

export const useExpoUpdateChecker = () => {
	const ctx = useContext(UpdateCheckerContext);
	if (!ctx) throw new Error('useExpoUpdateChecker must be used within ExpoUpdateChecker');
	return ctx;
};

export default ExpoUpdateChecker;

const modalStyles = StyleSheet.create({
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '80%',
	},
	cancelButton: {
		flex: 1,
		padding: 10,
		borderRadius: 5,
		marginRight: 5,
		alignItems: 'center',
		borderWidth: 1,
	},
	saveButton: {
		flex: 1,
		padding: 10,
		borderRadius: 5,
		marginLeft: 5,
		alignItems: 'center',
	},
	buttonText: {
		fontWeight: 'bold',
	},
});
