import { DatabaseTypes } from 'repo-depkit-common';

export type Foodoffers = DatabaseTypes.Foodoffers;
export type FoodoffersMarkings = DatabaseTypes.FoodoffersMarkings;
export type ProfilesMarkings = DatabaseTypes.ProfilesMarkings;

export class MarkingHelper {

    static getDislikedMarkingIds(foodOffer: Foodoffers, profileMarkingsDict: Record<string, ProfilesMarkings>) {
        const aMarkingsIds = MarkingHelper.getFoodOfferMarkingIds(foodOffer);
        let dislikedMarkingIds: string[] = [];
        for (const marking_id of aMarkingsIds) {
            const profilesMarking: ProfilesMarkings = profileMarkingsDict[marking_id];
            if (profilesMarking) {
                const like = profilesMarking.like;
                if (like !== null && like !== undefined && like === false) {
                    dislikedMarkingIds.push(marking_id);
                }
            }
        }
        return dislikedMarkingIds;
    }

    static getLikedMarkingIds(foodOffer: Foodoffers, profileMarkingsDict: Record<string, ProfilesMarkings>) {
        const aMarkingsIds = MarkingHelper.getFoodOfferMarkingIds(foodOffer);
        let likedMarkingIds: string[] = [];
        for (const marking_id of aMarkingsIds) {
            const profilesMarking: ProfilesMarkings = profileMarkingsDict[marking_id];
            if (profilesMarking) {
                const like = profilesMarking.like;
                if (like !== null && like !== undefined && like === true) {
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

    static filterDislikedMarkings(
        foodOfferMarkings: FoodoffersMarkings[] | null | undefined,
        profileMarkings: ProfilesMarkings[] | null | undefined
    ): FoodoffersMarkings[] {
        if (!foodOfferMarkings || !profileMarkings) {
            return [];
        }
        return foodOfferMarkings.filter((mark) => {
            const markId = typeof mark.markings_id === 'string'
                ? mark.markings_id
                : (mark.markings_id as any)?.id;
            return profileMarkings.some((profileMarking) => {
                const profileId = typeof profileMarking.markings_id === 'string'
                    ? profileMarking.markings_id
                    : (profileMarking.markings_id as any)?.id;
                return profileId === markId && profileMarking.like === false;
            });
        });
    }

    static getFoodOfferMarkingIds(foodOffer: Foodoffers | null | undefined) {
        const aMarkingsRelation = foodOffer?.markings as FoodoffersMarkings[];
        let aMarkingsIds: string[] = [];
        if (aMarkingsRelation) {
            for (const marking of aMarkingsRelation) {
                const markingIsOrMarking = marking.markings_id;
                if (typeof markingIsOrMarking === 'string') {
                    aMarkingsIds.push(markingIsOrMarking);
                }
                if (typeof markingIsOrMarking === 'object' && markingIsOrMarking !== null) {
                    aMarkingsIds.push((markingIsOrMarking as any).id);
                }
            }
        }
        return aMarkingsIds;
    }
}
