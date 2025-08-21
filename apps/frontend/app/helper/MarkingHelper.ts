import { DatabaseTypes } from 'repo-depkit-common';

export class MarkingHelper {
	static getDislikedMarkingIds(
		foodOffer: DatabaseTypes.Foodoffers,
		profileMarkingsDict: Record<string, DatabaseTypes.ProfilesMarkings>
	) {
		const aMarkingsIds = MarkingHelper.getFoodOfferMarkingIds(foodOffer);
		const dislikedMarkingIds: string[] = [];
		for (const marking_id of aMarkingsIds) {
			const profilesMarking: DatabaseTypes.ProfilesMarkings =
				profileMarkingsDict[marking_id];
			if (profilesMarking) {
				const like = profilesMarking.like;
				if (like !== null && like !== undefined && like === false) {
					dislikedMarkingIds.push(marking_id);
				}
			}
		}
		return dislikedMarkingIds;
	}

	static getLikedMarkingIds(
		foodOffer: DatabaseTypes.Foodoffers,
		profileMarkingsDict: Record<string, DatabaseTypes.ProfilesMarkings>
	) {
		const aMarkingsIds = MarkingHelper.getFoodOfferMarkingIds(foodOffer);
		const likedMarkingIds: string[] = [];
		for (const marking_id of aMarkingsIds) {
			const profilesMarking: DatabaseTypes.ProfilesMarkings =
				profileMarkingsDict[marking_id];
			if (profilesMarking) {
				const like = profilesMarking.like;
				if (like !== null && like !== undefined && like === true) {
					likedMarkingIds.push(marking_id);
				}
			}
		}
		return likedMarkingIds;
	}

	static areLikedEatingHabitsFoundInFoodOffer(
		foodOffer: DatabaseTypes.Foodoffers,
		profileMarkingsDict: Record<string, DatabaseTypes.ProfilesMarkings>
	) {
		const likedMarkingIds = MarkingHelper.getLikedMarkingIds(
			foodOffer,
			profileMarkingsDict
		);
		return likedMarkingIds.length > 0;
	}

	static areDislikedEatingHabitsFoundInFoodOffer(
		foodOffer: DatabaseTypes.Foodoffers,
		profileMarkingsDict: Record<string, DatabaseTypes.ProfilesMarkings>
	) {
		const dislikedMarkingIds = MarkingHelper.getDislikedMarkingIds(
			foodOffer,
			profileMarkingsDict
		);
		return dislikedMarkingIds.length > 0;
	}

	static getFoodOfferMarkingIds(
		foodOffer: DatabaseTypes.Foodoffers | null | undefined
	) {
		const aMarkingsRelation =
			foodOffer?.markings as DatabaseTypes.FoodoffersMarkings[];
		const aMarkingsIds: string[] = [];
		if (aMarkingsRelation) {
			for (const marking of aMarkingsRelation) {
				const markingIsOrMarking = marking.markings_id;
				if (typeof markingIsOrMarking === 'string') {
					aMarkingsIds.push(markingIsOrMarking);
				}
				if (typeof markingIsOrMarking === 'object' && markingIsOrMarking !== null) {
					aMarkingsIds.push(markingIsOrMarking.id);
				}
			}
		}
		return aMarkingsIds;
	}
}
