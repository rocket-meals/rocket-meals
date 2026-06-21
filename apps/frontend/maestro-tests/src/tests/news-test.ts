/**
 * news-test.ts – Tests the news screen.
 *
 * After login: navigate to news → verify content loads.
 *
 * SCREEN ELEMENTS AND EXPECTED TEXT STRINGS:
 * - Uses translation keys from TranslationKeys enum, never hardcoded strings
 * - Key screen texts (via t() function):
 *   - open_drawer: Opens side navigation menu (via stable testID)
 *   - news: "News" navigation option
 *   - All lookups use t() to fetch German translations by default
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { TranslationKeys } from '../../../app/locales/keys';
import { t, performAnonymousLogin, selectFirstCanteen, openDrawer } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'news'],
	outputFileName: 'news-test',
});

// Login and select a canteen
performAnonymousLogin(test);
selectFirstCanteen(test);

// Navigate to News
openDrawer(test);
test
	.tapOn(t(TranslationKeys.news))
	.waitForAnimationToEnd()
	.takeScreenshot('news-screen-loaded')

	// Scroll through news items
	.scroll()
	.takeScreenshot('news-scrolled')

	// Scroll further
	.scroll()
	.takeScreenshot('news-scrolled-more');

export default test;
