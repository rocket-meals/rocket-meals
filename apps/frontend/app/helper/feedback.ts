import { DatabaseTypes } from 'repo-depkit-common';
import { FoodFeedbackHelper } from '@/redux/actions/FoodFeedbacks/FoodFeedbacks';
import { DELETE_FOOD_FEEDBACK_LOCAL, UPDATE_FOOD_FEEDBACK_LOCAL } from '@/redux/Types/types';
import { Dispatch } from 'react';

type FeedbackPayload = {
	foodId: string;
	profileId: string | undefined;
	userId: string;
	rating: number | null;
	canteenId: string | undefined;
	previousFeedback: any;
	dispatch: Dispatch<any>;
	setWarning?: (val: boolean) => void;
};

export const handleFoodRating = async ({ foodId, profileId, userId, rating, canteenId, previousFeedback, dispatch, setWarning }: FeedbackPayload) => {
	if (!userId) {
		setWarning?.(true);
		return;
	}

	try {
		const foodFeedbackHelper = new FoodFeedbackHelper();

		const updateFeedbackResult = (await foodFeedbackHelper.updateFoodFeedback(foodId, profileId || '', { ...previousFeedback, rating, canteen: canteenId })) as DatabaseTypes.FoodsFeedbacks;

		dispatch({
			type: updateFeedbackResult?.id ? UPDATE_FOOD_FEEDBACK_LOCAL : DELETE_FOOD_FEEDBACK_LOCAL,
			payload: updateFeedbackResult || previousFeedback?.id,
		});
	} catch (e) {
		console.error('Error creating feedback:', e);
	}
};
