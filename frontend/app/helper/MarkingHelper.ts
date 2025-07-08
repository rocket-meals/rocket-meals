import {Foodoffers, FoodoffersMarkings, ProfilesMarkings} from "@rocket-meals/shared";

export class MarkingHelper {

	static getDislikedMarkingIds(foodOffer: Foodoffers, profileMarkingsDict: Record<string, ProfilesMarkings>) {
		const aMarkingsIds = MarkingHelper.getFoodOfferMarkingIds(foodOffer);
		let dislikedMarkingIds: string[] = [];
		for(const marking_id of aMarkingsIds){
			const profilesMarking: ProfilesMarkings = profileMarkingsDict[marking_id];
			if(profilesMarking){
				const like = profilesMarking.like;
				if(like !== null && like !== undefined && like===false){
					dislikedMarkingIds.push(marking_id);
				}
			}
		}
		return dislikedMarkingIds;
	}

	static getLikedMarkingIds(foodOffer: Foodoffers, profileMarkingsDict: Record<string, ProfilesMarkings>) {
		const aMarkingsIds = MarkingHelper.getFoodOfferMarkingIds(foodOffer);
		let likedMarkingIds: string[] = [];
		for(const marking_id of aMarkingsIds){
			const profilesMarking: ProfilesMarkings = profileMarkingsDict[marking_id];
			if(profilesMarking){
				const like = profilesMarking.like;
				if(like !== null && like !== undefined && like===true){
					likedMarkingIds.push(marking_id);
				}
			}
		}
		return likedMarkingIds;
	}

	static areLikedEatingHabitsFoundInFoodOffer(foodOffer: Foodoffers, profileMarkingsDict: Record<string, ProfilesMarkings>) {
		const likedMarkingIds = MarkingHelper.getLikedMarkingIds(foodOffer, profileMarkingsDict);
		return likedMarkingIds.length > 0;
	}

	static areDislikedEatingHabitsFoundInFoodOffer(foodOffer: Foodoffers, profileMarkingsDict: Record<string, ProfilesMarkings>) {
		const dislikedMarkingIds = MarkingHelper.getDislikedMarkingIds(foodOffer, profileMarkingsDict);
		return dislikedMarkingIds.length > 0;
	}


	static getFoodOfferMarkingIds(foodOffer: Foodoffers | null | undefined) {
		const aMarkingsRelation = foodOffer?.markings as FoodoffersMarkings[]
		let aMarkingsIds: string[] = [];
		if(aMarkingsRelation){
			for(const marking of aMarkingsRelation){
				const markingIsOrMarking = marking.markings_id;
				if(typeof markingIsOrMarking === 'string'){
					aMarkingsIds.push(markingIsOrMarking);
				}
				if(typeof markingIsOrMarking === 'object' && markingIsOrMarking !== null){
					aMarkingsIds.push(markingIsOrMarking.id);
				}
			}
		}
		return aMarkingsIds;
	}
}