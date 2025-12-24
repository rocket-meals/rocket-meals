import React from 'react';
import { View } from 'react-native';
import styles from './styles';
import { ColorSchemeSheetProps } from './types';
import ColorScheme from '@/components/ColorScheme/ColorScheme';
import { themes } from '@/constants/SettingData';
import CollectibleSpot from "@/components/CollectibleItem/CollectibleSpot";
import { CollectibleAt } from 'repo-depkit-common';

const ColorSchemeSheet: React.FC<ColorSchemeSheetProps> = ({ closeSheet, selectedTheme, onSelect }) => {
	return (
		<View style={styles.sheetView}>
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
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_settings_theme} />
		</View>
	);
};

export default ColorSchemeSheet;
