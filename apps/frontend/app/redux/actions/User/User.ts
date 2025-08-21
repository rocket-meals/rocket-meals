// import {SyncState, useSyncState} from '@/helper/syncState/SyncState';
// import {PersistentStore} from '@/helper/syncState/PersistentStore';
// import {NonPersistentStore} from '@/helper/syncState/NonPersistentStore';
import { configureStore } from '@/redux/store';
// import {PersistentSecureStore} from '@/helper/syncState/PersistentSecureStore';
import { DatabaseTypes } from 'repo-depkit-common';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
// import {useSynchedRolesDict} from "@/states/SynchedRoles";
// import {useIsDemo} from "@/states/SynchedDemo";
// import {RoleHelper} from "@/helper/role/RoleHelper";
// import {PermissionHelper, PermissionHelperObject} from "@/helper/permission/PermissionHelper";

export type CachedUserInformation = DatabaseTypes.DirectusUsers | undefined;

export function useLogoutCallback(): () => void {
	return async () => {
		ServerAPI.client = null;
		// await SyncState.getInstance().reset();
	};
}

// export function useAccessToken(): string | null | undefined {
// 	const [authData, setAuthData] = useSyncState<AuthenticationData>(PersistentSecureStore.authentificationData)
// 	return authData?.access_token
// }

// export function useCachedUserRaw(): [CachedUserInformation | null | undefined, (callback: (currentValue: (CachedUserInformation | null | undefined)) => (CachedUserInformation | null | undefined)) => void] {
// 	// const [cachedUserRaw, setCachedUser] = useSyncState<CachedUserInformation>(PersistentStore.cachedUser)
// 	// return [cachedUserRaw, setCachedUser]
// }

// export function useCurrentUserRaw(): [CachedUserInformation | null | undefined, (newValue: CachedUserInformation) => void] {
// 	const [cachedUser, setCachedUser] = useCachedUserRaw()
// 	const [currentUser, setCurrentUser] = useSyncState<CachedUserInformation>(NonPersistentStore.currentUser)
// 	// TODO: Update cached user
// 	const setUserWithCache = (newValue: any) => {
// 		setCurrentUser((currentValue) => {
// 			return newValue
// 		})
// 		setCachedUser((currentValue) => {
// 			return newValue
// 		})
// 	}

// 	return [currentUser, setUserWithCache]
// }

function isDirectusUserAnonymous(
	user: DatabaseTypes.DirectusUsers | undefined
) {
	if (!user) return true;
	return user?.id === undefined || user?.id === null;
}

/**
 * Used in the RootAuthUser Flow Loader where we want to check the cache
 * @param user
 */
export function getIsCachedUserAnonymous(
	user: CachedUserInformation | undefined
): boolean {
	return isDirectusUserAnonymous(user);
}

export function useIsCurrentUserAnonymous() {
	// const [currentUser, setCurrentUser] = useCurrentUser();
	// return isDirectusUserAnonymous(currentUser);
}

export function getAnonymousUser(): any {
	return {
		// TODO: Add some default values
		id: null,
	};
}

// export function useCurrentUser(): [DatabaseTypes.DirectusUsers | undefined, (newValue: any) => void] {
// 	const [currentUserRaw, setCurrentUserRaw] = useCurrentUserRaw()
// 	// TODO: Update cached user
// 	const setUserWithCache = (newValue: any) => {
// 		setCurrentUserRaw(
// 			{
// 				data: newValue,
// 				loggedIn: !!newValue
// 			}
// 		)
// 	}
// 	const currentUser = currentUserRaw?.data

// 	return [currentUser, setUserWithCache]
// }

// export function useCurrentRole(): DatabaseTypes.DirectusRoles | null {
// 	const [currentUser, setCurrentUser] = useCurrentUser()
// 	const [rolesDict, setRolesDict] = useSynchedRolesDict()
// 	const role_id = currentUser?.role
// 	if(!role_id){
// 		return null
// 	}
// 	if(typeof role_id !== 'string'){
// 		return role_id
// 	}
// 	const role = rolesDict?.[role_id]
// 	return role || null
// }

// export function useCurrentRoleIsAdmin(): boolean | null{
// 	let permissionHelperObject = PermissionHelper.usePermissionHelperObject();
// 	return RoleHelper.isAdmin(permissionHelperObject);
// }

// export function useCurrentRoleIsAtleastManagement(){
// 	let permissionHelperObject = PermissionHelper.usePermissionHelperObject();
// 	if(RoleHelper.isAdmin(permissionHelperObject)){
// 		return true;
// 	}

// 	if(RoleHelper.isManagement(permissionHelperObject)){
// 		return true;
// 	}
// 	return false;
// }

export function isUserLoggedIn(): boolean {
	const state = configureStore.getState();
	const userLoggedIn = state.authReducer.loggedIn;
	return !!userLoggedIn;
}
