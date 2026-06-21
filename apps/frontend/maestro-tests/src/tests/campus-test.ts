/**
 * campus-test.ts – Tests the campus information screen.
 *
 * After login: navigate to campus → verify content loads → check details.
 *
 * SCREEN ELEMENTS AND EXPECTED TEXT STRINGS:
 * - Uses translation keys from TranslationKeys enum, never hardcoded strings
 * - Key screen texts (via t() function):
 *   - open_drawer: Opens side navigation menu (via stable testID)
 *   - campus: "Campus" navigation option
 *   - no_campus_found: "No campus found" message (should NOT be visible when content loads)
 *   - All lookups use t() to fetch German translations by default
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { TranslationKeys } from '../../../app/locales/keys';
import { t, performAnonymousLogin, selectFirstCanteen, openDrawer } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'campus'],
	outputFileName: 'campus-test',
});

// Login and select a canteen
performAnonymousLogin(test);
selectFirstCanteen(test);

// Navigate to Campus
openDrawer(test);
test
	.tapOn(t(TranslationKeys.campus))
	.waitForAnimationToEnd()
	.takeScreenshot('campus-screen-loaded')

	// Verify campus content is loaded (not showing "no campus found")
	.assertNotVisible(t(TranslationKeys.no_campus_found))

	// Scroll through campus items
	.scroll()
	.takeScreenshot('campus-scrolled')

	// Scroll further to see more
	.scroll()
	.takeScreenshot('campus-scrolled-more');

export default test;
