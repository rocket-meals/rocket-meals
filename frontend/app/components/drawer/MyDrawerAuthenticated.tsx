import {MyDrawer, useRenderMyDrawerScreen} from '@/components/drawer/MyDrawer';
import React from 'react';
import {TranslationKeys, useTranslation, useTranslationSupportAndFeedback} from '@/helper/translations/Translation';
import {MyDrawerCustomItemProps} from '@/components/drawer/MyDrawerCustomItemCenter';
import {getMyScreenHeaderFoodOffers} from '@/compositions/foodoffers/MyScreenHeaderFoodOffers';
import {IconNames} from '@/constants/IconNames';
import {useMyDrawerWikiItems, useRenderedMyDrawerWikiScreens} from '@/components/drawer/useMyDrawerWikiItems';
import {
	useCampusAreaColor,
	useFoodsAreaColor, useHousingAreaColor,
	useIsAccountBalanceEnabled,
	useIsBuildingsEnabled,
	useIsCourseTimetableEnabled,
	useIsFoodsEnabled,
	useIsHousingEnabled,
	useIsMapEnabled,
	useIsNewsEnabled, useNewsAreaColor
} from '@/states/SynchedAppSettings';
import {getMyScreenHeaderHousing} from "@/compositions/housing/MyScreenHeaderHousing";
import {getMyScreenHeaderBuildings} from "@/compositions/buildings/MyScreenHeaderBuildings";
import {useIsDeveloperModeActive} from "@/states/Develop";
import {useTranslationAccountDelete} from "@/compositions/settings/SettingsRowUserDelete";
import {useCurrentIsEmployee, useCurrentRole, useCurrentRoleIsAdmin} from "@/states/User";

