import {PersistentStore} from '@/helper/syncState/PersistentStore';
import {
	Canteens,
	Devices,
	DirectusUsers,
	FoodsFeedbacks,
	Languages,
	Profiles,
	ProfilesBuildingsFavorites,
	ProfilesBuildingsLastVisited,
	ProfilesMarkings
} from '@/helper/database/databaseTypes/types';
import {
	NewValueRawSingleType,
	useSynchedResourceSingleRawValue,
	useSynchResourceSingleRawSetter
} from '@/states/SynchedResource';
import {CollectionHelper} from '@/helper/database/server/CollectionHelper';
import {useSynchedCanteensDict} from '@/states/SynchedCanteens';
import {useCurrentUser, useIsCurrentUserAnonymous} from '@/states/User';
import {useIsServerOnline} from '@/states/SyncStateServerInfo';
import {DirectusTranslationHelper} from '@/helper/translations/DirectusTranslationHelper';
import {LocationType} from "@/helper/geo/LocationType";
import {useSynchedBuildingsDict} from "@/states/SynchedBuildings";
import {CoordinateHelper} from "@/helper/geo/CoordinateHelper";
import {useCallback} from "react";
import {MyCacheHelperDeepFields, MyCacheHelperDependencyEnum, MyCacheHelperType} from "@/helper/cache/MyCacheHelper";
import {useLocales as useLocalesExpo} from "expo-localization";
import {useSynchedLanguagesDict} from "@/states/SynchedLanguages";
import {PlatformHelper} from "@/helper/PlatformHelper";

export const TABLE_NAME_PROFILES = 'profiles';
const cacheHelperDeepFields_profile: MyCacheHelperDeepFields = new MyCacheHelperDeepFields([
	{
		field: '*',
		limit: -1,
		dependency_collections_or_enum: MyCacheHelperDependencyEnum.DOWNLOAD_ALWAYS
	},
	{
		field: 'markings.*',
		limit: -1,
		dependency_collections_or_enum: MyCacheHelperDependencyEnum.DOWNLOAD_ALWAYS
	},
	{
		field: 'devices.*',
		limit: -1,
		dependency_collections_or_enum: MyCacheHelperDependencyEnum.DOWNLOAD_ALWAYS
	},
	{
		field: 'buildings_favorites.*',
		limit: -1,
		dependency_collections_or_enum: MyCacheHelperDependencyEnum.DOWNLOAD_ALWAYS
	},
	{
		field: 'buildings_last_visited.*',
		limit: -1,
		dependency_collections_or_enum: MyCacheHelperDependencyEnum.DOWNLOAD_ALWAYS
	}
])
async function loadProfileRemoteByProfileId(id: string) {
	const usersProfileId: string = id;
	//console.log('usersProfileId: ',usersProfileId)
	//console.log('Okay lets load from remote')
	const profileCollectionHelper = new CollectionHelper<Profiles>(TABLE_NAME_PROFILES)
	return await profileCollectionHelper.readItem(usersProfileId, {
		fields: cacheHelperDeepFields_profile.getFields(),
		deep: cacheHelperDeepFields_profile.getDeepFields(),
	});
}

export async function deleteProfileRemote(id: string | number) {
	const profileCollectionHelper = new CollectionHelper<Profiles>(TABLE_NAME_PROFILES)
	await profileCollectionHelper.deleteItem(id);
}

export async function loadProfileRemoteByUser(user: DirectusUsers | undefined) {
	//console.log('loadProfileRemote');
	//console.log('user', user)
	if (user) {
		const usersProfileId: string = user.profile as unknown as string
		//console.log('usersProfileId: ',usersProfileId)
		if (usersProfileId) {
			return await loadProfileRemoteByProfileId(usersProfileId);
		}
	}
	return undefined;
}

export async function updateProfileRemote(id: string | number, profile: Partial<Profiles>) {
	//console.log('updateProfileRemote')
	//console.log('id: ', id)
	//console.log('profile: ', profile)
	const profileCollectionHelper = new CollectionHelper<Profiles>(TABLE_NAME_PROFILES)
	await profileCollectionHelper.updateItem(id, profile);
	return await loadProfileRemoteByProfileId(id as string);
}

