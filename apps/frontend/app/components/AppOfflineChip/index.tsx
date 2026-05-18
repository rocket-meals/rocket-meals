import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

export interface AppOfflineChipProps {
	style?: ViewStyle;
	textStyle?: TextStyle;
}

const AppOfflineChip: React.FC<AppOfflineChipProps> = ({ style, textStyle }) => {
	const { translate } = useLanguage();

	return (
		<View style={[styles.offlineChip, style]}>
			<Text style={[styles.text, textStyle]}>
				{translate(TranslationKeys.offline)}
			</Text>
		</View>
	);
};

export default AppOfflineChip;

const styles = StyleSheet.create({
	offlineChip: {
		width: 80,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'red',
		padding: 4,
		borderRadius: 25,
	},
	text: {
		color: '#ffffff',
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
	},
});
