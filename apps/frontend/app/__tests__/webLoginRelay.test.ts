import { relayWebLoginCode, waitForWebLoginCode, WEB_LOGIN_RELAY_TIMEOUT_MS, WebLoginRelayEnvironment } from '@/helper/webLoginRelay';

/** Two windows of the same origin: one storage, channels that reach each other, storage events. */
function createOrigin() {
	const values = new Map<string, string>();
	const channels = new Set<{ onmessage: ((event: MessageEvent) => void) | null }>();
	const storageListeners = new Set<(event: StorageEvent) => void>();
	let now = 1_000_000;
	const environment = (withChannel = true): WebLoginRelayEnvironment => ({
		storage: {
			getItem: key => values.get(key) ?? null,
			setItem: (key, value) => {
				values.set(key, value);
				storageListeners.forEach(listener => listener({ key, newValue: value } as StorageEvent));
			},
			removeItem: key => {
				values.delete(key);
			},
		},
		createChannel: withChannel
			? () => {
					const channel = {
						onmessage: null as ((event: MessageEvent) => void) | null,
						postMessage: (data: unknown) => channels.forEach(other => other !== channel && other.onmessage?.({ data } as MessageEvent)),
						close: () => channels.delete(channel),
					};
					channels.add(channel);
					return channel;
				}
			: null,
		addStorageListener: listener => {
			storageListeners.add(listener);
			return () => storageListeners.delete(listener);
		},
		now: () => now,
	});
	return { environment, values, advance: (ms: number) => (now += ms) };
}

describe('webLoginRelay', () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it('hands the code of the popup to the waiting app window', () => {
		const origin = createOrigin();
		const onCode = jest.fn();
		waitForWebLoginCode(onCode, origin.environment());
		expect(relayWebLoginCode('abc', origin.environment())).toBe(true);
		expect(onCode).toHaveBeenCalledTimes(1);
		expect(onCode).toHaveBeenCalledWith('abc');
	});

	it('works without BroadcastChannel through the storage event', () => {
		const origin = createOrigin();
		const onCode = jest.fn();
		waitForWebLoginCode(onCode, origin.environment(false));
		expect(relayWebLoginCode('abc', origin.environment(false))).toBe(true);
		expect(onCode).toHaveBeenCalledWith('abc');
		expect(origin.values.size).toBe(0);
	});

	it('does not relay when no app window waits, so a normal /login?code=… keeps working', () => {
		const origin = createOrigin();
		expect(relayWebLoginCode('abc', origin.environment())).toBe(false);
	});

	it('does not relay for a login started longer ago than the timeout', () => {
		const origin = createOrigin();
		const onCode = jest.fn();
		waitForWebLoginCode(onCode, origin.environment());
		origin.advance(WEB_LOGIN_RELAY_TIMEOUT_MS + 1);
		jest.advanceTimersByTime(WEB_LOGIN_RELAY_TIMEOUT_MS + 1);
		expect(relayWebLoginCode('abc', origin.environment())).toBe(false);
		expect(onCode).not.toHaveBeenCalled();
	});

	it('stops waiting when the app window got the code itself', () => {
		const origin = createOrigin();
		const onCode = jest.fn();
		const stop = waitForWebLoginCode(onCode, origin.environment());
		stop();
		expect(relayWebLoginCode('abc', origin.environment())).toBe(false);
		expect(onCode).not.toHaveBeenCalled();
	});
});