export function useSynchedProfileSetter(): [(callback: (currentValue: Partial<Profiles> | null | undefined) => Partial<Profiles> | null | undefined, sync_cache_composed_key_local?: string) => void, (callback: (currentValue: NewValueRawSingleType<Partial<Profiles>> | null | undefined) => NewValueRawSingleType<Partial<Profiles>> | null | undefined) => void] {
	const [setResource, setResourceRaw] = useSynchResourceSingleRawSetter<Partial<Profiles>>(PersistentStore.profile);

	const isServerOnline = useIsServerOnline()
	const isCurrentUserAnonymous = useIsCurrentUserAnonymous();

	const usedSetResource = useCallback(
		(callback: (currentValue: Partial<Profiles> | null | undefined) => Partial<Profiles> | null | undefined, sync_cache_composed_key_local?: string) => {
			//console.log("setProfile, isServerOnline: ", isServerOnline, "isCurrentUserAnonymous: ", isCurrentUserAnonymous)

			setResource((currentValue) => {
				const newValue = callback(currentValue);
				const profile_id = newValue?.id || currentValue?.id;

				if (isServerOnline && !isCurrentUserAnonymous) {
					if (profile_id && newValue) {
						//console.log('profile_id: ', profile_id);


						updateProfileRemote(profile_id, newValue).then((remoteAnswer) => {
							//console.log('remoteAnswer: ', remoteAnswer);
						}).catch((err) => {
							console.log(err);
						});


						return newValue;
					} else {
						console.error('Profile ID not found');
					}
				}

				return newValue;
			}, sync_cache_composed_key_local);
		},
		// Dependencies for useCallback
		[isServerOnline, isCurrentUserAnonymous, setResource]
	);

	return [usedSetResource, setResourceRaw]
}

export function useSynchedProfileId(): string | null | undefined {
	const profile = useSynchedResourceSingleRawValue<Profiles, (string | null | undefined)>(PersistentStore.profile, (storedProfileRaw) => {
		return storedProfileRaw?.data?.id
	});
	return profile;
}

export function useSynchedProfile(): [Partial<Profiles>, (callback: (currentValue: Partial<Profiles> | null | undefined) => Partial<Profiles> | null | undefined, sync_cache_composed_key_local?: string) => void, cacheHelperObj: MyCacheHelperType]
{
	//const [resourceOnly, setResource, resourceRaw, setResourceRaw] = useSynchedResourceSingleRaw<Partial<Profiles>>(PersistentStore.profile);
	const [usedSetResource, setResourceRaw] = useSynchedProfileSetter();
	const isCurrentUserAnonymous = useIsCurrentUserAnonymous();
	const [currentUser, setUserWithCache] = useCurrentUser();
	const resourceRaw = useSynchedResourceSingleRawValue<Profiles, NewValueRawSingleType<Profiles>>(PersistentStore.profile)
	const resourceOnly = resourceRaw?.data

	let usedResource = resourceOnly;
	if (!usedResource) {
		usedResource = {}
	}

	const sync_cache_composed_key_local = resourceRaw?.sync_cache_composed_key_local;

	async function updateFromServer(sync_cache_composed_key_local?: string) {
		//console.log('RootSyncDatabase: Update profile');
		//console.log('RootSyncDatabase: Update profile - isCurrentUserAnonymous: ',isCurrentUserAnonymous);
		if (!isCurrentUserAnonymous) {
			//console.log('RootSyncDatabase: Update profile - loadProfileRemote: ');
			const remoteProfile = await loadProfileRemoteByUser(currentUser)
			//console.log('RootSyncDatabase: Update profile - remoteProfile: ',remoteProfile);
			if (remoteProfile) {
				usedSetResource((currentProfile) => {
					return remoteProfile;
				}, sync_cache_composed_key_local);
			}
		} else {
			if (!!usedResource && JSON.stringify(usedResource) !== JSON.stringify({})) {
				usedSetResource((currentProfile) => {
					return usedResource;
				}, sync_cache_composed_key_local)
			} else {
				usedSetResource((currentProfile) => {
					return getEmptyProfile();
				}, sync_cache_composed_key_local)
			}
		}
	}

	const cacheHelperObj: MyCacheHelperType = {
		sync_cache_composed_key_local: sync_cache_composed_key_local,
		updateFromServer: updateFromServer,
		dependencies: cacheHelperDeepFields_profile.getDependencies()
	}

	return [usedResource, usedSetResource, cacheHelperObj]
}

