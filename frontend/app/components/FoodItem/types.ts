import { SHEET_COMPONENTS } from '@/app/(app)/foodoffers';
import {Foodoffers, Foods, FoodoffersMarkings, Canteens} from '@rocket-meals/shared';

export interface FoodItemProps {
  item: Foodoffers;
  canteen: Canteens;
  // handleNavigation: (id: string, foodId: string) => void;
  handleMenuSheet: (sheet: keyof typeof SHEET_COMPONENTS) => void;
  handleImageSheet: (id: string) => void;
  handleEatingHabitsSheet: (sheet: keyof typeof SHEET_COMPONENTS) => void;
  // setItemMarkings: React.Dispatch<React.SetStateAction<FoodoffersMarkings[]>>;
  setSelectedFoodId: React.Dispatch<React.SetStateAction<string>>;
}
