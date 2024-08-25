import {ItemsServiceCreator} from "../helpers/ItemsServiceCreator";
import {CollectionNames} from "../helpers/CollectionNames";
import {Foods, FoodsFeedbacks} from "../databaseTypes/types";
import {ApiContext} from "../helpers/ApiContext";

export class FoodRatingCalculator{

	static MAX_RATING_VALUE = 5;
	static MIN_RATING_VALUE = 1;

	private apiContext: ApiContext;

	constructor(apiContext: ApiContext){
		this.apiContext = apiContext;
	}

	public async getFoodIdsFromFoodFeedbackIds(food_feedback_ids: string[]){
		let itemsServiceCreator = new ItemsServiceCreator(this.apiContext);
		let foodfeedbacksService = await itemsServiceCreator.getItemsService<FoodsFeedbacks>(CollectionNames.FOODS_FEEDBACKS);

		let food_id_dict: {[key: string]: boolean} = {}

		for(let food_feedback_id of food_feedback_ids){
			let food_feedback = await foodfeedbacksService.readOne(food_feedback_id);
			let food_id = food_feedback?.food;
			if(!!food_id && typeof food_id === "string"){
				food_id_dict[food_id] = true;
			}
		}

		return Object.keys(food_id_dict);
	}

	recalculateFoodIdsRatingsNonBlocking(food_ids: string[], ignore_food_feedback_ids?: string[]){
		for(let food_id of food_ids){
			// await // we do not want to block the deletion of the food_feedbacks
			this.recalculateFoodRating(food_id, ignore_food_feedback_ids).then(r => {
				// do nothing, we do not want to block the deletion of the food_feedbacks
			});
		}
	}

	private async getFoodFromId(food_id: string){
		let itemsServiceCreator = new ItemsServiceCreator(this.apiContext);
		let foodsService = await itemsServiceCreator.getItemsService<Foods>(CollectionNames.FOODS);
		return await foodsService.readOne(food_id);
	}

	static getNumberIfValueInRatingRange(value: number | null | undefined){
		if(value === null || value === undefined){
			return null;
		}
		if(FoodRatingCalculator.MIN_RATING_VALUE <= value && value <= FoodRatingCalculator.MAX_RATING_VALUE){
			return value;
		}
		return null;
	}

	static calculateFoodRating(food: Partial<Foods>, food_feedbacks: Partial<FoodsFeedbacks>[]){
		let sum_rating_values = 0;
		let rating_amount = 0;
		for(let food_feedback of food_feedbacks){
			let rating = food_feedback?.rating;
			const valid_rating = FoodRatingCalculator.getNumberIfValueInRatingRange(rating);
			if(valid_rating !== null){
				sum_rating_values += valid_rating;
				rating_amount++;
			}
		}

		let rating_average_legacy = food.rating_average_legacy || 0;
		let rating_amount_legacy = food.rating_amount_legacy || 0;

		let combined_rating_amount = rating_amount + rating_amount_legacy;

		if(combined_rating_amount > 0){

			let combined_rating_average = (sum_rating_values + rating_average_legacy * rating_amount_legacy) / combined_rating_amount;

			//console.log("recalculateFoodRating: food_id: "+food_id+" | sum: "+sum+" | rating_amount: "+rating_amount+" | rating_average: "+rating_average+" | food_feedbacks.length: "+food_feedbacks.length);

			return {
				rating_average: combined_rating_average,
				rating_amount: combined_rating_amount
			};

		} else {
			//console.log("recalculateFoodRating: food_id: "+food_id+" | rating_amount: "+rating_amount+" | food_feedbacks.length: "+food_feedbacks.length);
			// set for food both values to null
			return {
				rating_average: null,
				rating_amount: 0
			}
		}
	}

	async getFoodFeedbacksForFood(food_id: string){
		let itemsServiceCreator = new ItemsServiceCreator(this.apiContext);
		let foodfeedbacksService = await itemsServiceCreator.getItemsService<FoodsFeedbacks>(CollectionNames.FOODS_FEEDBACKS);

		let food_feedbacks: FoodsFeedbacks[] = [];
		try{
			food_feedbacks = await foodfeedbacksService.readByQuery({
				filter: {
					food: {
						_eq: food_id
					}
				},
				limit: -1
			})
		} catch (e){
			// When no feedbacks are found for the filter, we get an error:
		}
		return food_feedbacks;
	}

	private async recalculateFoodRating(food_id: string, ignore_food_feedback_ids?: string[]){
		//console.log("recalculateFoodRating: food_id: "+food_id);

		const food = await this.getFoodFromId(food_id);
		if(!food){
			console.error("recalculateFoodRating: food_id: "+food_id+" | food not found");
			return;
		}

		let ignore_food_feedbacks_ids_dict: {[key: string]: boolean} = {}
		if(!!ignore_food_feedback_ids){
			for(let ignore_food_feedback_id of ignore_food_feedback_ids){
				ignore_food_feedbacks_ids_dict[ignore_food_feedback_id] = true;
			}
		}

		let food_feedbacks: FoodsFeedbacks[] = await this.getFoodFeedbacksForFood(food_id);
		let filtered_food_feedbacks = food_feedbacks.filter(food_feedback => !ignore_food_feedbacks_ids_dict[food_feedback.id]);

		let {rating_average, rating_amount} = FoodRatingCalculator.calculateFoodRating(food, filtered_food_feedbacks);
		await this.updateFoodRating(food, rating_average, rating_amount);
	}

	private async updateFoodRating(food: Foods, rating_average: number | null, rating_amount: number){
		let itemsServiceCreator = new ItemsServiceCreator(this.apiContext);
		let foodsService = await itemsServiceCreator.getItemsService<Foods>(CollectionNames.FOODS);

		await foodsService.updateOne(food.id, {
			rating_average,
			rating_amount
		});
	}

}
