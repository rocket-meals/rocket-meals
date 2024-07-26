import {PersistentStore} from '@/helper/syncState/PersistentStore';
import {Apartments, Buildings, Washingmachines} from '@/helper/database/databaseTypes/types';
import {useSynchedResourcesDictRaw} from '@/states/SynchedResource';
import {useIsDemo} from '@/states/SynchedDemo';
import {CollectionHelper} from '@/helper/database/server/CollectionHelper';
import {getBuildingLocationType, getDemoBuildings} from '@/states/SynchedBuildings';
import {LocationType} from "@/helper/geo/LocationType";
import {MyCacheHelperDeepFields, MyCacheHelperType} from "@/helper/cache/MyCacheHelper";

export const TABLE_NAME_APARTMENTS = 'apartments';
const cacheHelperDeepFields_apartments: MyCacheHelperDeepFields = new MyCacheHelperDeepFields([
	{
		field: '*',
		limit: -1,
		dependency_collections_or_enum: [TABLE_NAME_APARTMENTS],
	},
])
async function loadApartmentsFromServer(): Promise<Apartments[]> {
	const collectionHelper = new CollectionHelper<Apartments>(TABLE_NAME_APARTMENTS);
	const query = cacheHelperDeepFields_apartments.getQuery()
	return await collectionHelper.readItems(query);
}

export async function loadApartmentWithWashingMachinesFromServer(apartmentId: string): Promise<Apartments> {
	const collectionHelper = new CollectionHelper<Apartments>(TABLE_NAME_APARTMENTS);

	const fields = ['*', "washingmachines.*"];

	const query = {
		limit: -1,
		fields: fields,
		filter: {
			id: apartmentId
		}
	}

	return await collectionHelper.readItem(apartmentId, query);
}

export function useSynchedApartmentsDict(): [ Record<string, Apartments | null | undefined> | null | undefined, ((callback: (currentValue: (Record<string, Apartments | null | undefined> | null | undefined)) => Record<string, Apartments | null | undefined>, sync_cache_composed_key_local?: (string | undefined)) => void), cacheHelperObj: MyCacheHelperType]
{
	const [resourcesOnly, setResourcesOnly, resourcesRaw, setResourcesRaw] = useSynchedResourcesDictRaw<Apartments>(PersistentStore.apartments);
	const demo = useIsDemo()
	const sync_cache_composed_key_local = resourcesRaw?.sync_cache_composed_key_local;
	let usedResources = resourcesOnly;
	if (demo) {
		usedResources = getDemoApartments()
	}

	async function updateFromServer(sync_cache_composed_key_local?: string) {
		const resourceAsList = await loadApartmentsFromServer();
		const resourceAsDict = CollectionHelper.convertListToDict(resourceAsList, 'id')
		setResourcesOnly((currentValue) => {
			return resourceAsDict
		}, sync_cache_composed_key_local);
	}

	const cacheHelperObj: MyCacheHelperType = {
		sync_cache_composed_key_local: sync_cache_composed_key_local,
		updateFromServer: updateFromServer,
		dependencies: cacheHelperDeepFields_apartments.getDependencies()
	}

	return [usedResources, setResourcesOnly, cacheHelperObj]
}

export function getApartmentLocationType(apartment: Apartments, buildingsDict: Record<string, Buildings> | undefined): LocationType | null {
	let buildingA = buildingsDict?.[apartment?.building];
	return getBuildingLocationType(buildingA);
}

export function getDemoWashingmachines(): Washingmachines[] {
	const amountWashingmachines = 10
	const demoResources: Washingmachines[] = []

	for (let i = 0; i < amountWashingmachines; i++) {
		let date_finished: string | null | undefined = null;

		const date = new Date();
		if(i%2===1){
			// set in 2 minutes
			date.setMinutes(date.getMinutes() + (i));
		}
		date_finished = date.toISOString();
		const demoResource: Washingmachines = {
			id: i+'',
			alias: 'Washingmachine ' + i,
			date_finished: date_finished
		}
		demoResources.push(demoResource)
	}

	return demoResources


}

function getDemoApartments(): Record<string, Apartments> {
	const buildingsDict = getDemoBuildings()
	const demoBuildingsKeys = Object.keys(buildingsDict)
	const amountApartments = 500

	const demoResources: Record<string, Apartments> = {}

	let amountFreeApartments = 5
	let amountFreeApartmentsCounter = 0;
	for (let i = 0; i < amountApartments; i++) {
		const demoBuildingKey = demoBuildingsKeys[i%demoBuildingsKeys.length]
		let availableFrom = null;
		if(i%2===0 && amountFreeApartmentsCounter < amountFreeApartments){
			// add i days to the current date
			const date = new Date();
			date.setDate(date.getDate() + i*10);
			availableFrom = date.toISOString();
			amountFreeApartmentsCounter++;
		}
		const demoResource: Apartments = {
			id: i+'',
			washingmachines: getDemoWashingmachines(),
			available_from: availableFrom,
			building: demoBuildingKey
		}
		demoResources[demoResource.id] = demoResource
	}

	return demoResources
}