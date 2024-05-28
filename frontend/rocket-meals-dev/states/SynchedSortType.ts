import {useSyncState} from '@/helper/syncState/SyncState';

export enum SortType {
	none = 'none',
	alphabetical = 'alphabetical',
	favorite = 'favorite',
	publicRating = 'publicRating',
	date = 'date',
	distance = 'distance',
	freeRooms = 'freeRooms',
	intelligent = 'intelligent',
	eatingHabits = 'eatingHabits',
}

export const sortTypesForFood = [SortType.intelligent, SortType.favorite, SortType.eatingHabits, SortType.publicRating, SortType.alphabetical, SortType.none]
export const sortTypesApartments = [SortType.intelligent, SortType.freeRooms, SortType.distance, SortType.alphabetical, SortType.none]
export const sortTypesBuildings = [SortType.intelligent, SortType.distance, SortType.alphabetical, SortType.none]
export const sortTypesNews = [SortType.intelligent, SortType.date]

export function useSynchedSortType(
	synchKey: string
): [SortType, ((newValue: SortType | null) => Promise<(boolean | void)>)] {
	const [resourcesRaw, setResourcesRaw] = useSyncState<SortType>(synchKey);
	const usedSortType = resourcesRaw || SortType.intelligent

	return [usedSortType, setResourcesRaw]
}