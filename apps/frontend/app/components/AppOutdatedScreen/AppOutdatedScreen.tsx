import React, { useMemo } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { useAppSelector } from '@/redux/hooks';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import useCustomerConfig from '@/hooks/useCustomerConfig';
import { getImageUrl } from '@/constants/HelperFunctions';
import { getContrastRatio } from '@/helper/ColorHelper';
import { CommonSystemActionHelper } from '@/helper/SystemActionHelper';

export type AppOutdatedScreenProps = {
	visible: boolean;
	storeUrl: string | null;
	// Only for the experimental preview: the real screen cannot be closed.
	onClosePreview?: () => void;
};

const BACKGROUND_BLUR_RADIUS = 18;
const SCRIM_COLOR = 'rgba(0, 0, 0, 0.55)';
// The text sits on a dark panel on top of the scrim, so it stays readable on
// any canteen image: even over a pure white image, scrim and panel together
// leave about #2E2E2E behind the white text, a contrast of about 13:1 (WCAG AA
// asks for 4.5:1).
const PANEL_COLOR = 'rgba(0, 0, 0, 0.6)';
const PANEL_BORDER_COLOR = 'rgba(255, 255, 255, 0.15)';
const TEXT_COLOR = '#FFFFFF';
const DARK_TEXT_COLOR = '#000000';

// Full screen notice that a newer version of the app is in the store. There is
// nothing to tap except the store button: no close button, and the Android back
// button does nothing (onRequestClose is a no-op). The selected canteen shows
// blurred behind it, so the user still sees where they are.
export const AppOutdatedScreen = ({ visible, storeUrl, onClosePreview }: AppOutdatedScreenProps) => {
	const { translate } = useLanguage();
	const { primaryColor, serverInfo } = useAppSelector(state => state.settings);
	const { buildingsDict } = useAppSelector(state => state.canteenReducer);
	const selectedCanteen = useSelectedCanteen();
	const customerConfig = useCustomerConfig();
	// black or white, whichever reads better on the project color
	const buttonTextColor = getContrastRatio(DARK_TEXT_COLOR, primaryColor) >= getContrastRatio(TEXT_COLOR, primaryColor) ? DARK_TEXT_COLOR : TEXT_COLOR;

	const canteenImageUrl = useMemo(() => {
		const building = selectedCanteen?.building ? buildingsDict[String(selectedCanteen.building)] : undefined;
		return building?.image_remote_url || (building?.image ? getImageUrl(String(building.image)) : null);
	}, [selectedCanteen, buildingsDict]);

	const projectLogo = serverInfo?.info?.project?.project_logo ? getImageUrl(serverInfo.info.project.project_logo) : null;
	const iconSource = projectLogo ? { uri: projectLogo } : customerConfig.images.icon_logo_source_get_for_react_native();

	return (
		<Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
			<View style={[styles.container, { backgroundColor: primaryColor }]}>
				{canteenImageUrl && <Image source={{ uri: canteenImageUrl }} style={StyleSheet.absoluteFill} blurRadius={BACKGROUND_BLUR_RADIUS} resizeMode="cover" />}
				<View style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM_COLOR }]} />
				<View style={styles.content}>
					<Image source={iconSource} style={styles.appIcon} />
					<View style={styles.panel}>
						<Text style={styles.title}>{translate(TranslationKeys.app_outdated_title)}</Text>
						<Text style={styles.message}>{translate(TranslationKeys.app_outdated_message)}</Text>
					</View>
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
					{onClosePreview && (
						<TouchableOpacity style={[styles.panel, styles.previewCloseButton]} onPress={onClosePreview} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.app_outdated_end_preview)}>
							<Text style={styles.previewCloseText}>{translate(TranslationKeys.app_outdated_end_preview)}</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		</Modal>
	);
};

export default AppOutdatedScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	content: {
		width: '100%',
		maxWidth: 420,
		paddingHorizontal: 32,
		alignItems: 'center',
	},
	appIcon: {
		width: 96,
		height: 96,
		borderRadius: 22,
		marginBottom: 28,
	},
	panel: {
		width: '100%',
		paddingVertical: 20,
		paddingHorizontal: 20,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: PANEL_BORDER_COLOR,
		backgroundColor: PANEL_COLOR,
		marginBottom: 32,
	},
	title: {
		fontSize: 26,
		fontFamily: 'Poppins_700Bold',
		color: TEXT_COLOR,
		textAlign: 'center',
		marginBottom: 12,
	},
	message: {
		fontSize: 16,
		lineHeight: 24,
		fontFamily: 'Poppins_400Regular',
		color: TEXT_COLOR,
		textAlign: 'center',
	},
	updateButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		width: '100%',
		height: 54,
		borderRadius: 27,
	},
	updateButtonText: {
		fontSize: 17,
		fontFamily: 'Poppins_700Bold',
	},
	previewCloseButton: {
		width: 'auto',
		marginTop: 24,
		marginBottom: 0,
		paddingVertical: 10,
		paddingHorizontal: 18,
	},
	previewCloseText: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		color: TEXT_COLOR,
		textDecorationLine: 'underline',
	},
});
