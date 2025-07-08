import { Foods, FoodsFeedbacks } from "@rocket-meals/shared";

export interface NotificationSheetProps {
  closeSheet: () => void;
  previousFeedback: FoodsFeedbacks;
  foodDetails: Foods;
}
