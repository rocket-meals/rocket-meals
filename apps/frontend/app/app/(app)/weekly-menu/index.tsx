import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { addDays, format, startOfWeek } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { fetchFoodOffersByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { DatabaseTypes } from 'repo-depkit-common';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { showFormatedPrice, showPrice } from '@/constants/HelperFunctions';
import styles from './styles';

const DAY_KEYS = [
	TranslationKeys.Mon_S,
	TranslationKeys.Tue_S,
	TranslationKeys.Wed_S,
	TranslationKeys.Thu_S,
	TranslationKeys.Fri_S,
	TranslationKeys.Sat_S,
	TranslationKeys.Sun_S,
] as const;

/** Returns the ISO date string (YYYY-MM-DD) for Mon–Sun of the current week. */
const getWeekDates = (firstDayOfWeek: number): string[] => {
	const today = new Date();
	// startOfWeek with locale: 0=Sun, 1=Mon
	const weekStart = startOfWeek(today, { weekStartsOn: firstDayOfWeek as 0 | 1 });
	return Array.from({ length: 7 }, (_, i) =>
		format(addDays(weekStart, i), 'yyyy-MM-dd')
	);
};

const WeeklyMenu: React.FC = () => {
	useSetPageTitle(TranslationKeys.weekly_menu);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { language, primaryColor, appSettings } = useAppSelector(
		(state) => state.settings
	);
	const { profile } = useAppSelector((state) => state.authReducer);
	const selectedCanteen = useSelectedCanteen();

	const firstDayOfWeek =
		useAppSelector((state) => state.settings.firstDayOfTheWeek?.id) ?? 'Mon';
	const firstDayOfWeekIndex = firstDayOfWeek === 'Sun' ? 0 : 1;

	const weekDates = useMemo(
		() => getWeekDates(firstDayOfWeekIndex),
		// Recompute only once per mount; week doesn't change mid-session
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	// Map from getDay() [0=Sun..6=Sat] to weekDates index
	const dayIndexMap = useMemo<number[]>(() => {
		return weekDates.map((d) => new Date(d + 'T00:00:00').getDay());
	}, [weekDates]);

	// Default to today's index in the weekDates array
	const todayIso = format(new Date(), 'yyyy-MM-dd');
	const defaultIndex = weekDates.indexOf(todayIso);
	const [selectedDayIndex, setSelectedDayIndex] = useState<number>(
		defaultIndex >= 0 ? defaultIndex : 0
	);

	const [loading, setLoading] = useState(false);
	const cache = useRef<Record<string, DatabaseTypes.Foodoffers[]>>({});
	const [offers, setOffers] = useState<DatabaseTypes.Foodoffers[]>([]);

	const accentColor = appSettings?.weekly_menu_area_color || primaryColor;
	const isDark = mode === 'dark';

	const loadOffersForDay = useCallback(
		async (dateIso: string) => {
			if (!selectedCanteen?.id) return;
			if (cache.current[dateIso]) {
				setOffers(cache.current[dateIso]);
				return;
			}
			setLoading(true);
			try {
				const result = await fetchFoodOffersByCanteen(
					String(selectedCanteen.id),
					dateIso
				);
				const items: DatabaseTypes.Foodoffers[] = result?.data ?? [];
				// Filter out permanent (null-date) offers, keep only the requested date
				const dated = items.filter(
					(o: DatabaseTypes.Foodoffers) =>
						!o.date || o.date?.toString().startsWith(dateIso)
				);
				cache.current[dateIso] = dated;
				setOffers(dated);
			} catch {
				setOffers([]);
			} finally {
				setLoading(false);
			}
		},
		[selectedCanteen?.id]
	);

	useEffect(() => {
		// Clear cache when canteen changes and reload the currently selected day
		cache.current = {};
		loadOffersForDay(weekDates[selectedDayIndex]);
		// We only want to re-run this when the canteen changes; weekDates is stable per mount
		// and selectedDayIndex is intentionally excluded to avoid double-fetch with the effect below
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCanteen?.id]);

	useEffect(() => {
		loadOffersForDay(weekDates[selectedDayIndex]);
	}, [selectedDayIndex, loadOffersForDay, weekDates]);

	/** Checks whether a food offer contains any marking the user dislikes. */
	const hasDislikedMarking = useCallback(
		(offer: DatabaseTypes.Foodoffers): boolean => {
			const profileMarkings = profile?.markings as any[] | undefined;
			if (!profileMarkings?.length) return false;
			return (offer.markings as any[])?.some((m: any) =>
				profileMarkings.some(
					(pm: any) =>
						pm.markings_id === m.markings_id && pm.like === false
				)
			) ?? false;
		},
		[profile?.markings]
	);

	const renderOffer = useCallback(
		({ item }: { item: DatabaseTypes.Foodoffers }) => {
			const foodItem = item.food as DatabaseTypes.Foods | undefined;
			const name =
				getTextFromTranslation(
					foodItem?.translations as DatabaseTypes.FoodsTranslations[],
					language || 'de'
				) ||
				item.alias ||
				foodItem?.alias ||
				'';

			const priceLabel = showFormatedPrice(showPrice(item, profile as any));
			const disliked = hasDislikedMarking(item);

			return (
				<TouchableOpacity
					style={[
						styles.offerRow,
						{ backgroundColor: theme.screen.iconBg },
					]}
					onPress={() =>
						router.push({
							pathname: '/(app)/foodoffers/details',
							params: { id: String(item.id) },
						})
					}
					activeOpacity={0.7}
				>
					<View style={{ flex: 1 }}>
						<Text
							style={[styles.offerName, { color: theme.screen.text }]}
							numberOfLines={2}
						>
							{name}
						</Text>
					</View>
					<Text style={[styles.offerPrice, { color: accentColor }]}>
						{priceLabel}
					</Text>
					{/* Compatibility indicator */}
					<View
						style={[
							styles.compatibilityDot,
							{ backgroundColor: disliked ? '#e53e3e' : '#38a169' },
						]}
					/>
				</TouchableOpacity>
			);
		},
		[language, profile, hasDislikedMarking, theme, accentColor]
	);

	// Compute day labels aligned to weekDates order
	const dayLabels = useMemo(() => {
		const dowToKeyIndex: Record<number, number> = {
			0: 6, // Sun → index 6 in DAY_KEYS (Sun_S)
			1: 0, // Mon
			2: 1,
			3: 2,
			4: 3,
			5: 4,
			6: 5, // Sat
		};
		return weekDates.map((d) => {
			const dow = new Date(d + 'T00:00:00').getDay();
			return translate(DAY_KEYS[dowToKeyIndex[dow]]);
		});
	}, [weekDates, translate]);

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			{/* Day selector tabs */}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.dayTabsContainer}
			>
				{weekDates.map((d, i) => {
					const isSelected = i === selectedDayIndex;
					const isToday = d === todayIso;
					return (
						<TouchableOpacity
							key={d}
							style={[
								styles.dayTab,
								{
									backgroundColor: isSelected ? accentColor : 'transparent',
									borderWidth: isToday && !isSelected ? 1.5 : 0,
									borderColor: accentColor,
								},
							]}
							onPress={() => setSelectedDayIndex(i)}
							activeOpacity={0.75}
						>
							<Text
								style={[
									styles.dayTabShort,
									{ color: isSelected ? '#fff' : theme.screen.text },
								]}
							>
								{dayLabels[i]}
							</Text>
							<Text
								style={[
									styles.dayTabDate,
									{ color: isSelected ? '#fff' : theme.screen.text, opacity: 0.75 },
								]}
							>
								{format(new Date(d + 'T00:00:00'), 'd.M')}
							</Text>
						</TouchableOpacity>
					);
				})}
			</ScrollView>

			{/* Offers list */}
			{loading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator color={accentColor} size="large" />
				</View>
			) : (
				<FlatList
					data={offers}
					keyExtractor={(item) => String(item.id)}
					renderItem={renderOffer}
					ListEmptyComponent={
						<Text style={[styles.emptyText, { color: theme.screen.text }]}>
							{translate(TranslationKeys.weekly_menu_no_offers)}
						</Text>
					}
					contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
				/>
			)}
		</View>
	);
};

export default WeeklyMenu;
