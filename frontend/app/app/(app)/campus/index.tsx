import {ListRenderItemInfo} from 'react-native';
import {MySafeAreaView} from '@/components/MySafeAreaView';
import {MyGridFlatList} from '@/components/grid/MyGridFlatList';
import {Buildings, DirectusFiles} from '@/helper/database/databaseTypes/types';
import {MyCardForResourcesWithImage} from '@/components/card/MyCardForResourcesWithImage';
import {useMyGridListDefaultColumns} from '@/components/grid/MyGridFlatListDefaultColumns';
import {getBuildingLocationType, useSynchedBuildingsDict} from '@/states/SynchedBuildings';
import {router, useGlobalSearchParams, useLocalSearchParams} from "expo-router";
import {SortType, useSynchedSortType} from "@/states/SynchedSortType";
import {PersistentStore} from "@/helper/syncState/PersistentStore";
import {useEstimatedLocationUponSelectedCanteen, useProfileLanguageCode} from "@/states/SynchedProfile";
import {LocationType} from "@/helper/geo/LocationType";
import {DistanceHelper} from "@/helper/geo/DistanceHelper";
import DistanceBadge from "@/components/distance/DistanceBadge";
import React from "react";
import {
	filterAndSortResourcesBySearchValue,
	useSearchTextFromGlobalSearchParams
} from "@/compositions/header/HeaderSearchButtonParams";
import {useCampusAreaColor} from "@/states/SynchedAppSettings";

function getBuildingName(building: Buildings, languageCode: string): string | null {
	if(building.alias){
		return building.alias;
	}
	return building.id;
}

function sortByBuildingName(resources: Buildings[], buildingsDict: Record<string, Buildings> | undefined, languageCode: string) {
	resources.sort((a, b) => {
		let nameA = getBuildingName(a, languageCode);
		let nameB = getBuildingName(b, languageCode);
		if(nameA && nameB){
			return nameA.localeCompare(nameB);
		} else if (nameA){
			return -1;
		} else if (nameB){
			return 1;
		}
	});
	return resources;
}

function sortByDistance(resources: Buildings[], currentLocation: LocationType) {
	resources.sort((a, b) => {
		let locationA = getBuildingLocationType(a);
		let locationB = getBuildingLocationType(b);

		if(locationA && locationB){
			let distanceA = DistanceHelper.getDistanceOfLocationInM(currentLocation, locationA);
			let distanceB = DistanceHelper.getDistanceOfLocationInM(currentLocation, locationB);
			return distanceA - distanceB;
		} else if(locationA){
			return -1;
		} else if(locationB){
			return 1;
		} else {
			return 0;
		}
	});
	return resources;

}

function sortBuildings(resources: Buildings[], buildingsDict: Record<string, Buildings> | undefined, sortType: SortType, languageCode: string, currentLocation: LocationType | null) {
	let copiedResources = [...resources];
	if(sortType === SortType.intelligent){
		// sort first by name, then by eating habits, then by favorite
		let sortOrders = [SortType.alphabetical, SortType.distance, SortType.favorite];
		for(const sortOrder of sortOrders){
			copiedResources = sortBuildings(copiedResources, buildingsDict, sortOrder, languageCode, currentLocation);
		}
	} else if(sortType === SortType.alphabetical){
		copiedResources = sortByBuildingName(copiedResources, buildingsDict, languageCode);
	} else if(sortType === SortType.distance){
		if(currentLocation){
			copiedResources = sortByDistance(copiedResources, currentLocation);
		}
	}
	/**
	 else if(sortType === SortType.favorite){
	 copiedResources = sortByFavorite(copiedResources, foodFeedbacksDict);
	 }
	 */
	return copiedResources;
}

export const SEARCH_PARAM_BUILDINGS_ID = 'buildings_id';

export function useBuildingIdFromLocalSearchParams() {
	const params = useGlobalSearchParams<{ [SEARCH_PARAM_BUILDINGS_ID]?: string }>();
	return params[SEARCH_PARAM_BUILDINGS_ID];
}

