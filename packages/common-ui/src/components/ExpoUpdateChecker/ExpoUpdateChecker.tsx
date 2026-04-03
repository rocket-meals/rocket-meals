import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Updates from 'expo-updates';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { myContrastColor } from '../../helpers/ColorHelper';
import { useCommonTranslation } from '../../hooks/useCommonTranslation';
import { CommonUITranslationKeys } from '../../locales/keys';

export interface ExpoUpdateCheckerTexts {
	updateAvailableTitle?: string;
	updateAvailableMessage?: string;
	noUpdatesTitle?: string;
	noUpdatesMessage?: string;
	cancelLabel?: string;
	okayLabel?: string;
	updateLabel?: string;
}

export interface ExpoUpdateCheckerProps {
	children?: ReactNode;
	texts?: ExpoUpdateCheckerTexts;
	isExpoGo?: boolean;
}

interface UpdateCheckerContextType {
	manualCheck: () => void;
}

const UpdateCheckerContext = createContext<UpdateCheckerContextType | null>(null);

const ExpoUpdateChecker: React.FC<ExpoUpdateCheckerProps> = ({ children, texts, isExpoGo = false }) => {
	const { translate } = useCommonTranslation();
	const t = useMemo(() => ({
		updateAvailableTitle: translate(CommonUITranslationKeys.update_available),
		updateAvailableMessage: translate(CommonUITranslationKeys.update_available_message),
		noUpdatesTitle: translate(CommonUITranslationKeys.no_updates),
		noUpdatesMessage: translate(CommonUITranslationKeys.no_updates_message),
		cancelLabel: translate(CommonUITranslationKeys.cancel),
		okayLabel: translate(CommonUITranslationKeys.ok),
		updateLabel: translate(CommonUITranslationKeys.update),
		...texts,
	}), [texts, translate]);
	const appStateRef = useRef<AppStateStatus>(AppState.currentState);
	const { theme } = useTheme();
	const settingsCtx = useSettingsContext();
	const primaryColor = settingsCtx?.primaryColor ?? '#007AFF';
	const contrastColor = myContrastColor(primaryColor, theme, false);

	const [modalVisible, setModalVisible] = useState(false);
	const [updating, setUpdating] = useState(false);
	const [updateAvailable, setUpdateAvailable] = useState(false);
	const [title, setTitle] = useState(t.updateAvailableTitle);
	const [message, setMessage] = useState(t.updateAvailableMessage);

	const isSmartPhone = Platform.OS !== 'web';

	const checkForUpdates = useCallback(async (showUpToDate = false) => {
		if (!isSmartPhone) return;
		if (isExpoGo) return;
		try {
			const update = await Updates.checkForUpdateAsync();
			if (update.isAvailable) {
				setUpdateAvailable(true);
				setTitle(t.updateAvailableTitle);
				setMessage(t.updateAvailableMessage);
				setModalVisible(true);
			} else if (showUpToDate) {
				setUpdateAvailable(false);
				setTitle(t.noUpdatesTitle);
				setMessage(t.noUpdatesMessage);
				setModalVisible(true);
			}
		} catch (e) {
			console.error('Error while checking updates', e);
		}
	}, [isSmartPhone, isExpoGo, t]);

	useEffect(() => {
		if (!isSmartPhone) return;
		const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
			if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
				checkForUpdates();
			}
			appStateRef.current = nextState;
		});
		return () => {
			subscription.remove();
		};
	}, [isSmartPhone, isExpoGo, checkForUpdates]);

	const applyUpdate = async () => {
		try {
			setUpdating(true);
			await Updates.fetchUpdateAsync();
			await Updates.reloadAsync();
		} catch (e) {
			console.error('Error while applying updates', e);
		}
	};

	return (
		<UpdateCheckerContext.Provider value={{ manualCheck: () => checkForUpdates(true) }}>
			{children}
			<Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
				<View style={styles.overlay}>
					<View style={[styles.sheet, { backgroundColor: theme.screen.background }]}>
						<Text style={[styles.sheetTitle, { color: theme.screen.text }]}>{title}</Text>
						<Text style={[styles.sheetMessage, { color: theme.screen.text }]}>{message}</Text>
						<View style={styles.buttonContainer}>
							<TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.cancelButton, { borderColor: primaryColor }]}>
								<Text style={[styles.buttonText, { color: theme.screen.text }]}>{updateAvailable ? t.cancelLabel : t.okayLabel}</Text>
							</TouchableOpacity>
							{updateAvailable && (
								<TouchableOpacity onPress={applyUpdate} style={[styles.saveButton, { backgroundColor: primaryColor }]}>
									{updating ? (
										<ActivityIndicator color={contrastColor} />
									) : (
										<Text style={[styles.buttonText, { color: contrastColor }]}>{t.updateLabel}</Text>
									)}
								</TouchableOpacity>
							)}
						</View>
					</View>
				</View>
			</Modal>
		</UpdateCheckerContext.Provider>
	);
};

export const useExpoUpdateChecker = (): UpdateCheckerContextType => {
	const ctx = useContext(UpdateCheckerContext);
	if (!ctx) throw new Error('useExpoUpdateChecker must be used within ExpoUpdateChecker');
	return ctx;
};

export default ExpoUpdateChecker;

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'flex-end',
	},
	sheet: {
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		padding: 24,
		alignItems: 'center',
	},
	sheetTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 12,
		textAlign: 'center',
	},
	sheetMessage: {
		fontSize: 15,
		textAlign: 'center',
		marginBottom: 24,
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
	},
	cancelButton: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		marginRight: 6,
		alignItems: 'center',
		borderWidth: 1,
	},
	saveButton: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		marginLeft: 6,
		alignItems: 'center',
	},
	buttonText: {
		fontWeight: 'bold',
		fontSize: 15,
	},
});
