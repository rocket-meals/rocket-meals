import { CanteensFeedbacksLabels, CanteensFeedbacksLabelsTranslations, FoodsFeedbacksLabelsTranslations } from "@rocket-meals/shared";

export interface CanteenFeedbackLabelProps {
  label: CanteensFeedbacksLabels;
  date: string;
}

export interface ModifiedCanteensFeedbacksLabelsEntries {
  count: string;
  like: boolean;
}
