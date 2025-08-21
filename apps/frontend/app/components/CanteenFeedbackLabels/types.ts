import { DatabaseTypes } from 'repo-depkit-common';

export interface CanteenFeedbackLabelProps {
	label: DatabaseTypes.CanteensFeedbacksLabels;
	date: string;
}

export interface ModifiedCanteensFeedbacksLabelsEntries {
	count: string;
	like: boolean;
}
