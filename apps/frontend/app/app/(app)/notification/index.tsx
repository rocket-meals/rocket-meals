import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DatabaseTypes, CollectibleAt } from 'repo-depkit-common';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { FoodFeedbackHelper } from '@/redux/actions/FoodFeedbacks/FoodFeedbacks';
import { DELETE_FOOD_FEEDBACK_LOCAL, UPDATE_FOOD_FEEDBACK_LOCAL } from '@/redux/Types/types';
import { getFoodName } from '@/helper/resourceHelper';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';
import { isWeb } from '@/constants/Constants';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import OwnFoodFeedbackItem from '@/components/OwnFoodFeedbackItem';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';

/** What the list is narrowed down to. */
enum OwnFoodFeedbackTab {
	ALL = 'all',
	RATINGS = 'ratings',
	COMMENTS = 'comments',
	NOTIFICATIONS = 'notifications',
}

const TABS: readonly { tab: OwnFoodFeedbackTab; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; labelKey: TranslationKeys }[] = [
	{ tab: OwnFoodFeedbackTab.ALL, icon: 'format-list-bulleted', labelKey: TranslationKeys.own_food_feedbacks_tab_all },
	{ tab: OwnFoodFeedbackTab.RATINGS, icon: 'star', labelKey: TranslationKeys.own_food_feedbacks_tab_ratings },
	{ tab: OwnFoodFeedbackTab.COMMENTS, icon: 'chat', labelKey: TranslationKeys.comments },
	{ tab: OwnFoodFeedbackTab.NOTIFICATIONS, icon: 'bell', labelKey: TranslationKeys.own_food_feedbacks_tab_notifications },
];

const FIELDS = ['*', 'food.id', 'food.alias', 'food.image', 'food.image_remote_url', 'food.translations.*'];

function matchesTab(feedback: DatabaseTypes.FoodsFeedbacks, tab: OwnFoodFeedbackTab): boolean {
	switch (tab) {
		case OwnFoodFeedbackTab.RATINGS:
			return typeof feedback.rating === 'number';
		case OwnFoodFeedbackTab.COMMENTS:
			return (feedback.comment ?? '').trim().length > 0;
		case OwnFoodFeedbackTab.NOTIFICATIONS:
			return !!feedback.notify;
		default:
			return true;
	}
}

/**
 * "Favoriten, Bewertungen & Benachrichtigungen": every food the user rated, commented on or wants to be
 * notified about, with the canteen's reaction to it. Tabs narrow it down, the search looks at the food
 * name and the own comment. A tap opens the food, the bell switches the notification.
 */
