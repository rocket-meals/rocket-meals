import * as DatabaseTypes from '../databaseTypes/types';
import { FoodSortOption } from '../SortingEnums';

/**
 * Shared food offer test data used by:
 * - Unit tests (packages/common/src/__tests__/SortingHelper.test.ts)
 * - The Maestro mock backend (apps/frontend/maestro-tests/src/mock-server)
 *
 * Keeping the fixtures and the expected sort orders in one place guarantees
 * that the unit tests and the end-to-end tests verify the same behavior on
 * the same data. The ratings intentionally reproduce the originally reported
 * sorting bug (4.4, 4.6, 3.9, 4.9, 4.2 shown unsorted).
 */

export const TEST_CANTEEN_ID = 'canteen-test-1';
export const TEST_CANTEEN_ALIAS = 'Mensa Testhausen';

export const TEST_CANTEEN: DatabaseTypes.Canteens = {
	id: TEST_CANTEEN_ID,
	alias: TEST_CANTEEN_ALIAS,
	status: 'published',
	sort: 1,
} as DatabaseTypes.Canteens;

export interface TestFoodSpec {
	/** Stable id used in fixtures and in Maestro element ids. */
	id: string;
	/** Displayed (German) dish name; also used for alphabetical sorting. */
	name: string;
	ratingAverage: number | null;
	ratingAverageLegacy: number | null;
	priceStudent: number;
	priceEmployee: number;
	priceGuest: number;
}

/**
 * The array order is the "backend order" (the order the server would return
 * without any client-side sorting) and intentionally does NOT match any of
 * the expected sort results.
 */
export const TEST_FOOD_SPECS: TestFoodSpec[] = [
	{ id: 'food-gnocchi', name: 'Gebratene Gnocchi, Ratatouille', ratingAverage: 4.4, ratingAverageLegacy: null, priceStudent: 2.4, priceEmployee: 3.6, priceGuest: 4.8 },
	{ id: 'food-blattsalat', name: 'Gemischter Blattsalat, Kräuter-Joghurt', ratingAverage: 4.6, ratingAverageLegacy: null, priceStudent: 0.6, priceEmployee: 0.9, priceGuest: 1.2 },
	{ id: 'food-bohnen', name: 'Grüne Bohnen', ratingAverage: 3.9, ratingAverageLegacy: null, priceStudent: 0.6, priceEmployee: 0.9, priceGuest: 1.2 },
	{ id: 'food-roestinchen', name: 'Mini-Röstinchen', ratingAverage: 4.9, ratingAverageLegacy: null, priceStudent: 1.0, priceEmployee: 1.5, priceGuest: 2.0 },
	// Only a legacy rating: must be treated like a 3.5 rating (fallback), not like "unrated".
	{ id: 'food-schnitzel', name: 'Paniertes Schnitzel', ratingAverage: null, ratingAverageLegacy: 3.5, priceStudent: 3.2, priceEmployee: 4.4, priceGuest: 5.6 },
	{ id: 'food-nudelsalat', name: 'Nudelsalat', ratingAverage: 4.2, ratingAverageLegacy: null, priceStudent: 1.8, priceEmployee: 2.6, priceGuest: 3.4 },
];

function buildTestFood(spec: TestFoodSpec): DatabaseTypes.Foods {
	return {
		id: spec.id,
		alias: spec.name,
		status: 'published',
		rating_average: spec.ratingAverage,
		rating_average_legacy: spec.ratingAverageLegacy,
		rating_amount: spec.ratingAverage === null ? null : 12,
		translations: [
			{ id: 1, languages_code: 'de-DE', name: spec.name },
			// Same name for English so tests behave identically in every app language.
			{ id: 2, languages_code: 'en-US', name: spec.name },
		],
		markings: [],
		attribute_values: [],
		feedbacks: [],
	} as unknown as DatabaseTypes.Foods;
}

export const TEST_FOODS: DatabaseTypes.Foods[] = TEST_FOOD_SPECS.map(buildTestFood);

/**
 * Builds the foodoffers for a given date (YYYY-MM-DD) in backend order.
 * The nested food objects match what the app requests via `fields=food.*,food.translations.*`.
 */
export function getTestFoodoffers(date: string): DatabaseTypes.Foodoffers[] {
	return TEST_FOOD_SPECS.map((spec, index) => {
		return {
			id: `foodoffer-${spec.id}`,
			alias: spec.name,
			canteen: TEST_CANTEEN_ID,
			date,
			food: buildTestFood(spec),
			price_student: spec.priceStudent,
			price_employee: spec.priceEmployee,
			price_guest: spec.priceGuest,
			sort: index + 1,
			status: 'published',
			markings: [],
			attribute_values: [],
			foodoffer_components: [],
		} as unknown as DatabaseTypes.Foodoffers;
	});
}

/**
 * Expected food id orders per sort option for the fixtures above.
 * Ties (equal prices) keep the backend order because Array.prototype.sort is stable.
 */
export const EXPECTED_FOOD_ID_ORDER: Partial<Record<FoodSortOption, string[]>> = {
	[FoodSortOption.RATING]: ['food-roestinchen', 'food-blattsalat', 'food-gnocchi', 'food-nudelsalat', 'food-bohnen', 'food-schnitzel'],
	[FoodSortOption.ALPHABETICAL]: ['food-gnocchi', 'food-blattsalat', 'food-bohnen', 'food-roestinchen', 'food-nudelsalat', 'food-schnitzel'],
	[FoodSortOption.PRICE_ASCENDING]: ['food-blattsalat', 'food-bohnen', 'food-roestinchen', 'food-nudelsalat', 'food-gnocchi', 'food-schnitzel'],
	[FoodSortOption.PRICE_DESCENDING]: ['food-schnitzel', 'food-gnocchi', 'food-nudelsalat', 'food-roestinchen', 'food-blattsalat', 'food-bohnen'],
};

/**
 * Minimal app_settings singleton so the food area is enabled and the average
 * rating is displayed on the food cards (needed to visually verify rating sort).
 */
export const TEST_APP_SETTINGS: Partial<DatabaseTypes.AppSettings> = {
	foods_enabled: true,
	foods_ratings_average_display: true,
	foods_ratings_average_display_on_card: true,
	foods_ratings_amount_display: true,
	campus_enabled: true,
	housing_enabled: true,
	news_enabled: false,
	map_enabled: false,
	balance_enabled: false,
	course_timetable_enabled: false,
};
