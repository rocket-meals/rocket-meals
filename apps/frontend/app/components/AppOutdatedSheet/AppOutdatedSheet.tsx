import React, { useCallback } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ModalCloseReason } from 'repo-depkit-common-ui';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { useAppSelector } from '@/redux/hooks';
import useCustomerConfig from '@/hooks/useCustomerConfig';
import { getImageUrl } from '@/constants/HelperFunctions';
import { getContrastRatio } from '@/helper/ColorHelper';
import { CommonSystemActionHelper } from '@/helper/SystemActionHelper';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';

const LIGHT_TEXT_COLOR = '#FFFFFF';
const DARK_TEXT_COLOR = '#000000';

type AppOutdatedSheetProps = {
	storeUrl: string | null;
};

// The notice that a newer version of the app is in the store, shown as a sheet
// like the popup events. It can be closed (X, swipe, backdrop), the button
// opens the store.
const AppOutdatedSheet = ({ storeUrl }: AppOutdatedSheetProps) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, serverInfo } = useAppSelector(state => state.settings);
	const customerConfig = useCustomerConfig();
	// black or white, whichever reads better on the project color
	const buttonTextColor = getContrastRatio(DARK_TEXT_COLOR, primaryColor) >= getContrastRatio(LIGHT_TEXT_COLOR, primaryColor) ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR;

	const projectLogo = serverInfo?.info?.project?.project_logo ? getImageUrl(serverInfo.info.project.project_logo) : null;
	const iconSource = projectLogo ? { uri: projectLogo } : customerConfig.images.icon_logo_source_get_for_react_native();

	return (
		<View style={styles.content}>
			<Image source={iconSource} style={styles.appIcon} />
			<Text style={[styles.message, { color: theme.screen.text }]}>{translate(TranslationKeys.app_outdated_message)}</Text>
			<TouchableOpacity
				style={[styles.updateButton, { backgroundColor: primaryColor }]}
				onPress={() => storeUrl && CommonSystemActionHelper.openExternalURL(storeUrl, true)}
				disabled={!storeUrl}
				accessibilityRole="button"
				accessibilityLabel={translate(TranslationKeys.app_outdated_update_now)}
			>
				<MaterialCommunityIcons name="download" size={22} color={buttonTextColor} />
				<Text style={[styles.updateButtonText, { color: buttonTextColor }]}>{translate(TranslationKeys.app_outdated_update_now)}</Text>
			</TouchableOpacity>
		</View>
	);
};

/** Opens the "new version in the store" sheet. onClosed fires once the sheet is gone. */
export const useShowAppOutdatedSheet = () => {
	const { show } = useMyScrollViewModal();
	return useCallback(
		(storeUrl: string | null, onClosed?: (reason: ModalCloseReason) => void) => {
			show({ children: <AppOutdatedSheet storeUrl={storeUrl} /> }, onClosed ? { onClosed } : undefined);
		},
		[show]
	);
};

export default AppOutdatedSheet;

const styles = StyleSheet.create({
	content: {
		alignItems: 'center',
		paddingTop: 8,
		paddingBottom: 24,
		gap: 20,
	},
	appIcon: {
		width: 88,
		height: 88,
		borderRadius: 20,
	},
	message: {
		fontSize: 17,
		lineHeight: 26,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
	},
	updateButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		width: '100%',
		maxWidth: 420,
		height: 54,
		borderRadius: 27,
	},
	updateButtonText: {
		fontSize: 17,
		fontFamily: 'Poppins_700Bold',
	},
});
