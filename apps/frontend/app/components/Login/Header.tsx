import { Platform, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { styles } from './styles';
import { isWeb } from '@/constants/Constants';
import { useLanguage } from '@/hooks/useLanguage';
import { useLocales } from 'expo-localization';
import { useDispatch, useSelector } from 'react-redux';
import { SET_DRAWER_POSITION } from '@/redux/Types/types';
import { languages } from '../../constants/SettingData';
import MyImage from '@/components/MyImage';
import { Entypo } from '@expo/vector-icons';
import { getImageUrl } from '@/constants/HelperFunctions';
import { RootState } from '@/redux/reducer';
import { useLanguageModal } from '@/hooks/useLanguageModal';

const LoginHeader = () => {
        const { setLanguageMode, language } = useLanguage();
        const locales = useLocales();
        const dispatch = useDispatch();
        const { theme } = useTheme();
        const { serverInfo } = useSelector((state: RootState) => state.settings);
        const deviceLocale: any = useDeviceLocaleCodesWithoutRegionCode();
        const { openLanguageModal } = useLanguageModal();

	function useDeviceLocaleCodesWithoutRegionCode(): string[] {
		let localeCodes: string[] = [];

		for (let i = 0; i < locales.length; i++) {
			let locale = locales[i];
			localeCodes.push(locale.languageTag);
		}

		const defaultLanguageCode = 'de';
		const defaultFallbackLanguageCode = 'en';

		if (Platform.OS === 'web') {
			localeCodes = localeCodes.sort((a, b) => {
				if (a.startsWith(defaultLanguageCode)) {
					return -1;
				} else if (b.startsWith(defaultLanguageCode)) {
					return 1;
				} else {
					return 0;
				}
			});
		}

		return localeCodes.length > 0 ? localeCodes : [defaultFallbackLanguageCode];
	}

	useEffect(() => {
		if (!language) {
			const langCode = deviceLocale[0]?.split('-')[0];
			setLanguageMode(langCode);
			if (langCode === 'ar') {
				dispatch({
					type: SET_DRAWER_POSITION,
					payload: 'right',
				});
			}
		} else {
			if (language === 'ar') {
				dispatch({
					type: SET_DRAWER_POSITION,
					payload: 'right',
				});
			}
		}
	}, []);

        const selectedLanguage = language;
	return (
		<View style={styles.header}>
			<MyImage
				source={{
					uri: getImageUrl(serverInfo?.info?.project?.project_logo),
				}}
				style={{
					width: 64,
					height: 64,
					resizeMode: 'contain',
					borderRadius: 6,
				}}
			/>
                        <TouchableOpacity
                                onPress={openLanguageModal}
                                style={{
					...styles.picker,
					height: isWeb ? 41 : 'auto',
					backgroundColor: theme.login.pickerBg,
					color: theme.login.pickerText,
				}}
			>
				<Text
					style={{
						...styles.selectText,
						color: theme.screen.text,
					}}
				>
                                        {languages.find(lang => lang.value === selectedLanguage)?.label || 'selected language'}
                                </Text>
                                <Entypo name="chevron-small-down" size={25} color={theme.screen.icon} />
                        </TouchableOpacity>
                </View>
        );
};

export default LoginHeader;
