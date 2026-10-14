/**
 * MenuInsightsHelper.ts – data side of the page "Speiseplan-Analyse" (`menu-insights-page.vue`):
 * what was offered, how it was rated, which markings the plan covers, what the users wait for, how
 * the feedback labels, the canteen visits ("Verabredungen") and the languages of the profiles look.
 *
 * Source: `GET /rocket-meals-menu-insights` (`menu-insights-endpoint`), which reads the raw rows with
 * the permissions of the person looking and lets the pure functions below turn them into the
 * response. The same response is the basis of the experimental AI menu planning
 * (`MenuPlanningHelper`).
 *
 * No Vue and no Directus server imports in here, so the rules are testable in Node and the file can
 * be bundled into the Directus app.
 */

import { RatingHelper } from 'repo-depkit-common/src/RatingHelper';
import { BackendTranslationKeys } from '../translations/BackendTranslationKeys';

/** One period the page can show, in days back from today. */
export enum MenuInsightsPeriod {
  DAYS_30 = '30',
  DAYS_90 = '90',
  DAYS_180 = '180',
  DAYS_365 = '365',
}

/** A food with what the page shows of it. */
export type MenuInsightsFood = {
  id: string;
  name: string;
  /** Directus file id of the picture, if any. */
  image: string | null;
  image_remote_url: string | null;
  /** Average of the ratings in the period (or all time for `awaited`), `null` without ratings. */
  rating_average: number | null;
  rating_count: number;
  /** How often the food was offered in the period. */
  offer_count: number;
  /** Profiles that asked for a push message when the food is offered (`foods_feedbacks.notify`). */
  waiting_count: number;
  /** Last day (`YYYY-MM-DD`) the food was offered up to today, `null` when never. */
  last_offered: string | null;
  /** Next planned day after today, `null` when none is planned yet. */
  next_offered: string | null;
};

export type MenuInsightsMarking = {
  id: string;
  name: string;
  short_code: string | null;
  group_name: string | null;
  image: string | null;
  image_remote_url: string | null;
  offer_count: number;
  /** Share of all offers (0–1) that carry the marking. */
  offer_share: number;
  /** Share of the days with offers (0–1) on which at least one offer carries the marking. */
  day_coverage: number;
  /** Profiles that marked it as liked / to avoid in their eating habits. */
  profile_likes: number;
  profile_dislikes: number;
};

export type MenuInsightsLabel = {
  id: string;
  name: string;
  icon: string | null;
  likes: number;
  dislikes: number;
};

export type MenuInsightsStarCount = {
  stars: number;
  count: number;
};

export type MenuInsightsNamedCount = {
  id: string;
  name: string;
  count: number;
};

export type MenuInsights = {
  period: { from: string; to: string; days: number };
  canteen: string | null;
  offers: {
    total: number;
    distinct_foods: number;
    offer_days: number;
    average_per_day: number;
    /** Foods offered exactly once in the period. */
    foods_offered_once: number;
    most_offered: MenuInsightsFood[];
  };
  ratings: {
    /** Single ratings given in the period. */
    count: number;
    average: number | null;
    /** Single ratings per star (5 … 1). */
    distribution: MenuInsightsStarCount[];
    /** Foods per rounded average star (5 … 1), only foods with at least `min_ratings` ratings. */
    food_distribution: MenuInsightsStarCount[];
    rated_foods: number;
    min_ratings: number;
    /** Share (0–1) of the single ratings with 4 or 5 stars, `null` without ratings. */
    good_share: number | null;
    top: MenuInsightsFood[];
    flop: MenuInsightsFood[];
  };
  /** Foods the most profiles wait for (push message when offered). */
  awaited: MenuInsightsFood[];
  markings: MenuInsightsMarking[];
  /** Days with offers on which no offer carries one of the "diet" markings (vegan or vegetarian), see `DIET_MARKING_HINTS`. */
  days_without_diet_option: number;
  food_labels: MenuInsightsLabel[];
  canteen_labels: MenuInsightsLabel[];
  visits: {
    total: number;
    profiles: number;
    /** Planned visits per weekday, Monday first. */
    per_weekday: number[];
    per_canteen: MenuInsightsNamedCount[];
  };
  languages: MenuInsightsNamedCount[];
  profiles_total: number;
  /** The same numbers for the period of the same length right before, for the trends. */
  previous: MenuInsightsComparison;
  /** The planned offers of the current and the next calendar week. */
  upcoming: { from: string; to: string; days: MenuInsightsUpcomingDay[] };
};

