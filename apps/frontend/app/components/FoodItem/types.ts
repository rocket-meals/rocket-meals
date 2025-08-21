import { SHEET_COMPONENTS } from '@/app/(app)/foodoffers';
import { DatabaseTypes } from 'repo-depkit-common';

export interface FoodItemProps {
	item: DatabaseTypes.Foodoffers;
	canteen: DatabaseTypes.Canteens;
	// handleNavigation: (id: string, foodId: string) => void;
	handleMenuSheet: (sheet: keyof typeof SHEET_COMPONENTS) => void;
	handleImageSheet: (id: string) => void;
	handleEatingHabitsSheet: (sheet: keyof typeof SHEET_COMPONENTS) => void;
	// setItemMarkings: React.Dispatch<React.SetStateAction<DatabaseTypes.FoodoffersMarkings[]>>;
	setSelectedFoodId: React.Dispatch<React.SetStateAction<string>>;
}
