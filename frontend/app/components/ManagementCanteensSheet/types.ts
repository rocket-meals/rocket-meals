import { Canteens } from '@/constants/types';

export interface ManagementCanteensSheetProps {
  closeSheet: () => void;
  handleSelectCanteen: (canteen: any) => void;
}

export interface CanteenProps extends Canteens {
  imageAssetId: string;
  image_url: string;
}