export default function BuildingsScreen() {
	return <BuildingsScreenIndex />
}

function filterForSearchValue(resources: Buildings[], searchValue: string | undefined | null, buildingsDict: Record<string, Buildings> | undefined, languageCode: string) {
	return filterAndSortResourcesBySearchValue(resources, searchValue, (resource) => {
		return getBuildingName(resource, languageCode)
	});
}

function BuildingsScreenIndex() {
	const [buildingsDict, setBuildingsDict, lastUpdateBuildings, updateBuildingsFromServer] = useSynchedBuildingsDict()

	const initialAmountColumns = useMyGridListDefaultColumns();

	const searchValue = useSearchTextFromGlobalSearchParams();
	const [sortType, setSortType] = useSynchedSortType(PersistentStore.sortConfigBuildings);
	const [languageCode, setLanguageCode] = useProfileLanguageCode()
	const estimatedLocation: LocationType | null = useEstimatedLocationUponSelectedCanteen();

	const campusColor = useCampusAreaColor();

	const resources: Buildings[] = []
	if (buildingsDict) {
		const buildingsKeys = Object.keys(buildingsDict)
		for (let i = 0; i < buildingsKeys.length; i++) {
			const key = buildingsKeys[i];
			const building = buildingsDict[key];
			if (building) {
				resources.push(building)
			}
		}
	}

	let usedResources = resources
	if (usedResources) {
		usedResources = sortBuildings(usedResources, buildingsDict, sortType, languageCode, estimatedLocation)
		usedResources = filterForSearchValue(usedResources, searchValue, buildingsDict, languageCode)
	}

  type DataItem = { key: string; data: Buildings }

  const data: DataItem[] = []
  if (usedResources) {
  	for (let i = 0; i < usedResources.length; i++) {
  		const resource = usedResources[i];
  		data.push({
  			key: resource.id + '', data: resource
  		})
  	}
  }

  const renderItem = (info: ListRenderItemInfo<DataItem>) => {
  	const {item, index} = info;
  	const resource = item.data;

	  let location = getBuildingLocationType(resource)
	  let distance = null;
	  let distanceBadge = null;
	  if(location && estimatedLocation){
		  distance = DistanceHelper.getDistanceOfLocationInM(estimatedLocation, location)
		  distanceBadge = <DistanceBadge color={campusColor} distanceInMeter={distance} />
	  }

	  let title: string | null | undefined = getBuildingName(resource, languageCode)


  	let assetId: string | DirectusFiles | null | undefined = undefined
  	let image_url: string | undefined = undefined
  	let thumb_hash: string | undefined = undefined
  	if (typeof resource !== 'string') {
  		if (resource?.image) {
  			assetId = resource.image
  		}
  		if (resource?.image_remote_url) {
  			image_url = resource.image_remote_url
  		}
  		if (resource?.image_thumb_hash) {
  			thumb_hash = resource.image_thumb_hash
  		}
  		if (resource?.alias) {
  			title = resource.alias
  		}
  	}

  	return (
  		<MyCardForResourcesWithImage
			separatorColor={campusColor}
  			key={item.key}
  			heading={title}
  			thumbHash={thumb_hash}
  			image_url={image_url}
			bottomRightComponent={
				distanceBadge
			}
  			assetId={assetId}
  			onPress={() => {
				  router.push(`/(app)/buildings/details/?${SEARCH_PARAM_BUILDINGS_ID}=${resource.id}`)
			}}
  			accessibilityLabel={title}
			imageUploaderConfig={{
				resourceId: resource.id,
				resourceCollectionName: 'buildings',
				onImageUpdated: async () => {
					await updateBuildingsFromServer();
				}
			}}
  		/>
  	);
  }

  return (
  	<MySafeAreaView>
  		<MyGridFlatList
  			data={data}
  			renderItem={renderItem}
  			amountColumns={initialAmountColumns}
  		/>
  	</MySafeAreaView>
  );
}