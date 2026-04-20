import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SettingsListGroupTitle, SettingsListProgress } from 'repo-depkit-common-ui';
import { RatingHelper, DatabaseTypes } from 'repo-depkit-common';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';

const ICON_BG_OPACITY_HEX = '20';

type Achievement = {
	key: string;
	labelKey: TranslationKeys;
	descriptionKey: TranslationKeys;
	icon: string;
	iconColor: string;
	current: number;
	target: number;
};

type AchievementGroup = {
	titleKey: TranslationKeys;
	achievements: Achievement[];
};

const Achievements = () => {
	useSetPageTitle(TranslationKeys.achievements);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { primaryColor } = useAppSelector((state) => state.settings);
	const { loggedIn, profile } = useAppSelector((state) => state.authReducer);
	const { ownFoodFeedbacks } = useAppSelector((state) => state.food);
	const selectedCanteen = useSelectedCanteen();

	const ratingsCount = useMemo(() => {
		const feedbacks = ownFoodFeedbacks as DatabaseTypes.FoodsFeedbacks[];
		return feedbacks.filter((f) => RatingHelper.getNumberIfValueInRatingRange(f.rating) !== null).length;
	}, [ownFoodFeedbacks]);

	const favoritesCount = useMemo(() => {
		const feedbacks = ownFoodFeedbacks as DatabaseTypes.FoodsFeedbacks[];
		return feedbacks.filter(
			(f) => RatingHelper.isMaxRating(f.rating) || f.notify
		).length;
	}, [ownFoodFeedbacks]);

	const markingsCount = useMemo(() => {
		const markings = (profile?.markings ?? []) as DatabaseTypes.ProfilesMarkings[];
		return markings.filter((m) => m.like || m.dislike).length;
	}, [profile?.markings]);

	const buildingFavoritesCount = useMemo(() => {
		const favorites = (profile?.buildings_favorites ?? []) as DatabaseTypes.ProfilesBuildingsFavorites[];
		return favorites.length;
	}, [profile?.buildings_favorites]);

	const hasNickname = useMemo(() => {
		return profile?.nickname ? 1 : 0;
	}, [profile?.nickname]);

	const hasCanteen = useMemo(() => {
		return selectedCanteen?.id ? 1 : 0;
	}, [selectedCanteen?.id]);

	const achievementGroups: AchievementGroup[] = useMemo(() => [
		{
			titleKey: TranslationKeys.achievements_group_profile,
			achievements: [
				{
					key: 'app-explorer',
					labelKey: TranslationKeys.achievement_app_explorer,
					descriptionKey: TranslationKeys.achievement_app_explorer_description,
					icon: 'account-check',
					iconColor: '#4CAF50',
					current: loggedIn ? 1 : 0,
					target: 1,
				},
				{
					key: 'personal-touch',
					labelKey: TranslationKeys.achievement_personal_touch,
					descriptionKey: TranslationKeys.achievement_personal_touch_description,
					icon: 'card-account-details',
					iconColor: '#9C27B0',
					current: hasNickname,
					target: 1,
				},
				{
					key: 'home-base',
					labelKey: TranslationKeys.achievement_home_base,
					descriptionKey: TranslationKeys.achievement_home_base_description,
					icon: 'silverware-fork-knife',
					iconColor: '#FF9800',
					current: hasCanteen,
					target: 1,
				},
			],
		},
		{
			titleKey: TranslationKeys.achievements_group_food_ratings,
			achievements: [
				{
					key: 'first-bite',
					labelKey: TranslationKeys.achievement_first_bite,
					descriptionKey: TranslationKeys.achievement_first_bite_description,
					icon: 'food-apple',
					iconColor: '#F44336',
					current: Math.min(ratingsCount, 1),
					target: 1,
				},
				{
					key: 'foodie',
					labelKey: TranslationKeys.achievement_foodie,
					descriptionKey: TranslationKeys.achievement_foodie_description,
					icon: 'food',
					iconColor: '#E91E63',
					current: Math.min(ratingsCount, 10),
					target: 10,
				},
				{
					key: 'gourmet',
					labelKey: TranslationKeys.achievement_gourmet,
					descriptionKey: TranslationKeys.achievement_gourmet_description,
					icon: 'food-variant',
					iconColor: '#FF5722',
					current: Math.min(ratingsCount, 25),
					target: 25,
				},
				{
					key: 'food-critic',
					labelKey: TranslationKeys.achievement_food_critic,
					descriptionKey: TranslationKeys.achievement_food_critic_description,
					icon: 'star-circle',
					iconColor: '#FFD700',
					current: Math.min(ratingsCount, 50),
					target: 50,
				},
			],
		},
		{
			titleKey: TranslationKeys.achievements_group_favorites,
			achievements: [
				{
					key: 'found-a-favorite',
					labelKey: TranslationKeys.achievement_found_a_favorite,
					descriptionKey: TranslationKeys.achievement_found_a_favorite_description,
					icon: 'heart',
					iconColor: '#E91E63',
					current: Math.min(favoritesCount, 1),
					target: 1,
				},
				{
					key: 'favorites-list',
					labelKey: TranslationKeys.achievement_favorites_list,
					descriptionKey: TranslationKeys.achievement_favorites_list_description,
					icon: 'heart-multiple',
					iconColor: '#E91E63',
					current: Math.min(favoritesCount, 5),
					target: 5,
				},
				{
					key: 'food-treasure-hunter',
					labelKey: TranslationKeys.achievement_food_treasure_hunter,
					descriptionKey: TranslationKeys.achievement_food_treasure_hunter_description,
					icon: 'treasure-chest',
					iconColor: '#795548',
					current: Math.min(favoritesCount, 10),
					target: 10,
				},
			],
		},
		{
			titleKey: TranslationKeys.achievements_group_preferences,
			achievements: [
				{
					key: 'know-yourself',
					labelKey: TranslationKeys.achievement_know_yourself,
					descriptionKey: TranslationKeys.achievement_know_yourself_description,
					icon: 'account-heart',
					iconColor: '#3F51B5',
					current: Math.min(markingsCount, 1),
					target: 1,
				},
				{
					key: 'diet-expert',
					labelKey: TranslationKeys.achievement_diet_expert,
					descriptionKey: TranslationKeys.achievement_diet_expert_description,
					icon: 'leaf',
					iconColor: '#4CAF50',
					current: Math.min(markingsCount, 5),
					target: 5,
				},
			],
		},
		{
			titleKey: TranslationKeys.achievements_group_campus,
			achievements: [
				{
					key: 'campus-explorer',
					labelKey: TranslationKeys.achievement_campus_explorer,
					descriptionKey: TranslationKeys.achievement_campus_explorer_description,
					icon: 'map-marker-star',
					iconColor: '#2196F3',
					current: Math.min(buildingFavoritesCount, 1),
					target: 1,
				},
				{
					key: 'campus-guide',
					labelKey: TranslationKeys.achievement_campus_guide,
					descriptionKey: TranslationKeys.achievement_campus_guide_description,
					icon: 'map-legend',
					iconColor: '#00BCD4',
					current: Math.min(buildingFavoritesCount, 3),
					target: 3,
				},
			],
		},
	], [loggedIn, hasNickname, hasCanteen, ratingsCount, favoritesCount, markingsCount, buildingFavoritesCount]);

	const totalAchievements = useMemo(() => {
		return achievementGroups.reduce((sum, g) => sum + g.achievements.length, 0);
	}, [achievementGroups]);

	const unlockedAchievements = useMemo(() => {
		return achievementGroups.reduce(
			(sum, g) => sum + g.achievements.filter((a) => a.current >= a.target).length,
			0
		);
	}, [achievementGroups]);

	const renderAchievement = (achievement: Achievement, index: number, total: number) => {
		const isUnlocked = achievement.current >= achievement.target;
		const progress = achievement.target > 0 ? achievement.current / achievement.target : 0;
		const groupPosition =
			total === 1 ? 'single' : index === 0 ? 'top' : index === total - 1 ? 'bottom' : 'middle';

		return (
			<SettingsListProgress
				key={achievement.key}
				label={translate(achievement.labelKey)}
				description={translate(achievement.descriptionKey)}
				progress={progress}
				progressText={isUnlocked ? `✓ ${translate(TranslationKeys.achievement_unlocked)}` : `${achievement.current}/${achievement.target}`}
				progressColor={isUnlocked ? '#4CAF50' : undefined}
				primaryColor={primaryColor}
				leftIcon={
					<MaterialCommunityIcons
						name={achievement.icon as keyof typeof MaterialCommunityIcons.glyphMap}
						size={22}
						color={isUnlocked ? achievement.iconColor : theme.screen.icon}
					/>
				}
				iconBgColor={isUnlocked ? achievement.iconColor + ICON_BG_OPACITY_HEX : undefined}
				groupPosition={groupPosition}
				showSeparator={index < total - 1}
			/>
		);
	};

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.screen.background }]}
			contentContainerStyle={{ backgroundColor: theme.screen.background }}
		>
			<View style={styles.content}>
				<Text style={[styles.heading, { color: theme.screen.text }]}>
					{translate(TranslationKeys.achievements)}
				</Text>
				<Text style={[styles.description, { color: theme.screen.icon }]}>
					{translate(TranslationKeys.achievements_description)}
				</Text>

				<SettingsListGroupTitle title={translate(TranslationKeys.achievements_progress)} />
				<SettingsListProgress
					label={translate(TranslationKeys.achievements)}
					progress={totalAchievements > 0 ? unlockedAchievements / totalAchievements : 0}
					progressText={`${unlockedAchievements}/${totalAchievements}`}
					primaryColor={primaryColor}
					leftIcon={
						<MaterialCommunityIcons name="trophy" size={22} color={primaryColor} />
					}
					iconBgColor={primaryColor + ICON_BG_OPACITY_HEX}
					groupPosition="single"
					showSeparator={false}
				/>

				{achievementGroups.map((group) => (
					<React.Fragment key={group.titleKey}>
						<SettingsListGroupTitle title={translate(group.titleKey)} />
						{group.achievements.map((achievement, index) =>
							renderAchievement(achievement, index, group.achievements.length)
						)}
					</React.Fragment>
				))}
			</View>
		</ScrollView>
	);
};

export default Achievements;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		width: '100%',
		height: '100%',
		padding: 20,
	},
	heading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 10,
	},
	description: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		marginBottom: 8,
	},
});