export type MenuInsightsComparison = {
  from: string;
  to: string;
  offers: number;
  distinct_foods: number;
  rating_count: number;
  rating_average: number | null;
  good_share: number | null;
  visits: number;
};

export type MenuInsightsUpcomingMarking = { id: string; name: string; short_code: string | null };

export type MenuInsightsUpcomingOffer = {
  /** The food with its rating of all time and the profiles waiting for it. */
  food: MenuInsightsFood;
  markings: MenuInsightsUpcomingMarking[];
};

export type MenuInsightsUpcomingDay = {
  date: string;
  offers: MenuInsightsUpcomingOffer[];
  /** At least one offer carries a vegetarian or vegan marking, see `DIET_MARKING_HINTS`. */
  has_diet_option: boolean;
};

export enum MenuInsightsHighlightTone {
  POSITIVE = 'positive',
  WARNING = 'warning',
  INFO = 'info',
}

/** One sentence of the summary "Auffälligkeiten", already with its formatted values. */
export type MenuInsightsHighlight = {
  key: string;
  tone: MenuInsightsHighlightTone;
  icon: string;
  textKey: BackendTranslationKeys;
  params: Record<string, string | number>;
};

export type MenuInsightsTrend = {
  /** Difference to the previous period, `null` when there is nothing to compare. */
  delta: number | null;
  direction: 'up' | 'down' | 'flat' | null;
};

export type MenuInsightsResponse = { data: MenuInsights };

/** The raw rows the server reads; all of them already filtered by period and canteen. */
export type MenuInsightsOfferRow = { id: string; date: string | null; food: string | null; canteen?: string | null };
export type MenuInsightsOfferMarkingRow = { foodoffers_id: string | null; markings_id: string | null };
export type MenuInsightsRatingRow = { food: string | null; rating: number | null; count: number };
export type MenuInsightsLabelRow = { label: string | null; like: boolean | null; dislike: boolean | null; count: number };
export type MenuInsightsVisitRow = { date: string | null; canteen: string | null; count: number };
export type MenuInsightsProfileMarkingRow = { markings_id: string | null; like: boolean | null; dislike: boolean | null; count: number };

/** One segment of a bar of `insight-bar-list.vue`. */
export type InsightBarSegment = {
  value: number;
  /** A CSS colour, by default the primary colour. */
  color?: string;
  /** Tooltip of the segment. */
  title?: string;
};

/** One row of `insight-bar-list.vue`. */
export type InsightBarItem = {
  key: string;
  label: string;
  segments: InsightBarSegment[];
  valueText: string;
  imageUrl?: string;
  icon?: string;
  /** A route of the Directus app the label leads to. */
  to?: string;
};

/** The part of the Directus app's axios instance used here. */
export type MenuInsightsApiClient = {
  get: (url: string, config?: { params?: Record<string, string> }) => Promise<{ data?: any }>;
};

export class MenuInsightsHelper {
  public static readonly ENDPOINT_ID = 'rocket-meals-menu-insights';
  public static readonly ENDPOINT = `/${MenuInsightsHelper.ENDPOINT_ID}`;

  public static readonly PERIODS: readonly MenuInsightsPeriod[] = [MenuInsightsPeriod.DAYS_30, MenuInsightsPeriod.DAYS_90, MenuInsightsPeriod.DAYS_180, MenuInsightsPeriod.DAYS_365];
  public static readonly DEFAULT_PERIOD = MenuInsightsPeriod.DAYS_90;
  /** The longest period the endpoint accepts, a little more than a year. */
  public static readonly MAX_DAYS = 400;