export enum PriceGroups {
    Student = 'student',
    Employee = 'employee',
    Guest = 'guest'
}
export function useProfilePriceGroup(): [PriceGroups, ((newValue: string) => void), PriceGroups | string | null | undefined] {
	//const [profile, setProfile] = useSynchedProfile();
	const [setProfile] = useSynchedProfileSetter();
	const profilePriceGroup = useSynchedResourceSingleRawValue<Profiles, (string | null | undefined)>(PersistentStore.profile, (storedProfileRaw) => {
		return storedProfileRaw?.data?.price_group
	});
	const rawProfilePriceGroup = profilePriceGroup;

	let usedPriceGroup = PriceGroups.Student;
	//const profilePriceGroup = profile?.price_group;
	if (profilePriceGroup) {
		// check if profilePriceGroup is a valid PriceGroup
		if (profilePriceGroup === PriceGroups.Student || profilePriceGroup === PriceGroups.Employee || profilePriceGroup === PriceGroups.Guest) {
			usedPriceGroup = profilePriceGroup;
		}
	}

	const setPriceGroup = useCallback((priceGroup: string) => {
		setProfile((currentProfile) => {
			if(currentProfile){
				currentProfile.price_group = priceGroup;
			}
			return currentProfile;
		})
	}, [setProfile]);



	return [usedPriceGroup, setPriceGroup, rawProfilePriceGroup];
}

export function useNickname(): [string | null | undefined, ((newValue: string | undefined) => boolean | void)] {
	//const [profile, setProfile, lastUpdateProfile] = useSynchedProfile()
	const [setProfile] = useSynchedProfileSetter();
	const nickname = useSynchedResourceSingleRawValue<Profiles, (string | null | undefined)>(PersistentStore.profile, (storedProfileRaw) => {
		return storedProfileRaw?.data?.nickname
	});


	const setNickname = useCallback((nickname: string | undefined) => {
		setProfile((currentValue) => {
			if(currentValue){
				currentValue.nickname = nickname;
			}
			return currentValue;
		});
	}, [setProfile]);
	//const nickname = profile?.nickname
	return [nickname, setNickname]
}

export function useEstimatedLocationUponSelectedCanteen(): LocationType | null {
	let [canteen, setCanteen] = useSynchedProfileCanteen();
	const [buildingDict, setBuildingDict] = useSynchedBuildingsDict()
	let building_id = canteen?.building as string;
	let building = buildingDict?.[building_id];
	let coordinates = building?.coordinates;
	let location = CoordinateHelper.getLocation(coordinates);
	return location;
}

export function useProfileLanguageCode(): [string, ((newValue: string | null | undefined) => void), string | Languages | null | undefined] {
	//const [profile, setProfile] = useSynchedProfile();
	const [setProfile] = useSynchedProfileSetter();
	const deviceLocaleCodesWithoutRegionCode = useDeviceLocaleCodesWithoutRegionCode();
	const [languageDict, setLanguageDict] = useSynchedLanguagesDict();

	const profileLanguageSaved = useSynchedResourceSingleRawValue<Profiles, (string | Languages | null | undefined)>(PersistentStore.profile, (storedProfileRaw) => {
		return storedProfileRaw?.data?.language
	});


	const setLanguage = useCallback((newLanguage: string | null | undefined) => {
			setProfile((currentValue) => {
				if(currentValue){
					currentValue.language = newLanguage;
				}
				return currentValue;
			});
		},
		[setProfile]
	);

	let usedLanguage: string = getBestLanguageCodeForProfile(profileLanguageSaved, deviceLocaleCodesWithoutRegionCode, languageDict);
	return [usedLanguage, setLanguage, profileLanguageSaved];
}

