import {PersistentStore} from "@/helper/syncState/PersistentStore";
import {
    Canteens,
    Devices,
    DirectusUsers,
    FoodsFeedbacks,
    Profiles,
    ProfilesBuildingsFavorites,
    ProfilesBuildingsLastVisited,
    ProfilesMarkings
} from "@/helper/database/databaseTypes/types";
import {useSynchedResourceSingleRaw} from "@/states/SynchedResource";
import {CollectionHelper} from "@/helper/database/server/CollectionHelper";
import {useSynchedCanteensDict} from "@/states/SynchedCanteens";
import {useIsCurrentUserAnonymous} from "@/states/User";
import {useIsServerOnline} from "@/states/SyncStateServerInfo";
import {DirectusTranslationHelper} from "@/helper/translations/DirectusTranslationHelper";

/**
 * Loads the profile remotely for the given user.
 * @param user The user for whom the profile is to be loaded.
 * @throws If the user is not provided.
 * @returns The profile data if available, otherwise undefined.
 */
export async function loadProfileRemote(user: DirectusUsers | undefined) {
    console.log("loadProfileRemote");
    console.log("user", user)
    if(!!user){
        const profileRelations = ["markings", "foods_feedbacks", "devices", "buildings_favorites", "buildings_last_visited"]
        const profileFields = profileRelations.map(x => x+".*").concat(["*"]);

        const deepFields: Record<string, { _limit: number }> = profileRelations.reduce((acc, x) => {
            acc[x] = { _limit: -1 };
            return acc;
        }, {} as Record<string, { _limit: number }>);

        let usersProfileId: string = user.profile as unknown as string
        console.log("usersProfileId: ",usersProfileId)
        if (usersProfileId){
            console.log("Okay lets load from remote")
            const profileCollectionHelper = new CollectionHelper<Profiles>("profiles")
            return await profileCollectionHelper.readItem(usersProfileId, {
                fields: profileFields,
                deep: deepFields,
            });
        }
    }
    return undefined;
}

export async function updateProfileRemote(id: string | number, profile: Partial<Profiles>){
    console.log("updateProfileRemote")
    console.log("id: ", id)
    console.log("profile: ", profile)
    const profileCollectionHelper = new CollectionHelper<Profiles>("profiles")
    let answer = await profileCollectionHelper.updateItem(id, profile);
    console.log("answer: ",answer)
    return answer
}

export function useSynchedProfile(): [(Partial<Profiles>), ((newValue: Partial<Profiles>, timestamp?: number) => Promise<(boolean | void)>), (number | undefined)] {
    const [resourceOnly, setResource, resourceRaw, setResourceRaw] = useSynchedResourceSingleRaw<Partial<Profiles>>(PersistentStore.profile);
    const isServerOnline = useIsServerOnline()
    const isCurrentUserAnonymous = useIsCurrentUserAnonymous();

    let lastUpdate = resourceRaw?.lastUpdate;
    let usedSetResource: (newValue: Partial<Profiles>, timestamp?: number) => Promise<(boolean | void)> = async (newValue, timestamp) => {
        return setResource(newValue, timestamp);
    };
    if(isServerOnline && !isCurrentUserAnonymous){
        usedSetResource = async (newValue: Partial<Profiles>, timestamp?: number) => {
            console.log("useSynchedProfile setProfile online");
            const profile_id = newValue?.id || resourceOnly?.id;
            console.log("profile_id: ", profile_id)
            if (!!profile_id) {
                try {
                    let remoteAnswer = await updateProfileRemote(profile_id, newValue);
                    console.log("remoteAnswer: ", remoteAnswer)
                    setResource(newValue, timestamp);
                    return true;
                } catch (err) {
                    console.log(err)
                    return false;
                }
            } else {
                setResource(newValue, timestamp);
                return true;
            }
        }
    }
    let usedResource = resourceOnly;
    if(!usedResource){
        usedResource = {}
    }
    return [usedResource, usedSetResource, lastUpdate]
}

export function useNickname(): [string | undefined, ((newValue: string | undefined) => Promise<boolean | void>)]{
    const [profile, setProfile, lastUpdateProfile] = useSynchedProfile()
    async function setNickname(nextValue: string | undefined){
        console.log("SettingsRowProfileNickname onSave", nextValue)
        return await setProfile({...profile, nickname: nextValue})
    }
    const nickname = profile?.nickname
    return [nickname, setNickname]
}

/**
 * Retrieves the language code from the user's profile.
 * @throws {Error} Throws an error if there is an issue retrieving the language code.
 * @returns {string} The language code from the user's profile, or the default language code if not found.
 */
export function useProfileLanguageCode(){
    let default_language_code = DirectusTranslationHelper.DEFAULT_LANGUAGE_CODE;
    const [profile, setProfile] = useSynchedProfile();
    return profile?.language || default_language_code;
}

/**
 * Returns a tuple containing the current canteen and a function to set a new canteen.
 * @returns {[Canteens | undefined, ((newValue: Canteens) => void)]} - A tuple containing the current canteen and a function to set a new canteen.
 * @throws {Error} - If an error occurs while setting the canteen.
 */
export function useSynchedProfileCanteen(): [Canteens | undefined, ((newValue: Canteens) => void)]{
    const [profile, setProfile] = useSynchedProfile();
    const [canteenDict, setCanteenDict] = useSynchedCanteensDict();

    let canteen_id = profile?.canteen as number;
    let canteen = undefined
    if(canteenDict && canteen_id){
        canteen = canteenDict[canteen_id];
    }

    const setCanteen = (canteen: Canteens) => {
        profile.canteen = canteen.id;
        return setProfile(profile);
    }
    return [canteen, setCanteen];
}

export function useIsProfileSetupComplete(): boolean {
    const [profileCanteen, setProfileCanteen] = useSynchedProfileCanteen();

    const requiredSetVariables = [profileCanteen]
    for(let i=0; i<requiredSetVariables.length; i++){
        let requiredVariable = requiredSetVariables[i];
        if(!requiredVariable){
            return false;
        }
    }

    return true;
}

function getDemoResource(): Profiles {
    const undefinedBuildingsFavorites: ProfilesBuildingsFavorites[] = [];
    const undefinedBuildingsLastVisited: ProfilesBuildingsLastVisited[] = [];
    const undefinedDevices: Devices[] = [];
    const undefinedFoodsFeedbacks: FoodsFeedbacks[] = [];
    const undefinedMarkings: ProfilesMarkings[] = [];

    return {
        //avatar?: unknown;
        //canteen?: undefined
        //course_timetable?: unknown;
        credit_balance: 12.34,
        date_created: new Date().toISOString(),
        date_updated: new Date().toISOString(),
        id: 123,
        //language?: string;
        nickname: "Demo User",
        //sort?: number;
        status: "",
        //user_created?: string & DirectusUsers;
        //user_updated?: string & DirectusUsers;
        buildings_favorites: undefinedBuildingsFavorites,
        buildings_last_visited: undefinedBuildingsLastVisited,
        devices: undefinedDevices,
        foods_feedbacks: undefinedFoodsFeedbacks,
        markings: undefinedMarkings,
    }
}

export function getEmptyProfile(): Partial<Profiles>{
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
        nickname: "Gast"
    }
}