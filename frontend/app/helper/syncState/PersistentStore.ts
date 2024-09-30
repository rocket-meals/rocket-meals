export class PersistentStore {
	// the key is just for easier access, the value is the actual key in the storage or syncState
	static test = 'PersistentStore.test'

	static debug = 'PersistentStore.debug'
	static demo = 'PersistentStore.demo'
	static animations_auto_play_disabled = 'PersistentStore.performance'
	static develop = 'PersistentStore.develop'
	static consentStatusTermsAndPrivacy = 'PersistentStore.consentStatusTermsAndPrivacy'

	static useSystemLanguage = 'PersistentStore.useSystemLanguage'

	static debugAutoLogin = 'PersistentStore.debugAutoLogin'

	static drawerConfig = 'PersistentStore.drawerConfig'

	static colorSchemeName = 'PersistentStore.colorSchemeName'
	static cachedUser = 'PersistentStore.user'

	static server_info = 'PersistentStore.server_info'

	static course_timetable_settings = 'PersistentStore.course_timetable_settings'
	static course_timetable = 'PersistentStore.course_timetable'

	static collections_dates_last_update = 'PersistentStore.collections_dates_last_update'
	static canteens = 'PersistentStore.canteens'

	static foodoffers_cache = 'PersistentStore.foodoffers_cache'
	static foods_cache = 'PersistentStore.foods_cache'

	static businesshours = 'PersistentStore.businesshours'
	static languages = 'PersistentStore.languages'
	static wikis = 'PersistentStore.wikis'
	static news = 'PersistentStore.news'
	static buildings = 'PersistentStore.buildings'
	static foodsFeedbacksLabels = 'PersistentStore.foodsFeedbacksLabels'
	static canteensFeedbacksLabels = 'PersistentStore.canteensFeedbacksLabels'
	static apartments = 'PersistentStore.apartments'
	static app_settings = 'PersistentStore.app_settings'
	static markings = 'PersistentStore.markings'
	static markings_groups = 'PersistentStore.markings_groups'
	static popup_events = 'PersistentStore.popup_events'
	static popup_events_read = 'PersistentStore.popup_events_read'
	static roles = 'PersistentStore.roles'
	static policies = 'PersistentStore.policies'
	static permissions = 'PersistentStore.permissions'

	static ownFoodFeedbacks = 'PersistentStore.ownFoodFeedbacks'
	static ownFoodFeedbacksLabelsEntries = 'PersistentStore.ownFoodFeedbacksLabelsEntries'
	static ownCanteenFeedbacksLabelsEntries = 'PersistentStore.ownCanteenFeedbacksLabelsEntries'

	static sortConfigFoodoffers = 'PersistentStore.sortConfigFoodoffers'
	static sortConfigBuildings = 'PersistentStore.sortConfigBuildings'
	static sortConfigApartments = 'PersistentStore.sortConfigApartments'
	static sortConfigNews = 'PersistentStore.sortConfigNews'

	static profile = 'PersistentStore.profile'

	static firstWeekday = 'PersistentStore.firstWeekday'

	static displaySettings = 'PersistentStore.displaySettings'
}

type ValueOf<T> = T[keyof T];
export type PersistentStoreValues = ValueOf<typeof PersistentStore>;