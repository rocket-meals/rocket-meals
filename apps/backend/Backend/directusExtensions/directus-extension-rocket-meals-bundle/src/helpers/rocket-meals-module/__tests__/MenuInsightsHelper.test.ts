import { describe, expect, it } from '@jest/globals';
import { MenuInsightsHelper, MenuInsightsPeriod } from '../MenuInsightsHelper';
import { RocketMealsModulePages } from '../RocketMealsModulePages';

describe('MenuInsightsHelper', () => {
  it('is a page of the module, together with the menu planning', () => {
    expect(RocketMealsModulePages.PAGES).toContain(RocketMealsModulePages.MENU_INSIGHTS);
    expect(RocketMealsModulePages.PAGES).toContain(RocketMealsModulePages.MENU_PLANNING);
  });

  describe('parseDays', () => {
    it('keeps a valid number of days and caps it', () => {
      expect(MenuInsightsHelper.parseDays('30')).toBe(30);
      expect(MenuInsightsHelper.parseDays('5000')).toBe(MenuInsightsHelper.MAX_DAYS);
    });

    it('falls back to the default period for anything else', () => {
      expect(MenuInsightsHelper.parseDays(undefined)).toBe(Number(MenuInsightsPeriod.DAYS_90));
      expect(MenuInsightsHelper.parseDays('abc')).toBe(Number(MenuInsightsPeriod.DAYS_90));
      expect(MenuInsightsHelper.parseDays('0')).toBe(Number(MenuInsightsPeriod.DAYS_90));
    });
  });

  it('getPeriod ends today and includes both ends', () => {
    expect(MenuInsightsHelper.getPeriod(7, new Date('2026-10-14T15:00:00Z'))).toEqual({ from: '2026-10-08', to: '2026-10-14', days: 7 });
  });

  it('getWeekdayIndex starts the week on Monday', () => {
    expect(MenuInsightsHelper.getWeekdayIndex('2026-10-12')).toBe(0);
    expect(MenuInsightsHelper.getWeekdayIndex('2026-10-18')).toBe(6);
    expect(MenuInsightsHelper.getWeekdayIndex('no date')).toBeUndefined();
    expect(MenuInsightsHelper.getWeekdayIndex(null)).toBeUndefined();
  });

  it('readCount reads the count of a Directus aggregate row in both shapes', () => {
    expect(MenuInsightsHelper.readCount({ count: { id: '12' } })).toBe(12);
    expect(MenuInsightsHelper.readCount({ count: 3 })).toBe(3);
    expect(MenuInsightsHelper.readCount({})).toBe(0);
  });

  it('readRating accepts ratings within 1 and 5, also as string', () => {
    expect(MenuInsightsHelper.readRating('4')).toBe(4);
    expect(MenuInsightsHelper.readRating(6)).toBeNull();
    expect(MenuInsightsHelper.readRating(null)).toBeNull();
  });

  it('summarizeOffers counts offers, days, foods and foods offered once', () => {
    const summary = MenuInsightsHelper.summarizeOffers([
      { id: '1', date: '2026-10-12', food: 'a' },
      { id: '2', date: '2026-10-12', food: 'b' },
      { id: '3', date: '2026-10-13', food: 'a' },
      { id: '4', date: '2026-10-13', food: null },
    ]);
    expect(summary.total).toBe(4);
    expect(summary.offerDays).toBe(2);
    expect(summary.distinctFoods).toBe(2);
    expect(summary.foodsOfferedOnce).toBe(1);
    expect(summary.countPerFood.get('a')).toBe(2);
  });

  describe('ratings', () => {
    const rows = [
      { food: 'good', rating: 5, count: 4 },
      { food: 'good', rating: 4, count: 1 },
      { food: 'bad', rating: 1, count: 3 },
      { food: 'few', rating: 5, count: 1 },
      { food: 'broken', rating: 9, count: 5 },
    ];

    it('averages per food and ignores ratings outside of the range', () => {
      const perFood = MenuInsightsHelper.getRatingsPerFood(rows);
      expect(perFood.get('good')).toEqual({ average: 4.8, count: 5 });
      expect(perFood.has('broken')).toBe(false);
    });

    it('counts the single ratings per star', () => {
      const result = MenuInsightsHelper.getRatingDistribution(rows);
      expect(result.distribution).toEqual([
        { stars: 5, count: 5 },
        { stars: 4, count: 1 },
        { stars: 3, count: 0 },
        { stars: 2, count: 0 },
        { stars: 1, count: 3 },
      ]);
      expect(result.count).toBe(9);
      expect(result.average).toBeCloseTo((5 * 5 + 4 + 3) / 9);
    });

    it('counts the foods per rounded average, only with enough ratings', () => {
      const perFood = MenuInsightsHelper.getRatingsPerFood(rows);
      expect(MenuInsightsHelper.getFoodStarDistribution(perFood, 3)).toEqual([
        { stars: 5, count: 1 },
        { stars: 4, count: 0 },
        { stars: 3, count: 0 },
        { stars: 2, count: 0 },
        { stars: 1, count: 1 },
      ]);
    });

    it('ranks the best and worst foods with enough ratings', () => {
      const perFood = MenuInsightsHelper.getRatingsPerFood(rows);
      expect(MenuInsightsHelper.getRankedFoodIds(perFood, true, 10, 3)).toEqual(['good', 'bad']);
      expect(MenuInsightsHelper.getRankedFoodIds(perFood, false, 1, 3)).toEqual(['bad']);
    });

    it('prefers more ratings on the same average', () => {
      const perFood = new Map([
        ['a', { average: 4.5, count: 3 }],
        ['b', { average: 4.5, count: 30 }],
      ]);
      expect(MenuInsightsHelper.getRankedFoodIds(perFood, true, 10, 1)).toEqual(['b', 'a']);
    });
  });

  it('getTopIds sorts by count and skips zeros', () => {
    expect(
      MenuInsightsHelper.getTopIds(
        new Map([
          ['a', 1],
          ['b', 5],
          ['c', 0],
        ]),
        5
      )
    ).toEqual(['b', 'a']);
  });

  describe('markings', () => {
    const offers = [
      { id: '1', date: '2026-10-12', food: 'a' },
      { id: '2', date: '2026-10-12', food: 'b' },
      { id: '3', date: '2026-10-13', food: 'c' },
      { id: '4', date: '2026-10-14', food: 'd' },
    ];
    const offerMarkings = [
      { foodoffers_id: '1', markings_id: 'vegan' },
      { foodoffers_id: '2', markings_id: 'vegan' },
      { foodoffers_id: '3', markings_id: 'vegetarian' },
      { foodoffers_id: '4', markings_id: 'pork' },
      { foodoffers_id: 'unknown', markings_id: 'pork' },
    ];

    it('counts offers and covered days per marking', () => {
      const coverage = MenuInsightsHelper.getMarkingCoverage(offers, offerMarkings);
      expect(coverage.get('vegan')?.offerCount).toBe(2);
      expect(coverage.get('vegan')?.days.size).toBe(1);
      expect(coverage.get('pork')?.offerCount).toBe(1);
    });

    it('counts the days without one of the given markings', () => {
      const coverage = MenuInsightsHelper.getMarkingCoverage(offers, offerMarkings);
      expect(MenuInsightsHelper.countDaysWithout(offers, coverage, ['vegan', 'vegetarian'])).toBe(1);
      expect(MenuInsightsHelper.countDaysWithout(offers, coverage, ['vegan'])).toBe(2);
    });

    it('recognises vegetarian and vegan markings by alias, short code or name', () => {
      expect(MenuInsightsHelper.isDietMarking({ alias: 'Vegan' })).toBe(true);
      expect(MenuInsightsHelper.isDietMarking({ name: 'Vegetarisch' })).toBe(true);
      expect(MenuInsightsHelper.isDietMarking({ short_code: 'VEGGIE' })).toBe(true);
      expect(MenuInsightsHelper.isDietMarking({ alias: 'Schwein', name: 'Schweinefleisch' })).toBe(false);
    });
  });

  it('getLabelCounts sums likes and dislikes per label', () => {
    const counts = MenuInsightsHelper.getLabelCounts([
      { label: 'tasty', like: true, dislike: false, count: 4 },
      { label: 'tasty', like: false, dislike: true, count: 1 },
      { label: 'tasty', like: null, dislike: null, count: 7 },
      { label: null, like: true, dislike: false, count: 2 },
    ]);
    expect(counts.get('tasty')).toEqual({ likes: 4, dislikes: 1 });
    expect(counts.size).toBe(1);
  });

  it('summarizeVisits counts per weekday and per canteen', () => {
    const summary = MenuInsightsHelper.summarizeVisits([
      { date: '2026-10-12', canteen: 'main', count: 3 },
      { date: '2026-10-13', canteen: 'north', count: 2 },
      { date: '2026-10-19', canteen: 'main', count: 1 },
    ]);
    expect(summary.total).toBe(6);
    expect(summary.perWeekday).toEqual([4, 2, 0, 0, 0, 0, 0]);
    expect(summary.perCanteen.get('main')).toBe(4);
  });

  it('getBarPercent scales to the largest value and keeps small values visible', () => {
    expect(MenuInsightsHelper.getBarPercent(50, 100)).toBe(50);
    expect(MenuInsightsHelper.getBarPercent(1, 1000)).toBe(2);
    expect(MenuInsightsHelper.getBarPercent(0, 100)).toBe(0);
    expect(MenuInsightsHelper.getBarPercent(5, 0)).toBe(0);
  });

  it('getWeekdayNames starts with Monday', () => {
    expect(MenuInsightsHelper.getWeekdayNames('en-US')[0]).toBe('Mon');
  });

  it('getImageUrl prefers the Directus file over the remote URL', () => {
    expect(MenuInsightsHelper.getImageUrl({ image: 'file', image_remote_url: 'https://x' }, '/api', 20)).toBe('/api/assets/file?width=40&height=40&fit=cover&quality=80');
    expect(MenuInsightsHelper.getImageUrl({ image: null, image_remote_url: 'https://x' })).toBe('https://x');
    expect(MenuInsightsHelper.getImageUrl({})).toBeUndefined();
  });
});
