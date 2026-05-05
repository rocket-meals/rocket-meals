import { Dimensions, Text, TouchableOpacity } from 'react-native';
import React, { useCallback } from 'react';
import BaseModal from '@/components/BaseModal';
import { styles } from './styles';
import { PermissionModalProps } from './types';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import { myContrastColor } from '@/helper/ColorHelper';
import { performLogout } from '@/helper/logoutHelper';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';

const PermissionModal: React.FC<PermissionModalProps> = ({ isVisible, setIsVisible }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, selectedTheme: mode } = useAppSelector(state => state.settings);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	const { close: closeScrollViewModal } = useMyScrollViewModal();
	const dispatch = useDispatch();
	const router = useRouter();

	const handleClose = useCallback(() => {
		closeScrollViewModal();
		setIsVisible(false);
	}, [closeScrollViewModal, setIsVisible]);

	const handleLogout = useCallback(async () => {
		handleClose();
		await performLogout(dispatch, router);
	}, [dispatch, handleClose, router]);

	return (
		<BaseModal isVisible={isVisible} title={translate(TranslationKeys.access_limited)} onClose={handleClose}>
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
					{translate(TranslationKeys.sign_in)} / {translate(TranslationKeys.create_account)}
				</Text>
			</TouchableOpacity>
		</BaseModal>
	);
};

export default PermissionModal;