  /** A food needs this many ratings in the period before it counts for top, flop and the star distribution. */
  public static readonly MIN_RATINGS = 3;
  /** Entries of the top, flop, awaited and most offered lists. */
  public static readonly LIST_LIMIT = 10;

  public static readonly STARS: readonly number[] = [5, 4, 3, 2, 1];

  /** A food with at least `MIN_RATINGS` ratings counts as weak up to this average and as favourite from `STRONG_RATING`. */
  public static readonly WEAK_RATING = 2.5;
  public static readonly STRONG_RATING = 4.2;

  /** Days of the planning overview: the current and the next calendar week. */
  public static readonly UPCOMING_DAYS = 14;

  /** A change of the average rating below this is shown as unchanged. */
  public static readonly RATING_TREND_THRESHOLD = 0.05;
  /** A relative change of a count below this (10 %) is shown as unchanged. */
  public static readonly COUNT_TREND_THRESHOLD = 0.1;

  /**
   * Markings that stand for a meat free choice, matched case-insensitively against alias, short code
   * and name. Used for "days without vegetarian or vegan option": the markings are maintained per
   * customer, so there is no fixed id to rely on.
   */
  public static readonly DIET_MARKING_HINTS: readonly string[] = ['vegan', 'vegetar', 'veggie'];

  static async load(api: MenuInsightsApiClient, options: { canteen?: string | null; period: MenuInsightsPeriod; language?: string }): Promise<MenuInsights> {
    const params: Record<string, string> = { days: options.period };
    if (options.canteen) {
      params.canteen = options.canteen;
    }
    if (options.language) {
      params.language = options.language;
    }
    const response = await api.get(MenuInsightsHelper.ENDPOINT, { params });
    return (response.data as MenuInsightsResponse).data;
  }

