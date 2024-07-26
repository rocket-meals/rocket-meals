import {ListRenderItemInfo} from 'react-native';
import {MySafeAreaView} from '@/components/MySafeAreaView';
import {MyGridFlatList} from '@/components/grid/MyGridFlatList';
import {Apartments, Buildings, DirectusFiles} from '@/helper/database/databaseTypes/types';
import {MyCardForResourcesWithImage} from '@/components/card/MyCardForResourcesWithImage';
import {useMyGridListDefaultColumns} from '@/components/grid/MyGridFlatListDefaultColumns';
import {useSynchedBuildingsDict} from '@/states/SynchedBuildings';
import {getApartmentLocationType, useSynchedApartmentsDict} from '@/states/SynchedApartments';
import {useHousingAreaColor, useSynchedAppSettings} from "@/states/SynchedAppSettings";
import {useEstimatedLocationUponSelectedCanteen, useProfileLanguageCode} from "@/states/SynchedProfile";
import {getDirectusTranslationUnsafe, TranslationEntry} from "@/helper/translations/DirectusTranslationUseFunction";
import {View, Text} from "@/components/Themed";
import {MyCardDefaultBorderRadius} from "@/components/card/MyCard";
import {router} from "expo-router";
import {SortType, useSynchedSortType} from "@/states/SynchedSortType";
import {PersistentStore} from "@/helper/syncState/PersistentStore";
import {LocationType} from "@/helper/geo/LocationType";
import {DistanceHelper} from "@/helper/geo/DistanceHelper";
import React from "react";
import DistanceBadge from "@/components/distance/DistanceBadge";
import {FreeRoomBadge} from "@/components/housing/FreeRoomBadge";
import {SEARCH_PARAM_APARTMENTS_ID} from "@/app/(app)/housing/apartment";
import {ThemedMarkdownWithCards} from "@/components/markdown/ThemedMarkdownWithCards";
import {
	filterAndSortResourcesBySearchValue,
	useSearchTextFromGlobalSearchParams
} from "@/compositions/header/HeaderSearchButtonParams";

function useHousingAdditionalInformationMarkdown(): string |null {
	const [appSettings] = useSynchedAppSettings();
	let [languageCode, setLanguage] = useProfileLanguageCode();
	let translations = appSettings?.housing_translations
	let usedTranslations = translations || [] as TranslationEntry[]
	let translation = getDirectusTranslationUnsafe(languageCode, usedTranslations, "content")
	return translation
}

function getApartmentName(apartment: Apartments, buildingsDict: Record<string, Buildings> | undefined, languageCode: string): string | null {
	const building_id = apartment.building
	if(building_id && buildingsDict){
		let building = buildingsDict[building_id];
		if(building){
			if(building.alias){
				return building.alias;
			}
		}
	}
	return apartment.id;
}

