import { DatabaseTypes } from 'repo-depkit-common';

export interface NotificationSheetProps {
	closeSheet: () => void;
	previousFeedback: DatabaseTypes.FoodsFeedbacks;
	foodDetails: DatabaseTypes.Foods;
}
