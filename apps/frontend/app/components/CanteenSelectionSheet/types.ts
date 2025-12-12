import { DatabaseTypes } from 'repo-depkit-common';

export interface CanteenSelectionSheetProps {
        closeSheet: () => void;
        useBottomSheetScrollView?: boolean;
}

export interface CanteenProps extends DatabaseTypes.Canteens {
	imageAssetId: string;
	image_url: string;
}
