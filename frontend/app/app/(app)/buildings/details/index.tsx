import {MySafeAreaView} from '@/components/MySafeAreaView';
import React from 'react';
import BuildingDetails from "@/compositions/buildings/BuildingDetails";
import {useBuildingIdFromLocalSearchParams} from "@/app/(app)/campus";
import {useCampusAreaColor} from "@/states/SynchedAppSettings";

export default function BuildingsDetails() {
	let buildings_id: string | undefined = useBuildingIdFromLocalSearchParams();

	return (
		<MySafeAreaView>
			{buildings_id && (
				<BuildingDetails buildingId={buildings_id}/>
			)}
		</MySafeAreaView>
	)
}