import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import ProjectButton from '@/components/ProjectButton';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import { performLogout } from '@/helper/logoutHelper';

const useRatingPermissionModal = () => {
	const { show, close } = useMyScrollViewModal();
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const router = useRouter();
	const dispatch = useDispatch();

	const openRatingPermissionModal = useCallback(() => {
		const handleLogin = () => {
			void performLogout(dispatch, router);
		};

		show({
			title: translate(TranslationKeys.access_limited),
			onClose: close,
			children: (
				<View style={{ gap: 12 }}>
					<Text style={{ color: theme.sheet.text }}>
						{translate(TranslationKeys.limited_access_description)}
					</Text>
					<ProjectButton
						text={`${translate(TranslationKeys.sign_in)} / ${translate(TranslationKeys.create_account)}`}
						onPress={() => {
							close();
							handleLogin();
						}}
						style={{ marginVertical: 0 }}
					/>
				</View>
			),
		});
	}, [close, dispatch, router, show, theme.sheet.text, translate]);

	return { openRatingPermissionModal, closeRatingPermissionModal: close };
};

export default useRatingPermissionModal;
