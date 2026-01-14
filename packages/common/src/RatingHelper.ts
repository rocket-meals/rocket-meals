export class RatingHelper {
  static readonly MAX_RATING = 5;
  static readonly MIN_RATING = 1;
  static readonly RATING_VALUE_AVG = (RatingHelper.MAX_RATING + RatingHelper.MIN_RATING) / 2;
  static readonly RATING_VALUE_LOW = RatingHelper.MIN_RATING;
  static readonly RATING_VALUE_HIGH = RatingHelper.MAX_RATING;
  static readonly RATING_VALUE_INVALID_LOW = RatingHelper.MIN_RATING - 1;
  static readonly RATING_VALUE_INVALID_HIGH = RatingHelper.MAX_RATING + 1;

  static isMaxRating(value: number | null | undefined): boolean {
    return RatingHelper.getNumberIfValueInRatingRange(value) === RatingHelper.MAX_RATING;
  }

  static getNumberIfValueInRatingRange(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (value < RatingHelper.MIN_RATING || value > RatingHelper.MAX_RATING) {
      return null;
    }

    return value;
  }
}
