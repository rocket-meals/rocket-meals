import { getCustomerConfig } from '@/config';

export class EnvHelper {
	static isProduction() {
		const env = EnvHelper.getEnv();
		return env.NODE_ENV === 'production';
	}

	static getBaseUrl() {
		return getCustomerConfig().baseUrl;
	}

	static getEnv() {
		return process.env;
	}
}
