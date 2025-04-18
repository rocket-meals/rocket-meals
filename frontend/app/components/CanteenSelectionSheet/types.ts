import { Canteens } from '@/constants/types';

export interface CanteenSelectionSheetProps {
  closeSheet: () => void;
}

export interface CanteenProps extends Canteens {
  imageAssetId: string;
  image_url: string;
}
