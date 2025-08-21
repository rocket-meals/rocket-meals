import React from 'react';
import { Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { days } from '@/constants/SettingData';
import FirstDayOfWeek from '@/components/FirstDay/FirstDayOfWeek';
import { isWeb } from '@/constants/Constants';
import styles from './styles';
import { FirstDaySheetProps } from './types';
import { TranslationKeys } from '@/locales/keys';

const FirstDaySheet: React.FC<FirstDaySheetProps> = ({
	closeSheet,
	selectedDay,
	onSelect,
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();

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
						fontSize: isWeb ? 40 : 28,
						color: theme.sheet.text,
					}}
				>
					{translate(TranslationKeys.first_day_of_week)}
				</Text>
			</View>
			<View style={styles.optionsContainer}>
				{days.map(firstDay => (
					<FirstDayOfWeek
						key={firstDay.id}
						position={firstDay}
						isSelected={selectedDay === firstDay.name}
						onPress={() => {
							onSelect({ id: firstDay.id, name: firstDay.name });
							closeSheet();
						}}
					/>
				))}
			</View>
		</BottomSheetScrollView>
	);
};

export default FirstDaySheet;
