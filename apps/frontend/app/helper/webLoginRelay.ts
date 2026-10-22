/**
 * Web login: hands the authorization code from the login popup to the window that opened it.
 *
 * The web app opens the SSO login (e.g. "Uni/Hochschule") in a popup. The backend sends
 * `Cross-Origin-Opener-Policy` (Directus 11.17+, CVE-2026-35408), so the browser cuts the link
 * between the two windows: the opener sees the popup as closed and can no longer read its URL.
 * At the end the popup lands on `<web app>/login?code=…` on the same origin as the opener, though.
 * There the popup app passes the code on via `BroadcastChannel` (and `localStorage` as fallback),
 * which every page of the same origin receives - also when the popup shows another web app
 * (`/rocket-meals` vs `/studi-futter`) or the opener uses another server.
 *
 * Only a popup the opener announced (`PENDING_KEY`, set right before `window.open`) relays the code,
 * so a normal visit of `/login?code=…` keeps working as before.
 */

const CHANNEL_NAME = 'rocket-meals-web-login';
const PENDING_KEY = 'rocket-meals-web-login-pending';
const RESULT_KEY = 'rocket-meals-web-login-result';

/** A login popup older than this is not waited for anymore. */
export const WEB_LOGIN_RELAY_TIMEOUT_MS = 10 * 60 * 1000;

type RelayMessage = { code: string };

export type WebLoginRelayEnvironment = {
	storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
	createChannel: (() => Pick<BroadcastChannel, 'postMessage' | 'close'> & { onmessage: ((event: MessageEvent) => void) | null }) | null;
	addStorageListener: ((listener: (event: StorageEvent) => void) => () => void) | null;
	now: () => number;
};

function getBrowserEnvironment(): WebLoginRelayEnvironment {
	const hasWindow = typeof window !== 'undefined';
	let storage: WebLoginRelayEnvironment['storage'] = null;
	try {
		storage = hasWindow ? window.localStorage : null;
	} catch {
		storage = null;
	}
	return {
		storage,
		createChannel: typeof BroadcastChannel === 'undefined' ? null : () => new BroadcastChannel(CHANNEL_NAME),
		addStorageListener: hasWindow
			? listener => {
					window.addEventListener('storage', listener);
					return () => window.removeEventListener('storage', listener);
				}
			: null,
		now: Date.now,
	};
}

function readCode(value: unknown): string | null {
	const code = (value as RelayMessage | null)?.code;
	return typeof code === 'string' && code.length > 0 ? code : null;
}

/**
 * Opener side: call right before opening the popup. `onCode` gets the code once (or never, if the
 * login is not finished within `WEB_LOGIN_RELAY_TIMEOUT_MS`). Returns a function that stops waiting.
 */
export function waitForWebLoginCode(onCode: (code: string) => void, environment: WebLoginRelayEnvironment = getBrowserEnvironment()): () => void {
	const { storage, createChannel, addStorageListener, now } = environment;
	let done = false;
	const channel = createChannel?.() ?? null;
	let removeStorageListener: (() => void) | null = null;

	const stop = () => {
		if (done) return;
		done = true;
		clearTimeout(timeout);
		channel?.close();
		removeStorageListener?.();
		try {
			storage?.removeItem(PENDING_KEY);
		} catch {
			// Storage not available - nothing to clean up.
		}
	};
	const receive = (code: string | null) => {
		if (!code || done) return;
		stop();
		onCode(code);
	};

	if (channel) {
		channel.onmessage = event => receive(readCode(event.data));
	}
	removeStorageListener =
		addStorageListener?.(event => {
			if (event.key === RESULT_KEY && event.newValue) {
				try {
					receive(readCode(JSON.parse(event.newValue)));
				} catch {
					// Not ours.
				}
			}
		}) ?? null;
	const timeout = setTimeout(stop, WEB_LOGIN_RELAY_TIMEOUT_MS);

	try {
		storage?.removeItem(RESULT_KEY);
		storage?.setItem(PENDING_KEY, String(now()));
	} catch {
		// Without storage the popup cannot know it should relay - the URL polling still works.
	}
	return stop;
}

/**
 * Popup side: call when a page opens with `?code=…`. Relays the code and returns `true` when an
 * opener announced a login popup within the timeout, else `false` (handle the code as before).
 */
export function relayWebLoginCode(code: string, environment: WebLoginRelayEnvironment = getBrowserEnvironment()): boolean {
	const { storage, createChannel, now } = environment;
	if (!code || !storage) return false;
	let pendingSince: number;
	try {
		pendingSince = Number(storage.getItem(PENDING_KEY));
	} catch {
		return false;
	}
	if (!pendingSince || now() - pendingSince > WEB_LOGIN_RELAY_TIMEOUT_MS) {
		return false;
	}

	const message: RelayMessage = { code };
	try {
		const channel = createChannel?.();
		channel?.postMessage(message);
		channel?.close();
	} catch {
		// Fallback below.
	}
	try {
		storage.removeItem(PENDING_KEY);
		// The `storage` event reaches the other windows of the origin, the value itself is not needed afterwards.
		storage.setItem(RESULT_KEY, JSON.stringify(message));
		storage.removeItem(RESULT_KEY);
	} catch {
		// BroadcastChannel already delivered it, if available.
	}
	return true;
}

/**
 * Popup side, at the start of the web app: when this page is a login popup that ended on
 * `…/login?code=…`, relay the code. Runs before the router may redirect away from `/login`.
 */
export function relayWebLoginCodeFromLocation(): boolean {
	if (typeof window === 'undefined' || !window.location) return false;
	try {
		const url = new URL(window.location.href);
		const code = url.searchParams.get('code');
		if (!code || !url.pathname.replace(/\/+$/, '').endsWith('/login')) return false;
		return relayWebLoginCode(code);
	} catch {
		return false;
	}
}
