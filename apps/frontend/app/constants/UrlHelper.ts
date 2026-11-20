import { createURL } from 'expo-linking';
import { Platform } from 'react-native';
import { EnvHelper } from './EnvHelper';
import { getWebBaseUrl, isWebTenantSubpathBuild } from '@/config';

// import app.json

export class UrlHelper {
	static createLocalURL(path: string) {
		const isProduction = EnvHelper.isProduction();

		if (Platform.OS !== 'web') {
			// The base url workaround below is only needed for web builds. In
			// native production builds it turned "scheme://login" into
			// "scheme://rocket-meals/login", which matches no expo-router route,
			// so the auth deep link could never reach the login screen.
			return createURL(path);
		}

		if (isProduction) {
			const urlWithoutBaseUrl = createURL(path); // createUrl creates a url but without the base url which seems to be a bug
			// example: path = "/login"
			// example: urlWithoutBaseUrl = "https://localhost:3000/login"
			const urlWithoutPath = urlWithoutBaseUrl.replace(path, ''); // remove the path from the url
			// example: urlWithoutPath = "https://localhost:3000"
			// Fork builds (e.g. /swosy) keep redirecting to /rocket-meals, that is what the
			// backends allow today. A tenant built for the central repository
			// (/rocket-meals/<tenant>) gets its own login page, so the login popup never
			// loads the app of another tenant on the same origin.
			const baseUrl = isWebTenantSubpathBuild() ? getWebBaseUrl() : '/rocket-meals';
			// example: baseUrl = "/rocket-meals" or "/rocket-meals/darmstadt"
			const url = urlWithoutPath + baseUrl + path;
			// example: url = "https://localhost:3000/rocket-meals/login"

			return url;
		} else {
			const url = createURL(path);
			// example: url = "localhost:19006/login"
			return url;
		}
	}

	static getURLToLogin() {
		const url = UrlHelper.createLocalURL('/login');
		return url;
	}
}
