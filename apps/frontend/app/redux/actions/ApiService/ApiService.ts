import axios from 'axios';
import Server from '@/constants/ServerUrl';

const api = axios.create({
	baseURL: Server.ServerUrl,
	headers: {
		'Content-Type': 'application/json',
	},
});

export const setApiBaseUrl = (url: string) => {
	api.defaults.baseURL = url;
};

// Token Request
export const fetchToken = async (codeVerifier: string, code: string) => {
	const endpoint = '/proof-key-code-exchange/token';
	const { data } = await api.post(endpoint, {
		code_verifier: codeVerifier,
		code,
	});
	return data;
};

// Authorization Request
export const fetchAuthorizationUrl = async (payload: {
	provider: string;
	redirect_url: string;
	code_challenge_method: string;
	code_challenge: string;
}) => {
	const endpoint = '/proof-key-code-exchange/authorize';
	const { data } = await api.post(endpoint, payload);
	return data;
};
