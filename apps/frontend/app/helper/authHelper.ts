import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { getPlatformHelper } from './platformHelper';
import { fetchToken } from '@/redux/actions/ApiService/ApiService';
import { addLoginLog, describeError } from './loginDebug';

const preferInkognitoMode = true;

// On Android there is no native auth session: expo-web-browser emulates
// openAuthSessionAsync with a race between an AppState listener ("app became
// active again" -> {type: 'dismiss'}) and a Linking 'url' listener
// ({type: 'success'}). When the app resumes before the deep link event reaches
// JS - which reliably happens once Google/Directus sessions exist in the
// Custom Tab and the redirect chain completes instantly - the session resolves
// with 'dismiss' and its url listener is removed, silently dropping the auth
// code. iOS uses ASWebAuthenticationSession and is not affected.
// See https://github.com/expo/expo/issues/12044
//
// To be robust against this, the native login additionally:
// - registers its own Linking listener, which still receives the redirect
//   event even when the auth session already resolved with 'dismiss'. The
//   listener stays registered after the auth session ends (it is replaced on
//   the next login attempt) so arbitrarily late redirects still complete.
// - persists the PKCE code verifier, so the login screen can complete the
//   token exchange from the deep link (?code=...) even after an app restart
const CODE_VERIFIER_STORAGE_KEY = 'pkce_pending_code_verifier';

// Different ways of opening the provider login page, selectable from the
// login screen's debug panel to find out what works reliably per device.
// Default on both platforms is the auth session in the preferred browser -
// the same principle as iOS's native ASWebAuthenticationSession. The other
// strategies stay available for debugging devices/browsers where that
// doesn't complete reliably (e.g. some Samsung Internet setups).
export enum LoginBrowserStrategy {
	// Auth session in a Custom Tab of the preferred browser package.
	// Default on both platforms (matches iOS's native ASWebAuthenticationSession).
	AUTH_SESSION_PREFERRED_BROWSER = 'auth_session_preferred_browser',
	// Auth session, but let the system pick the browser (no explicit package).
	// Same Samsung Internet problem as above when it is the default browser.
	AUTH_SESSION_DEFAULT_BROWSER = 'auth_session_default_browser',
	// Auth session with createTask=false: Custom Tab inside the app's own
	// Android task. Flaky on Samsung Internet devices, see above.
	AUTH_SESSION_SAME_TASK = 'auth_session_same_task',
	// Plain in-app browser (openBrowserAsync) without auth session semantics;
	// relies entirely on the redirect listener / deep link fallback.
	IN_APP_BROWSER = 'in_app_browser',
	// Full app switch to the system browser via Linking.openURL; return happens
	// through the deep link only.
	SYSTEM_BROWSER = 'system_browser',
}

export const LOGIN_BROWSER_STRATEGY_LABELS: Record<LoginBrowserStrategy, string> = {
	[LoginBrowserStrategy.AUTH_SESSION_PREFERRED_BROWSER]: 'Auth-Session, bevorzugter Browser (Standard)',
	[LoginBrowserStrategy.AUTH_SESSION_DEFAULT_BROWSER]: 'Auth-Session (System-Browser-Wahl)',
	[LoginBrowserStrategy.AUTH_SESSION_SAME_TASK]: 'Auth-Session (gleicher App-Task)',
	[LoginBrowserStrategy.IN_APP_BROWSER]: 'In-App-Browser',
	[LoginBrowserStrategy.SYSTEM_BROWSER]: 'System-Browser (App-Wechsel)',
};

// Both platforms default to the auth session in the preferred browser - the
// same principle as iOS's native ASWebAuthenticationSession.
const defaultLoginBrowserStrategy = LoginBrowserStrategy.AUTH_SESSION_PREFERRED_BROWSER;

let selectedLoginBrowserStrategy: LoginBrowserStrategy = defaultLoginBrowserStrategy;

export const getSelectedLoginBrowserStrategy = () => selectedLoginBrowserStrategy;

export const setSelectedLoginBrowserStrategy = (strategy: LoginBrowserStrategy) => {
	selectedLoginBrowserStrategy = strategy;
	addLoginLog(`Strategie gewählt: ${strategy}`);
};

let inMemoryCodeVerifier: string | null = null;
// Codes are single-use on the backend; all completion paths (auth session
// result, own listener, login screen deep link params) guard against
// exchanging the same code twice.
const handledCodes = new Set<string>();

// Only one login attempt is active at a time: a new attempt replaces the
// previous redirect listener.
let activeRedirectSubscription: { remove: () => void } | null = null;

const isSecureStoreUsable = () => Platform.OS !== 'web';

