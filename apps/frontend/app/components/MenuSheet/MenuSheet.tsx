import { Image, Text, View } from 'react-native';
import React from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { MenuSheetProps } from './types';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { getImageUrl } from '@/constants/HelperFunctions';
import {
	getDescriptionFromTranslation,
	getTextFromTranslation,
} from '@/helper/resourceHelper';
import MyMarkdown from '../MyMarkdown';
import { RootState } from '@/redux/reducer';

const MenuSheet: React.FC<MenuSheetProps> = ({ closeSheet }) => {
	const { theme } = useTheme();
	const { markingDetails } = useSelector((state: RootState) => state.food);
	const { language } = useSelector((state: RootState) => state.settings);
	const description = getDescriptionFromTranslation(
		markingDetails?.translations,
		language
	);
	return (
		<BottomSheetScrollView
			style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
			contentContainerStyle={styles.contentContainer}
		>
			<View
				style={{
					...styles.sheetHeader,
					paddingRight: isWeb ? 10 : 0,
					paddingTop: isWeb ? 10 : 0,
				}}
			>
				<View />
				<Text
					style={{
						...styles.sheetHeading,
						maxWidth: '70%',
						textAlign: 'center',
						color: theme.sheet.text,
					}}
				>
					{getTextFromTranslation(markingDetails?.translations, language)}
					{` (${markingDetails?.external_identifier})`}
				</Text>
			</View>
			<View style={{ ...styles.menuContainer, width: isWeb ? '90%' : '100%' }}>
				<View style={styles.imageContainer}>
					<Image
						source={{
							uri:
								markingDetails?.image_remote_url ||
								getImageUrl(String(markingDetails?.image)),
						}}
						style={{
							...styles.image,
							backgroundColor: markingDetails?.background_color
								? markingDetails?.background_color
								: 'transparent',
							borderRadius: markingDetails?.background_color
								? 8
								: markingDetails.hide_border
									? 5
									: 0,
						}}
					/>
				</View>
				<MyMarkdown content={description} />
			</View>
		</BottomSheetScrollView>
	);
};

export default MenuSheet;
