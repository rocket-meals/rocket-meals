/**
 * food-offers-sorting-test.ts – Verifies that sorting the food offers list works
 * and that the rendered order updates immediately when the sort type changes.
 *
 * REQUIRES THE MOCK BACKEND: run via `yarn maestro:mock` (from apps/frontend/app),
 * which starts the Directus GET mock server and the Expo dev server with
 * EXPO_PUBLIC_SERVER_URL pointing at it. The mock serves the shared fixtures from
 * packages/common/src/testData/FoodOfferTestData.ts, and this test asserts the
 * exact same expected orders that the unit tests in
 * packages/common/src/__tests__/SortingHelper.test.ts assert.
 *
 * Each food card wrapper carries the nativeID
 *   `foodoffer-position-<position>-<foodId>`
 * (see ComponentIds.FOODOFFER_POSITION_PREFIX), so asserting a specific id
 * asserts that a specific food is rendered at a specific list position.
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';
import { completeAnonymousOnboarding, performAnonymousLogin } from '../framework/loginHelper';
import { EXPECTED_FOOD_ID_ORDER } from '../../../../../packages/common/src/testData/FoodOfferTestData';
import { FoodSortOption } from '../../../../../packages/common/src/SortingEnums';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'food-offers', 'sorting', 'mock-backend'],
	outputFileName: 'food-offers-sorting-test',
});

/** Assert that every food is rendered at its expected list position. */
function assertFoodOrder(sortOption: FoodSortOption): void {
	const expectedFoodIds = EXPECTED_FOOD_ID_ORDER[sortOption];
	if (!expectedFoodIds) {
		throw new Error(`No expected order defined for sort option: ${sortOption}`);
	}
	for (let position = 0; position < expectedFoodIds.length; position++) {
		test.assertVisibleId(`${ComponentIds.FOODOFFER_POSITION_PREFIX}-${position}-${expectedFoodIds[position]}`);
	}
}

/** Open the sort modal via the header options menu and select a sort option. */
function selectSortOption(sortOption: FoodSortOption): void {
	test
		.tapOnId(ComponentIds.FOODOFFERS_OPTIONS_BUTTON)
		.waitForAnimationToEnd()
		.tapOnId(ComponentIds.FOODOFFERS_OPTION_SORT)
		.waitForAnimationToEnd()
		.tapOnId(`${ComponentIds.SORT_OPTION_PREFIX}-${sortOption}`)
		.waitForAnimationToEnd()
		// Selecting a sort option closes only the sort modal (the topmost sheet);
		// the options menu below it stays open by design – close it as a user would.
		.tapOnId(ComponentIds.MODAL_CLOSE_BUTTON)
		.waitForAnimationToEnd();
}

// Login anonymously and complete onboarding with the mocked canteen ("Mensa Testhausen").
performAnonymousLogin(test);
completeAnonymousOnboarding(test);

test
	// Dismiss any popup/event modal that may have appeared after canteen selection
	.optionalTapOnId(ComponentIds.MODAL_CLOSE_BUTTON)
	.waitForAnimationToEnd()

	// Navigate to food offers via drawer (same as the existing food-offers test)
	.tapOnId(ComponentIds.OPEN_DRAWER)
	.waitForAnimationToEnd()
	.tapOnId(ComponentIds.DRAWER_ITEM_FOOD_OFFERS)
	.waitForAnimationToEnd()
	.takeScreenshot('sorting-01-food-offers-loaded')
	// The mocked offers must be visible (any position, food from the fixtures)
	.assertVisibleId(`${ComponentIds.FOODOFFER_POSITION_PREFIX}-0-`);

// Public rating: highest rating first, legacy-only rating treated as its value.
selectSortOption(FoodSortOption.RATING);
test.takeScreenshot('sorting-02-rating');
assertFoodOrder(FoodSortOption.RATING);

// Alphabetical: sorted by the displayed food name.
selectSortOption(FoodSortOption.ALPHABETICAL);
test.takeScreenshot('sorting-03-alphabetical');
assertFoodOrder(FoodSortOption.ALPHABETICAL);

// Price ascending (anonymous profile → student prices).
selectSortOption(FoodSortOption.PRICE_ASCENDING);
test.takeScreenshot('sorting-04-price-ascending');
assertFoodOrder(FoodSortOption.PRICE_ASCENDING);

// Price descending.
selectSortOption(FoodSortOption.PRICE_DESCENDING);
test.takeScreenshot('sorting-05-price-descending');
assertFoodOrder(FoodSortOption.PRICE_DESCENDING);

export default test;
