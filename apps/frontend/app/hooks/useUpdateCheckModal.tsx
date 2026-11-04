import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import * as Updates from 'expo-updates';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import SettingsList from '@/components/SettingsList';
import usePlatformHelper from '@/helper/platformHelper';
import { areExpoUpdatesAvailable } from '@/helper/DeviceRuntimeHelper';

type UpdateStep = 'checking' | 'no_update' | 'update_available' | 'downloading' | 'downloaded' | 'reloading' | 'unavailable';

const UpdateCheckModalContent: React.FC = () => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { isSmartPhone } = usePlatformHelper();

	const [step, setStep] = useState<UpdateStep>('checking');

	const runCheck = useCallback(async () => {
		if (!isSmartPhone() || !areExpoUpdatesAvailable()) {
			setStep('unavailable');
			return;
		}
		setStep('checking');
		try {
			const result = await Updates.checkForUpdateAsync();
			setStep(result.isAvailable ? 'update_available' : 'no_update');
		} catch {
			setStep('no_update');
		}
	}, [isSmartPhone]);

	// Auto-check as soon as the modal opens - the point is to skip the extra
	// tap that the debug "experimentell Expo Update" screen requires.
	useEffect(() => {
		runCheck();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const runDownload = useCallback(async () => {
		setStep('downloading');
		try {
			const result = await Updates.fetchUpdateAsync();
			setStep(result?.isNew ? 'downloaded' : 'no_update');
		} catch {
			// Stay on update_available so the user can retry the download.
			setStep('update_available');
		}
	}, []);

	const runReload = useCallback(async () => {
		setStep('reloading');
		try {
			await Updates.reloadAsync();
		} catch {
			setStep('downloaded');
		}
	}, []);

	let checkValue: string | undefined = undefined;
	if (step === 'unavailable') {
		checkValue = translate(TranslationKeys.update_not_available_on_platform);
	} else if (step === 'no_update') {
		checkValue = translate(TranslationKeys.update_current_version);
	}

	return (
		<View style={{ width: '100%', gap: 0 }}>
			<SettingsList
				leftIcon={<MaterialCommunityIcons name="cloud-search-outline" size={24} color={theme.screen.icon} />}
				rightIcon={step === 'checking' ? <LoadingIndicator size="small" color={theme.screen.icon} /> : undefined}
				label={translate(TranslationKeys.CHECK_FOR_APP_UPDATES)}
				value={checkValue}
				groupPosition={step === 'update_available' || step === 'downloading' || step === 'downloaded' || step === 'reloading' ? 'top' : 'single'}
			/>
			{(step === 'update_available' || step === 'downloading' || step === 'downloaded' || step === 'reloading') && (
				<>
					<View style={{ opacity: step === 'update_available' ? 1 : 0.5 }}>
						<SettingsList
							leftIcon={<MaterialCommunityIcons name="cloud-download-outline" size={24} color={theme.screen.icon} />}
							rightIcon={step === 'downloading' ? <LoadingIndicator size="small" color={theme.screen.icon} /> : undefined}
							label={translate(TranslationKeys.DOWNLOAD_NEW_APP_UPDATE)}
							handleFunction={step === 'update_available' ? runDownload : undefined}
							groupPosition="middle"
						/>
					</View>
					<View style={{ opacity: step === 'downloaded' ? 1 : 0.5 }}>
						<SettingsList
							leftIcon={<MaterialCommunityIcons name="reload" size={24} color={theme.screen.icon} />}
							rightIcon={step === 'reloading' ? <LoadingIndicator size="small" color={theme.screen.icon} /> : undefined}
							label={translate(TranslationKeys.RELOAD_APP)}
							handleFunction={step === 'downloaded' ? runReload : undefined}
							groupPosition="bottom"
						/>
					</View>
				</>
			)}
		</View>
	);
};

export const useUpdateCheckModal = () => {
	const { show: showScrollViewModal } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const openUpdateCheckModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.CHECK_FOR_APP_UPDATES),
			children: <UpdateCheckModalContent />,
		});
	}, [showScrollViewModal, translate]);

	return { openUpdateCheckModal };
};

export default useUpdateCheckModal;
