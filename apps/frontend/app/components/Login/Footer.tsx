import { Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { styles } from './styles';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import { getTitleFromTranslation } from '@/helper/resourceHelper';
import { RootState } from '@/redux/reducer';

const Footer = () => {
	const { theme } = useTheme();
	const { wikis, language } = useSelector((state: RootState) => state.settings);

	return (
		<View style={styles.footer}>
			{wikis &&
				wikis?.map((wiki: any, index: number) => {
					if (wiki?.custom_id && !wiki?.url && wiki?.show_in_drawer_as_bottom_item) {
						return (
							<React.Fragment key={index}>
								<TouchableOpacity
									onPress={() =>
										router.push({
											pathname: '/wikis',
											params: { custom_id: wiki?.custom_id },
										})
									}
								>
									<Text style={{ ...styles.link, color: theme.screen.text }}>{getTitleFromTranslation(wiki?.translations, language)}</Text>
								</TouchableOpacity>
								<Text style={{ ...styles.divider, color: theme.screen.text }}>|</Text>
							</React.Fragment>
						);
					}
				})}
		</View>
	);
};

export default Footer;
