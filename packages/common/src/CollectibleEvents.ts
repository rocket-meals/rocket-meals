import * as DatabaseTypes from './databaseTypes/types';

type CollectibleAtKey = Extract<
    keyof DatabaseTypes.CollectibleEvents,
    `collectible_at_${string}`
>;

export const CollectibleAt = {
  collectible_at_campus: 'collectible_at_campus',
  collectible_at_canteen_selection: 'collectible_at_canteen_selection',
  collectible_at_card_balance: 'collectible_at_card_balance',
  collectible_at_course_timetable: 'collectible_at_course_timetable',
  collectible_at_data_access: 'collectible_at_data_access',
  collectible_at_drawer: 'collectible_at_drawer',
  collectible_at_faq: 'collectible_at_faq',
  collectible_at_foodoffers: 'collectible_at_foodoffers',
  collectible_at_foodoffers_details: 'collectible_at_foodoffers_details',
  collectible_at_foodoffers_details_markings: 'collectible_at_foodoffers_details_markings',
  collectible_at_foodoffers_details_nutritions: 'collectible_at_foodoffers_details_nutritions',
  collectible_at_foodoffers_select_date: 'collectible_at_foodoffers_select_date',
  collectible_at_foodoffers_sort: 'collectible_at_foodoffers_sort',
  collectible_at_housing: 'collectible_at_housing',
  collectible_at_license_information: 'collectible_at_license_information',
  collectible_at_markings: 'collectible_at_markings',
  collectible_at_markings_details: 'collectible_at_markings_details',
  collectible_at_news: 'collectible_at_news',
  collectible_at_notification: 'collectible_at_notification',
  collectible_at_price_group_selection: 'collectible_at_price_group_selection',
  collectible_at_settings: 'collectible_at_settings',
  collectible_at_settings_amount_column: 'collectible_at_settings_amount_column',
  collectible_at_settings_first_day_of_week: 'collectible_at_settings_first_day_of_week',
  collectible_at_settings_menuposition: 'collectible_at_settings_menuposition',
  collectible_at_settings_theme: 'collectible_at_settings_theme',
} as const satisfies Record<CollectibleAtKey, CollectibleAtKey>;

export type CollectibleAtType = (typeof CollectibleAt)[keyof typeof CollectibleAt];

export const COLLECTABLE_AT_FIELDS: CollectibleAtType[] = Object.values(CollectibleAt);