function sortByApartmentName(resources: Apartments[], buildingsDict: Record<string, Buildings> | undefined, languageCode: string) {
	resources.sort((a, b) => {
		let nameA = getApartmentName(a, buildingsDict, languageCode);
		let nameB = getApartmentName(b, buildingsDict, languageCode);
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

function sortByAvailableFromOldestDateFirst(resources: Apartments[]) {
	resources.sort((a, b) => {
		let availableFromA = a.available_from;
		let availableFromB = b.available_from;
		let availableFromA_asDate = availableFromA ? new Date(availableFromA) : null;
		let availableFromB_asDate = availableFromB ? new Date(availableFromB) : null;

		// oldest first - since rooms which will be available far in the future are not interesting
		if(availableFromA_asDate && availableFromB_asDate){
			return availableFromA_asDate.getTime() - availableFromB_asDate.getTime()
		} else if(availableFromA_asDate){
			return -1;
		} else if(availableFromB_asDate){
			return 1;
		}
		return 0;
	});
	return resources;

}

function sortByDistance(resources: Apartments[], buildingsDict: Record<string, Buildings> | undefined, currentLocation: LocationType) {
	resources.sort((a, b) => {
		if(a.building && b.building && buildingsDict){
			let locationA = getApartmentLocationType(a, buildingsDict);
			let locationB = getApartmentLocationType(b, buildingsDict);

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
		}
		return 0;
	});
	return resources;

}



function sortApartments(resources: Apartments[], buildingsDict: Record<string, Buildings> | undefined, sortType: SortType, languageCode: string, currentLocation: LocationType | null) {
	let copiedResources = [...resources];
	if(sortType === SortType.intelligent){
		// sort first by name, then by eating habits, then by favorite
		let sortOrders = [SortType.alphabetical, SortType.distance, SortType.freeRooms, SortType.favorite];
		for(const sortOrder of sortOrders){
			copiedResources = sortApartments(copiedResources, buildingsDict, sortOrder, languageCode, currentLocation);
		}
	} else if(sortType === SortType.alphabetical){
		copiedResources = sortByApartmentName(copiedResources, buildingsDict, languageCode);
	} else if(sortType === SortType.distance){
		if(currentLocation){
			copiedResources = sortByDistance(copiedResources, buildingsDict, currentLocation);
		}
	} else if(sortType === SortType.freeRooms){
		copiedResources = sortByAvailableFromOldestDateFirst(copiedResources);
	}
	/**
	 else if(sortType === SortType.favorite){
	 copiedResources = sortByFavorite(copiedResources, foodFeedbacksDict);
	 }
	 */
	return copiedResources;
}


function filterForSearchValue(resources: Apartments[], searchValue: string | undefined | null, buildingsDict: Record<string, Buildings> | undefined, languageCode: string) {
	return filterAndSortResourcesBySearchValue(resources, searchValue, (resource) => {
		return getApartmentName(resource, buildingsDict, languageCode);
	});
}

export default function HousingScreen() {
	const [apartmentsDict, setApartmentsDict] = useSynchedApartmentsDict()
	const [buildingsDict, setBuildingsDict, lastUpdateBuildings, updateBuildingsFromServer] = useSynchedBuildingsDict()
	const additionalInformationMarkdown = useHousingAdditionalInformationMarkdown()

	const searchValue = useSearchTextFromGlobalSearchParams();
	const [sortType, setSortType] = useSynchedSortType(PersistentStore.sortConfigApartments);
	const [languageCode, setLanguageCode] = useProfileLanguageCode()
	const estimatedLocation: LocationType | null = useEstimatedLocationUponSelectedCanteen();

	const initialAmountColumns = useMyGridListDefaultColumns();

	const housingAreaColor = useHousingAreaColor();

	const resources: Apartments[] = []
	if (apartmentsDict) {
		const buildingsKeys = Object.keys(apartmentsDict)
		for (let i = 0; i < buildingsKeys.length; i++) {
			const key = buildingsKeys[i];
			const apartment = apartmentsDict[key];
			if(apartment){
				resources.push(apartment)
			}
		}
	}

	let usedResources = resources
	if (usedResources) {
		usedResources = sortApartments(usedResources, buildingsDict, sortType, languageCode, estimatedLocation)
		usedResources = filterForSearchValue(usedResources, searchValue, buildingsDict, languageCode)
	}

	type DataItem = { key: string; data: Apartments }

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

		let location = getApartmentLocationType(resource, buildingsDict)
		let distance = null;
		let distanceBadge = null;
		if(location && estimatedLocation){
			distance = DistanceHelper.getDistanceOfLocationInM(estimatedLocation, location)
			distanceBadge = <DistanceBadge color={housingAreaColor} distanceInMeter={distance} />
		}

		let title: string | null | undefined = getApartmentName(resource, buildingsDict, languageCode)
		let assetId: string | DirectusFiles | null | undefined = undefined
		let image_url: string | undefined = undefined
		let thumb_hash: string | undefined = undefined

		let building = undefined
		let imageUploaderConfig = undefined
		if (!!buildingsDict && resource.building && typeof resource.building === 'string') {
			building = buildingsDict[resource.building]

			if (typeof building !== 'string') {
				if (building?.image) {
					assetId = building.image
				}
				if (building?.image_remote_url) {
					image_url = building.image_remote_url
				}
				if (building?.image_thumb_hash) {
					thumb_hash = building.image_thumb_hash
				}
			}

			imageUploaderConfig = {
				resourceId: resource.building,
				resourceCollectionName: 'buildings',
				onImageUpdated: async () => {
					await updateBuildingsFromServer();
				}
			}
		}

		return (
			<MyCardForResourcesWithImage
				separatorColor={housingAreaColor}
				key={item.key}
				heading={title}
				thumbHash={thumb_hash}
				image_url={image_url}
				assetId={assetId}
				topLeftComponent={
					<FreeRoomBadge apartment={resource} />
				}
				bottomRightComponent={
					distanceBadge
				}
				onPress={() => {
					router.push(`/(app)/housing/apartment/?${SEARCH_PARAM_APARTMENTS_ID}=${resource.id}`)
				}}
				accessibilityLabel={title}
				imageUploaderConfig={imageUploaderConfig}
			/>
		);
	}

	function renderAdditionalInformation() {
		if(!!additionalInformationMarkdown){
			const borderRaidus = MyCardDefaultBorderRadius
			return (
				<View style={{padding: 10, width: '100%', borderBottomLeftRadius: borderRaidus, borderBottomRightRadius: borderRaidus, height: "100%"}}>
					<ThemedMarkdownWithCards buttonAndLinkColor={housingAreaColor} markdown={additionalInformationMarkdown} />
				</View>
			)
		}
	}

	return (
		<MySafeAreaView>
			<MyGridFlatList
				flatListProps={{
					ListHeaderComponent: renderAdditionalInformation()
				}}
				data={data}
				renderItem={renderItem}
				amountColumns={initialAmountColumns}
			/>
		</MySafeAreaView>
	);
}