export const MyDrawerAuthenticated = (props: any) => {
	const develop = useIsDeveloperModeActive();
	const role = useCurrentRole();
	const isAdmin = useCurrentRoleIsAdmin();
	const isEmployee = useCurrentIsEmployee()

	const isFoodsEnabled = useIsFoodsEnabled();
	const isHousingEnabled = useIsHousingEnabled();
	const isMapEnabled = useIsMapEnabled();
	const isBuildingsEnabled = useIsBuildingsEnabled();
	const isNewsEnabled = useIsNewsEnabled();
	const isCourseTimetableEnabled = useIsCourseTimetableEnabled();
	const isAccountBalanceEnabled = useIsAccountBalanceEnabled()

	const translation_feedback = useTranslation(TranslationKeys.feedback);
	const translation_support_and_feedback = useTranslationSupportAndFeedback();

	const translation_feedback_support_faq = useTranslation(TranslationKeys.feedback_support_faq);

	const translation_accountbalance = useTranslation(TranslationKeys.accountbalance);
	const translation_home = useTranslation(TranslationKeys.home);
	const translation_settings = useTranslation(TranslationKeys.settings);
	const translation_canteens = useTranslation(TranslationKeys.canteens);
	const translation_campus = useTranslation(TranslationKeys.campus);
	const translation_housing = useTranslation(TranslationKeys.housing);
	const translation_news = useTranslation(TranslationKeys.news);
	const translation_map = useTranslation(TranslationKeys.map);
	const translation_course_timetable = useTranslation(TranslationKeys.course_timetable);
	const translation_food_details = useTranslation(TranslationKeys.food_details);
	const translation_data_access = useTranslation(TranslationKeys.dataAccess);
	const translation_price_group = useTranslation(TranslationKeys.price_group)
	const translation_eating_habits = useTranslation(TranslationKeys.eating_habits)
	const translation_notification = useTranslation(TranslationKeys.notification)

	const translation_foodweekplan = useTranslation(TranslationKeys.foodweekplan)

	const translation_role_employee = useTranslation(TranslationKeys.role_employee)

	const translation_delete_account = useTranslationAccountDelete();

	const customDrawerWikiItems = useMyDrawerWikiItems()
	const renderedMyDrawerWikiItems = useRenderedMyDrawerWikiScreens()

	const customDrawerItems: MyDrawerCustomItemProps[] = []

	if (customDrawerWikiItems) {
		customDrawerItems.push(...customDrawerWikiItems)
	}

	const foodsAreaColor = useFoodsAreaColor();
	const newsAreaColor = useNewsAreaColor();
	const housingAreaColor = useHousingAreaColor()
	const campusAreaColor = useCampusAreaColor()


	return (
		<MyDrawer
			customDrawerItems={customDrawerItems}
		>
			{useRenderMyDrawerScreen({
				routeName: 'home/index',
				label: translation_home,
				title: translation_home,
				icon: 'home',
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'foodoffers/index',
				label: translation_canteens,
				title: translation_canteens,
				icon: IconNames.foodoffers_icon,
				color: foodsAreaColor,
				getHeader: getMyScreenHeaderFoodOffers(),
				visibleInDrawer: isFoodsEnabled || develop
			})}
			{useRenderMyDrawerScreen({
				routeName: 'foodoffers/details/index',
				title: translation_food_details,
				label: translation_food_details,
				color: foodsAreaColor,
				showBackButton: true,
				icon: null,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'map/index',
				label: translation_map,
				title: translation_map,
				icon: IconNames.map_icon,
				visibleInDrawer: isMapEnabled || develop
			})}
			{useRenderMyDrawerScreen({
				routeName: 'accountbalance/index',
				label: translation_accountbalance,
				title: translation_accountbalance,
				icon: IconNames.account_balance_icon,
				visibleInDrawer: isAccountBalanceEnabled || develop
			})}
			{useRenderMyDrawerScreen({
				routeName: 'campus/index',
				color: campusAreaColor,
				label: translation_campus,
				title: translation_campus,
				icon: IconNames.campus_icon,
				getHeader: getMyScreenHeaderBuildings(),
				visibleInDrawer: isBuildingsEnabled || develop
			})}
			{useRenderMyDrawerScreen({
				routeName: 'buildings/details/index',
				title: "Building Details",
				label: "Building Details",
				showBackButton: true,
				icon: null,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'housing/index',
				color: housingAreaColor,
				label: translation_housing,
				title: translation_housing,
				icon: IconNames.apartments_icon,
				getHeader: getMyScreenHeaderHousing(),
				visibleInDrawer: isHousingEnabled || develop
			})}
			{useRenderMyDrawerScreen({
				routeName: 'housing/apartment/index',
				color: housingAreaColor,
				title: "Apartment Details",
				label: "Apartment Details",
				showBackButton: true,
				icon: null,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'news/index',
				color: newsAreaColor,
				label: translation_news,
				title: translation_news,
				icon: IconNames.news_icon,
				visibleInDrawer: isNewsEnabled || develop
			})}
			{useRenderMyDrawerScreen({
				routeName: 'course-timetable/index',
				label: translation_course_timetable,
				title: translation_course_timetable,
				icon: IconNames.course_timetable_icon,
				visibleInDrawer: isCourseTimetableEnabled || develop
			})}
			{useRenderMyDrawerScreen({
				routeName: 'settings/index',
				label: translation_settings,
				title: translation_settings,
				icon: IconNames.settings_icon,
			})}
			{useRenderMyDrawerScreen({
				routeName: 'support/index',
				label: translation_feedback_support_faq,
				title: translation_feedback_support_faq,
				showBackButton: true,
				icon: IconNames.support_icon,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'support/app_feedbacks/index',
				label: translation_support_and_feedback,
				title: translation_support_and_feedback,
				showBackButton: true,
				icon: IconNames.support_icon,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'employee/index',
				title: translation_role_employee,
				label: translation_role_employee,
				showBackButton: true,
				icon: IconNames.role_employee,
				visibleInDrawer: isEmployee || develop
			})}
			{useRenderMyDrawerScreen({
				routeName: 'foodoffers/weekplan/index',
				title: translation_foodweekplan,
				label: translation_foodweekplan,
				showBackButton: true,
				icon: IconNames.foodweekplan_icon,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'foodoffers/weekplan/canteens/index',
				title: translation_foodweekplan,
				label: translation_foodweekplan,
				showBackButton: true,
				icon: IconNames.foodweekplan_icon,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'foodoffers/weekplan/canteen_and_date_iso_start_week/index',
				title: translation_foodweekplan,
				label: translation_foodweekplan,
				getHeader: null,
				showBackButton: true,
				icon: IconNames.foodweekplan_icon,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'foodoffers/bigscreen/details/index',
				title: "",
				label: "",
				getHeader: null,
				showBackButton: true,
				icon: IconNames.foodweekplan_icon,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'settings/price-group/index',
				label: translation_price_group,
				title: translation_price_group,
				icon: IconNames.price_group_icon,
				showBackButton: true,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'settings/delete-account/index',
				label: translation_delete_account,
				title: translation_delete_account,
				icon: IconNames.user_account_delete_icon,
				showBackButton: true,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'settings/eatinghabits/index',
				title: translation_eating_habits,
				label: translation_eating_habits,
				showBackButton: true,
				icon: null,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'settings/notifications/index',
				title: translation_notification,
				label: translation_notification,
				showBackButton: true,
				icon: null,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'data-access/index',
				label: translation_data_access,
				title: translation_data_access,
				icon: IconNames.data_access_icon,
				visibleInDrawer: false
			})}
			{useRenderMyDrawerScreen({
				routeName: 'components/index',
				label: 'Components',
				title: 'Components',
				icon: 'drawing-box',
				visibleInDrawer: develop
			})}
			{renderedMyDrawerWikiItems}
		</MyDrawer>
	)
}