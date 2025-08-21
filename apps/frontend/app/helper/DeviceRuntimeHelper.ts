import { UrlHelper } from '@/constants/UrlHelper';

export function isInExpoGo() {
	const urlToLogin = UrlHelper.getURLToLogin();
	return urlToLogin.startsWith('exp://');
}
