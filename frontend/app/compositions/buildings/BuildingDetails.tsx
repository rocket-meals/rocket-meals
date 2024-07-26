import {Buildings} from '@/helper/database/databaseTypes/types';
import React from 'react';
import {IconNames} from '@/constants/IconNames';
import {useSynchedBuildingsDict} from "@/states/SynchedBuildings";
import {DirectusTranslatedMarkdownWithCards} from "@/components/markdown/DirectusTranslatedMarkdownWithCards";
import {TranslationEntry} from "@/helper/translations/DirectusTranslationUseFunction";
import {DetailsComponent, DetailsComponentTabProps} from "@/components/detailsComponent/DetailsComponent";
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {MyScrollView} from "@/components/scrollview/MyScrollView";
import {SettingsRowGroup} from "@/components/settings/SettingsRowGroup";
import {SettingsRow} from "@/components/settings/SettingsRow";
import {useMyClipboard} from "@/helper/clipboardHelper/MyClipboardHelper";
import {CoordinateHelper} from "@/helper/geo/CoordinateHelper";
import {CommonSystemActionHelper} from "@/helper/device/CommonSystemActionHelper";
import {View} from "@/components/Themed";
import {MyButtonNavigationToLocation} from "@/components/buttons/MyButtonNavigationToLocation";
import NotFoundScreen from "@/app/+not-found";
import {useCampusAreaColor} from "@/states/SynchedAppSettings";

export default function BuildingDetails({ buildingId }: { buildingId: string }) {
	const [buildingsDict, setBuildingsDict] = useSynchedBuildingsDict()
	let building = buildingsDict?.[buildingId];

	const campusAreaColor = useCampusAreaColor();

	if(building && typeof building === 'object'){
		return <BuildingDetailsWithObject color={campusAreaColor} building={building} />
	} else {
		return <NotFoundScreen />
	}
}

function BuildingDetailsDescription({ building }: { building: Buildings }) {
	const translations = building?.translations

	if (typeof translations === 'undefined' || typeof translations === 'string') {
		return null;
	}

	let usedTranslations = translations as TranslationEntry[];

	return <DirectusTranslatedMarkdownWithCards field={'content'} translations={usedTranslations} />
}

export function getBuildingLocation(building: Buildings) {
	const coordinates = building.coordinates;
	if(!!coordinates){
		const location = CoordinateHelper.getLocation(coordinates);
		if(!!location){
			return location;
		}
	}
	return null;
}

function BuildingsInformation({ building }: { building: Buildings }) {
	const translation_open_navitation_to_location = useTranslation(TranslationKeys.open_navitation_to_location)
	const translation_coordinates = useTranslation(TranslationKeys.coordinates)
	const translation_copy_url = useTranslation(TranslationKeys.copy_url)
	const translation_copy = useTranslation(TranslationKeys.copy)
	const translation_year_of_construction = useTranslation(TranslationKeys.year_of_construction)
	const translation_unknown = useTranslation(TranslationKeys.unknown)

	const {copyText} = useMyClipboard();

	let buildingLocationInformation = undefined;
	const location = getBuildingLocation(building);
	if(!!location){
		buildingLocationInformation = <>
			<SettingsRow labelLeft={translation_open_navitation_to_location} accessibilityLabel={translation_open_navitation_to_location} leftIcon={IconNames.location_open_icon} onPress={() => {
				CommonSystemActionHelper.openMaps(location)
			}} />
			<SettingsRow rightIcon={IconNames.copy_icon} onPress={() => {
				copyText(CoordinateHelper.getLocationAsString(location));
			}} labelLeft={translation_coordinates} accessibilityLabel={translation_coordinates} labelRight={CoordinateHelper.getLocationAsString(location, true)} leftIcon={IconNames.location_icon} />
		</>
	}

	return <MyScrollView>
		<SettingsRowGroup>
			{buildingLocationInformation}
			<SettingsRow labelLeft={translation_year_of_construction} accessibilityLabel={translation_year_of_construction} labelRight={building.date_of_construction} leftIcon={"hard-hat"} />
			<SettingsRow labelLeft={translation_copy_url} accessibilityLabel={translation_copy_url} leftIcon={"link"} rightIcon={IconNames.copy_icon} onPress={() => {
				copyText(building.url);
			}} />
		</SettingsRowGroup>
	</MyScrollView>
}

function BuildingNavigationButton({ building, color }: { building: Buildings, color?: string }) {
	const location = getBuildingLocation(building);
	if(!!location) {
		return <MyButtonNavigationToLocation location={location} color={color}/>
	}
	return null;
}

export function BuildingDetailsWithObject({ building, additionalTabs, color }: { building: Buildings, additionalTabs?: DetailsComponentTabProps[], color?: string }) {

	const translation_description = useTranslation(TranslationKeys.description)
	const translation_information = useTranslation(TranslationKeys.information)

	let tabs: DetailsComponentTabProps[] = [
		{
			iconName: IconNames.fact_icon,
			color: color,
			accessibilityLabel: translation_information,
			text: translation_information,
			content: <BuildingsInformation building={building} />
		},
		{
			iconName: IconNames.description_icon,
			color: color,
			accessibilityLabel: translation_description,
			text: translation_description,
			content: <BuildingDetailsDescription building={building} />
		},
	]
	if(additionalTabs){
		tabs.push(...additionalTabs)
	}

	return (
		<DetailsComponent item={building} heading={
			building.alias
		}
		image={{
			assetId: building.image,
			image_url: building.image_remote_url,
		}}
		  subHeadingComponent={<View style={{flexDirection: 'row', justifyContent: 'space-between', flexWrap: "wrap"}}>
			  <View style={{ flex: 1, flexDirection: "row" }}>
				  <BuildingNavigationButton building={building} color={color} />
			  </View>
		  </View>
		}
	  tabs={tabs}
		/>
	)
}