function getBestLanguageCodeForProfile(profileLanguage: string | Languages | null | undefined, deviceLocaleCodesWithOrWithoutRegionCode: string[], languageDict: Record<string, Languages | null | undefined> | null | undefined): string {
	let languageCodeOrderToCheck: string[] = [];

	// most important is the locale saved in the profile
	if(!!profileLanguage){
		if (typeof profileLanguage === "string") {
			languageCodeOrderToCheck.push(profileLanguage);
		} else {
			let profileLanguageCode = profileLanguage.code;
			languageCodeOrderToCheck.push(profileLanguageCode);
		}
	}

	// we then would like to use the device locale
	languageCodeOrderToCheck = languageCodeOrderToCheck.concat(deviceLocaleCodesWithOrWithoutRegionCode);

	const serverLanguageDict = languageDict;
	// if we have knowledge about which languages the server supports, we can use this information
	if(!!serverLanguageDict){
		// we want to use the first language code that is supported by the server
		for (let i=0; i<languageCodeOrderToCheck.length; i++) {
			let languageCode = languageCodeOrderToCheck[i];
			let matchingLanguage = getMatchingLanguageCode(languageCode, serverLanguageDict);
			if (matchingLanguage) {
				return matchingLanguage.code;
			}
		}
	}

	// if we have no knowledge about which languages the server supports,
	// we want to check if in the languageCodeOrderToCheck the first one is
	// DEFAULT_LANGUAGE_CODE_GERMAN or FALLBACK_LANGUAGE_CODE_ENGLISH
	const defaultLanguageCode = DirectusTranslationHelper.DEFAULT_LANGUAGE_CODE_GERMAN;
	const defaultFallbackLanguageCode = DirectusTranslationHelper.FALLBACK_LANGUAGE_CODE_ENGLISH;

	for (let i=0; i<languageCodeOrderToCheck.length; i++) {
		let languageCode = languageCodeOrderToCheck[i];
		if (isLanguageCodeMatchingServerLanguageCode(languageCode, defaultLanguageCode)) {
			return defaultLanguageCode
		}
		if (isLanguageCodeMatchingServerLanguageCode(languageCode, defaultFallbackLanguageCode)) {
			return defaultFallbackLanguageCode
		}
	}

	// okay, we have no DEFAULT_LANGUAGE_CODE_GERMAN, so we just use the fallback
	return DirectusTranslationHelper.FALLBACK_LANGUAGE_CODE_ENGLISH;
}

function getMatchingLanguageCode(languageCodeWithOrWithoutRegionCode: string, serverLanguageDict: Record<string, Languages | null | undefined>): Languages | null {
	const languageCodeWithOrWithoutRegionCodeLower = languageCodeWithOrWithoutRegionCode.toLowerCase();

	let serverLanguageKeys = Object.keys(serverLanguageDict);
	for (let i=0; i<serverLanguageKeys.length; i++) {
		let serverLanguageKey = serverLanguageKeys[i];
		const languageSupportedByServer = serverLanguageDict[serverLanguageKey];
		if(languageSupportedByServer){
			const serverLanguageCodeWithRegion = languageSupportedByServer.code;
			const serverLanguageCodeWithRegionLower = serverLanguageCodeWithRegion.toLowerCase();
			// serverLanguageCodeWithRegion could be "de-DE"
			// serverLanguageCodeWithRegionLower could be "de-de"
			// languageCodeWithOrWithoutRegionCodeLower could be "de-de" or "de"

			// if the one is a substring of the other, we have a match
			if (isLanguageCodeMatchingServerLanguageCode(languageCodeWithOrWithoutRegionCodeLower, serverLanguageCodeWithRegionLower)) {
				return languageSupportedByServer
			}
		}
	}
	return null;
}

function isLanguageCodeMatchingServerLanguageCode(languageCodeWithOrWithoutRegionCode: string, serverLanguageCodeWithRegion: string): boolean {
	const languageCodeWithOrWithoutRegionCodeLower = languageCodeWithOrWithoutRegionCode.toLowerCase();
	const serverLanguageCodeWithRegionLower = serverLanguageCodeWithRegion.toLowerCase();
	// serverLanguageCodeWithRegion could be "de-DE"
	// serverLanguageCodeWithRegionLower could be "de-de"
	return serverLanguageCodeWithRegionLower.includes(languageCodeWithOrWithoutRegionCodeLower) || languageCodeWithOrWithoutRegionCodeLower.includes(serverLanguageCodeWithRegionLower);
}

