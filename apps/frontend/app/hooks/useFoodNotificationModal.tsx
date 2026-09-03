import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import ProjectButton from '@/components/ProjectButton';
import { NotificationHelper } from '@/helper/NotificationHelper';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';

/**
 * The two modals around the "notify me when this food is served" reminder:
 *
 * - the confirmation shown where the app cannot ask for a system permission (web/desktop),
 * - the hint shown when the system permission is missing and can no longer be requested, which
 *   offers the way into the system settings.
 *
 * Both use the app's shared scroll-view modal so they look and behave like every other modal.
 */
const useFoodNotificationModal = () => {
	const { show, close } = useMyScrollViewModal();
	const { translate } = useLanguage();
	const { theme } = useTheme();

	const showNotificationModal = useCallback(
		(description: string, confirmLabel: string, onConfirm: () => void | Promise<void>) => {
			show({
				title: translate(TranslationKeys.notification),
				children: (
					<View style={{ gap: 12 }}>
						<Text style={{ color: theme.screen.text }}>{description}</Text>
						<ProjectButton
							text={confirmLabel}
							onPress={() => {
								close();
								void onConfirm();
							}}
							style={{ marginVertical: 0 }}
						/>
						<TouchableOpacity onPress={close} style={{ alignSelf: 'center', paddingVertical: 6 }}>
							<Text style={{ color: theme.screen.text }}>{translate(TranslationKeys.cancel)}</Text>
						</TouchableOpacity>
					</View>
				),
			});
		},
		[close, show, theme.screen.text, translate]
	);

	/** Asks the user to confirm the reminder; `onConfirm` performs the actual toggle. */
	const openNotificationConfirmModal = useCallback(
		(onConfirm: () => void | Promise<void>) => {
			showNotificationModal(
				translate(TranslationKeys.notification_please_notify_me_on_my_smartphones_if_they_allow_to_be_notified),
				translate(TranslationKeys.confirm),
				onConfirm
			);
		},
		[showNotificationModal, translate]
	);

	/** Explains the missing system permission and offers to open the system settings. */
	const openNotificationPermissionModal = useCallback(() => {
		showNotificationModal(
			translate(TranslationKeys.notification_please_enable_notifications_in_order_to_use_this_feature),
			translate(TranslationKeys.notification_open_system_settings),
			() => NotificationHelper.openSystemNotificationSettings()
		);
	}, [showNotificationModal, translate]);

	return { openNotificationConfirmModal, openNotificationPermissionModal, closeNotificationModal: close };
};

export default useFoodNotificationModal;
