import { ActivityIndicator, Text, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import FoodLabelingInfo from '../FoodLabelingInfo';
import { useSelector } from 'react-redux';
import { getFoodAttributesTranslation } from '@/helper/resourceHelper';
import { useLanguage } from '@/hooks/useLanguage';
import { DetailsProps } from './types';
import AttributeItem from './AttributeItem';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { CollectibleAt } from 'repo-depkit-common';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
const Details: React.FC<DetailsProps> = ({ groupedAttributes, loading }) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { primaryColor, appSettings, language } = useSelector((state: RootState) => state.settings);

	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;

	return (
		<View style={styles.container}>
			<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.food_data)}</Text>

			{loading ? (
				<View
					style={{
						height: 200,
						width: '100%',
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					<ActivityIndicator size={30} color={theme.screen.text} />
				</View>
			) : (
				groupedAttributes &&
				groupedAttributes?.map((item: any) => {
					const title = item?.translations ? getFoodAttributesTranslation(item?.translations, language) : '';
					const attributeItems =
						item?.attributes?.filter((attr: any) => {
							const status = attr?.food_attribute?.status;
							if (status !== 'published') {
								return false;
							}
							const label = attr?.food_attribute?.translations ? getFoodAttributesTranslation(attr?.food_attribute?.translations, language) : '';
							const hasValue = attr?.number_value !== null && attr?.number_value !== undefined ? true : Boolean(attr?.string_value);
							return Boolean(label || hasValue);
						}) || [];

					if (!attributeItems.length && !title) {
						return null;
					}

					return (
						<View style={styles.groupedAttributes} key={item?.id}>
							{title ? <SettingsGroupTitle>{title}</SettingsGroupTitle> : null}
							<View style={styles.attributeList}>
								{attributeItems.map((attribute: any, index: number) => {
									const groupPosition =
										attributeItems.length === 1
											? 'single'
											: index === 0
												? 'top'
												: index === attributeItems.length - 1
													? 'bottom'
													: 'middle';
									return (
										<AttributeItem
											key={attribute?.id ?? `${item?.id}-${index}`}
											attr={attribute}
											groupPosition={groupPosition}
										/>
									);
								})}
							</View>
						</View>
					);
				})
			)}
			<FoodLabelingInfo textStyle={styles.body1} backgroundColor={foods_area_color} />
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_foodoffers_details_nutritions} />
		</View>
	);
};

export default Details;
