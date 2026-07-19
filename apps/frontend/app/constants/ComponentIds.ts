/**
 * ComponentIds – stable identifiers for UI elements targeted by Maestro E2E tests.
 *
 * WICHTIG: Immer `nativeID={ComponentIds.XXX}` verwenden, NICHT `testID`.
 * - `nativeID` wird im Web zu `id="..."` (HTML-Attribut) → Maestro findet Elemente über die `id`
 * - `testID` wird zu `data-testid="..."` → Maestro kann das im Web NICHT finden
 *
 * IMPORTANT: Always use `nativeID={ComponentIds.XXX}`, NOT `testID`.
 * - `nativeID` renders as `id="..."` in HTML → Maestro locates elements by `id`
 * - `testID` renders as `data-testid="..."` → Maestro cannot find this on web
 *
 * NOTE: IDs from the common-ui package are re-exported here so that all Maestro
 * tests and app components can import from a single location.
 */
// NOTE: We import directly from the common-ui source file (bypassing the package
// index) so that the Maestro test generator (tsconfig without `jsx`) can also
// import this file without triggering a JSX compilation error that would occur
// if the full `repo-depkit-common-ui` entry point were used.
import { CommonUiComponentIds } from '../../../../packages/common-ui/src/constants/ComponentIds';

export { CommonUiComponentIds };

export enum AppComponentIds {
	// Drawer navigation
	OPEN_DRAWER = 'open-drawer',
	DRAWER_ITEM_FOOD_OFFERS = 'drawer-item-foodoffers',
	DRAWER_ITEM_CAMPUS = 'drawer-item-campus',
	DRAWER_ITEM_HOUSING = 'drawer-item-housing',
	DRAWER_ITEM_NEWS = 'drawer-item-news',
	DRAWER_ITEM_MAP = 'drawer-item-map',
	DRAWER_ITEM_SETTINGS = 'drawer-item-settings',
	DRAWER_ITEM_LOGOUT = 'drawer-item-logout',
	DRAWER_ITEM_BALANCE = 'drawer-item-balance',
	DRAWER_ITEM_COURSE_TIMETABLE = 'drawer-item-course-timetable',
	DRAWER_ITEM_COLLECTIBLE_EVENT = 'drawer-item-collectible-event',
	DRAWER_ITEM_MANAGEMENT = 'drawer-item-management',
	DRAWER_ITEM_EXPERIMENTAL = 'drawer-item-experimental',
	DRAWER_ITEM_CHATS = 'drawer-item-chats',

	// Login / Onboarding
	LOGIN_ACCEPT_PRIVACY = 'login-accept-privacy',
	LOGIN_CONTINUE_WITHOUT_ACCOUNT = 'login-continue-without-account',
	LOGIN_ATTENTION_TITLE = 'login-attention-title',
	LOGIN_ATTENTION_CONFIRM = 'login-attention-confirm',

	// Canteen selection
	CANTEEN_SELECTION_TITLE = 'canteen-selection-title',
	CANTEEN_SELECTION_EMPTY = 'canteen-selection-empty',
	CANTEEN_SELECT_BUTTON = 'canteen-select-button',

	// Onboarding
	ONBOARDING_NEXT_BUTTON = 'onboarding-next-button',
	ONBOARDING_START_BUTTON = 'onboarding-start-button',
	// Prefix for the price group options; the PriceGroupKey is appended,
	// e.g. "price-group-select-button-student".
	PRICE_GROUP_SELECT_BUTTON = 'price-group-select-button',

	// Settings groups
	SETTINGS_GROUP_APP_SETTINGS = 'settings-group-app-settings',
	SETTINGS_GROUP_CANTEEN_USAGE = 'settings-group-canteen-usage',

	// Settings items
	SETTINGS_COLOR_SCHEME = 'settings-color-scheme',
	SETTINGS_LANGUAGE = 'settings-language',
	SETTINGS_EATING_HABITS = 'settings-eating-habits',
	SETTINGS_CANTEEN = 'settings-canteen',
	SETTINGS_FEEDBACK_SUPPORT_FAQ = 'settings-feedback-support-faq',
	SETTINGS_MAP_VARIANTS = 'settings-map-variants',

	// Color scheme options
	COLOR_SCHEME_DARK = 'color-scheme-dark',
	COLOR_SCHEME_LIGHT = 'color-scheme-light',
	COLOR_SCHEME_SYSTEM = 'color-scheme-system',

	// Language options
	LANGUAGE_ENGLISH = 'language-en',
	LANGUAGE_GERMAN = 'language-de',
	LANGUAGE_TURKISH = 'language-tr',
	LANGUAGE_SPANISH = 'language-es',
	LANGUAGE_FRENCH = 'language-fr',
	LANGUAGE_CHINESE = 'language-zh',
	LANGUAGE_ARABIC = 'language-ar',
	LANGUAGE_RUSSIAN = 'language-ru',

	// Eating habits
	EATING_HABITS_MARKINGS = 'eating-habits-markings',
	EATING_HABITS_ALLERGENE = 'eating-habits-allergene',

	// Food offers
	FOODOFFERS_BALANCE_QUICK_ACCESS = 'foodoffers-balance-quick-access',
	FOODOFFERS_OPTIONS_BUTTON = 'foodoffers-options-button',
	FOODOFFERS_OPTION_SORT = 'foodoffers-option-sort',
	// Prefix for the sort options in the sorting modal; the FoodSortOption value
	// is appended, e.g. "sort-option-rating", "sort-option-alphabetical".
	SORT_OPTION_PREFIX = 'sort-option',
	// Prefix for a food card at a specific list position; the 0-based position
	// and the food id are appended, e.g. "foodoffer-position-0-food-gnocchi".
	// This encodes the rendered order so Maestro tests can assert sorting.
	FOODOFFER_POSITION_PREFIX = 'foodoffer-position',

	// Housing
	HOUSING_SEARCH = 'housing-search',

	// Campus
	CAMPUS_EMPTY = 'campus-empty',

	// Feedback
	FEEDBACK_AND_SUPPORT_TITLE = 'feedback-and-support-title',
}

/**
 * Combined component IDs from both the app and the common-ui package.
 * Use this object for all element targeting in Maestro tests and app components.
 */
export const ComponentIds = { ...AppComponentIds, ...CommonUiComponentIds };
export type ComponentIdValue = AppComponentIds | CommonUiComponentIds;
