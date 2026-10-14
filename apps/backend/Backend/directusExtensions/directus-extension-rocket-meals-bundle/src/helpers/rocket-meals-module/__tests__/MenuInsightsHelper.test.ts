import { describe, expect, it } from '@jest/globals';
import { MenuInsightsHelper, MenuInsightsHighlightTone, MenuInsightsPeriod, type MenuInsights, type MenuInsightsFood } from '../MenuInsightsHelper';
import { BackendTranslationKeys } from '../../translations/BackendTranslationKeys';
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

  describe('periods', () => {
    it('getPreviousPeriod is the period of the same length right before', () => {
      expect(MenuInsightsHelper.getPreviousPeriod({ from: '2026-10-08', days: 7 })).toEqual({ from: '2026-10-01', to: '2026-10-07', days: 7 });
    });

    it('getUpcomingRange starts on Monday of the current week and covers two weeks', () => {
      expect(MenuInsightsHelper.getUpcomingRange(new Date('2026-10-14T12:00:00Z'))).toEqual({ from: '2026-10-12', to: '2026-10-25' });
      expect(MenuInsightsHelper.getUpcomingRange(new Date('2026-10-18T12:00:00Z'))).toEqual({ from: '2026-10-12', to: '2026-10-25' });
    });

    it('getDates lists every day of a range', () => {
      expect(MenuInsightsHelper.getDates({ from: '2026-10-30', to: '2026-11-02' })).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    });
  });

  it('getGoodShare is the share of 4 and 5 stars', () => {
    expect(
      MenuInsightsHelper.getGoodShare([
        { stars: 5, count: 2 },
        { stars: 4, count: 1 },
        { stars: 1, count: 1 },
      ])
    ).toBe(0.75);
    expect(MenuInsightsHelper.getGoodShare([{ stars: 5, count: 0 }])).toBeNull();
  });

  it('isWeak and isStrong need enough ratings', () => {
    expect(MenuInsightsHelper.isWeak({ rating_average: 2.1, rating_count: 5 })).toBe(true);
    expect(MenuInsightsHelper.isWeak({ rating_average: 2.1, rating_count: 1 })).toBe(false);
    expect(MenuInsightsHelper.isStrong({ rating_average: 4.5, rating_count: 5 })).toBe(true);
    expect(MenuInsightsHelper.isStrong({ rating_average: null, rating_count: 5 })).toBe(false);
  });

  it('getTrend compares averages absolutely and counts relatively', () => {
    expect(MenuInsightsHelper.getTrend(3.9, 3.7)).toEqual({ delta: expect.closeTo(0.2), direction: 'up' });
    expect(MenuInsightsHelper.getTrend(3.71, 3.7).direction).toBe('flat');
    expect(MenuInsightsHelper.getTrend(80, 100, true)).toEqual({ delta: -0.2, direction: 'down' });
    expect(MenuInsightsHelper.getTrend(5, 0, true)).toEqual({ delta: null, direction: null });
    expect(MenuInsightsHelper.getTrend(null, 3)).toEqual({ delta: null, direction: null });
  });

  it('getTopComplaint takes the label with the most dislikes, only when dislikes win', () => {
    const labels = [
      { id: 'a', name: 'Lecker', icon: null, likes: 50, dislikes: 10 },
      { id: 'b', name: 'Zu salzig', icon: null, likes: 2, dislikes: 8 },
      { id: 'c', name: 'Kalt', icon: null, likes: 1, dislikes: 5 },
    ];
    expect(MenuInsightsHelper.getTopComplaint(labels)?.id).toBe('b');
    expect(MenuInsightsHelper.getTopComplaint([labels[0]!])).toBeUndefined();
  });

  describe('highlights', () => {
    const food = (id: string, rating: number | null, extra: Partial<MenuInsightsFood> = {}): MenuInsightsFood => ({ id, name: id, image: null, image_remote_url: null, rating_average: rating, rating_count: 10, offer_count: 1, waiting_count: 0, last_offered: null, next_offered: null, ...extra });

    function createInsights(): MenuInsights {
      return {
        period: { from: '2026-09-15', to: '2026-10-14', days: 30 },
        canteen: null,
        offers: { total: 100, distinct_foods: 30, offer_days: 20, average_per_day: 5, foods_offered_once: 3, most_offered: [] },
        ratings: { count: 200, average: 3.6, distribution: [], food_distribution: [], rated_foods: 20, min_ratings: 3, good_share: 0.65, top: [], flop: [] },
        awaited: [food('pizza', 4, { waiting_count: 7 }), food('curry', 4, { waiting_count: 3, next_offered: '2026-10-20' })],
        markings: [],
        days_without_diet_option: 0,
        food_labels: [{ id: 'salt', name: 'Zu salzig', icon: null, likes: 1, dislikes: 9 }],
        canteen_labels: [],
        visits: { total: 50, profiles: 20, per_weekday: [], per_canteen: [] },
        languages: [],
        profiles_total: 0,
        previous: { from: '2026-08-16', to: '2026-09-14', offers: 90, distinct_foods: 28, rating_count: 180, rating_average: 3.9, good_share: 0.7, visits: 40 },
        upcoming: {
          from: '2026-10-12',
          to: '2026-10-25',
          days: [
            { date: '2026-10-13', offers: [{ food: food('old', 1.5), markings: [] }], has_diet_option: false },
            { date: '2026-10-15', offers: [{ food: food('bad', 2.0), markings: [] }], has_diet_option: false },
            { date: '2026-10-16', offers: [{ food: food('good', 4.5), markings: [] }], has_diet_option: true },
          ],
        },
      };
    }

    it('summarises trends and what needs attention, warnings first', () => {
      const highlights = MenuInsightsHelper.getHighlights(createInsights(), 'de-DE', new Date('2026-10-14T10:00:00Z'));
      const keys = highlights.map(highlight => highlight.key);
      expect(keys).toEqual(['rating-trend', 'food-complaint', 'weak-planned', 'no-diet', 'good-share', 'visits', 'awaited']);
      expect(highlights[0]).toMatchObject({ tone: MenuInsightsHighlightTone.WARNING, textKey: BackendTranslationKeys.rocket_meals_module_menu_insights_highlight_rating_down, params: { before: '3,90', after: '3,60' } });
      // Days before today do not count any more.
      expect(highlights.find(highlight => highlight.key === 'weak-planned')?.params).toEqual({ count: 1 });
      expect(highlights.find(highlight => highlight.key === 'awaited')?.params).toEqual({ count: 1, waiting: '7' });
    });

    it('reports a stable rating without a previous period', () => {
      const insights = createInsights();
      insights.previous.rating_average = null;
      const highlights = MenuInsightsHelper.getHighlights(insights, 'en-US', new Date('2026-10-14T10:00:00Z'));
      expect(highlights.find(highlight => highlight.key === 'rating')?.params).toEqual({ value: '3.60' });
    });
  });
});
