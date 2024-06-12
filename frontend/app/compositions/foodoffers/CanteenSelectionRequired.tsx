import React, {FunctionComponent} from 'react';
import {Heading, View} from '@/components/Themed';
import {useEditCanteenAccessibilityLabel} from '@/compositions/settings/SettingsRowProfileCanteen';
import {useSynchedProfileCanteen} from '@/states/SynchedProfile';
import {useSynchedCanteenById, useSynchedCanteensDict} from '@/states/SynchedCanteens';
import {CanteenSelectGridList} from '@/compositions/resourceGridList/canteenSelectGridList';

export function useIsValidProfileCanteenSelected(): boolean {
	const [profileCanteen, setProfileCanteen] = useSynchedProfileCanteen();
	return useIsValidCanteenId(profileCanteen?.id);
}

export function useIsValidCanteenId(canteen_id: string | undefined): boolean {
	const foundCanteen = useSynchedCanteenById(canteen_id);
	return !!foundCanteen;
}

interface AppState {

}
export const CanteenSelectionRequired: FunctionComponent<AppState> = ({...props}) => {
	const tooltip = useEditCanteenAccessibilityLabel();

	//                <MyButton
	//                     useOnlyNecessarySpace={true} accessibilityLabel={"Canteen"} leftIcon={IconNames.canteen_icon} {...props} onPress={onPress} />

	return (
		<View style={{
			width: '100%',
			height: '100%',
			alignItems: 'center',
			flex: 1
		}}
		>
			<View>
				<Heading>{tooltip}</Heading>
			</View>
			<View style={{
				width: '100%',
				height: '100%',
				alignItems: 'center',
				flex: 1
			}}
			>
				<CanteenSelectGridList />
			</View>
		</View>
	)
}
