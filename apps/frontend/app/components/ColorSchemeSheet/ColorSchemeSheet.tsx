import React from 'react';
import { Text, View } from 'react-native';
import styles from './styles';
import { ColorSchemeSheetProps } from './types';
import { themes } from '@/constants/SettingData';
import CollectibleSpot from "@/components/CollectibleItem/CollectibleSpot";
import { CollectibleAt } from 'repo-depkit-common';
import SettingsListSelectOption from '@/components/SettingsListSelectOption/SettingsListSelectOption';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import DebugView from '@/components/DebugView';

const ColorSchemeSheet: React.FC<ColorSchemeSheetProps> = ({ closeSheet, selectedTheme, onSelect }) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { primaryColor, selectedTheme: selectedThemeFromStore } = useSelector((state: RootState) => state.settings);
	const activeSelectedTheme = selectedThemeFromStore ?? selectedTheme;

	return (
		<View style={styles.sheetView}>
			<View style={styles.optionsContainer}>
				<SettingsListSelectOption
					options={themes.map((themeOption) => ({
						id: themeOption.id,
						label: translate(themeOption.name),
						icon: <MaterialCommunityIcons name={themeOption.icon as any} size={24} />,
					}))}
					selectedOption={activeSelectedTheme}
					onSelect={(option) => {
						onSelect(option.id);
						closeSheet();
					}}
					iconBgColor={primaryColor}
				/>
			</View>
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_settings_theme} />
			<DebugView title="Theme" isVisible>
				<View style={styles.debugContainer}>
					<Text style={[styles.debugLabel, { color: theme.screen.text }]}>
						theme.screen.background: {theme.screen.background}
					</Text>
					<View style={[styles.debugSwatch, { backgroundColor: theme.screen.background }]} />
				</View>
			</DebugView>
		</View>
	);
};

export default ColorSchemeSheet;
