import axios from 'axios';
import Server from '@/constants/ServerUrl';

const axiosInstance = axios.create({
	baseURL: Server.ServerUrl,
	timeout: 60000, // Adjust timeout as necessary
});

export const setBaseURL = (url: string) => {
	axiosInstance.defaults.baseURL = url;
};

// Function to set token dynamically
export const setAuthorizationToken = (token: string | null) => {
	if (token) {
		axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
	} else {
		delete axiosInstance.defaults.headers.common['Authorization'];
	}
};

// Request Interceptor
axiosInstance.interceptors.request.use(
	async config => {
		return config;
	},
	error => {
		return Promise.reject(error);
	}
);

// Response Interceptor
axiosInstance.interceptors.response.use(
	response => response,
	error => {
		if (error.response) {
			console.error('Error response:', error.response.data);
		} else {
			console.error('Network error:', error.message);
		}
		return Promise.reject(error);
	}
);

export default axiosInstance;
