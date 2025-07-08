import { Foods } from '@rocket-meals/shared';

export interface StatisticsCardProps {
  food: Foods;
  handleImageSheet: () => void;
  setSelectedFoodId: React.Dispatch<React.SetStateAction<string>>;
}
