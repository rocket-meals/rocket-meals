jest.mock('expo-web-browser', () => ({
	openAuthSessionAsync: jest.fn(),
	openBrowserAsync: jest.fn(),
	dismissBrowser: jest.fn(),
}));

jest.mock('expo-secure-store', () => {
	const store = new Map<string, string>();
	return {
		setItemAsync: jest.fn(async (key: string, value: string) => {
			store.set(key, value);
		}),
		getItemAsync: jest.fn(async (key: string) => (store.has(key) ? (store.get(key) as string) : null)),
		deleteItemAsync: jest.fn(async (key: string) => {
			store.delete(key);
		}),
	};
});

jest.mock('@/redux/actions/ApiService/ApiService', () => ({
	fetchToken: jest.fn(),
}));

jest.mock('./platformHelper', () => ({
	getPlatformHelper: () => ({
		getAndroidPreferredBrowserPackageOption: async () => ({ browserPackage: 'com.android.chrome' }),
	}),
}));

const REDIRECT_URL = 'app-rocket-meals://login';
const LOGIN_URL = 'https://server.example/auth/login/google?redirect=...';
const CODE_VERIFIER_STORAGE_KEY = 'pkce_pending_code_verifier';

type UrlListener = (event: { url: string }) => void;

describe('authHelper native login', () => {
	let authHelper: typeof import('./authHelper');
	let WebBrowser: { openAuthSessionAsync: jest.Mock; openBrowserAsync: jest.Mock; dismissBrowser: jest.Mock };
	let SecureStore: { setItemAsync: jest.Mock; getItemAsync: jest.Mock; deleteItemAsync: jest.Mock };
	let ApiService: { fetchToken: jest.Mock };
	let urlListeners: UrlListener[];
	let removeListenerMock: jest.Mock;
	let openUrlMock: jest.Mock;

	const emitUrlEvent = (url: string) => {
		[...urlListeners].forEach(listener => listener({ url }));
	};

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();

		const reactNative = require('react-native');
		reactNative.Platform.OS = 'android';

		urlListeners = [];
		removeListenerMock = jest.fn();
		jest.spyOn(reactNative.Linking, 'addEventListener').mockImplementation(((_type: string, handler: UrlListener) => {
			urlListeners.push(handler);
			return {
				remove: () => {
					removeListenerMock();
					urlListeners = urlListeners.filter(listener => listener !== handler);
				},
			};
		}) as never);
		openUrlMock = jest.fn(async () => true);
		jest.spyOn(reactNative.Linking, 'openURL').mockImplementation(openUrlMock as never);

		WebBrowser = require('expo-web-browser');
		SecureStore = require('expo-secure-store');
		ApiService = require('@/redux/actions/ApiService/ApiService');
		authHelper = require('./authHelper');
	});

	it('exchanges the code when the auth session resolves with success', async () => {
		authHelper.setSelectedLoginBrowserStrategy(authHelper.LoginBrowserStrategy.AUTH_SESSION_SAME_TASK);
		WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: `${REDIRECT_URL}?code=code-success` });
		const getToken = jest.fn();

		await authHelper.handleNativeLogin(LOGIN_URL, REDIRECT_URL, 'verifier-success', getToken);

		expect(getToken).toHaveBeenCalledTimes(1);
		expect(getToken).toHaveBeenCalledWith('verifier-success', 'code-success');
	});

	// The core Android bug: expo-web-browser's internal race can resolve with
	// 'dismiss' although the redirect arrived; the deep link event that still
	// follows must complete the login. The listener stays registered even after
	// handleNativeLogin returned.
	it('completes the login via its own listener when the auth session resolves with dismiss', async () => {
		authHelper.setSelectedLoginBrowserStrategy(authHelper.LoginBrowserStrategy.AUTH_SESSION_SAME_TASK);
		WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'dismiss' });
		const getToken = jest.fn();

		await authHelper.handleNativeLogin(LOGIN_URL, REDIRECT_URL, 'verifier-dismiss', getToken);
		expect(getToken).not.toHaveBeenCalled();

		emitUrlEvent(`${REDIRECT_URL}?code=code-dismiss`);

		expect(getToken).toHaveBeenCalledTimes(1);
		expect(getToken).toHaveBeenCalledWith('verifier-dismiss', 'code-dismiss');
	});

	it('ignores events that do not match the redirect url or carry no code', async () => {
		authHelper.setSelectedLoginBrowserStrategy(authHelper.LoginBrowserStrategy.AUTH_SESSION_SAME_TASK);
		WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'dismiss' });
		const getToken = jest.fn();

		await authHelper.handleNativeLogin(LOGIN_URL, REDIRECT_URL, 'verifier-ignore', getToken);

		emitUrlEvent('other-scheme://login?code=foreign-code');
		emitUrlEvent(REDIRECT_URL);

		expect(getToken).not.toHaveBeenCalled();
	});

	it('exchanges a code only once even when listener and session result both deliver it', async () => {
		authHelper.setSelectedLoginBrowserStrategy(authHelper.LoginBrowserStrategy.AUTH_SESSION_SAME_TASK);
		WebBrowser.openAuthSessionAsync.mockImplementation(async () => {
			emitUrlEvent(`${REDIRECT_URL}?code=code-dup`);
			return { type: 'success', url: `${REDIRECT_URL}?code=code-dup` };
		});
		const getToken = jest.fn();

		await authHelper.handleNativeLogin(LOGIN_URL, REDIRECT_URL, 'verifier-dup', getToken);

		expect(getToken).toHaveBeenCalledTimes(1);
	});

	it('replaces the redirect listener on the next login attempt', async () => {
		authHelper.setSelectedLoginBrowserStrategy(authHelper.LoginBrowserStrategy.AUTH_SESSION_SAME_TASK);
		WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'dismiss' });
		const firstGetToken = jest.fn();
		const secondGetToken = jest.fn();

		await authHelper.handleNativeLogin(LOGIN_URL, REDIRECT_URL, 'verifier-first', firstGetToken);
		await authHelper.handleNativeLogin(LOGIN_URL, REDIRECT_URL, 'verifier-second', secondGetToken);

		expect(removeListenerMock).toHaveBeenCalledTimes(1);
		emitUrlEvent(`${REDIRECT_URL}?code=code-second-attempt`);

		expect(firstGetToken).not.toHaveBeenCalled();
		expect(secondGetToken).toHaveBeenCalledWith('verifier-second', 'code-second-attempt');
	});

	it('uses the system browser strategy via Linking.openURL and completes through the listener', async () => {
		authHelper.setSelectedLoginBrowserStrategy(authHelper.LoginBrowserStrategy.SYSTEM_BROWSER);
		const getToken = jest.fn();

		await authHelper.handleNativeLogin(LOGIN_URL, REDIRECT_URL, 'verifier-system', getToken);

		expect(openUrlMock).toHaveBeenCalledWith(LOGIN_URL);
		expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();

		emitUrlEvent(`${REDIRECT_URL}?code=code-system`);
		expect(getToken).toHaveBeenCalledWith('verifier-system', 'code-system');
	});

	it('uses the in-app browser strategy via openBrowserAsync and completes through the listener', async () => {
		authHelper.setSelectedLoginBrowserStrategy(authHelper.LoginBrowserStrategy.IN_APP_BROWSER);
		WebBrowser.openBrowserAsync.mockResolvedValue({ type: 'opened' });
		const getToken = jest.fn();

		await authHelper.handleNativeLogin(LOGIN_URL, REDIRECT_URL, 'verifier-inapp', getToken);

		expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(LOGIN_URL);
		expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();

		emitUrlEvent(`${REDIRECT_URL}?code=code-inapp`);
		expect(getToken).toHaveBeenCalledWith('verifier-inapp', 'code-inapp');
		expect(WebBrowser.dismissBrowser).toHaveBeenCalled();
	});

	// Android defaults to the same principle as iOS: the auth session in the
	// preferred browser (native ASWebAuthenticationSession on iOS).
	it('defaults to the preferred-browser auth session strategy on Android', async () => {
		expect(authHelper.getSelectedLoginBrowserStrategy()).toBe(authHelper.LoginBrowserStrategy.AUTH_SESSION_PREFERRED_BROWSER);
		WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: `${REDIRECT_URL}?code=code-default` });
		const getToken = jest.fn();

		await authHelper.handleNativeLogin(LOGIN_URL, REDIRECT_URL, 'verifier-default', getToken);

		expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(LOGIN_URL, REDIRECT_URL, expect.objectContaining({ browserPackage: 'com.android.chrome' }));
		expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
		expect(getToken).toHaveBeenCalledWith('verifier-default', 'code-default');
	});

	it('passes createTask=false for the same-task auth session strategy', async () => {
		authHelper.setSelectedLoginBrowserStrategy(authHelper.LoginBrowserStrategy.AUTH_SESSION_SAME_TASK);
		WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'dismiss' });

		await authHelper.handleNativeLogin(LOGIN_URL, REDIRECT_URL, 'verifier-task', jest.fn());

		expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(LOGIN_URL, REDIRECT_URL, expect.objectContaining({ createTask: false }));
		expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(LOGIN_URL, REDIRECT_URL, expect.not.objectContaining({ browserPackage: expect.anything() }));
	});

	it('passes the preferred browser package for the preferred-browser auth session strategy', async () => {
		authHelper.setSelectedLoginBrowserStrategy(authHelper.LoginBrowserStrategy.AUTH_SESSION_PREFERRED_BROWSER);
		WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'dismiss' });

		await authHelper.handleNativeLogin(LOGIN_URL, REDIRECT_URL, 'verifier-preferred', jest.fn());

		expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(LOGIN_URL, REDIRECT_URL, expect.objectContaining({ browserPackage: 'com.android.chrome' }));
		expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(LOGIN_URL, REDIRECT_URL, expect.not.objectContaining({ createTask: false }));
	});

	it('completes the login from the deep link code with the persisted verifier', async () => {
		await SecureStore.setItemAsync(CODE_VERIFIER_STORAGE_KEY, 'persisted-verifier');
		ApiService.fetchToken.mockResolvedValue({ directus_refresh_token: 'refresh-token-1' });
		const onToken = jest.fn();

		await authHelper.completeLoginFromDeepLinkCode('code-deeplink', onToken);

		expect(ApiService.fetchToken).toHaveBeenCalledWith('persisted-verifier', 'code-deeplink');
		expect(onToken).toHaveBeenCalledWith('refresh-token-1');

		// same code again is a no-op (codes are single-use on the backend)
		await authHelper.completeLoginFromDeepLinkCode('code-deeplink', onToken);
		expect(ApiService.fetchToken).toHaveBeenCalledTimes(1);
		expect(onToken).toHaveBeenCalledTimes(1);
	});

	it('retries the token exchange on transient network errors', async () => {
		jest.useFakeTimers();
		ApiService.fetchToken.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ directus_refresh_token: 'refresh-after-retry' });

		const promise = authHelper.fetchTokenWithRetry('verifier-retry', 'code-retry');
		await jest.advanceTimersByTimeAsync(5000);

		await expect(promise).resolves.toEqual({ directus_refresh_token: 'refresh-after-retry' });
		expect(ApiService.fetchToken).toHaveBeenCalledTimes(2);
		jest.useRealTimers();
	});

	it('does not retry the token exchange when the server responded with an error', async () => {
		const serverError = Object.assign(new Error('Request failed with status code 400'), { response: { status: 400, data: { error: 'Invalid or expired state.' } } });
		ApiService.fetchToken.mockRejectedValue(serverError);

		await expect(authHelper.fetchTokenWithRetry('verifier-400', 'code-400')).rejects.toBe(serverError);
		expect(ApiService.fetchToken).toHaveBeenCalledTimes(1);
	});

	it('does nothing on a deep link code without pending verifier', async () => {
		const onToken = jest.fn();

		await authHelper.completeLoginFromDeepLinkCode('code-without-verifier', onToken);

		expect(ApiService.fetchToken).not.toHaveBeenCalled();
		expect(onToken).not.toHaveBeenCalled();
	});

	it('does not exchange a code via deep link that the auth session already handled', async () => {
		authHelper.setSelectedLoginBrowserStrategy(authHelper.LoginBrowserStrategy.AUTH_SESSION_SAME_TASK);
		WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: `${REDIRECT_URL}?code=code-both-paths` });
		const getToken = jest.fn();
		await authHelper.handleNativeLogin(LOGIN_URL, REDIRECT_URL, 'verifier-both', getToken);
		expect(getToken).toHaveBeenCalledTimes(1);

		const onToken = jest.fn();
		await authHelper.completeLoginFromDeepLinkCode('code-both-paths', onToken);

		expect(ApiService.fetchToken).not.toHaveBeenCalled();
		expect(onToken).not.toHaveBeenCalled();
	});
});