const OwnFoodFeedbacksScreen = () => {
	useSetPageTitle(TranslationKeys.own_food_feedbacks_title);
	const { theme } = useTheme();
	const { translate, language } = useLanguage();
	const dispatch = useAppDispatch();
	const { primaryColor, appSettings, selectedTheme: mode } = useAppSelector(state => state.settings);
	const profile = useAppSelector(state => state.authReducer.profile) as DatabaseTypes.Profiles | undefined;
	const profileId = profile?.id;
	const foodFeedbackHelper = useMemo(() => new FoodFeedbackHelper(), []);
	const [feedbacks, setFeedbacks] = useState<DatabaseTypes.FoodsFeedbacks[]>([]);
	const [loaded, setLoaded] = useState(false);
	const [activeTab, setActiveTab] = useState<OwnFoodFeedbackTab>(OwnFoodFeedbackTab.ALL);
	const [search, setSearch] = useState('');
	const tabColor = appSettings?.foods_area_color || primaryColor;
	const tabTextColor = myContrastColor(tabColor, theme, mode === 'dark');

	const load = useCallback(async () => {
		if (!profileId) {
			setFeedbacks([]);
			setLoaded(true);
			return;
		}
		try {
			const result = (await foodFeedbackHelper.fetchFoodFeedbacks(profileId, { fields: FIELDS, sort: ['-date_updated'] })) as DatabaseTypes.FoodsFeedbacks[];
			setFeedbacks(result ?? []);
		} catch (error) {
			console.error('Loading own food feedbacks failed:', error);
		} finally {
			setLoaded(true);
		}
	}, [foodFeedbackHelper, profileId]);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load])
	);

	const toggleNotify = useCallback(
		async (feedback: DatabaseTypes.FoodsFeedbacks) => {
			if (!profileId) return;
			const foodId = typeof feedback.food === 'object' && feedback.food !== null ? (feedback.food as DatabaseTypes.Foods).id : String(feedback.food);
			// Sent with the food as id: the loaded food object must not go back to the server.
			const payload = { ...feedback, food: foodId, notify: feedback.notify ? null : true } as DatabaseTypes.FoodsFeedbacks;
			try {
				const result = (await foodFeedbackHelper.updateFoodFeedback(foodId, profileId, payload)) as DatabaseTypes.FoodsFeedbacks | null;
				if (result?.id) {
					dispatch({ type: UPDATE_FOOD_FEEDBACK_LOCAL, payload: result });
					setFeedbacks(current => current.map(entry => (entry.id === feedback.id ? { ...entry, notify: result.notify } : entry)));
				} else {
					dispatch({ type: DELETE_FOOD_FEEDBACK_LOCAL, payload: feedback.id });
					setFeedbacks(current => current.filter(entry => entry.id !== feedback.id));
				}
			} catch (error) {
				console.error('Switching the food notification failed:', error);
			}
		},
		[dispatch, foodFeedbackHelper, profileId]
	);

	const counts = useMemo(() => Object.fromEntries(TABS.map(({ tab }) => [tab, feedbacks.filter(feedback => matchesTab(feedback, tab)).length])) as Record<OwnFoodFeedbackTab, number>, [feedbacks]);

	const visible = useMemo(() => {
		const query = search.trim().toLowerCase();
		return feedbacks.filter(feedback => {
			if (!matchesTab(feedback, activeTab)) return false;
			if (!query) return true;
			const name = getFoodName(feedback.food as DatabaseTypes.Foods | null | undefined, language) ?? '';
			return name.toLowerCase().includes(query) || (feedback.comment ?? '').toLowerCase().includes(query);
		});
	}, [feedbacks, activeTab, search, language]);

	return (
		<ScrollView style={{ flex: 1, backgroundColor: theme.screen.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
				{TABS.map(({ tab, icon, labelKey }) => {
					const active = tab === activeTab;
					return (
						<TouchableOpacity
							key={tab}
							onPress={() => setActiveTab(tab)}
							style={[styles.tab, { backgroundColor: active ? tabColor : theme.screen.iconBg }]}
							accessibilityRole="tab"
							accessibilityState={{ selected: active }}
						>
							<MaterialCommunityIcons name={icon} size={18} color={active ? tabTextColor : theme.screen.icon} />
							<Text style={[styles.tabText, { color: active ? tabTextColor : theme.screen.text }]}>{`${translate(labelKey)} (${counts[tab]})`}</Text>
						</TouchableOpacity>
					);
				})}
			</ScrollView>

			<View style={[styles.search, { backgroundColor: theme.screen.iconBg }]}>
				<MaterialCommunityIcons name="magnify" size={20} color={theme.screen.icon} />
				<TextInput
					value={search}
					onChangeText={setSearch}
					placeholder={translate(TranslationKeys.search)}
					placeholderTextColor={theme.screen.placeholder}
					style={[styles.searchInput, { color: theme.screen.text }, isWeb && styles.searchInputWeb]}
					accessibilityLabel={translate(TranslationKeys.search)}
				/>
				{search.length > 0 && (
					<TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.hide)} hitSlop={8}>
						<MaterialCommunityIcons name="close-circle" size={18} color={theme.screen.icon} />
					</TouchableOpacity>
				)}
			</View>

			{activeTab === OwnFoodFeedbackTab.NOTIFICATIONS && <Text style={[styles.intro, { color: theme.screen.text }]}>{translate(TranslationKeys.notification_index_introduction)}</Text>}

			<View style={styles.list}>
				{visible.map(feedback => (
					<OwnFoodFeedbackItem
						key={feedback.id}
						feedback={feedback}
						onPress={() => {
							const foodId = typeof feedback.food === 'object' && feedback.food !== null ? (feedback.food as DatabaseTypes.Foods).id : feedback.food;
							if (foodId) router.push({ pathname: '/(app)/foodoffers/details', params: { foodId: String(foodId) } });
						}}
						onToggleNotify={() => void toggleNotify(feedback)}
					/>
				))}
				{loaded && visible.length === 0 && <Text style={[styles.empty, { color: theme.screen.placeholder }]}>{translate(TranslationKeys.nothing_found)}</Text>}
			</View>
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_notification} />
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	content: {
		width: '100%',
		maxWidth: 800,
		alignSelf: 'center',
		padding: 12,
		gap: 12,
	},
	tabs: {
		gap: 8,
	},
	tab: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
	},
	tabText: {
		fontSize: 14,
		fontWeight: '600',
	},
	search: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		borderRadius: 12,
	},
	searchInput: {
		flex: 1,
		paddingVertical: 10,
		fontSize: 15,
	},
	// The surrounding field already shows where to type; the browser's focus outline would draw a second box.
	searchInputWeb: {
		outlineStyle: 'none',
	} as object,
	list: {
		gap: 12,
	},
	intro: {
		fontSize: 14,
	},
	empty: {
		textAlign: 'center',
		paddingVertical: 24,
	},
});

export default OwnFoodFeedbacksScreen;
