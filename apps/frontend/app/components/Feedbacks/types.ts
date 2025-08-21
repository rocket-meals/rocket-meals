import { DatabaseTypes } from 'repo-depkit-common';

export interface FeedbacksProps {
	foodDetails: DatabaseTypes.Foods;
	canteenId?: string;
	offerId: string;
}
