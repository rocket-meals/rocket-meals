import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PriceGroupKey } from '@/app/(app)/settings/types';
import { AuthState } from '@/redux/Types/stateTypes';

export const InitialProfile = {
	markings: [],
	price_group: PriceGroupKey.student,
	id: null,
};

const initialState: AuthState = {
	user: {} as any,
	profile: InitialProfile as any,
	loggedIn: false,
	isManagement: false,
	isDevMode: false,
	termsAndPrivacyConsentAcceptedDate: null,
};

const authSlice = createSlice({
	name: 'authReducer',
	initialState,
	reducers: {
		onLogin: (state, action: PayloadAction<any>) => {
			state.user = action.payload;
			state.loggedIn = true;
		},
		updateLogin: (state, action: PayloadAction<any>) => {
			state.user = action.payload;
			state.loggedIn = true;
		},
		onLogout: () => initialState,
		updateManagement: (state, action: PayloadAction<boolean>) => {
			state.isManagement = action.payload;
		},
		updateDeveloperMode: (state, action: PayloadAction<boolean>) => {
			state.isDevMode = action.payload;
		},
		updateProfile: (state, action: PayloadAction<any>) => {
			state.profile = action.payload;
		},
		clearProfile: (state) => {
			state.profile = InitialProfile as any;
		},
		updatePrivacyPolicyDate: (state, action: PayloadAction<string | null>) => {
			state.termsAndPrivacyConsentAcceptedDate = action.payload;
		},
		clearAnonymously: (state) => {
			const isDevMode = state.isDevMode;
			Object.assign(state, initialState);
			state.isDevMode = isDevMode;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase('ON_LOGIN', (state, action: any) => {
				state.user = action.payload;
				state.loggedIn = true;
			})
			.addCase('UPDATE_LOGIN', (state, action: any) => {
				state.user = action.payload;
				state.loggedIn = true;
			})
			.addCase('ON_LOGOUT', () => initialState)
			.addCase('UPDATE_MANAGEMENT', (state, action: any) => {
				state.isManagement = action.payload;
			})
			.addCase('UPDATE_DEVELOPER_MODE', (state, action: any) => {
				state.isDevMode = action.payload;
			})
			.addCase('UPDATE_PROFILE', (state, action: any) => {
				state.profile = action.payload;
			})
			.addCase('CLEAR_PROFILE', (state) => {
				state.profile = InitialProfile as any;
			})
			.addCase('UPDATE_PRIVACY_POLICY_DATE', (state, action: any) => {
				state.termsAndPrivacyConsentAcceptedDate = action.payload;
			})
			.addCase('CLEAR_ANONYMOUSLY', (state) => {
				const isDevMode = state.isDevMode;
				Object.assign(state, initialState);
				state.isDevMode = isDevMode;
			});
	},
});

export const {
	onLogin,
	updateLogin,
	onLogout,
	updateManagement,
	updateDeveloperMode,
	updateProfile,
	clearProfile,
	updatePrivacyPolicyDate,
	clearAnonymously,
} = authSlice.actions;

export default authSlice.reducer;
