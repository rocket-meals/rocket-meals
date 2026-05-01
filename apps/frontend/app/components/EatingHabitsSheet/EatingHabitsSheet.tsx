import { Text, View } from 'react-native';
import React from 'react';
import { isWeb } from '@/constants/Constants';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { EatingHabitsSheetProps } from './types';
import MarkingLabels from '../MarkingLabels/MarkingLabels';
import { useAppSelector } from '@/redux/hooks';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { DatabaseTypes } from 'repo-depkit-common';

const EatingHabitsSheet: React.FC<EatingHabitsSheetProps> = ({ closeSheet }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const markings = useAppSelector(state => state.food.markings);
	return (
		<BottomSheetScrollView style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }} contentContainerStyle={styles.contentContainer}>
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
						fontSize: isWeb ? 40 : 28,
						color: theme.sheet.text,
					}}
				>
					{translate(TranslationKeys.eating_habits)}
				</Text>
			</View>
			<View style={styles.eatingHabitsList}>
				{markings?.map((marking: DatabaseTypes.Markings) => (
					<View key={marking.id}>
						<MarkingLabels markingId={marking.id} />
						<View style={styles.divider} />
					</View>
				))}
				<View style={styles.divider} />
			</View>
		</BottomSheetScrollView>
	);
};

export default EatingHabitsSheet;
