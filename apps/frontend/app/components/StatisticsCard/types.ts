import { DatabaseTypes } from 'repo-depkit-common';

export interface StatisticsCardProps {
	food: DatabaseTypes.Foods;
	handleImageSheet: () => void;
	setSelectedFoodId: React.Dispatch<React.SetStateAction<string>>;
}
