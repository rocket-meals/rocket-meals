import {
	CLEAR_ANONYMOUSLY,
	ON_LOGIN,
	ON_LOGOUT,
	UPDATE_DEVELOPER_MODE,
	UPDATE_LOGIN,
	UPDATE_MANAGEMENT,
	UPDATE_PRIVACY_POLICY_DATE,
	UPDATE_PROFILE,
} from '@/redux/Types/types';

const initialState = {
	user: {},
	profile: { markings: [] },
	loggedIn: false,
	isManagement: false,
	isDevMode: false,
	termsAndPrivacyConsentAcceptedDate: null,
};

const authReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case ON_LOGIN: {
			return {
				...state,
				user: actions.payload,
				loggedIn: true,
			};
		}
		case UPDATE_LOGIN: {
			return {
				...state,
				user: actions.payload,
				loggedIn: true,
			};
		}
		case UPDATE_MANAGEMENT: {
			return {
				...state,
				isManagement: actions.payload,
			};
		}
		case UPDATE_DEVELOPER_MODE: {
			return {
				...state,
				isDevMode: actions.payload,
			};
		}
		case UPDATE_PROFILE: {
			return {
				...state,
				profile: actions.payload,
			};
		}
		case UPDATE_PRIVACY_POLICY_DATE: {
			return {
				...state,
				termsAndPrivacyConsentAcceptedDate: actions.payload,
			};
		}
		case CLEAR_ANONYMOUSLY: {
			return {
				...initialState,
				isDevMode: state.isDevMode,
			};
		}
		case ON_LOGOUT: {
			return {
				...initialState,
			};
		}
		default:
			return state;
	}
};

export default authReducer;
