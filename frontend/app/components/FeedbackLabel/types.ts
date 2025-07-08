import { FoodsFeedbacksLabelsTranslations } from "@rocket-meals/shared";

export interface FeedbackLabelProps {
  label: Array<FoodsFeedbacksLabelsTranslations>;
  imageUrl?: string | null | undefined;
  icon?: string;
  labelEntries: any;
  foodId: string;
  offerId: string;
}
