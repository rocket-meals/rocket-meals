import {useFoodsAreaColor, useSynchedAppSettings} from "@/states/SynchedAppSettings";
import {Foods} from "@/helper/database/databaseTypes/types";
import React from "react";
import {MyRatingButton, RatingType} from "@/components/buttons/MyRatingButton";
import {AccountRequiredTouchableOpacity} from "@/components/buttons/AccountRequiredTouchableOpacity";
import {useSynchedOwnFoodFeedback} from "@/states/SynchedFoodFeedbacks";
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";

export const useFeedbackRatingType = (): RatingType => {
	const [appSettings] = useSynchedAppSettings();
	const ratingType = appSettings?.foods_ratings_type;
	let feedbackRatingType: RatingType = RatingType.disabled
	if(ratingType === 'favorite'){
		feedbackRatingType = RatingType.favorite
	} else if(ratingType === 'hearts'){
		feedbackRatingType = RatingType.hearts
	} else if(ratingType === 'likes'){
		feedbackRatingType = RatingType.likes
	} else if(ratingType === 'stars'){
		feedbackRatingType = RatingType.stars
	}
	return feedbackRatingType
}



/**
 *
 * @param food
 * @param showOnlyMax if true, only the max button is shown
 * @param borderRadius the border radius
 * @constructor
 */
export const FoodFeedbackRating = ({food, showQuickAction, borderRadius}: {food: Foods, showQuickAction: boolean, borderRadius?: number}) => {
	let foods_ratings_type = useFeedbackRatingType();
	const usedFoodId = food.id;
	const [foodFeedback, setOwnRating, setOwnComment, setOwnNotify, setOwnLabels] = useSynchedOwnFoodFeedback(food.id);
	const translation_set_rating = useTranslation(TranslationKeys.set_rating);

	const foodsAreaColor = useFoodsAreaColor();

	const rating: number | undefined | null = foodFeedback?.rating;

	return <AccountRequiredTouchableOpacity translationOfDesiredAction={translation_set_rating}>
		<MyRatingButton color={foodsAreaColor} borderRadius={borderRadius} rating={rating} showQuickAction={showQuickAction} ratingType={foods_ratings_type} setRating={setOwnRating} />
	</AccountRequiredTouchableOpacity>
}