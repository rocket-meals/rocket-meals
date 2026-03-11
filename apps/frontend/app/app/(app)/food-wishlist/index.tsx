import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Octicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import SettingsList from '@/components/SettingsList';
import MyImage from '@/components/MyImage';
import { getImageUrl } from '@/constants/HelperFunctions';
import { fetchFoodDetailsById, fetchNextFoodOfferByFoodAndCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { RatingHelper, DatabaseTypes } from 'repo-depkit-common';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';

const FoodWishlist = () => {
	useSetPageTitle(TranslationKeys.food_wishlist);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { language, primaryColor, appSettings } = useAppSelector((state) => state.settings);
	const { ownFoodFeedbacks } = useAppSelector((state) => state.food);
	const selectedCanteen = useSelectedCanteen();

	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;

	const [foods, setFoods] = useState<DatabaseTypes.Foods[]>([]);
	const [nextOfferedDates, setNextOfferedDates] = useState<Record<string, string | null>>({});
	const [loadingFoods, setLoadingFoods] = useState(false);
	const [loadingDates, setLoadingDates] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	// Include foods that have max rating OR have the 'notify' flag set
	// (notify allows users to be alerted for foods without giving them max rating)
	const wishlistFeedbacks = useMemo(
		() =>
			(ownFoodFeedbacks as DatabaseTypes.FoodsFeedbacks[]).filter(
				(feedback) => RatingHelper.isMaxRating(feedback.rating) || feedback.notify
			),
		[ownFoodFeedbacks]
	);

	const loadFoods = useCallback(async () => {
		if (wishlistFeedbacks.length === 0) {
			setFoods([]);
			return;
		}
		setLoadingFoods(true);
		try {
			const results = await Promise.all(
				wishlistFeedbacks.map((feedback: DatabaseTypes.FoodsFeedbacks) =>
					fetchFoodDetailsById(String(feedback.food)).catch(() => null)
				)
			);
			const foodItems = results
				.map((result: { data?: DatabaseTypes.Foods } | null) => result?.data ?? null)
				.filter(Boolean) as DatabaseTypes.Foods[];
			setFoods(foodItems);
		} finally {
			setLoadingFoods(false);
		}
	}, [wishlistFeedbacks]);

	const loadNextOfferedDates = useCallback(async () => {
		if (foods.length === 0 || !selectedCanteen?.id) return;
		setLoadingDates(true);
		const canteenId = String(selectedCanteen.id);
		const dates: Record<string, string | null> = {};
		try {
			await Promise.all(
				foods.map(async (food) => {
					const foodId = String(food.id);
					try {
						const offer = await fetchNextFoodOfferByFoodAndCanteen(foodId, canteenId);
						dates[foodId] = offer?.date ?? null;
					} catch {
						dates[foodId] = null;
					}
				})
			);
		} finally {
			setNextOfferedDates(dates);
			setLoadingDates(false);
		}
	}, [foods, selectedCanteen?.id]);

	useEffect(() => {
		loadFoods();
	}, [loadFoods]);

	useEffect(() => {
		loadNextOfferedDates();
	}, [loadNextOfferedDates]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadFoods();
		await loadNextOfferedDates();
		setRefreshing(false);
	}, [loadFoods, loadNextOfferedDates]);

	const getSmartDateLabel = useCallback(
		(date: string): string => {
			const today = new Date();
			const offerDate = new Date(date);
			today.setHours(0, 0, 0, 0);
			offerDate.setHours(0, 0, 0, 0);

			if (today.toDateString() === offerDate.toDateString()) {
				return translate(TranslationKeys.today);
			}
			const tomorrow = new Date(today);
			tomorrow.setDate(today.getDate() + 1);
			if (tomorrow.toDateString() === offerDate.toDateString()) {
				return translate(TranslationKeys.tomorrow);
			}
			const weekdayKeys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
			const weekdayKey = weekdayKeys[offerDate.getDay()];
			return `${translate(TranslationKeys[weekdayKey])}, ${offerDate.toLocaleDateString()}`;
		},
		[translate]
	);

	const plannedFoods = useMemo(
		() =>
			foods
				.filter((food) => nextOfferedDates[String(food.id)] != null)
				.sort((a, b) => {
					const dateA = new Date(nextOfferedDates[String(a.id)] as string).getTime();
					const dateB = new Date(nextOfferedDates[String(b.id)] as string).getTime();
					return dateA - dateB;
				}),
		[foods, nextOfferedDates]
	);

	const unplannedFoods = useMemo(
		() => foods.filter((food) => nextOfferedDates[String(food.id)] == null),
		[foods, nextOfferedDates]
	);

	const renderFoodItem = (food: DatabaseTypes.Foods, index: number, totalItems: number) => {
		const groupPosition =
			totalItems === 1
				? 'single'
				: index === 0
				? 'top'
				: index === totalItems - 1
				? 'bottom'
				: 'middle';

		const imageUri =
			food.image_remote_url || getImageUrl(food.image as string) || undefined;

		const foodName =
			getTextFromTranslation(
				food.translations as DatabaseTypes.FoodsTranslations[],
				language || 'de'
			) ||
			food.alias ||
			'';

		const foodId = String(food.id);
		const nextDate = nextOfferedDates[foodId];
		const dateLabel = nextDate
			? `${translate(TranslationKeys.offered_on)}: ${getSmartDateLabel(nextDate)}`
			: undefined;

		return (
			<SettingsList
				key={food.id}
				iconBgColor={foods_area_color}
				leftIconComponent={
					<MyImage
						remote_image_url={imageUri}
						directus_asset_id={!imageUri ? (food.image as string) : undefined}
						style={{
							width: 34,
							height: 34,
							borderRadius: 8,
							marginRight: 10,
						}}
						contentFit="cover"
					/>
				}
				label={foodName}
				value={dateLabel}
				groupPosition={groupPosition}
				showSeparator={groupPosition !== 'bottom' && groupPosition !== 'single'}
				rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
				onPress={() => {
					router.push({
						pathname: '/(app)/foodoffers/details',
						params: { foodId },
					});
				}}
			/>
		);
	};

	const isLoading = loadingFoods || loadingDates;

	const EmptyState = () => (
		<View style={styles.emptyContainer}>
			<Text style={[styles.emptyText, { color: theme.screen.secondaryText }]}>
				{translate(TranslationKeys.food_wishlist_empty)}
			</Text>
		</View>
	);

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.screen.background }]}
			contentContainerStyle={[styles.contentContainer, { backgroundColor: theme.screen.background }]}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={foods_area_color} />}
		>
			<View style={styles.content}>
				{isLoading && !refreshing ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={foods_area_color} />
					</View>
				) : wishlistFeedbacks.length === 0 ? (
					<EmptyState />
				) : (
					<>
						{plannedFoods.length > 0 && (
							<View style={styles.section}>
								<Text style={[styles.sectionHeading, { color: theme.screen.text }]}>
									{translate(TranslationKeys.food_wishlist_planned)}
								</Text>
								{plannedFoods.map((food, index) =>
									renderFoodItem(food, index, plannedFoods.length)
								)}
							</View>
						)}

						{unplannedFoods.length > 0 && (
							<View style={styles.section}>
								<Text style={[styles.sectionHeading, { color: theme.screen.text }]}>
									{translate(TranslationKeys.food_wishlist_not_planned)}
								</Text>
								{unplannedFoods.map((food, index) =>
									renderFoodItem(food, index, unplannedFoods.length)
								)}
							</View>
						)}
					</>
				)}
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {
		flexGrow: 1,
	},
	content: {
		width: '100%',
		padding: 20,
	},
	section: {
		width: '100%',
		marginTop: 10,
	},
	sectionHeading: {
		fontSize: 18,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 10,
	},
	loadingContainer: {
		flex: 1,
		height: 200,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyContainer: {
		flex: 1,
		height: 200,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
	},
	emptyText: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
	},
});

export default FoodWishlist;
