import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MyImage from '@/components/MyImage';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { useAppSelector } from '@/redux/hooks';
import { PopupEventSheetProps } from './types';
import { getImageUrl } from '@/constants/HelperFunctions';
import { getTextFromTranslation, getTitleFromTranslation } from '@/helper/resourceHelper';
import ProjectButton from '../ProjectButton';
import { useMyScrollViewModal } from '../GlobalModal/useMyScrollViewModal';
import MyMarkdown from '../MyMarkdown';
import { RateAppSettingsItem } from '../RateAppSettingsItem/RateAppSettingsItem';

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
});

const PopupEventSheet: React.FC<PopupEventSheetProps> = ({ closeSheet, dismissSheet, eventData }) => {
	const { theme } = useTheme();
	const { close: closeScrollViewModal } = useMyScrollViewModal();
	const { language } = useAppSelector((state) => state.settings);
	const title = eventData?.translations ? getTitleFromTranslation(eventData?.translations, language) : '';
	const rawText = eventData?.translations ? getTextFromTranslation(eventData?.translations, language) : '';

	const handleClose = () => {
		dismissSheet?.();
		closeScrollViewModal();
		closeSheet();
	};

	return (
		<View style={styles.container}>
			<View
				style={{
					...styles.sheetHeaderClose,
					paddingRight: isWeb ? 10 : 0,
					paddingTop: isWeb ? 10 : 0,
					alignItems: 'center',
				}}
			>
				<ProjectButton text="Schließen und nicht erneut anzeigen" onPress={handleClose} />
			</View>
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
				{(eventData?.image || eventData?.image_remote_url) && (
					<View style={styles.imageContainer}>
						<MyImage
							style={styles.image}
							remote_image_url={eventData?.image_remote_url || getImageUrl(String(eventData?.image))}
						/>
					</View>
				)}
				{rawText ? <MyMarkdown content={rawText} textColor={theme.screen.text} /> : null}
			</View>
			{eventData?.show_app_rating_button ? (
				<View style={{ width: '100%', marginTop: 20 }}>
					<RateAppSettingsItem groupPosition="single" showSeparator={false} />
				</View>
			) : null}
		</View>
	);
};

export default PopupEventSheet;
