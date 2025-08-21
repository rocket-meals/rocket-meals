import React from 'react';
import { Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useSelector } from 'react-redux';
import styles from './styles';
import { ColorSchemeSheetProps } from './types';
import ColorScheme from '@/components/ColorScheme/ColorScheme';
import { themes } from '@/constants/SettingData';
import { isWeb } from '@/constants/Constants';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const ColorSchemeSheet: React.FC<ColorSchemeSheetProps> = ({
	closeSheet,
	selectedTheme,
	onSelect,
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useSelector((state: RootState) => state.settings);

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
					{translate(TranslationKeys.color_scheme)}
				</Text>
			</View>
			<View style={styles.optionsContainer}>
				{themes.map(th => (
					<ColorScheme
						key={th.id}
						theme={th}
						isSelected={selectedTheme === th.id}
						onPress={() => {
							onSelect(th.id);
							closeSheet();
						}}
					/>
				))}
			</View>
		</BottomSheetScrollView>
	);
};

export default ColorSchemeSheet;
