import React from 'react';
import { Linking, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import RedirectButton from '../RedirectButton';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import styles from './styles';

interface FoodLabelingInfoProps {
	textStyle?: TextStyle;
	containerStyle?: ViewStyle;
	backgroundColor?: string;
}

const FoodLabelingInfo: React.FC<FoodLabelingInfoProps> = ({ textStyle, containerStyle, backgroundColor }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, appSettings } = useSelector((state: RootState) => state.settings);

	const foods_area_color = backgroundColor ?? appSettings?.foods_area_color ?? primaryColor;

	const food_responsible_organization_name = appSettings?.food_responsible_organization_name || 'Verantwortliche Organisation';
	const food_responsible_organization_link = appSettings?.food_responsible_organization_link || 'https://www.studentenwerk-osnabrueck.de/';

	const handleRedirect = () => {
		Linking.openURL(food_responsible_organization_link).catch(err => console.error('Failed to open URL:', err));
	};

	return (
		<View style={containerStyle}>
			<Text style={[styles.text, { color: theme.screen.text }, textStyle]}>{translate(TranslationKeys.FOOD_LABELING_INFO)}</Text>
			<RedirectButton type="link" onClick={handleRedirect} label={food_responsible_organization_name} backgroundColor={foods_area_color} />
		</View>
	);
};

export default FoodLabelingInfo;