function useDeviceLocaleCodesWithoutRegionCode(): string[] {
	const locales = useLocalesExpo()
	let localeCodes: string[] = [];
	for (let i=0; i<locales.length; i++) {
		let locale = locales[i];
		//locale.languageCode; // e.g. "en"
		localeCodes.push(locale.languageTag); // "de" or "de-DE"
	}

	const defaultLanguageCode = DirectusTranslationHelper.DEFAULT_LANGUAGE_CODE_GERMAN;
	const defaultFallbackLanguageCode = DirectusTranslationHelper.FALLBACK_LANGUAGE_CODE_ENGLISH;

	// Workaround for issue #134 - temporarily
	if(PlatformHelper.isWeb()){ // on Web the locale order does not work properly
		// sort the default language code if it is in the list to the front
		localeCodes = localeCodes.sort((a, b) => {
			if (isLanguageCodeMatchingServerLanguageCode(a, defaultLanguageCode)) {
				return -1;
			} else if (isLanguageCodeMatchingServerLanguageCode(b, defaultLanguageCode)) {
				return 1;
			} else {
				return 0;
			}
		});
	}


	return localeCodes;
}

export function useProfileLocaleForJsDate(): string {
	const [language, setLanguage] = useProfileLanguageCode();
	let locale = language;
	if (locale) {
		locale = locale.toLowerCase() //"en-US" --> "en-us"; since js uses lowercase
	}
	// TODO: check if locale is valid as ISO 639-1 code or something like that
	return locale;
}

export function useSynchedProfileCanteen(): [Canteens | null | undefined, ((newValue: Canteens | null) => void)] {
	//const [profile, setProfile] = useSynchedProfile();
	const [setProfile] = useSynchedProfileSetter();
	const canteen_id = useSynchedResourceSingleRawValue<Profiles, (string | Canteens | null | undefined)>(PersistentStore.profile, (storedProfileRaw) => {
		return storedProfileRaw?.data?.canteen
	});

	const [canteenDict, setCanteenDict] = useSynchedCanteensDict();

	//const canteen_id = profile?.canteen as string;
	let canteen = undefined
	if (canteenDict && canteen_id) {
		canteen = canteenDict[canteen_id];
	}

	const setCanteen = useCallback((newValue: Canteens | null) => {
		setProfile((currentValue) => {
			if(currentValue){
				if(newValue === null) {
					currentValue.canteen = null;
					return currentValue;
				} else {
					currentValue.canteen = newValue.id;
					return currentValue;
				}
			}
		});
	}, [setProfile]);

	return [canteen, setCanteen];
}

export function useAccountBalance(): [number | null | undefined, ((newValue: number | null | undefined) => void)] {
	//const [profile, setProfile] = useSynchedProfile();
	const [setProfile] = useSynchedProfileSetter();
	const credit_balance = useSynchedResourceSingleRawValue<Profiles, (number | null | undefined)>(PersistentStore.profile, (storedProfileRaw) => {
		return storedProfileRaw?.data?.credit_balance
	});


	const setAccountBalance = useCallback((newValue: number | null | undefined) => {
		setProfile((currentValue) => {
			if (currentValue) {
				currentValue.credit_balance = newValue;
			}
			return currentValue;
		});
	}, [setProfile]);
	//const credit_balance = profile?.credit_balance;

	return [credit_balance, setAccountBalance];
}

