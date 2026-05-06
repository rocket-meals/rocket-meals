import { TranslationKeys } from '../locales/keys';

export const foodPlaneWeek = [
	{ name: TranslationKeys.canteen, showFeedIcon: true, showSwitch: false },
	{
		name: TranslationKeys.show_allergens,
		showFeedIcon: false,
		showSwitch: true,
		switchState: false,
	},
];

export const foodPlaneDay = [
	{ name: TranslationKeys.canteen, showFeedIcon: true, showSwitch: false },
	{
		name: TranslationKeys.food_offer_category_optional,
		showFeedIcon: false,
		showSwitch: false,
	},
	{
		name: TranslationKeys.show_food_offer_category_name,
		showFeedIcon: false,
		showSwitch: true,
		switchState: false,
	},
	{ name: TranslationKeys.next_food_interval, showFeedIcon: false, showSwitch: false },
	{
		name: TranslationKeys.refresh_food_offers_interval,
		showFeedIcon: false,
		showSwitch: false,
	},
	{
		name: TranslationKeys.full_screen,
		showFeedIcon: false,
		showSwitch: true,
		switchState: false,
	},
	{
		name: TranslationKeys.food_category_optional,
		showFeedIcon: false,
		showSwitch: false,
	},
	{
		name: TranslationKeys.show_food_offer_category_name,
		showFeedIcon: false,
		showSwitch: true,
		switchState: false,
	},
];

export const foodPlaneList = [
	{ name: TranslationKeys.canteen, showFeedIcon: true, showSwitch: false },
	{
		name: TranslationKeys.optional_additional_canteen,
		showFeedIcon: true,
		showSwitch: false,
	},
	{ name: TranslationKeys.next_food_interval, showFeedIcon: false, showSwitch: false },
	{
		name: TranslationKeys.refresh_data_interval_seconds,
		showFeedIcon: false,
		showSwitch: false,
	},
];
