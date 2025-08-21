import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import SettingsList from '@/components/SettingsList';
import styles from './styles';

const SettingsListCheck = () => {
	useSetPageTitle(TranslationKeys.settings_list_check);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useSelector((state: RootState) => state.settings);

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{
				...styles.contentContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<View style={{ ...styles.content }}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>
					{translate(TranslationKeys.settings_list_check)}
				</Text>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={
						<MaterialCommunityIcons
							name="format-list-text"
							size={24}
							color={theme.screen.icon}
						/>
					}
					title="Dies ist ein extrem langer Titel, der in dieser Zeile nicht vollständig angezeigt werden kann."
					value="Auch dieser sehr lange Wert sollte ordentlich umgebrochen werden, damit alles lesbar bleibt."
					groupPosition="single"
				/>
			</View>
		</ScrollView>
	);
};

export default SettingsListCheck;
