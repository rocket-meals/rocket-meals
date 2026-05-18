import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { FontAwesome, Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import { SET_DAY_PLAN, SET_FOOD_PLAN, SET_WEEK_PLAN } from '@/redux/Types/types';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import SettingsList from '@/components/SettingsList';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import AppScreen from '@/components/AppScreen';
import AppSection from '@/components/AppSection';

const Index = () => {
	useSetPageTitle(TranslationKeys.role_management);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const isLtrLanguage = useIsLtrLanguage();
	const isArabic = !isLtrLanguage;
	const chevronName: React.ComponentProps<typeof Octicons>['name'] = isArabic ? 'chevron-left' : 'chevron-right';

	return (
		<AppScreen>
			<AppSection title={translate(TranslationKeys.meal_guidance_system)}>
				<SettingsList
					leftIcon={<MaterialCommunityIcons name="calendar" size={24} />}
					label={translate(TranslationKeys.foodweekplan)}
					rightIcon={<Octicons name={chevronName} size={24} color={theme.screen.icon} />}
					onPress={() => {
						dispatch({
							type: SET_WEEK_PLAN,
							payload: {
								selectedCanteen: {},
								isAllergene: true,
							},
						});
						router.navigate('/foodPlanWeek');
					}}
					groupPosition="top"
				/>
				<SettingsList
					leftIcon={<MaterialCommunityIcons name="folder-image" size={24} />}
					label={translate(TranslationKeys.foodBigScreen)}
					rightIcon={<Octicons name={chevronName} size={24} color={theme.screen.icon} />}
					onPress={() => {
						dispatch({
							type: SET_DAY_PLAN,
							payload: {
								selectedCanteen: {},
								mealOfferCategory: '',
								isMenuCategory: true,
								nextFoodInterval: 10,
								refreshInterval: 300,
								isFullScreen: true,
								foodCategory: '',
								isMenuCategoryName: true,
							},
						});
						router.navigate('/foodPlanDay');
					}}
					groupPosition="middle"
				/>
				<SettingsList
					leftIcon={<MaterialCommunityIcons name="view-list" size={24} />}
					label={translate(TranslationKeys.monitorDayPlan)}
					rightIcon={<Octicons name={chevronName} size={24} color={theme.screen.icon} />}
					onPress={() => {
						dispatch({
							type: SET_FOOD_PLAN,
							payload: {
								selectedCanteen: {},
								additionalSelectedCanteen: {},
								nextFoodInterval: 10,
								refreshInterval: 300,
							},
						});
						router.navigate('/foodPlanList');
					}}
					groupPosition="middle"
				/>
				<SettingsList
					leftIcon={<Ionicons name="bag-add" size={24} />}
					label={translate(TranslationKeys.markings)}
					rightIcon={<Octicons name={chevronName} size={24} color={theme.screen.icon} />}
					onPress={() => {
						router.navigate('/labels');
					}}
					groupPosition="bottom"
				/>
			</AppSection>

			<AppSection title={translate(TranslationKeys.forms)}>
				<SettingsList
					leftIcon={<FontAwesome name="list-alt" size={22} />}
					label={translate(TranslationKeys.form_categories)}
					rightIcon={<Octicons name={chevronName} size={24} color={theme.screen.icon} />}
					onPress={() => {
						router.navigate('/form-categories');
					}}
					groupPosition="single"
				/>
			</AppSection>

			<AppSection title={translate(TranslationKeys.event_monitors)}>
				<SettingsList
					leftIcon={<MaterialCommunityIcons name="trophy" size={24} />}
					label={translate(TranslationKeys.collectible_event_monitor)}
					rightIcon={<Octicons name={chevronName} size={24} color={theme.screen.icon} />}
					onPress={() => {
						router.navigate('/collectible-event-monitor');
					}}
					groupPosition="single"
				/>
			</AppSection>

			<AppSection title={translate(TranslationKeys.rss_feed)}>
				<SettingsList
					leftIcon={<FontAwesome name="rss-square" size={22} />}
					label={translate(TranslationKeys.rss_feed)}
					rightIcon={<Octicons name={chevronName} size={24} color={theme.screen.icon} />}
					onPress={() => {
						router.navigate('/rss-feed-config');
					}}
					groupPosition="single"
				/>
			</AppSection>

			<AppSection title={translate(TranslationKeys.statistics)}>
				<SettingsList
					leftIcon={<MaterialCommunityIcons name="calendar" size={24} />}
					label={translate(TranslationKeys.test_statistik)}
					rightIcon={<Octicons name={chevronName} size={24} color={theme.screen.icon} />}
					onPress={() => {
						router.navigate('/statistics');
					}}
					groupPosition="single"
				/>
			</AppSection>

			<AppSection title={translate(TranslationKeys.public_links)}>
				<SettingsList
					leftIcon={<MaterialCommunityIcons name="comment-edit" size={24} />}
					label={translate(TranslationKeys.rueckmeldung_geben)}
					rightIcon={<Octicons name={chevronName} size={24} color={theme.screen.icon} />}
					onPress={() => {
						router.navigate('/give-feedback');
					}}
					groupPosition="top"
				/>
				<SettingsList
					leftIcon={<MaterialCommunityIcons name="download" size={24} />}
					label={translate(TranslationKeys.app_download)}
					rightIcon={<Octicons name={chevronName} size={24} color={theme.screen.icon} />}
					onPress={() => {
						router.navigate('/app-download-management');
					}}
					groupPosition="bottom"
				/>
			</AppSection>
		</AppScreen>
	);
};

export default Index;
