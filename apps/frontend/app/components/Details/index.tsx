import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import FoodLabelingInfo from '../FoodLabelingInfo';
import { useSelector } from 'react-redux';
import { formatFoodInformationValue, getImageUrl } from '@/constants/HelperFunctions';
import { getFoodAttributesTranslation } from '@/helper/resourceHelper';
import { useLanguage } from '@/hooks/useLanguage';
import { DetailsProps } from './types';
import { iconLibraries } from '../Drawer/CustomDrawerContent';
import { useMyContrastColor } from '@/helper/colorHelper';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const Details: React.FC<DetailsProps> = ({ groupedAttributes, loading }) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { primaryColor, appSettings, language, selectedTheme: mode } = useSelector((state: RootState) => state.settings);

	let food_responsible_organization_name = appSettings?.food_responsible_organization_name || 'Verantwortliche Organisation';
	let food_responsible_organization_link = appSettings?.food_responsible_organization_link || 'https://www.studentenwerk-osnabrueck.de/';
	const handleRedirect = () => {
		Linking.openURL(food_responsible_organization_link).catch(err => console.error('Failed to open URL:', err));
	};

        const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;
        const contrastColor = useMyContrastColor(foods_area_color, theme, mode === 'dark');

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
					return (
						<View style={styles.groupedAttributes} key={item?.id}>
							<Text style={{ ...styles.body, color: theme.screen.text }}>{title}</Text>
							<View
								style={{
									...styles.nutritionsContainer,
									justifyContent: 'flex-start',
								}}
							>
								{item?.attributes &&
									item?.attributes?.map((attr: any) => {
										let value;
										const prefix = attr?.food_attribute?.prefix || '';
										const suffix = attr?.food_attribute?.suffix || '';
										const status = attr?.food_attribute?.status;
										const full_width = attr?.food_attribute?.full_width;
                                                                                const background_color = attr?.food_attribute?.background_color || '';
                                                                                const image = attr?.food_attribute?.image_remote_url ? { uri: attr?.food_attribute?.image_remote_url } : { uri: getImageUrl(attr?.food_attribute?.image) };
										const label = attr?.food_attribute?.translations ? getFoodAttributesTranslation(attr?.food_attribute?.translations, language) : '';

										const iconParts = attr?.food_attribute?.icon_expo?.split(':') || [];
										const [library, name] = iconParts;
										const Icon = library && iconLibraries[library];

										const attributeIconParts = attr?.icon_value?.split(':') || [];
										const [attributeIconLibrary, attributeIconName] = attributeIconParts;
										const AttributeIcon = attributeIconLibrary && iconLibraries[attributeIconLibrary];
										const colorValue = attr?.color_value || theme.screen.text;

										if (attr?.number_value) {
											value = formatFoodInformationValue(attr?.number_value, suffix);
										} else if (attr?.string_value) {
											value = attr?.string_value + suffix;
										}
										if (prefix && value) {
											value = `${prefix} ${value}`;
										}

										if ((label || value) && status === 'published') {
											return (
												<View
													style={{
														...styles.averageNutrition,
														minWidth: full_width ? '100%' : 120,
													}}
													key={attr?.id}
												>
													<View style={styles.iconContainer}>
														{attr?.food_attribute?.icon_expo ? (
															<Tooltip
																placement="top"
																trigger={triggerProps => (
																	<Pressable {...triggerProps}>
																		<Icon
																			name={name}
																			size={18}
																			color={background_color ? contrastColor : theme.screen.text}
																			style={{
																				backgroundColor: background_color,
																				borderRadius: 4,
																				padding: 2,
																			}}
																		/>
																	</Pressable>
																)}
															>
																<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
																	<TooltipText fontSize="$sm" color={theme.tooltip.text}>
																		{`${translate(label)}`}
																	</TooltipText>
																</TooltipContent>
															</Tooltip>
														) : image ? (
															<Image
																source={image}
																style={[
																	{
																		width: 24,
																		height: 24,
																		resizeMode: 'contain',
																	},
																	image?.uri && {
																		backgroundColor: background_color,
																		borderRadius: background_color ? 8 : 0,
																	},
																]}
															/>
														) : (
															<View style={{ width: 20 }} />
														)}
													</View>
													<View style={styles.nutritionDetails}>
														{value && (
															<View
																style={{
																	flexDirection: 'row',
																	alignItems: 'center',
																	gap: 10,
																}}
															>
																<Text
																	style={{
																		...styles.label,
																		color: theme.screen.text,
																	}}
																>
																	{value !== null && value !== undefined ? value : 'N/A'}
																</Text>
																{attr?.icon_value ? <AttributeIcon name={attributeIconName} size={20} color={colorValue} /> : <View style={{ width: 20 }} />}
															</View>
														)}
														<Text
															style={{
																...styles.label,
																color: theme.screen.text,
															}}
														>
															{label}
														</Text>
													</View>
												</View>
											);
										}
									})}
							</View>
						</View>
					);
				})
			)}
			<FoodLabelingInfo textStyle={styles.body1} backgroundColor={foods_area_color} />
		</View>
	);
};

export default Details;
