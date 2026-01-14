// small jest test
import { describe, expect, it } from '@jest/globals';
import { DatabaseTypes, RatingHelper } from 'repo-depkit-common';
import { FoodRatingCalculator } from '../FoodRatingCalculator';

describe('FoodRatingCalculator Test', () => {
  const RATING_VALUE_AVG = RatingHelper.RATING_VALUE_AVG;
  const RATING_VALUE_LOW = RatingHelper.RATING_VALUE_LOW;
  const RATING_VALUE_HIGH = RatingHelper.RATING_VALUE_HIGH;
  const RATING_VALUE_INVALID_LOW = RatingHelper.RATING_VALUE_INVALID_LOW;
  const RATING_VALUE_INVALID_HIGH = RatingHelper.RATING_VALUE_INVALID_HIGH;

  // Medium rating
  it('medium feedback rating', async () => {
    const rating_value = RATING_VALUE_AVG;
    let foodfeedbacks: Partial<DatabaseTypes.FoodsFeedbacks>[] = [
      {
        rating: rating_value,
      },
    ];

    let food: Partial<DatabaseTypes.Foods> = {};

    let result = FoodRatingCalculator.calculateFoodRating(food, foodfeedbacks);
    expect(result.rating_average).toBe(rating_value);
    expect(result.rating_amount).toBe(foodfeedbacks.length);
  });

  // Low rating
  it('low feedback rating', async () => {
    const rating_value = RATING_VALUE_LOW;
    let foodfeedbacks: Partial<DatabaseTypes.FoodsFeedbacks>[] = [
      {
        rating: rating_value,
      },
    ];

    let food: Partial<DatabaseTypes.Foods> = {};

    let result = FoodRatingCalculator.calculateFoodRating(food, foodfeedbacks);
    expect(result.rating_average).toBe(rating_value);
    expect(result.rating_amount).toBe(foodfeedbacks.length);
  });

  // High rating
  it('high feedback rating', async () => {
    const rating_value = RATING_VALUE_HIGH;
    let foodfeedbacks: Partial<DatabaseTypes.FoodsFeedbacks>[] = [
      {
        rating: rating_value,
      },
    ];

    let food: Partial<DatabaseTypes.Foods> = {};

    let result = FoodRatingCalculator.calculateFoodRating(food, foodfeedbacks);
    expect(result.rating_average).toBe(rating_value);
    expect(result.rating_amount).toBe(foodfeedbacks.length);
  });

  // No rating
  it('no feedback rating', async () => {
    let foodfeedbacks: Partial<DatabaseTypes.FoodsFeedbacks>[] = [];

    let food: Partial<DatabaseTypes.Foods> = {};

    let result = FoodRatingCalculator.calculateFoodRating(food, foodfeedbacks);
    expect(result.rating_average).toBe(null);
    expect(result.rating_amount).toBe(0);
  });

  // Multiple ratings
  it('multiple feedback ratings', async () => {
    const rating_value1 = RATING_VALUE_LOW;
    const rating_value2 = RATING_VALUE_HIGH;

    let foodfeedbacks: Partial<DatabaseTypes.FoodsFeedbacks>[] = [
      {
        rating: rating_value1,
      },
      {
        rating: rating_value2,
      },
    ];

    let food: Partial<DatabaseTypes.Foods> = {};

    let result = FoodRatingCalculator.calculateFoodRating(food, foodfeedbacks);
    expect(result.rating_average).toBe((rating_value1 + rating_value2) / 2);
    expect(result.rating_amount).toBe(foodfeedbacks.length);
  });

  // Invalid rating is ignored above max
  it('invalid feedback rating above max', async () => {
    let foodfeedbacks: Partial<DatabaseTypes.FoodsFeedbacks>[] = [
      {
        rating: RATING_VALUE_INVALID_HIGH,
      },
    ];

    let food: Partial<DatabaseTypes.Foods> = {};

    let result = FoodRatingCalculator.calculateFoodRating(food, foodfeedbacks);
    expect(result.rating_average).toBe(null);
    expect(result.rating_amount).toBe(0);
  });

  // Invalid rating is ignored below min
  it('invalid feedback rating below min', async () => {
    let foodfeedbacks: Partial<DatabaseTypes.FoodsFeedbacks>[] = [
      {
        rating: RATING_VALUE_INVALID_LOW,
      },
    ];

    let food: Partial<DatabaseTypes.Foods> = {};

    let result = FoodRatingCalculator.calculateFoodRating(food, foodfeedbacks);
    expect(result.rating_average).toBe(null);
    expect(result.rating_amount).toBe(0);
  });

  // Invalid ratings are ignored
  it('invalid feedback ratings are ignored', async () => {
    const rating_value1 = RATING_VALUE_INVALID_LOW;
    const rating_value2 = RATING_VALUE_INVALID_HIGH;

    let foodfeedbacks: Partial<DatabaseTypes.FoodsFeedbacks>[] = [
      {
        rating: rating_value1,
      },
      {
        rating: rating_value2,
      },
    ];

    let food: Partial<DatabaseTypes.Foods> = {};

    let result = FoodRatingCalculator.calculateFoodRating(food, foodfeedbacks);
    expect(result.rating_average).toBe(null);
    expect(result.rating_amount).toBe(0);
  });

  // Invalid ratings are filtered out
  it('invalid feedback ratings are filtered out', async () => {
    const rating_value1_invalid = RATING_VALUE_INVALID_LOW;
    const rating_value2_invalid = RATING_VALUE_INVALID_HIGH;
    const rating_value3_valid = RATING_VALUE_AVG;

    let foodfeedbacks: Partial<DatabaseTypes.FoodsFeedbacks>[] = [
      {
        rating: rating_value1_invalid,
      },
      {
        rating: rating_value2_invalid,
      },
      {
        rating: rating_value3_valid,
      },
    ];

    let food: Partial<DatabaseTypes.Foods> = {};

    let result = FoodRatingCalculator.calculateFoodRating(food, foodfeedbacks);
    expect(result.rating_average).toBe(rating_value3_valid);
    expect(result.rating_amount).toBe(1);
  });

  // legacy rating is considered
  it('legacy rating is considered', async () => {
    const rating_value1 = RATING_VALUE_LOW;
    const rating_value2 = RATING_VALUE_HIGH;

    let foodfeedbacks: Partial<DatabaseTypes.FoodsFeedbacks>[] = [
      {
        rating: rating_value1,
      },
      {
        rating: rating_value2,
      },
    ];
    const amount_feedbacks_new_system = foodfeedbacks.length;
    const rating_sum_new_system = rating_value1 + rating_value2;

    const rating_value_legacy = 2.5;
    const rating_amount_legacy = 2;

    let food: Partial<DatabaseTypes.Foods> = {
      rating_average_legacy: rating_value_legacy,
      rating_amount_legacy: rating_amount_legacy,
    };

    const expected_rating_amount = amount_feedbacks_new_system + rating_amount_legacy;
    const expected_rating_average = (rating_sum_new_system + rating_value_legacy * rating_amount_legacy) / expected_rating_amount;

    let result = FoodRatingCalculator.calculateFoodRating(food, foodfeedbacks);
    expect(result.rating_average).toBe(expected_rating_average);
    expect(result.rating_amount).toBe(expected_rating_amount);
  });

  // check valid rating values
  it('valid rating values', async () => {
    for (let i = RatingHelper.MIN_RATING; i <= RatingHelper.MAX_RATING; i++) {
      const valid_rating = RatingHelper.getNumberIfValueInRatingRange(i);
      expect(valid_rating).toBe(i);
    }
  });

  // check invalid rating values
  it('invalid rating values', async () => {
    const invalid_rating_low = RatingHelper.getNumberIfValueInRatingRange(RatingHelper.MIN_RATING - 1);
    const invalid_rating_high = RatingHelper.getNumberIfValueInRatingRange(RatingHelper.MAX_RATING + 1);
    expect(invalid_rating_low).toBe(null);
    expect(invalid_rating_high).toBe(null);
  });

  // randomized ratings test
  it('randomized feedback ratings', async () => {
    const amount_feedbacks = 100;
    const rating_values_valid_and_invalid: number[] = [];
    for (let i = RatingHelper.MIN_RATING - 5; i <= RatingHelper.MAX_RATING + 5; i++) {
      rating_values_valid_and_invalid.push(i);
    }

    let valid_rating_sum = 0;
    let valid_rating_amount = 0;
    let foodfeedbacks: Partial<DatabaseTypes.FoodsFeedbacks>[] = [];
    for (let i = 0; i < amount_feedbacks; i++) {
      const random_index = Math.floor(Math.random() * rating_values_valid_and_invalid.length);
      const rating_value = rating_values_valid_and_invalid[random_index];
      foodfeedbacks.push({
        rating: rating_value,
      });

      const valid_rating = RatingHelper.getNumberIfValueInRatingRange(rating_value);
      if (valid_rating !== null) {
        valid_rating_sum += valid_rating;
        valid_rating_amount++;
      }
    }

    let food: Partial<DatabaseTypes.Foods> = {};

    let result = FoodRatingCalculator.calculateFoodRating(food, foodfeedbacks);
    expect(result.rating_average).toBe(valid_rating_amount > 0 ? valid_rating_sum / valid_rating_amount : null);
    expect(result.rating_amount).toBe(valid_rating_amount);
  });
});
