import { Linking, Text, TouchableOpacity, View } from 'react-native';
import MyImage from '@/components/MyImage';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { AntDesign, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { FoodItemProps } from './types';
import { excerpt, getImageUrl, getpreviousFeedback, showFormatedPrice, showPrice } from '@/constants/HelperFunctions';
import { getDescriptionFromTranslation, getTextFromTranslation } from '@/helper/resourceHelper';
import { DatabaseTypes } from 'repo-depkit-common';
import { useDispatch, useSelector } from 'react-redux';
import { SET_MARKING_DETAILS, SET_SELECTED_FOOD_MARKINGS } from '@/redux/Types/types';
import PermissionModal from '../PermissionModal/PermissionModal';
import { router } from 'expo-router';
import { createSelector } from 'reselect';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useToast from '@/hooks/useToast';
import { handleFoodRating } from '@/helper/feedback';
import { RootState } from '@/redux/reducer';
import CardWithText from '../CardWithText/CardWithText';
import useFoodCard from '@/hooks/useFoodCard';

const selectFoodState = (state: RootState) => state.food;

const selectPreviousFeedback = createSelector([selectFoodState, (_, foodId) => foodId], (foodState, foodId) => getpreviousFeedback(foodState.ownFoodFeedbacks, foodId));

const selectMarkings = createSelector([selectFoodState], foodState => foodState.markings);

const FoodItem: React.FC<FoodItemProps> = memo(
	({ item, canteen, handleMenuSheet, handleImageSheet, setSelectedFoodId, handleEatingHabitsSheet }) => {
		const toast = useToast();
		const [warning, setWarning] = useState(false);
		const dispatch = useDispatch();
		const { theme } = useTheme();
		const { translate } = useLanguage();
		const { food } = item;
		const foodItem = food as DatabaseTypes.Foods;
		const markings = useSelector(selectMarkings);
		const { user, profile, isManagement } = useSelector((state: RootState) => state.authReducer);
		const previousFeedback = useSelector(state => selectPreviousFeedback(state, foodItem.id));
		const { language, serverInfo, appSettings, primaryColor } = useSelector((state: RootState) => state.settings);
		
		// Memoized derived values for performance
		const foods_area_color = useMemo(() => 
			appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor,
			[appSettings?.foods_area_color, primaryColor]
		);
		
		const defaultImage = useMemo(() => 
			getImageUrl(String(appSettings.foods_placeholder_image)) || 
			appSettings.foods_placeholder_image_remote_url || 
			getImageUrl(serverInfo?.info?.project?.project_logo),
			[appSettings.foods_placeholder_image, appSettings.foods_placeholder_image_remote_url, serverInfo?.info?.project?.project_logo]
		);

		const imageSource = useMemo(() => {
			if (foodItem?.image_remote_url || foodItem?.image) {
				return {
					uri: foodItem?.image_remote_url || getImageUrl(foodItem?.image)
				};
			}
			return { uri: defaultImage };
		}, [foodItem?.image_remote_url, foodItem?.image, defaultImage]);

		// Memoized recycling key for better memory management
		const recyclingKey = useMemo(() => 
			`food-${foodItem?.id || 'unknown'}`, 
			[foodItem?.id]
		);

		const getPriceGroup = useCallback((price_group: string) => {
			if (price_group) {
				return `price_group_${price_group?.toLocaleLowerCase()}`;
			}
			return '';
		}, []);

		const handleNavigation = useCallback((id: string, foodId: string) => {
			router.push({
				pathname: '/(app)/foodoffers/details',
				params: { id, foodId },
			});
		}, [router]);

		const openInBrowser = useCallback(async (url: string) => {
			try {
				if (isWeb) {
					window.open(url, '_blank');
				} else {
					const supported = await Linking.canOpenURL(url);

					if (supported) {
						await Linking.openURL(url);
					} else {
						toast(`Cannot open URL: ${url}`, 'error');
					}
				}
			} catch (error) {
				console.error('An error occurred:', error);
			}
		}, [toast]);

		// Memoized disliked markings calculation for performance
		const dislikedMarkings = useMemo(() => 
			item?.markings?.filter(marking => 
				profile?.markings?.some((profileMarking: DatabaseTypes.ProfilesMarkings) => 
					profileMarking?.markings_id === marking?.markings_id && profileMarking?.like === false
				)
			) || [], 
			[item?.markings, profile?.markings]
		);

		const { screenWidth, containerStyle: cardContainerStyle, imageContainerStyle: cardImageContainerStyle, contentStyle: cardContentStyle } = useFoodCard(dislikedMarkings.length > 0 ? 3 : 0);

		const handleOpenSheet = useCallback(() => {
			dispatch({ type: SET_SELECTED_FOOD_MARKINGS, payload: dislikedMarkings });
			handleEatingHabitsSheet('eatingHabits');
		}, [dispatch, dislikedMarkings, handleEatingHabitsSheet]);

		const updateRating = useCallback(
			(rating: number | null) => {
				handleFoodRating({
					foodId: foodItem?.id,
					profileId: profile?.id,
					userId: user.id,
					rating,
					canteenId: canteen?.id,
					previousFeedback,
					dispatch,
					setWarning,
				});
			},
			[foodItem?.id, profile?.id, user.id, canteen?.id, previousFeedback, dispatch]
		);

		// Memoized markings data calculation for performance
		const markingsData = useMemo(() => 
			markings?.filter((m: DatabaseTypes.Markings) => 
				item?.markings.some(mark => mark.markings_id === m.id)
			).slice(0, 2) || [], 
			[markings, item?.markings]
		);

		const openMarkingLabel = useCallback((marking: DatabaseTypes.Markings) => {
			dispatch({
				type: SET_MARKING_DETAILS,
				payload: marking,
			});
			handleMenuSheet('menu');
		}, [dispatch, handleMenuSheet]);

		const handlePriceChange = useCallback(() => {
			router.navigate('/price-group');
		}, [router]);

		// Memoized food name for different screen sizes
		const foodName = useMemo(() => {
			const fullName = getTextFromTranslation(foodItem?.translations, language);
			if (screenWidth > 1000) return excerpt(fullName, 120);
			if (screenWidth > 700) return excerpt(fullName, 80);
			if (screenWidth > 460) return excerpt(fullName, 60);
			return excerpt(fullName, 40);
		}, [foodItem?.translations, language, screenWidth]);

		const onFoodItemPress = useCallback(() => {
			if (item.redirect_url) {
				openInBrowser(item.redirect_url);
			} else {
				const foodId = item?.food && typeof item.food !== 'string' ? item.food.id : '';
				handleNavigation(item?.id, foodId);
			}
		}, [item.redirect_url, item?.food, item?.id, openInBrowser, handleNavigation]);

		const onImageEditPress = useCallback(() => {
			setSelectedFoodId(item?.food?.id);
			handleImageSheet(item?.food?.id);
		}, [setSelectedFoodId, item?.food?.id, handleImageSheet]);

		return (
			<>
				<Tooltip
					placement="top"
					trigger={triggerProps => (
						<CardWithText
							{...triggerProps}
							onPress={onFoodItemPress}
							imageSource={imageSource}
							containerStyle={cardContainerStyle}
							imageContainerStyle={cardImageContainerStyle}
							contentStyle={cardContentStyle}
							borderColor={foods_area_color}
							imageChildren={
								<>
									{isManagement && (
										<Tooltip
											placement="top"
											trigger={triggerProps => (
												<TouchableOpacity
													{...triggerProps}
													style={styles.editImageButton}
													onPress={onImageEditPress}
												>
													<MaterialCommunityIcons name="image-edit" size={20} color={'white'} />
												</TouchableOpacity>
											)}
										>
											<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
												<TooltipText fontSize="$sm" color={theme.tooltip.text}>
													{`${translate(TranslationKeys.edit)}: ${translate(TranslationKeys.image)}`}
												</TooltipText>
											</TooltipContent>
										</Tooltip>
									)}
									<TouchableOpacity style={styles.favContainer}>
										{previousFeedback?.rating === 5 ? (
											<Tooltip
												placement="top"
												trigger={triggerProps => (
													<TouchableOpacity {...triggerProps} onPress={() => updateRating(null)}>
														<AntDesign name="star" size={20} color={foods_area_color} />
													</TouchableOpacity>
												)}
											>
												<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
													<TooltipText fontSize="$sm" color={theme.tooltip.text}>
														{translate(TranslationKeys.set_rate_as_not_favorite)}
													</TooltipText>
												</TooltipContent>
											</Tooltip>
										) : (
											<Tooltip
												placement="top"
												trigger={triggerProps => (
													<TouchableOpacity {...triggerProps} onPress={() => updateRating(5)}>
														<AntDesign name="staro" size={20} color={'white'} />
													</TouchableOpacity>
												)}
											>
												<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
													<TooltipText fontSize="$sm" color={theme.tooltip.text}>
														{translate(TranslationKeys.set_rate_as_favorite)}
													</TooltipText>
												</TooltipContent>
											</Tooltip>
										)}
									</TouchableOpacity>
									{dislikedMarkings.length > 0 && (
										<Tooltip
											placement="top"
											trigger={triggerProps => (
												<TouchableOpacity
													style={{
														...styles.favContainerWarn,
													}}
													{...triggerProps}
													onPress={handleOpenSheet}
												>
													<MaterialIcons name="warning" size={20} color={foods_area_color} />
												</TouchableOpacity>
											)}
										>
											<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
												<TooltipText fontSize="$sm" color={theme.tooltip.text}>
													{`${translate(TranslationKeys.attention)} ${translate(TranslationKeys.eating_habits)}`}
												</TooltipText>
											</TooltipContent>
										</Tooltip>
									)}
									<View style={styles.categoriesContainer}>
										{markingsData?.map((mark: any) => {
											const description = getDescriptionFromTranslation(mark?.translations, language);
											if ((mark?.image_remote_url || mark?.image) && description)
												return (
													<TouchableOpacity key={mark.id} onPress={() => openMarkingLabel(mark)}>
														<Image
															source={
																mark?.image_remote_url || mark?.image
																	? {
																			uri: mark?.image_remote_url || getImageUrl(mark?.image),
																		}
																	: { uri: defaultImage }
															}
															style={{
																...styles.categoryLogo,
																backgroundColor: mark?.background_color && mark?.background_color,
																borderRadius: mark?.background_color ? 8 : mark.hide_border ? 5 : 0,
															}}
															cachePolicy="memory-disk"
															recyclingKey={`marking-${mark.id}`}
														/>
													</TouchableOpacity>
												);
										})}
									</View>
									<Tooltip
										placement="top"
										trigger={triggerProps => (
											<TouchableOpacity style={styles.priceTag} {...triggerProps} onPress={handlePriceChange}>
												<Text style={styles.priceText}>{showFormatedPrice(showPrice(item, profile))}</Text>
											</TouchableOpacity>
										)}
									>
										<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
											<TooltipText fontSize="$sm" color={theme.tooltip.text}>
												{`${showFormatedPrice(showPrice(item, profile))} - ${translate(TranslationKeys.edit)}: ${translate(TranslationKeys.price_group)} ${translate(profile?.price_group ? getPriceGroup(profile?.price_group) : '')}`}
											</TooltipText>
										</TooltipContent>
									</Tooltip>
								</>
							}
						>
							<Text style={{ ...styles.foodName, color: theme.screen.text }}>{foodName}</Text>
						</CardWithText>
					)}
				>
					<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
						<TooltipText fontSize="$sm" color={theme.tooltip.text}>
							{getTextFromTranslation(foodItem?.translations, language)}
						</TooltipText>
					</TooltipContent>
				</Tooltip>

				<PermissionModal isVisible={warning} setIsVisible={setWarning} />
			</>
		);
	},
	// Improved memo comparison function for better performance
	(prevProps, nextProps) => {
		return (
			prevProps.item.id === nextProps.item.id &&
			prevProps.item.food === nextProps.item.food &&
			prevProps.canteen?.id === nextProps.canteen?.id &&
			prevProps.handleMenuSheet === nextProps.handleMenuSheet &&
			prevProps.handleImageSheet === nextProps.handleImageSheet &&
			prevProps.handleEatingHabitsSheet === nextProps.handleEatingHabitsSheet &&
			prevProps.setSelectedFoodId === nextProps.setSelectedFoodId
		);
	}
);

export default FoodItem;
