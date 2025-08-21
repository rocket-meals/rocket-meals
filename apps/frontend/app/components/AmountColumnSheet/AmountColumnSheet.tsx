import React from 'react';
import { Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import AmountColumns from '@/components/AmountColumn/AmountColumns';
import { AmountColumn } from '@/constants/SettingData';
import { isWeb } from '@/constants/Constants';
import styles from './styles';
import { AmountColumnSheetProps } from './types';
import { TranslationKeys } from '@/locales/keys';

const AmountColumnSheet: React.FC<AmountColumnSheetProps> = ({
	closeSheet,
	selectedAmount,
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
					{translate(TranslationKeys.amount_columns_for_cards)}
				</Text>
			</View>
			<View style={styles.optionsContainer}>
				{AmountColumn.map(column => (
					<AmountColumns
						key={column.id}
						position={column}
						isSelected={selectedAmount === column.id}
						onPress={() => {
							onSelect(column.id);
							closeSheet();
						}}
					/>
				))}
			</View>
		</BottomSheetScrollView>
	);
};

export default AmountColumnSheet;
