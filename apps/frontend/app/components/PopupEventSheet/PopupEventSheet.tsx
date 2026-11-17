import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MyImage from '@/components/MyImage';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { useAppSelector } from '@/redux/hooks';
import { PopupEventSheetProps } from './types';
import { getNewsImageUrl } from '@/constants/HelperFunctions';
import { getTextFromTranslation, getTitleFromTranslation } from '@/helper/resourceHelper';
import ProjectButton from '../ProjectButton';
import MyMarkdownProjectColored from '@/components/MyMarkdownProjectColored';
import { RateAppSettingsItem } from '../RateAppSettingsItem/RateAppSettingsItem';
import { AppRatingPromptSources } from '@/helper/AppUsageEventHelper';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { getVersion } from '@/config';
import { useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { performLogout } from '@/helper/logoutHelper';
import { UserHelper } from '@/helper/UserHelper';

const styles = StyleSheet.create({
	container: {
		width: '100%',
		alignItems: 'center',
	},
	sheetHeaderClose: {
		width: '100%',
		flexDirection: 'column',
	},
	sheetHeaderText: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	sheetHeading: {
		fontFamily: 'Poppins_700Bold',
		textAlign: 'center',
	},
	popupContainer: {
		width: '100%',
		gap: 20,
		marginTop: 10,
		alignItems: 'center',
	},
	imageContainer: {
		width: '100%',
		height: 300,
	},
	image: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	versionInfo: {
		width: '100%',
		marginTop: 20,
	},
	versionInfoText: {
		textAlign: 'center',
		fontSize: 12,
		opacity: 0.6,
	},
});

const POPUP_IMAGE_SIZE = 1024;

const PopupEventSheet: React.FC<PopupEventSheetProps> = ({ closeSheet, eventData, showDismissButton = true }) => {
	const { theme } = useTheme();
	const { language } = useAppSelector((state) => state.settings);
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const router = useRouter();
	const { user } = useAppSelector((state) => state.authReducer);
	// Leaving the app for the login screen only makes sense without an account -
	// for a signed-in user it would mean logging out.
	const showLoginScreenButton = !!eventData?.show_login_screen_button && UserHelper.isAnonymousUser(user);
	const title = eventData?.translations ? getTitleFromTranslation(eventData?.translations, language) : '';
	const rawText = eventData?.translations ? getTextFromTranslation(eventData?.translations, language) : '';
	// Square like everywhere else, larger because the popup shows it at full height (300).
	const popupImageUrl = getNewsImageUrl(eventData, POPUP_IMAGE_SIZE);

	return (
		<View style={styles.container}>
			{showDismissButton ? (
				<View
					style={{
						...styles.sheetHeaderClose,
						paddingRight: isWeb ? 10 : 0,
						paddingTop: isWeb ? 10 : 0,
						alignItems: 'center',
					}}
				>
					<ProjectButton text="Schließen und nicht erneut anzeigen" onPress={closeSheet} />
				</View>
			) : null}
			<View style={styles.sheetHeaderText}>
				<View />
				<Text
					style={{
						...styles.sheetHeading,
						fontSize: isWeb ? 40 : 28,
						color: theme.screen.text,
					}}
				>
					{title || eventData?.alias}
				</Text>
			</View>
			<View style={styles.popupContainer}>
				{popupImageUrl && (
					<View style={styles.imageContainer}>
						<MyImage style={styles.image} remote_image_url={popupImageUrl} />
					</View>
				)}
				{rawText ? <MyMarkdownProjectColored content={rawText} textColor={theme.screen.text} /> : null}
			</View>
			{eventData?.show_app_rating_button ? (
				<View style={{ width: '100%', marginTop: 20 }}>
					<RateAppSettingsItem groupPosition="single" showSeparator={false} ratingPromptSource={AppRatingPromptSources.POPUP_EVENT_SHEET} />
				</View>
			) : null}
			{showLoginScreenButton ? (
				<View style={{ width: '100%', marginTop: 20, alignItems: 'center' }}>
					<ProjectButton
						text={`${translate(TranslationKeys.sign_in)} / ${translate(TranslationKeys.create_account)}`}
						onPress={() => {
							closeSheet();
							void performLogout(dispatch, router);
						}}
					/>
				</View>
			) : null}
			{eventData?.show_on_app_version ? (
				<View style={styles.versionInfo}>
					<Text style={[styles.versionInfoText, { color: theme.screen.text }]}>
						{translate(TranslationKeys.popup_event_current_app_version)}: {getVersion()}
					</Text>
					<Text style={[styles.versionInfoText, { color: theme.screen.text }]}>
						{translate(TranslationKeys.popup_event_version_condition)}: {eventData.show_on_app_version}
					</Text>
				</View>
			) : null}
		</View>
	);
};

export default PopupEventSheet;
