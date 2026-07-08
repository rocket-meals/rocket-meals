/**
 * onboarding-anonymous-test.ts – Tests the onboarding flow for a fresh anonymous session.
 *
 * Anonymous ("continue without account") sessions never have a server profile, so
 * they always have to go through every onboarding step (welcome -> canteen ->
 * price group -> preferences) before landing on the food offers screen. There is
 * no "returning user" case for anonymous sessions.
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';
import { performAnonymousLogin } from '../framework/loginHelper';
import { completeFullOnboarding } from '../framework/onboardingHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'onboarding'],
	outputFileName: 'onboarding-anonymous-test',
});

performAnonymousLogin(test);

test.takeScreenshot('onboarding-anonymous-welcome');

completeFullOnboarding(test);

test
	.takeScreenshot('onboarding-anonymous-complete')
	// Onboarding hands off to the food offers screen once finished.
	.assertVisibleId(ComponentIds.OPEN_DRAWER);

export default test;
