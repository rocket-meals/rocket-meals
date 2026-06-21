/**
 * map-test.ts – Tests the map screen.
 *
 * After login: navigate to map → verify it renders.
 *
 * SCREEN ELEMENTS AND EXPECTED TEXT STRINGS:
 * - Uses translation keys from TranslationKeys enum, never hardcoded strings
 * - Key screen texts (via t() function):
 *   - open_drawer: Opens side navigation menu (via stable testID)
 *   - map: "Map" navigation option
 *   - map_variants: Map variants/style selector option
 *   - All lookups use t() to fetch German translations by default
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { TranslationKeys } from '../../../app/locales/keys';
import { t, performAnonymousLogin, selectFirstCanteen, openDrawer } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'map'],
	outputFileName: 'map-test',
});

// Login and select a canteen
performAnonymousLogin(test);
selectFirstCanteen(test);

// Navigate to Map
openDrawer(test);
test
	.tapOn(t(TranslationKeys.map))
	.waitForAnimationToEnd()
	.takeScreenshot('map-screen-loaded')

	// Wait a bit more for map tiles to load
	.waitForAnimationToEnd()
	.takeScreenshot('map-fully-loaded')

	// Verify map variants option is available
	.tapOn(t(TranslationKeys.map_variants))
	.waitForAnimationToEnd()
	.takeScreenshot('map-variants-options');

export default test;
