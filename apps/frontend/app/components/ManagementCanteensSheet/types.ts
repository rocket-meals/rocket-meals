import { DatabaseTypes } from 'repo-depkit-common';

export interface ManagementCanteensSheetProps {
	closeSheet: () => void;
	handleSelectCanteen: (canteen: any) => void;
}

export interface CanteenProps extends DatabaseTypes.Canteens {
	imageAssetId: string;
	image_url: string;
}