  /** The number of days of a request, within 1 and `MAX_DAYS`; `fallback` for anything not a number. */
  static parseDays(value: unknown, fallback: number = Number(MenuInsightsHelper.DEFAULT_PERIOD)): number {
    const days = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(days) || days < 1) {
      return fallback;
    }
    return Math.min(days, MenuInsightsHelper.MAX_DAYS);
  }

  /** `YYYY-MM-DD` of a date in UTC. */
  static toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  /** The period ending today (inclusive) that is `days` long. */
  static getPeriod(days: number, today: Date = new Date()): { from: string; to: string; days: number } {
    const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    return { from: MenuInsightsHelper.toDateString(from), to: MenuInsightsHelper.toDateString(to), days };
  }

  /** Weekday of a `YYYY-MM-DD` date, Monday = 0 … Sunday = 6; `undefined` for anything else. */
  static getWeekdayIndex(date: string | null | undefined): number | undefined {
    if (!date) {
      return undefined;
    }
    const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return (parsed.getUTCDay() + 6) % 7;
  }

  /** A count out of a Directus aggregate row (`{ count: { id: '3' } }` or `{ count: 3 }`). */
  static readCount(row: unknown): number {
    const raw = (row as { count?: unknown } | null | undefined)?.count;
    const value = typeof raw === 'object' && raw !== null ? Object.values(raw as Record<string, unknown>)[0] : raw;
    const count = Number(value);
    return Number.isFinite(count) ? count : 0;
  }

  /** The id of a relation that may be loaded as object. */
  static readId(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'object') {
      const id = (value as { id?: unknown; code?: unknown }).id ?? (value as { code?: unknown }).code;
      return id === null || id === undefined ? null : String(id);
    }
    return String(value);
  }

  /** Total offers, days with offers, distinct foods, foods offered once and the count per food. */
  static summarizeOffers(offers: readonly MenuInsightsOfferRow[]): { total: number; offerDays: number; distinctFoods: number; foodsOfferedOnce: number; countPerFood: Map<string, number> } {
    const days = new Set<string>();
    const countPerFood = new Map<string, number>();
    for (const offer of offers) {
      if (offer.date) {
        days.add(offer.date.slice(0, 10));
      }
      if (offer.food) {
        countPerFood.set(offer.food, (countPerFood.get(offer.food) ?? 0) + 1);
      }
    }
    const foodsOfferedOnce = [...countPerFood.values()].filter(count => count === 1).length;
    return { total: offers.length, offerDays: days.size, distinctFoods: countPerFood.size, foodsOfferedOnce, countPerFood };
  }

  /** The ids with the highest counts, at most `limit`, ties by id so the order is stable. */
  static getTopIds(counts: ReadonlyMap<string, number>, limit: number): string[] {
    return [...counts.entries()]
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([id]) => id);
  }

  /** A rating within 1 and 5 (Directus may send it as string), `null` for anything else. */
  static readRating(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const rating = Number(value);
    return Number.isFinite(rating) ? RatingHelper.getNumberIfValueInRatingRange(rating) : null;
  }

  /** Average and count per food out of the rating rows (`food`, `rating`, `count`). */
  static getRatingsPerFood(rows: readonly MenuInsightsRatingRow[]): Map<string, { average: number; count: number }> {
    const sums = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const rating = MenuInsightsHelper.readRating(row.rating);
      if (!row.food || rating === null || row.count <= 0) {
        continue;
      }
      const entry = sums.get(row.food) ?? { sum: 0, count: 0 };
      entry.sum += rating * row.count;
      entry.count += row.count;
      sums.set(row.food, entry);
    }
    return new Map([...sums.entries()].map(([food, entry]) => [food, { average: entry.sum / entry.count, count: entry.count }]));
  }

  /** Single ratings per star, the overall average and their count. */
  static getRatingDistribution(rows: readonly MenuInsightsRatingRow[]): { distribution: MenuInsightsStarCount[]; average: number | null; count: number } {
    const perStar = new Map<number, number>();
    const totals = { sum: 0, count: 0 };
    for (const row of rows) {
      const rating = MenuInsightsHelper.readRating(row.rating);
      if (rating === null || row.count <= 0) {
        continue;
      }
      const stars = Math.round(rating);
      perStar.set(stars, (perStar.get(stars) ?? 0) + row.count);
      totals.sum += rating * row.count;
      totals.count += row.count;
    }
    return {
      distribution: MenuInsightsHelper.STARS.map(stars => ({ stars, count: perStar.get(stars) ?? 0 })),
      average: totals.count > 0 ? totals.sum / totals.count : null,
      count: totals.count,
    };
  }

  /** Foods per rounded average star, only foods with at least `minRatings` ratings. */
  static getFoodStarDistribution(ratingsPerFood: ReadonlyMap<string, { average: number; count: number }>, minRatings: number = MenuInsightsHelper.MIN_RATINGS): MenuInsightsStarCount[] {
    const perStar = new Map<number, number>();
    for (const entry of ratingsPerFood.values()) {
      if (entry.count < minRatings) {
        continue;
      }
      const stars = Math.min(RatingHelper.MAX_RATING, Math.max(RatingHelper.MIN_RATING, Math.round(entry.average)));
      perStar.set(stars, (perStar.get(stars) ?? 0) + 1);
    }
    return MenuInsightsHelper.STARS.map(stars => ({ stars, count: perStar.get(stars) ?? 0 }));
  }

  /**
   * The best (`best: true`) or worst rated foods with at least `minRatings` ratings. More ratings
   * win a tie, so a solid 4.8 of 40 ratings is above a 4.8 of 3.
   */
  static getRankedFoodIds(ratingsPerFood: ReadonlyMap<string, { average: number; count: number }>, best: boolean, limit: number = MenuInsightsHelper.LIST_LIMIT, minRatings: number = MenuInsightsHelper.MIN_RATINGS): string[] {
    return [...ratingsPerFood.entries()]
      .filter(([, entry]) => entry.count >= minRatings)
      .sort((a, b) => (best ? b[1].average - a[1].average : a[1].average - b[1].average) || b[1].count - a[1].count || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([id]) => id);
  }

  /** Offers and covered days per marking. */
  static getMarkingCoverage(offers: readonly MenuInsightsOfferRow[], offerMarkings: readonly MenuInsightsOfferMarkingRow[]): Map<string, { offerCount: number; days: Set<string> }> {
    const dateByOffer = new Map(offers.map(offer => [offer.id, offer.date?.slice(0, 10) ?? null]));
    const coverage = new Map<string, { offerCount: number; days: Set<string> }>();
    for (const row of offerMarkings) {
      if (!row.markings_id || !row.foodoffers_id || !dateByOffer.has(row.foodoffers_id)) {
        continue;
      }
      const entry = coverage.get(row.markings_id) ?? { offerCount: 0, days: new Set<string>() };
      entry.offerCount += 1;
      const date = dateByOffer.get(row.foodoffers_id);
      if (date) {
        entry.days.add(date);
      }
      coverage.set(row.markings_id, entry);
    }
    return coverage;
  }

  /** Whether a marking stands for a meat free choice, see `DIET_MARKING_HINTS`. */
  static isDietMarking(marking: { alias?: string | null; short_code?: string | null; name?: string | null }): boolean {
    const texts = [marking.alias, marking.short_code, marking.name].filter((text): text is string => !!text).map(text => text.toLowerCase());
    return texts.some(text => MenuInsightsHelper.DIET_MARKING_HINTS.some(hint => text.includes(hint)));
  }

  /** Days with offers on which none of the `markingIds` is offered. */
  static countDaysWithout(offers: readonly MenuInsightsOfferRow[], coverage: ReadonlyMap<string, { days: Set<string> }>, markingIds: readonly string[]): number {
    const days = new Set(offers.map(offer => offer.date?.slice(0, 10)).filter((date): date is string => !!date));
    const covered = new Set<string>();
    for (const id of markingIds) {
      for (const day of coverage.get(id)?.days ?? []) {
        covered.add(day);
      }
    }
    return [...days].filter(day => !covered.has(day)).length;
  }

  /** Likes and dislikes per label out of grouped label entries. */
  static getLabelCounts(rows: readonly MenuInsightsLabelRow[]): Map<string, { likes: number; dislikes: number }> {
    const counts = new Map<string, { likes: number; dislikes: number }>();
    for (const row of rows) {
      if (!row.label) {
        continue;
      }
      const entry = counts.get(row.label) ?? { likes: 0, dislikes: 0 };
      if (row.like === true) {
        entry.likes += row.count;
      }
      if (row.dislike === true) {
        entry.dislikes += row.count;
      }
      counts.set(row.label, entry);
    }
    return counts;
  }

  /** Likes and dislikes of the profiles per marking. */
  static getProfileMarkingCounts(rows: readonly MenuInsightsProfileMarkingRow[]): Map<string, { likes: number; dislikes: number }> {
    return MenuInsightsHelper.getLabelCounts(rows.map(row => ({ label: row.markings_id, like: row.like, dislike: row.dislike, count: row.count })));
  }

  /** Planned visits in total, per weekday (Monday first) and per canteen. */
  static summarizeVisits(rows: readonly MenuInsightsVisitRow[]): { total: number; perWeekday: number[]; perCanteen: Map<string, number> } {
    const perWeekday = [0, 0, 0, 0, 0, 0, 0];
    const perCanteen = new Map<string, number>();
    const totals = { count: 0 };
    for (const row of rows) {
      totals.count += row.count;
      const weekday = MenuInsightsHelper.getWeekdayIndex(row.date);
      if (weekday !== undefined) {
        perWeekday[weekday] = (perWeekday[weekday] ?? 0) + row.count;
      }
      if (row.canteen) {
        perCanteen.set(row.canteen, (perCanteen.get(row.canteen) ?? 0) + row.count);
      }
    }
    return { total: totals.count, perWeekday, perCanteen };
  }

  /** The period of the same length right before `period`. */
  static getPreviousPeriod(period: { from: string; days: number }): { from: string; to: string; days: number } {
    const from = new Date(`${period.from}T00:00:00Z`);
    const to = new Date(from.getTime() - 24 * 60 * 60 * 1000);
    return MenuInsightsHelper.getPeriod(period.days, to);
  }

  /** Monday of the current calendar week until Sunday of the next one. */
  static getUpcomingRange(today: Date = new Date()): { from: string; to: string } {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const monday = new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * 24 * 60 * 60 * 1000);
    const sunday = new Date(monday.getTime() + (MenuInsightsHelper.UPCOMING_DAYS - 1) * 24 * 60 * 60 * 1000);
    return { from: MenuInsightsHelper.toDateString(monday), to: MenuInsightsHelper.toDateString(sunday) };
  }

  /** All dates of a range as `YYYY-MM-DD`, both ends included. */
  static getDates(range: { from: string; to: string }): string[] {
    const start = new Date(`${range.from}T00:00:00Z`).getTime();
    const end = new Date(`${range.to}T00:00:00Z`).getTime();
    const count = Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1);
    return Array.from({ length: count }, (_, index) => MenuInsightsHelper.toDateString(new Date(start + index * 24 * 60 * 60 * 1000)));
  }

  /** Share of the single ratings with 4 or 5 stars. */
  static getGoodShare(distribution: readonly MenuInsightsStarCount[]): number | null {
    const total = distribution.reduce((sum, entry) => sum + entry.count, 0);
    if (total === 0) {
      return null;
    }
    return distribution.filter(entry => entry.stars >= 4).reduce((sum, entry) => sum + entry.count, 0) / total;
  }

  /** Whether a food is rated badly by enough people. */
  static isWeak(food: Pick<MenuInsightsFood, 'rating_average' | 'rating_count'>): boolean {
    return food.rating_average !== null && food.rating_count >= MenuInsightsHelper.MIN_RATINGS && food.rating_average <= MenuInsightsHelper.WEAK_RATING;
  }

  /** Whether a food is a favourite of enough people. */
  static isStrong(food: Pick<MenuInsightsFood, 'rating_average' | 'rating_count'>): boolean {
    return food.rating_average !== null && food.rating_count >= MenuInsightsHelper.MIN_RATINGS && food.rating_average >= MenuInsightsHelper.STRONG_RATING;
  }

  /** Change of an average (absolute) or a count (`relative`: share of the previous value). */
  static getTrend(current: number | null, previous: number | null, relative = false): MenuInsightsTrend {
    if (current === null || previous === null || (relative && previous === 0)) {
      return { delta: null, direction: null };
    }
    const delta = relative ? (current - previous) / previous : current - previous;
    const threshold = relative ? MenuInsightsHelper.COUNT_TREND_THRESHOLD : MenuInsightsHelper.RATING_TREND_THRESHOLD;
    return { delta, direction: Math.abs(delta) < threshold ? 'flat' : delta > 0 ? 'up' : 'down' };
  }

  /** The label with the most dislikes, when it has more dislikes than likes. */
  static getTopComplaint(labels: readonly MenuInsightsLabel[]): MenuInsightsLabel | undefined {
    return [...labels].filter(label => label.dislikes > label.likes).sort((a, b) => b.dislikes - a.dislikes)[0];
  }

  /** Offers of the upcoming days whose food is rated badly, each food once. */
  static getWeakUpcomingFoods(days: readonly MenuInsightsUpcomingDay[], from?: string): MenuInsightsFood[] {
    const foods = new Map<string, MenuInsightsFood>();
    for (const day of days) {
      if (from && day.date < from) {
        continue;
      }
      for (const offer of day.offers) {
        if (MenuInsightsHelper.isWeak(offer.food)) {
          foods.set(offer.food.id, offer.food);
        }
      }
    }
    return [...foods.values()];
  }

  /** Days of the upcoming range from `from` on with offers but without a vegetarian or vegan one. */
  static getUpcomingDaysWithoutDietOption(days: readonly MenuInsightsUpcomingDay[], from?: string): MenuInsightsUpcomingDay[] {
    return days.filter(day => (!from || day.date >= from) && day.offers.length > 0 && !day.has_diet_option);
  }

  /**
   * The summary "Auffälligkeiten" for the controller: what changed against the previous period and
   * what needs attention in the coming days. Warnings first.
   */
  static getHighlights(insights: MenuInsights, language: string | undefined, today: Date = new Date()): MenuInsightsHighlight[] {
    const highlights: MenuInsightsHighlight[] = [];
    const number = (value: number, digits = 0) => MenuInsightsHelper.formatNumber(value, language, digits);
    const percent = (share: number) => MenuInsightsHelper.formatPercent(share, language);
    const todayString = MenuInsightsHelper.toDateString(today);

    const ratingTrend = MenuInsightsHelper.getTrend(insights.ratings.average, insights.previous.rating_average);
    if (insights.ratings.average !== null && insights.previous.rating_average !== null && ratingTrend.direction && ratingTrend.direction !== 'flat') {
      highlights.push({
        key: 'rating-trend',
        tone: ratingTrend.direction === 'up' ? MenuInsightsHighlightTone.POSITIVE : MenuInsightsHighlightTone.WARNING,
        icon: ratingTrend.direction === 'up' ? 'trending_up' : 'trending_down',
        textKey: ratingTrend.direction === 'up' ? BackendTranslationKeys.rocket_meals_module_menu_insights_highlight_rating_up : BackendTranslationKeys.rocket_meals_module_menu_insights_highlight_rating_down,
        params: { before: number(insights.previous.rating_average, 2), after: number(insights.ratings.average, 2) },
      });
    } else if (insights.ratings.average !== null) {
      highlights.push({ key: 'rating', tone: MenuInsightsHighlightTone.INFO, icon: 'star', textKey: BackendTranslationKeys.rocket_meals_module_menu_insights_highlight_rating_stable, params: { value: number(insights.ratings.average, 2) } });
    }

    if (insights.ratings.good_share !== null) {
      const share = insights.ratings.good_share;
      highlights.push({
        key: 'good-share',
        tone: share >= 0.6 ? MenuInsightsHighlightTone.POSITIVE : share < 0.4 ? MenuInsightsHighlightTone.WARNING : MenuInsightsHighlightTone.INFO,
        icon: 'sentiment_satisfied',
        textKey: BackendTranslationKeys.rocket_meals_module_menu_insights_highlight_good_share,
        params: { share: percent(share) },
      });
    }

    const foodComplaint = MenuInsightsHelper.getTopComplaint(insights.food_labels);
    if (foodComplaint) {
      highlights.push({ key: 'food-complaint', tone: MenuInsightsHighlightTone.WARNING, icon: 'restaurant', textKey: BackendTranslationKeys.rocket_meals_module_menu_insights_highlight_food_complaint, params: { label: foodComplaint.name, count: number(foodComplaint.dislikes) } });
    }
    const canteenComplaint = MenuInsightsHelper.getTopComplaint(insights.canteen_labels);
    if (canteenComplaint) {
      highlights.push({ key: 'canteen-complaint', tone: MenuInsightsHighlightTone.WARNING, icon: 'storefront', textKey: BackendTranslationKeys.rocket_meals_module_menu_insights_highlight_canteen_complaint, params: { label: canteenComplaint.name, count: number(canteenComplaint.dislikes) } });
    }

    const weakPlanned = MenuInsightsHelper.getWeakUpcomingFoods(insights.upcoming.days, todayString);
    if (weakPlanned.length > 0) {
      highlights.push({ key: 'weak-planned', tone: MenuInsightsHighlightTone.WARNING, icon: 'thumb_down', textKey: BackendTranslationKeys.rocket_meals_module_menu_insights_highlight_weak_planned, params: { count: weakPlanned.length } });
    }
    const noDietDays = MenuInsightsHelper.getUpcomingDaysWithoutDietOption(insights.upcoming.days, todayString);
    if (noDietDays.length > 0) {
      highlights.push({ key: 'no-diet', tone: MenuInsightsHighlightTone.WARNING, icon: 'eco', textKey: BackendTranslationKeys.rocket_meals_module_menu_insights_highlight_no_diet_upcoming, params: { count: noDietDays.length } });
    }
    const awaitedWithoutDate = insights.awaited.filter(food => !food.next_offered);
    if (awaitedWithoutDate.length > 0) {
      highlights.push({ key: 'awaited', tone: MenuInsightsHighlightTone.INFO, icon: 'notifications_active', textKey: BackendTranslationKeys.rocket_meals_module_menu_insights_highlight_awaited_unplanned, params: { count: awaitedWithoutDate.length, waiting: number(awaitedWithoutDate.reduce((sum, food) => sum + food.waiting_count, 0)) } });
    }

    const visitTrend = MenuInsightsHelper.getTrend(insights.visits.total, insights.previous.visits, true);
    if (visitTrend.delta !== null && visitTrend.direction && visitTrend.direction !== 'flat') {
      highlights.push({
        key: 'visits',
        tone: visitTrend.direction === 'up' ? MenuInsightsHighlightTone.POSITIVE : MenuInsightsHighlightTone.INFO,
        icon: 'groups',
        textKey: visitTrend.direction === 'up' ? BackendTranslationKeys.rocket_meals_module_menu_insights_highlight_visits_up : BackendTranslationKeys.rocket_meals_module_menu_insights_highlight_visits_down,
        params: { change: percent(Math.abs(visitTrend.delta)) },
      });
    }

    const order = { [MenuInsightsHighlightTone.WARNING]: 0, [MenuInsightsHighlightTone.POSITIVE]: 1, [MenuInsightsHighlightTone.INFO]: 2 };
    return highlights
      .map((highlight, index) => ({ highlight, index }))
      .sort((a, b) => order[a.highlight.tone] - order[b.highlight.tone] || a.index - b.index)
      .map(entry => entry.highlight);
  }

  /** Share (0–1) of `part` in `total`, 0 without total. */
  static getShare(part: number, total: number): number {
    return total > 0 ? part / total : 0;
  }

  /** Width of a bar in percent of the largest value of its chart, at least a sliver when above 0. */
  static getBarPercent(value: number, max: number): number {
    if (max <= 0 || value <= 0) {
      return 0;
    }
    return Math.max(2, Math.round((value / max) * 100));
  }

  static formatPercent(share: number, language: string | undefined): string {
    return new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: share > 0 && share < 0.1 ? 1 : 0 }).format(share);
  }

  static formatNumber(value: number, language: string | undefined, fractionDigits = 0): string {
    return new Intl.NumberFormat(language, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
  }

  /** A `YYYY-MM-DD` date in the language of the page, e.g. `14.10.2026`; the input itself when it is no date. */
  static formatDate(date: string, language: string | undefined, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
    const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' }).format(parsed);
  }

  /** Short weekday names, Monday first, in the language of the page. */
  static getWeekdayNames(language: string | undefined): string[] {
    const format = new Intl.DateTimeFormat(language, { weekday: 'short', timeZone: 'UTC' });
    // 2024-01-01 was a Monday.
    return Array.from({ length: 7 }, (_, index) => format.format(new Date(Date.UTC(2024, 0, 1 + index))));
  }

  static getPeriodLabelKey(period: MenuInsightsPeriod): BackendTranslationKeys {
    switch (period) {
      case MenuInsightsPeriod.DAYS_30:
        return BackendTranslationKeys.rocket_meals_module_menu_insights_period_30;
      case MenuInsightsPeriod.DAYS_90:
        return BackendTranslationKeys.rocket_meals_module_menu_insights_period_90;
      case MenuInsightsPeriod.DAYS_180:
        return BackendTranslationKeys.rocket_meals_module_menu_insights_period_180;
      case MenuInsightsPeriod.DAYS_365:
        return BackendTranslationKeys.rocket_meals_module_menu_insights_period_365;
    }
  }

  /** The Directus file as square thumbnail of twice `size` px (HiDPI), else the remote URL, else `undefined`. */
  static getImageUrl(item: { image?: string | null; image_remote_url?: string | null }, apiRoot: string = '/', size = 40): string | undefined {
    if (item.image) {
      const root = apiRoot.endsWith('/') ? apiRoot : `${apiRoot}/`;
      const edge = size * 2;
      return `${root}assets/${encodeURIComponent(item.image)}?width=${edge}&height=${edge}&fit=cover&quality=80`;
    }
    return item.image_remote_url || undefined;
  }

  /** The food in the content area of Directus. */
  static getFoodRoute(foodId: string): string {
    return `/content/foods/${encodeURIComponent(foodId)}`;
  }
}
