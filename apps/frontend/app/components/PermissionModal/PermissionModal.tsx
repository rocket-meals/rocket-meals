import { Dimensions, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import BaseModal from '@/components/BaseModal';
import { styles } from './styles';
import { PermissionModalProps } from './types';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { useLogoutCallback } from '@/redux/actions/User/User';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import { myContrastColor } from '@/helper/colorHelper';
import { RootState } from '@/redux/reducer';

const PermissionModal: React.FC<PermissionModalProps> = ({
	isVisible,
	setIsVisible,
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, selectedTheme: mode } = useSelector(
		(state: RootState) => state.settings
	);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	const router = useRouter();
	const onLogout = useLogoutCallback();

	const handleLogout = () => {
		onLogout();
		router.replace('/(auth)/login');
	};

	return (
		<BaseModal
			isVisible={isVisible}
			title={translate(TranslationKeys.access_limited)}
			onClose={() => setIsVisible(false)}
		>
			<Text
				style={{
					...styles.modalSubHeading,
					color: theme.modal.text,
					fontSize: Dimensions.get('window').width < 500 ? 14 : 18,
				}}
			>
				{translate(TranslationKeys.limited_access_description)}
			</Text>
			<TouchableOpacity
				style={{
					...styles.loginButton,
					backgroundColor: primaryColor,
					width: Dimensions.get('window').width < 500 ? '100%' : '80%',
				}}
				onPress={handleLogout}
			>
				<Text style={{ ...styles.loginLabel, color: contrastColor }}>
					{translate(TranslationKeys.sign_in)} /{' '}
					{translate(TranslationKeys.create_account)}
				</Text>
			</TouchableOpacity>
		</BaseModal>
	);
};

export default PermissionModal;
