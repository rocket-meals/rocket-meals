import React, { forwardRef } from 'react';
import type BottomSheet from '@gorhom/bottom-sheet';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { CollectibleAt } from 'repo-depkit-common';
import BaseBottomSheet from '../BaseBottomSheet';
import CollectibleSpot from '../CollectibleItem/CollectibleSpot';
import MyMarkdown from '../MyMarkdown';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import { getImageUrl } from '@/constants/HelperFunctions';
import { getDescriptionFromTranslation, getTextFromTranslation } from '@/helper/resourceHelper';
import { useTheme } from '@/hooks/useTheme';
import { RootState } from '@/redux/reducer';

export interface MarkingBottomSheetProps {
        onClose: () => void;
}

const MarkingBottomSheet = forwardRef<BottomSheet, MarkingBottomSheetProps>(({ onClose }, ref) => {
        const { theme } = useTheme();
        const { markingDetails } = useSelector((state: RootState) => state.food);
        const { language } = useSelector((state: RootState) => state.settings);
        const description = getDescriptionFromTranslation(markingDetails?.translations, language);

        return (
                <BaseBottomSheet ref={ref} index={-1} backgroundStyle={{ backgroundColor: theme.sheet.sheetBg }} enablePanDownToClose handleComponent={null} onClose={onClose}>
                        <BottomSheetScrollView style={styles.sheetView} contentContainerStyle={styles.contentContainer}>
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
                                                                uri: markingDetails?.image_remote_url || getImageUrl(String(markingDetails?.image)),
                                                        }}
                                                        style={{
                                                                ...styles.image,
                                                                backgroundColor: markingDetails?.background_color ? markingDetails?.background_color : 'transparent',
                                                                borderRadius: markingDetails?.background_color ? 8 : markingDetails?.hide_border ? 5 : 0,
                                                        }}
                                                />
                                        </View>
                                        <MyMarkdown content={description} />
                                        <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_markings_details} />
                                </View>
                        </BottomSheetScrollView>
                </BaseBottomSheet>
        );
});

export default MarkingBottomSheet;
