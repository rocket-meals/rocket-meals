import { Text, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import { getBuildingTranslationByLanguageCode } from '@/helper/resourceHelper';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

const BuildingDescription: React.FC<any> = ({ campusDetails }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { language } = useAppSelector((state) => state.settings);

	return (
		<View style={styles.container}>
			<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.description)}</Text>
			{campusDetails && campusDetails?.translations?.length > 0 ? <Text style={{ ...styles.body, color: theme.screen.text }}>{getBuildingTranslationByLanguageCode(campusDetails?.translations, language) || ''}</Text> : <Text style={{ ...styles.body, color: theme.screen.text }}>{'Missing translation(content)'}</Text>}
		</View>
	);
};

export default BuildingDescription;