const storePendingCodeVerifier = async (codeVerifier: string) => {
	inMemoryCodeVerifier = codeVerifier;
	if (!isSecureStoreUsable()) return;
	try {
		await SecureStore.setItemAsync(CODE_VERIFIER_STORAGE_KEY, codeVerifier);
	} catch (error) {
		console.error('Could not persist pending code verifier:', error);
		addLoginLog(`Code-Verifier konnte nicht gespeichert werden: ${describeError(error)}`);
	}
};

const getPendingCodeVerifier = async (): Promise<string | null> => {
	if (inMemoryCodeVerifier) return inMemoryCodeVerifier;
	if (!isSecureStoreUsable()) return null;
	try {
		return await SecureStore.getItemAsync(CODE_VERIFIER_STORAGE_KEY);
	} catch (error) {
		console.error('Could not read pending code verifier:', error);
		return null;
	}
};

const clearPendingCodeVerifier = async () => {
	inMemoryCodeVerifier = null;
	if (!isSecureStoreUsable()) return;
	try {
		await SecureStore.deleteItemAsync(CODE_VERIFIER_STORAGE_KEY);
	} catch (error) {
		console.error('Could not clear pending code verifier:', error);
	}
};

const getCodeFromUrl = (url: string): string | null => {
	try {
		return new URLSearchParams(new URL(url).search).get('code');
	} catch {
		return null;
	}
};

// Right after returning from the browser the app may still be resuming from
// the background and the first request can fail with a transient network
// error (observed on iOS with the system browser strategy). Codes stay valid
// for a few minutes on the backend, so retrying is safe.
const TOKEN_EXCHANGE_RETRY_DELAYS_MS = [0, 1000, 3000];

// Axios errors without a response never reached the server - only those are
// worth retrying; a real server response (e.g. 400 invalid code) is final.
const isRetryableTokenError = (error: unknown) => !(error as { response?: unknown })?.response;

export const fetchTokenWithRetry = async (codeVerifier: string, code: string): Promise<{ directus_refresh_token?: string | null }> => {
	let lastError: unknown;
	for (let attempt = 0; attempt < TOKEN_EXCHANGE_RETRY_DELAYS_MS.length; attempt++) {
		const delay = TOKEN_EXCHANGE_RETRY_DELAYS_MS[attempt];
		if (delay > 0) {
			await new Promise(resolve => setTimeout(resolve, delay));
		}
		try {
			return await fetchToken(codeVerifier, code);
		} catch (error) {
			lastError = error;
			addLoginLog(`Token-Austausch Versuch ${attempt + 1}/${TOKEN_EXCHANGE_RETRY_DELAYS_MS.length} fehlgeschlagen: ${describeError(error)}`);
			if (!isRetryableTokenError(error)) {
				break;
			}
		}
	}
	throw lastError;
};

const dismissBrowserSafely = () => {
	try {
		WebBrowser.dismissBrowser();
	} catch {
		// No browser to dismiss (or not supported) - ignore.
	}
};

export const handleWebLogin = async (loginUrl: string, redirectUrl: string, codeVerifier: string, getToken: (codeVerifier: string, code: string) => void) => {
	const WEB_CHECK_INTERVAL = 25;

	return new Promise<void>(resolve => {
		const windowFeatures = 'width=500,height=600';
		const authWindow = window.open(loginUrl, '_blank', windowFeatures);
		const authCheckInterval = setInterval(() => {
			if (authWindow) {
				if (authWindow?.closed) {
					clearInterval(authCheckInterval);
					resolve();
				} else {
					try {
						const currentLocation = new URL(authWindow.location.href);
						if (currentLocation.href.startsWith(redirectUrl)) {
							authWindow.close();
							const code = new URLSearchParams(currentLocation.search).get('code');
							if (code) getToken(codeVerifier, code);
							clearInterval(authCheckInterval);
							resolve();
						}
					} catch {
						// Cross-origin access error during redirect, ignored.
					}
				}
			}
		}, WEB_CHECK_INTERVAL);
	});
};

