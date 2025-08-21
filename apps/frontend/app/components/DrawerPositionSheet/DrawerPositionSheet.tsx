import React from 'react';
import { Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useSelector } from 'react-redux';
import styles from './styles';
import { DrawerPositionSheetProps } from './types';
import DrawerPosition from '@/components/Drawer/DrawerPosition';
import { drawers } from '@/constants/SettingData';
import { isWeb } from '@/constants/Constants';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const DrawerPositionSheet: React.FC<DrawerPositionSheetProps> = ({
	closeSheet,
	selectedPosition,
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
					{translate(TranslationKeys.drawer_config_position)}
				</Text>
			</View>
			<View style={styles.optionsContainer}>
				{drawers.map(drawer => (
					<DrawerPosition
						key={drawer.id}
						position={drawer}
						isSelected={selectedPosition === drawer.id}
						onPress={() => {
							onSelect(drawer.id);
							closeSheet();
						}}
					/>
				))}
			</View>
		</BottomSheetScrollView>
	);
};

export default DrawerPositionSheet;
