import { authentication, AuthenticationClient, AuthenticationConfig, AuthenticationData, AuthenticationStorage, createDirectus, deleteUser, DirectusClient, graphql, GraphqlClient, readMe, readPolicies, readProviders, readRoles, rest, RestClient, serverInfo, ServerInfoOutput } from '@directus/sdk';

import { DatabaseTypes } from 'repo-depkit-common';

import { UrlHelper } from '@/constants/UrlHelper';
import ServerConfiguration from '@/constants/ServerUrl';
import { setApiBaseUrl } from '@/redux/actions/ApiService/ApiService';
import { setBaseURL } from '@/interceptor';

interface ExtendedProperties {
	project: {
		project_descriptor: string | null;
		project_logo: string | null;
		project_color: string | null;
		public_foreground: string | null;
		public_background: string | null;
		public_note: string | null;
		custom_css: string | null;
	};
}

type ExtendedServerInfoOutput = ServerInfoOutput & ExtendedProperties;

export interface ServerInfo {
	status: 'loading' | 'online' | 'offline' | 'error' | 'cached';
	info: ExtendedServerInfoOutput | null;
	errorMessage?: string;
}

export type AuthProvider = {
	name: string;
	icon?: string | null;
};

export class ServerAPI {
	static client: (DirectusClient<any> & AuthenticationClient<any> & GraphqlClient<any> & RestClient<any>) | null = null;
	static serverUrlCustom: string | null = null;
	static ParamNameForAccessToken = 'directus_refresh_token';
	static PROVIDER_NAME_APPLE = 'apple';
	static PROVIDER_NAME_GOOGLE = 'google';
	static simpleAuthentificationStorage: AuthenticationStorage | null = null;

	static updateServerUrl(url: string) {
		this.serverUrlCustom = url;
		ServerConfiguration.setServerUrl(url);
		setApiBaseUrl(url);
		setBaseURL(url);
		this.client = null;
	}

	// Retrieves server URL
	static getServerUrl() {
		return this.serverUrlCustom || ServerConfiguration.ServerUrl;
	}

	static getParamNameForDirectusAccessToken() {
		return this.ParamNameForAccessToken;
	}

	static getDirectusAccessTokenFromParams(params: any): string | null | undefined {
		return params?.[this.getParamNameForDirectusAccessToken()];
	}

	// Creates a public Directus client
	static getPublicClient() {
		return createDirectus<DatabaseTypes.CustomDirectusTypes>(this.getServerUrl()).with(rest());
	}

	// Initializes authentication storage
	static createAuthentificationStorage(get: () => Promise<AuthenticationData | null> | AuthenticationData | null, set: (value: AuthenticationData | null) => Promise<void> | void) {
		if (!this.simpleAuthentificationStorage) {
			this.simpleAuthentificationStorage = { get, set };
		}
	}

	static getClient() {
		if (!this.client) {
			if (!this.simpleAuthentificationStorage) {
				throw new Error('Authentication storage not initialized. Call createAuthentificationStorage() first.');
			}
			const authConfig: Partial<AuthenticationConfig> = {
				autoRefresh: true,
				credentials: 'include',
				storage: this.simpleAuthentificationStorage,
			};

			this.client = createDirectus(this.getServerUrl()).with(authentication('json', authConfig)).with(graphql()).with(rest());
		}
		return this.client;
	}

	static async authenticateWithAccessToken(accessToken: string | null) {
		try {
			if (accessToken) {
				await this.simpleAuthentificationStorage?.set({
					access_token: null,
					refresh_token: accessToken,
					expires: null,
					expires_at: null,
				});
			}
			return await this.getClient().refresh();
		} catch (err) {
			console.error('Authentication failed with access token:', err);
			throw err;
		}
	}

	static async authenticateWithEmailAndPassword(email: string, password: string) {
		try {
			const client = this.getClient();
			const result = await client.login(email, password);
			await this.simpleAuthentificationStorage?.set({
				access_token: result.access_token,
				refresh_token: result.refresh_token,
				expires: result.expires,
				expires_at: result.expires_at,
			});
			return await client.refresh();
		} catch (err) {
			console.error('Login failed with email and password:', err);
			throw err;
		}
	}

	static async getAuthProviders(isDemo?: boolean): Promise<AuthProvider[]> {
		if (isDemo) return this.getDemoAuthProviders();

		const client = this.getPublicClient();
		const providers = await client.request(readProviders());
		return providers.map(({ name, icon }) => ({ name, icon }));
	}

	static getDemoAuthProviders(): AuthProvider[] {
		return [
			{ name: this.PROVIDER_NAME_APPLE, icon: 'apple' },
			{ name: this.PROVIDER_NAME_GOOGLE, icon: 'google' },
		];
	}

	static async readRemoteRoles() {
		return this.getClient().request<DatabaseTypes.DirectusRoles[]>(
			readRoles({
				fields: ['*'],
				deep: { users: { _limit: 0 }, policies: { _limit: 0 } },
				limit: -1,
			})
		);
	}

	static async readRemotePolicies() {
		return this.getClient().request<DirectusPolicies[]>(
			readPolicies({
				fields: ['*', 'permissions.*', 'roles.*'],
				deep: {
					permissions: { _limit: -1 },
					roles: { _limit: -1 },
					users: { _limit: 0 },
				},
				limit: -1,
			})
		);
	}

	static async downloadServerInfo(): Promise<ServerInfo> {
		try {
			const remoteInfo = await this.getPublicClient().request(serverInfo());
			return {
				status: 'online',
				info: remoteInfo as ExtendedServerInfoOutput,
				errorMessage: '',
			};
		} catch (err) {
			console.error('Error fetching server info:', err);
			return {
				status: 'offline',
				info: null,
				errorMessage: err?.toString() || 'Unknown error',
			};
		}
	}

	static getUrlToProviderLogin(provider: AuthProvider) {
		const redirectURL = UrlHelper.getURLToLogin();
		return `${this.getServerUrl()}/auth/login/${provider?.name?.toLowerCase()}?redirect=${redirectURL}`;
	}

	static async getMe() {
		return this.getClient().request(readMe({ fields: ['*'] }));
	}

	static async deleteMe() {
		const me = await this.getMe();
		return this.getClient().request(deleteUser(me.id));
	}
}
