const DEFAULT_SERVER_URL = 'https://swosy.rocket-meals.de/rocket-meals/api';
const LOCALHOST = 'http://127.0.0.1/rocket-meals/api';
const REAL_TEST_SERVER_URL = "https://studi-futter.rocket-meals.de/rocket-meals/api";
const isDev = process.env.NODE_ENV === 'development';
let DEV_SERVER_URL = REAL_TEST_SERVER_URL

export default {
	ServerUrl: isDev ? DEV_SERVER_URL : DEFAULT_SERVER_URL,
};
