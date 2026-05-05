import React, { memo } from 'react';
import { View, TextInput } from 'react-native';
import { CollectibleAt } from 'repo-depkit-common';

import CustomMarkdown from '@/components/CustomMarkdown/CustomMarkdown';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { TranslationKeys } from '@/locales/keys';
import styles from '../styles';

interface HousingListHeaderProps {
	screenWidth: number;
	housingTranslations: any;
	language: string;
	housingAreaColor: string;
	theme: any;
	query: string;
	setQuery: (query: string) => void;
	translate: (key: string) => string;
}

const HousingListHeader: React.FC<HousingListHeaderProps> = ({
	screenWidth,
	housingTranslations,
	language,
	housingAreaColor,
	theme,
	query,
	setQuery,
	translate,
}) => {
	return (
		<View style={{ width: '100%', alignItems: 'center' }}>
			<View style={{ width: '100%', padding: screenWidth > 600 ? 20 : 5 }}>
				{housingTranslations && (
					<CustomMarkdown
						content={getTextFromTranslation(housingTranslations, language) || ''}
						backgroundColor={housingAreaColor}
						imageWidth={'100%'}
						imageHeight={400}
					/>
				)}
			</View>

			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_housing} />

			<View
				style={[
					styles.searchContainer,
					{
						paddingHorizontal: screenWidth > 600 ? 20 : 5,
						marginTop: 10,
						marginBottom: 10,
						width: '100%',
					},
				]}
			>
				<TextInput
					style={[styles.searchInput, { color: theme.screen.text }]}
					cursorColor={theme.screen.text}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={setQuery}
					value={query}
					placeholder={translate(TranslationKeys.search_apartment_here)}
				/>
			</View>
		</View>
	);
};

export default memo(HousingListHeader);