export function useSynchedProfileMarkingsDict(): [Record<string, ProfilesMarkings>, (marking_id: string, dislikes: boolean) => void, (marking_id: string) => void] {
	//const markingsRaw = useSyncStateValue<Profiles, ProfilesMarkings[]>(PersistentStore.profile, (storedProfile) => {
	//	return storedProfile?.markings;
	//});
	//const setProfile = useSyncStateSetter<Profiles>(PersistentStore.profile);
	const [setProfile] = useSynchedProfileSetter();
	const markingsRaw = useSynchedResourceSingleRawValue<Profiles, (ProfilesMarkings[] | null | undefined)>(PersistentStore.profile, (storedProfileRaw) => {
		return storedProfileRaw?.data?.markings;
	});

	const profileMarkingsList: ProfilesMarkings[] = markingsRaw || [];

	let markingsDictDep = "";
	for (let i=0; i<profileMarkingsList.length; i++) {
		const profilesMarking = profileMarkingsList[i];
		markingsDictDep += ""+profilesMarking.dislikes + profilesMarking.markings_id;
	}

	const useProfilesMarkingsDict = useCallback(() => {
		const profilesMarkingsDict: Record<string, ProfilesMarkings> = {};
		for (let i=0; i<profileMarkingsList.length; i++) {
			const profilesMarking = profileMarkingsList[i];
			const markings_key = profilesMarking.markings_id;
			markingsDictDep += ""+profilesMarking.dislikes + profilesMarking.markings_id;
			if (!!markings_key && typeof profilesMarking.markings_id === 'string') {
				profilesMarkingsDict[profilesMarking.markings_id] = profilesMarking;
			}
		}
		return profilesMarkingsDict;
	}, [markingsDictDep]);

	const profilesMarkingsDict: Record<string, ProfilesMarkings> = useProfilesMarkingsDict();

	const privateSetMarkings = useCallback((marking_id: string, dislikes: boolean, remove: boolean) => {
		//const markingsDictCopy = JSON.parse(JSON.stringify(profilesMarkingsDict));
		setProfile((currentProfile) => {
			if(currentProfile){
				const newProfileMarking: Partial<ProfilesMarkings> = {
					markings_id: marking_id,
					profiles_id: currentProfile?.id,
					dislikes: dislikes
				};
				let currentProfileMarkings = currentProfile?.markings || [];
				currentProfileMarkings.push(newProfileMarking as ProfilesMarkings);

				if (remove) {
					currentProfileMarkings = currentProfileMarkings.filter((x) => x.markings_id !== marking_id);
				}

				currentProfile.markings = currentProfileMarkings;
			}
			return currentProfile;
		});
	}, [setProfile]);

	const setProfileMarking = useCallback((marking_id: string, dislikes: boolean) => {
		privateSetMarkings(marking_id, dislikes, false);
	}, [privateSetMarkings]);

	const removeProfileMarking = useCallback((marking_id: string) => {
		privateSetMarkings(marking_id, false, true);
	}, [privateSetMarkings]);


	return [profilesMarkingsDict, setProfileMarking, removeProfileMarking];
}

export function useSynchedProfileMarking(marking_id: string): [boolean | null | undefined, (dislikes: boolean) => void, () => void] {
	const [profilesMarkingsDict, setProfileMarking, removeProfileMarking] = useSynchedProfileMarkingsDict();

	const setMarking = useCallback((dislikes: boolean) => {
		setProfileMarking(marking_id, dislikes);
	}, [marking_id]);

	const removeMarking = useCallback(() => {
		removeProfileMarking(marking_id);
	}, [marking_id]);

	const dislikes = profilesMarkingsDict[marking_id]?.dislikes;

	return [dislikes, setMarking, removeMarking];
}

export function getEmptyProfile(): Partial<Profiles> {
	const undefinedBuildingsFavorites = undefined as any as string & ProfilesBuildingsFavorites[];
	const undefinedBuildingsLastVisited = undefined as any as string & ProfilesBuildingsLastVisited[];
	const undefinedDevices = undefined as any as string & Devices[];
	const undefinedFoodsFeedbacks = undefined as any as string & FoodsFeedbacks[];
	const undefinedMarkings = undefined as any as string & ProfilesMarkings[];

	return {
		buildings_favorites: undefinedBuildingsFavorites,
		buildings_last_visited: undefinedBuildingsLastVisited,
		devices: undefinedDevices,
		foods_feedbacks: undefinedFoodsFeedbacks,
		canteen: undefined,
		markings: undefinedMarkings,
		nickname: undefined
	}
}