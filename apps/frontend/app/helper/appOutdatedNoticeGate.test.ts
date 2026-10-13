import { AppOutdatedNoticeGate } from './appOutdatedNoticeGate';

describe('AppOutdatedNoticeGate', () => {
	beforeEach(() => AppOutdatedNoticeGate.resetForTests());

	it('starts closed and opens once', () => {
		const listener = jest.fn();
		const unsubscribe = AppOutdatedNoticeGate.subscribe(listener);
		expect(AppOutdatedNoticeGate.isDone()).toBe(false);
		AppOutdatedNoticeGate.markDone();
		AppOutdatedNoticeGate.markDone();
		expect(AppOutdatedNoticeGate.isDone()).toBe(true);
		expect(listener).toHaveBeenCalledTimes(1);
		unsubscribe();
	});
});
