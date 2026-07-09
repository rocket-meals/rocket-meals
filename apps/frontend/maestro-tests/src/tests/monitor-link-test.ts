/**
 * monitor-link-test.ts – Configures the "Einzel Bild Speise" (BigScreen) monitor.
 *
 * Mimics what management does in Verwaltung: open the day-plan config screen, pick a
 * canteen, and open the BigScreen monitor - on web this produces the shareable monitor
 * link (/bigScreen?canteens_id=...&fullscreen=...) that gets saved into the monitor
 * device's browser. The logged-out "open the saved link" half lives in
 * monitor-link-logged-out-test.ts, because a Maestro web flow can only launch one URL
 * (the YAML header url is reused for every launchApp in the flow).
 *
 * NOTE: The management drawer entry itself needs a management account; test credentials
 * for the management login don't exist yet (see onboarding-registered-user follow-up).
 * The (monitor) route group is deliberately unguarded though, so the config screen is
 * driven directly via its URL - the steps after that are identical for management users.
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'monitor'],
	outputFileName: 'monitor-link-test',
});

test
	.openPage('http://localhost:8081/foodPlanDay')
	.waitForAnimationToEnd()
	// Pick a canteen (required before the BigScreen row becomes tappable)
	.tapOnId(ComponentIds.MONITOR_DAYPLAN_CANTEEN_ROW)
	.waitForAnimationToEnd()
	.tapOnId(ComponentIds.CANTEEN_SELECT_BUTTON)
	.waitForAnimationToEnd()
	.takeScreenshot('monitor-link-dayplan-configured')
	// Open the BigScreen monitor - the resulting URL is the shareable monitor link
	.tapOnId(ComponentIds.MONITOR_DAYPLAN_OPEN_BIGSCREEN)
	.waitForAnimationToEnd()
	.assertVisibleId(ComponentIds.MONITOR_BIG_SCREEN)
	.takeScreenshot('monitor-link-bigscreen-opened');

export default test;
