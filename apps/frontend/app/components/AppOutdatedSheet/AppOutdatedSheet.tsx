import React, { useCallback, useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ModalCloseReason } from 'repo-depkit-common-ui';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { useAppSelector } from '@/redux/hooks';
import useCustomerConfig from '@/hooks/useCustomerConfig';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { getImageUrl } from '@/constants/HelperFunctions';
import { getContrastRatio } from '@/helper/ColorHelper';
import { CommonSystemActionHelper } from '@/helper/SystemActionHelper';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';

const LIGHT_TEXT_COLOR = '#FFFFFF';
const DARK_TEXT_COLOR = '#000000';
const BACKGROUND_BLUR_RADIUS = 18;
const SCRIM_COLOR = 'rgba(0, 0, 0, 0.55)';
// The text sits on a dark panel on top of the scrim, so it stays readable on
// any canteen image: even over a pure white image, scrim and panel together
// leave about #2E2E2E behind the white text, a contrast of about 13:1 (WCAG AA
// asks for 4.5:1).
const PANEL_COLOR = 'rgba(0, 0, 0, 0.6)';
const PANEL_BORDER_COLOR = 'rgba(255, 255, 255, 0.15)';

// plain: on the sheet's own background. canteenBackground: on the blurred
// image of the selected canteen (the project color without one).
export type AppOutdatedSheetVariant = 'plain' | 'canteenBackground';

type AppOutdatedSheetProps = {
	storeUrl: string | null;
	variant?: AppOutdatedSheetVariant;
};

// The notice that a newer version of the app is in the store, shown as a sheet
// like the popup events. It can be closed (X, swipe, backdrop), the button
// opens the store.
const AppOutdatedSheet = ({ storeUrl, variant = 'plain' }: AppOutdatedSheetProps) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, serverInfo } = useAppSelector(state => state.settings);
	const { buildingsDict } = useAppSelector(state => state.canteenReducer);
	const selectedCanteen = useSelectedCanteen();
	const customerConfig = useCustomerConfig();
	const withCanteenBackground = variant === 'canteenBackground';

	const canteenImageUrl = useMemo(() => {
		if (!withCanteenBackground) return null;
		const building = selectedCanteen?.building ? buildingsDict[String(selectedCanteen.building)] : undefined;
		return building?.image_remote_url || (building?.image ? getImageUrl(String(building.image)) : null);
	}, [withCanteenBackground, selectedCanteen, buildingsDict]);
	// black or white, whichever reads better on the project color
	const buttonTextColor = getContrastRatio(DARK_TEXT_COLOR, primaryColor) >= getContrastRatio(LIGHT_TEXT_COLOR, primaryColor) ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR;

	const projectLogo = serverInfo?.info?.project?.project_logo ? getImageUrl(serverInfo.info.project.project_logo) : null;
	const iconSource = projectLogo ? { uri: projectLogo } : customerConfig.images.icon_logo_source_get_for_react_native();

	const message = <Text style={[styles.message, { color: withCanteenBackground ? LIGHT_TEXT_COLOR : theme.screen.text }]}>{translate(TranslationKeys.app_outdated_message)}</Text>;

	return (
		<View style={[styles.content, withCanteenBackground && [styles.canteenCard, { backgroundColor: primaryColor }]]}>
			{withCanteenBackground && (
				<>
					{canteenImageUrl && <Image source={{ uri: canteenImageUrl }} style={StyleSheet.absoluteFill} blurRadius={BACKGROUND_BLUR_RADIUS} resizeMode="cover" />}
					<View style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM_COLOR }]} />
				</>
			)}
			<Image source={iconSource} style={styles.appIcon} />
			{withCanteenBackground ? <View style={styles.panel}>{message}</View> : message}
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
		(storeUrl: string | null, onClosed?: (reason: ModalCloseReason) => void, variant: AppOutdatedSheetVariant = 'plain') => {
			show({ children: <AppOutdatedSheet storeUrl={storeUrl} variant={variant} /> }, onClosed ? { onClosed } : undefined);
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
	canteenCard: {
		overflow: 'hidden',
		borderRadius: 24,
		paddingTop: 28,
		paddingBottom: 24,
		paddingHorizontal: 16,
		marginBottom: 8,
	},
	panel: {
		width: '100%',
		padding: 20,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: PANEL_BORDER_COLOR,
		backgroundColor: PANEL_COLOR,
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