export const handleNativeLogin = async (loginUrl: string, redirectUrl: string, codeVerifier: string, getToken: (codeVerifier: string, code: string) => void) => {
	const { getAndroidPreferredBrowserPackageOption } = getPlatformHelper();
	const isAndroid = Platform.OS === 'android';
	const strategy = selectedLoginBrowserStrategy;

	addLoginLog(`Login startet (Strategie: ${strategy}, Plattform: ${Platform.OS})`);
	addLoginLog(`Redirect-URL: ${redirectUrl}`);

	await storePendingCodeVerifier(codeVerifier);

	const tryHandleRedirect = (url: string | null | undefined, source: string): boolean => {
		if (!url) return false;
		if (!url.startsWith(redirectUrl)) {
			addLoginLog(`URL ignoriert (${source}, passt nicht zur Redirect-URL): ${url}`);
			return false;
		}
		const code = getCodeFromUrl(url);
		if (!code) {
			addLoginLog(`URL ohne Code ignoriert (${source}): ${url}`);
			return false;
		}
		if (handledCodes.has(code)) {
			addLoginLog(`Code bereits verarbeitet, ignoriert (${source})`);
			return false;
		}
		handledCodes.add(code);
		addLoginLog(`Auth-Code empfangen (${source}), starte Token-Austausch`);
		clearPendingCodeVerifier();
		dismissBrowserSafely();
		getToken(codeVerifier, code);
		return true;
	};

	// The listener is intentionally NOT removed when this function returns: for
	// the in-app-browser and system-browser strategies there is no signal for
	// "browser closed", and for the auth session strategies a late deep link
	// event must still complete the login. The next attempt replaces it.
	activeRedirectSubscription?.remove();
	activeRedirectSubscription = Linking.addEventListener('url', event => {
		addLoginLog(`Linking-Event empfangen: ${event.url}`);
		tryHandleRedirect(event.url, 'Linking-Event');
	});

	try {
		if (strategy === LoginBrowserStrategy.SYSTEM_BROWSER) {
			addLoginLog('Öffne System-Browser (Linking.openURL)');
			await Linking.openURL(loginUrl);
			addLoginLog('System-Browser geöffnet, warte auf Deep-Link-Rückkehr');
			return;
		}

		if (strategy === LoginBrowserStrategy.IN_APP_BROWSER) {
			addLoginLog('Öffne In-App-Browser (openBrowserAsync)');
			const result = await WebBrowser.openBrowserAsync(loginUrl);
			addLoginLog(`openBrowserAsync Ergebnis: ${result?.type}`);
			return;
		}

		let browserPackage: string | undefined;
		if (isAndroid && strategy === LoginBrowserStrategy.AUTH_SESSION_PREFERRED_BROWSER) {
			({ browserPackage } = await getAndroidPreferredBrowserPackageOption());
			addLoginLog(`Bevorzugtes Browser-Paket: ${browserPackage}`);
		}

		const createTask = strategy === LoginBrowserStrategy.AUTH_SESSION_SAME_TASK ? false : undefined;

		addLoginLog(`Öffne Auth-Session (browserPackage=${browserPackage ?? '-'}, createTask=${createTask ?? '-'})`);
		const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUrl, {
			...(browserPackage ? { browserPackage } : {}),
			...(createTask === false ? { createTask } : {}),
			preferEphemeralSession: preferInkognitoMode,
		});

		addLoginLog(`Auth-Session Ergebnis: ${result?.type}${'url' in (result ?? {}) ? `, url=${(result as { url?: string }).url}` : ''}`);

		if (result?.type === 'success' && result.url) {
			tryHandleRedirect(result.url, 'Auth-Session-Ergebnis');
		} else if (isAndroid && result?.type === 'dismiss') {
			addLoginLog('Auth-Session meldet dismiss - Redirect-Listener bleibt aktiv, falls der Deep-Link noch eintrifft');
		}
	} catch (error) {
		addLoginLog(`Fehler beim Öffnen des Browsers: ${describeError(error)}`);
		throw error;
	}
};

// Completes the login when the auth redirect arrives as plain deep link
// navigation to the login screen (?code=...) instead of through the auth
// session, e.g. after the session resolved with 'dismiss' or the app was
// restarted while in the browser.
export const completeLoginFromDeepLinkCode = async (code: string, onToken: (directusRefreshToken: string) => void) => {
	if (!code || handledCodes.has(code)) return;
	const codeVerifier = await getPendingCodeVerifier();
	if (!codeVerifier) {
		addLoginLog('Deep-Link-Code erhalten, aber kein gespeicherter Code-Verifier vorhanden - ignoriert');
		return;
	}
	handledCodes.add(code);
	addLoginLog('Auth-Code empfangen (Login-Screen Deep-Link), starte Token-Austausch');
	dismissBrowserSafely();
	try {
		const { directus_refresh_token } = await fetchTokenWithRetry(codeVerifier, code);
		if (directus_refresh_token) {
			addLoginLog('Token-Austausch erfolgreich (Deep-Link-Pfad)');
			await clearPendingCodeVerifier();
			onToken(directus_refresh_token);
		} else {
			addLoginLog('Token-Austausch lieferte keinen Refresh-Token (Deep-Link-Pfad)');
		}
	} catch (error) {
		console.error('Error completing login from deep link code:', error);
		addLoginLog(`Token-Austausch fehlgeschlagen (Deep-Link-Pfad): ${describeError(error)}`);
	}
};
