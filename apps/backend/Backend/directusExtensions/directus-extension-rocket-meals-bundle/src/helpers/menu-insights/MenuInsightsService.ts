/**
 * MenuInsightsService.ts – reads the rows behind the page "Speiseplan-Analyse" and the experimental
 * AI menu planning, and lets `MenuInsightsHelper` / `MenuPlanningHelper` turn them into the answer
 * of `menu-insights-endpoint`.
 *
 * Everything is read with the permissions of the person asking (`accountability`), so the page only
 * shows what they may read anyway. Counts are Directus aggregate queries (`group`), only offers and
 * their markings are read row by row (the days a marking covers need both). A section whose
 * collection cannot be read (no permission, older schema) stays empty instead of failing the page.
 */

import type { Accountability } from '@directus/types';
import { CollectionNames } from 'repo-depkit-common';
import type { ApiContext } from '../ApiContext';
import { ContentTranslationHelper, type ExistingTranslation } from '../ContentTranslationHelper';
import { DirectusOpenAiCompatibleClient } from '../ai/DirectusOpenAiCompatibleClient';
import { MenuInsightsHelper, type MenuInsightsUpcomingDay, type MenuInsights, type MenuInsightsFood, type MenuInsightsLabel, type MenuInsightsLabelRow, type MenuInsightsMarking, type MenuInsightsNamedCount, type MenuInsightsOfferMarkingRow, type MenuInsightsOfferRow, type MenuInsightsProfileMarkingRow, type MenuInsightsRatingRow, type MenuInsightsVisitRow } from '../rocket-meals-module/MenuInsightsHelper';
import { MenuPlanningErrorCode, MenuPlanningHelper, type MenuPlanningContext, type MenuPlanningPastDay, type MenuPlanningRequest, type MenuPlanningResult } from '../rocket-meals-module/MenuPlanningHelper';

type DirectusFilter = Record<string, unknown>;
type Row = Record<string, unknown>;

/** Not (yet) part of `CollectionNames`: adding them there would make every hook wait for these tables. */
const CANTEEN_VISITS = 'canteen_visits';
const PROFILES_MARKINGS = 'profiles_markings';

const TRANSLATION_FIELDS = ['translations.languages_code', 'translations.name'];

export class MenuInsightsService {
  private readonly apiContext: ApiContext;
  private readonly accountability: Accountability | null;

  constructor(apiContext: ApiContext, accountability: Accountability | null) {
    this.apiContext = apiContext;
    this.accountability = accountability;
  }

  /** Whether an OpenAI-compatible provider is configured under Settings → AI. */
  static async isAiConfigured(apiContext: ApiContext): Promise<boolean> {
    return (await DirectusOpenAiCompatibleClient.fromDirectusSettings(apiContext)) !== null;
  }

  /**
   * Note: the internal ItemsService takes `group` for grouped aggregates. `groupBy` is only the REST
   * parameter (translated by `sanitizeQuery`) and is silently ignored here.
   */
  private async read(collection: string, query: Record<string, unknown>): Promise<Row[]> {
    const service = new this.apiContext.services.ItemsService(collection, { schema: await this.apiContext.getSchema(), accountability: this.accountability });
    return ((await service.readByQuery(query)) ?? []) as Row[];
  }

  /** Like `read`, but an empty list (and a warning in the log) when the collection cannot be read. */
  private async readSafe(collection: string, query: Record<string, unknown>): Promise<Row[]> {
    try {
      return await this.read(collection, query);
    } catch (error) {
      this.apiContext.logger.warn(`menu insights: reading ${collection} failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private static and(parts: (DirectusFilter | undefined)[]): DirectusFilter {
    const defined = parts.filter((part): part is DirectusFilter => !!part);
    return defined.length === 1 ? defined[0]! : { _and: defined };
  }

  /** Offers that are no component of another offer (a side dish of a menu is no own offer). */
  private static readonly NOT_A_COMPONENT: DirectusFilter = { _or: [{ is_component: { _null: true } }, { is_component: { _eq: false } }] };

  private static buildOfferFilter(range: { from: string; to: string }, canteen: string | null): DirectusFilter {
    return MenuInsightsService.and([{ date: { _between: [range.from, range.to] } }, canteen ? { canteen: { _eq: canteen } } : undefined, MenuInsightsService.NOT_A_COMPONENT]);
  }

  /** Timestamps within the days of the range; a changed feedback counts on the day it was changed. */
  private static buildChangedInRangeFilter(range: { from: string; to: string }): DirectusFilter {
    const between = { _between: [`${range.from}T00:00:00`, `${range.to}T23:59:59.999`] };
    return { _or: [{ date_updated: between }, { _and: [{ date_updated: { _null: true } }, { date_created: between }] }] };
  }

  /** `canteen_visits.date` is a timestamp: the whole last day counts. */
  private static buildVisitDateFilter(range: { from: string; to: string }): DirectusFilter {
    return { date: { _between: [`${range.from}T00:00:00`, `${range.to}T23:59:59.999`] } };
  }

  private static getName(row: Row | undefined, language: string, field = 'name'): string | undefined {
    if (!row) {
      return undefined;
    }
    const translated = ContentTranslationHelper.getTranslation((row.translations as ExistingTranslation[]) ?? [], language, field);
    return (typeof translated === 'string' && translated.trim()) || (typeof row.alias === 'string' && row.alias.trim()) || undefined;
  }

  private async readOffers(range: { from: string; to: string }, canteen: string | null, fields: string[]): Promise<Row[]> {
    return this.read(CollectionNames.FOODOFFERS, { fields, filter: MenuInsightsService.buildOfferFilter(range, canteen), sort: ['date'], limit: -1 });
  }

  private async readFoods(ids: readonly string[], language: string): Promise<Map<string, Row & { name: string }>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.readSafe(CollectionNames.FOODS, {
      fields: ['id', 'alias', 'image', 'image_remote_url', 'rating_average', 'rating_amount', ...TRANSLATION_FIELDS],
      filter: { id: { _in: [...ids] } },
      limit: -1,
    });
    return new Map(rows.map(row => [String(row.id), { ...row, name: MenuInsightsService.getName(row, language) ?? String(row.id) }]));
  }

  /** Last offer up to today and next planned offer after today per food. */
  private async readOfferDates(foodIds: readonly string[], canteen: string | null, today: string): Promise<{ last: Map<string, string>; next: Map<string, string> }> {
    const last = new Map<string, string>();
    const next = new Map<string, string>();
    if (foodIds.length === 0) {
      return { last, next };
    }
    const base = [{ food: { _in: [...foodIds] } }, canteen ? { canteen: { _eq: canteen } } : undefined, MenuInsightsService.NOT_A_COMPONENT];
    const [lastRows, nextRows] = await Promise.all([this.readSafe(CollectionNames.FOODOFFERS, { aggregate: { max: ['date'] }, group: ['food'], filter: MenuInsightsService.and([...base, { date: { _lte: today } }]), limit: -1 }), this.readSafe(CollectionNames.FOODOFFERS, { aggregate: { min: ['date'] }, group: ['food'], filter: MenuInsightsService.and([...base, { date: { _gt: today } }]), limit: -1 })]);
    for (const row of lastRows) {
      const date = (row.max as { date?: unknown } | undefined)?.date;
      if (row.food && date) {
        last.set(String(row.food), String(date).slice(0, 10));
      }
    }
    for (const row of nextRows) {
      const date = (row.min as { date?: unknown } | undefined)?.date;
      if (row.food && date) {
        next.set(String(row.food), String(date).slice(0, 10));
      }
    }
    return { last, next };
  }

  private async readLabels(collection: string, language: string): Promise<Map<string, Row & { name: string }>> {
    const rows = await this.readSafe(collection, { fields: ['id', 'alias', 'icon', 'sort', 'translations.languages_code', 'translations.text'], sort: ['sort', 'alias'], limit: -1 });
    return new Map(rows.map(row => [String(row.id), { ...row, name: MenuInsightsService.getName(row, language, 'text') ?? String(row.id) }]));
  }

  private static toLabels(counts: Map<string, { likes: number; dislikes: number }>, labels: Map<string, Row & { name: string }>): MenuInsightsLabel[] {
    return [...counts.entries()]
      .map(([id, count]) => {
        const label = labels.get(id);
        return { id, name: label?.name ?? id, icon: typeof label?.icon === 'string' ? label.icon : null, likes: count.likes, dislikes: count.dislikes };
      })
      .filter(label => label.likes + label.dislikes > 0)
      .sort((a, b) => b.likes + b.dislikes - (a.likes + a.dislikes) || a.name.localeCompare(b.name));
  }

  private static toLabelRows(rows: readonly Row[]): MenuInsightsLabelRow[] {
    return rows.map(row => ({ label: MenuInsightsHelper.readId(row.label), like: row.like === true || row.like === 1, dislike: row.dislike === true || row.dislike === 1, count: MenuInsightsHelper.readCount(row) }));
  }

  /**
   * The insights of `days` days up to today, for one canteen or (`canteen: null`) all of them. Names
   * of foods, markings and labels in `language` (falling back to German, English, the alias).
   */
  async getInsights(options: { canteen: string | null; days: number; language: string; today?: Date }): Promise<MenuInsights> {
    const { canteen, language } = options;
    const period = MenuInsightsHelper.getPeriod(options.days, options.today);
    const today = period.to;
    const previousPeriod = MenuInsightsHelper.getPreviousPeriod(period);
    const upcomingRange = MenuInsightsHelper.getUpcomingRange(options.today);
    const canteenFilter = canteen ? { canteen: { _eq: canteen } } : undefined;

    const [[previousOfferRows, previousRatingRows, previousVisitRows], [upcomingOfferRows, upcomingMarkingRows]] = await Promise.all([
      Promise.all([this.readSafe(CollectionNames.FOODOFFERS, { aggregate: { count: ['id'], countDistinct: ['food'] }, filter: MenuInsightsService.buildOfferFilter(previousPeriod, canteen) }), this.readSafe(CollectionNames.FOODS_FEEDBACKS, { aggregate: { count: ['id'] }, group: ['rating'], filter: MenuInsightsService.and([{ rating: { _nnull: true } }, canteenFilter, MenuInsightsService.buildChangedInRangeFilter(previousPeriod)]), limit: -1 }), this.readSafe(CANTEEN_VISITS, { aggregate: { count: ['id'] }, filter: MenuInsightsService.and([MenuInsightsService.buildVisitDateFilter(previousPeriod), canteenFilter]) })]),
      Promise.all([
        this.readSafe(CollectionNames.FOODOFFERS, { fields: ['id', 'date', 'food'], filter: MenuInsightsService.buildOfferFilter(upcomingRange, canteen), sort: ['date'], limit: -1 }),
        this.readSafe(CollectionNames.FOODOFFER_MARKINGS, {
          fields: ['foodoffers_id', 'markings_id'],
          filter: MenuInsightsService.and([{ foodoffers_id: { date: { _between: [upcomingRange.from, upcomingRange.to] } } }, canteen ? { foodoffers_id: { canteen: { _eq: canteen } } } : undefined]),
          limit: -1,
        }),
      ]),
    ]);

    const [offerRows, offerMarkingRows, ratingRows, waitingRows, markingRows, profileMarkingRows, foodLabelRows, canteenLabelRows, visitRows, visitProfileRows, languageRows, languages, canteens, foodLabels, canteenLabels] = await Promise.all([
      this.readOffers(period, canteen, ['id', 'date', 'food']),
      this.readSafe(CollectionNames.FOODOFFER_MARKINGS, {
        fields: ['foodoffers_id', 'markings_id'],
        filter: MenuInsightsService.and([{ foodoffers_id: { date: { _between: [period.from, period.to] } } }, canteen ? { foodoffers_id: { canteen: { _eq: canteen } } } : undefined]),
        limit: -1,
      }),
      this.readSafe(CollectionNames.FOODS_FEEDBACKS, { aggregate: { count: ['id'] }, group: ['food', 'rating'], filter: MenuInsightsService.and([{ rating: { _nnull: true } }, canteenFilter, MenuInsightsService.buildChangedInRangeFilter(period)]), limit: -1 }),
      this.readSafe(CollectionNames.FOODS_FEEDBACKS, { aggregate: { count: ['id'] }, group: ['food'], filter: { notify: { _eq: true } }, limit: -1 }),
      this.readSafe(CollectionNames.MARKINGS, { fields: ['id', 'alias', 'short_code', 'image', 'image_remote_url', 'sort', 'group.id', 'group.alias', 'group.translations.languages_code', 'group.translations.name', ...TRANSLATION_FIELDS], sort: ['sort', 'alias'], limit: -1 }),
      this.readSafe(PROFILES_MARKINGS, { aggregate: { count: ['id'] }, group: ['markings_id', 'like', 'dislike'], limit: -1 }),
      this.readSafe(CollectionNames.FOODS_FEEDBACKS_LABELS_ENTRIES, { aggregate: { count: ['id'] }, group: ['label', 'like', 'dislike'], filter: MenuInsightsService.and([canteenFilter, MenuInsightsService.buildChangedInRangeFilter(period)]), limit: -1 }),
      this.readSafe(CollectionNames.CANTEENS_FEEDBACKS_LABELS_ENTRIES, { aggregate: { count: ['id'] }, group: ['label', 'like', 'dislike'], filter: MenuInsightsService.and([canteenFilter, MenuInsightsService.buildChangedInRangeFilter(period)]), limit: -1 }),
      this.readSafe(CANTEEN_VISITS, { aggregate: { count: ['id'] }, group: ['date', 'canteen'], filter: MenuInsightsService.and([MenuInsightsService.buildVisitDateFilter(period), canteenFilter]), limit: -1 }),
      this.readSafe(CANTEEN_VISITS, { aggregate: { countDistinct: ['profile'] }, filter: MenuInsightsService.and([MenuInsightsService.buildVisitDateFilter(period), canteenFilter]) }),
      this.readSafe(CollectionNames.PROFILES, { aggregate: { count: ['id'] }, group: ['language'], limit: -1 }),
      this.readSafe(CollectionNames.LANGUAGES, { fields: ['code', 'name'], limit: -1 }),
      this.readSafe(CollectionNames.CANTEENS, { fields: ['id', 'alias'], limit: -1 }),
      this.readLabels(CollectionNames.FOODS_FEEDBACK_LABELS, language),
      this.readLabels(CollectionNames.CANTEENS_FEEDBACK_LABELS, language),
    ]);

    // Offers and variety
    const offers: MenuInsightsOfferRow[] = offerRows.map(row => ({ id: String(row.id), date: typeof row.date === 'string' ? row.date : null, food: MenuInsightsHelper.readId(row.food) }));
    const offerSummary = MenuInsightsHelper.summarizeOffers(offers);

    // Ratings in the period
    const ratings: MenuInsightsRatingRow[] = ratingRows.map(row => ({ food: MenuInsightsHelper.readId(row.food), rating: MenuInsightsHelper.readRating(row.rating), count: MenuInsightsHelper.readCount(row) }));
    const ratingsPerFood = MenuInsightsHelper.getRatingsPerFood(ratings);
    const ratingDistribution = MenuInsightsHelper.getRatingDistribution(ratings);

    // Waiting for a push message
    const waitingPerFood = new Map<string, number>();
    for (const row of waitingRows) {
      const food = MenuInsightsHelper.readId(row.food);
      if (food) {
        waitingPerFood.set(food, MenuInsightsHelper.readCount(row));
      }
    }

    const topIds = MenuInsightsHelper.getRankedFoodIds(ratingsPerFood, true);
    const flopIds = MenuInsightsHelper.getRankedFoodIds(ratingsPerFood, false).filter(id => !topIds.includes(id));
    const awaitedIds = MenuInsightsHelper.getTopIds(waitingPerFood, MenuInsightsHelper.LIST_LIMIT);
    const mostOfferedIds = MenuInsightsHelper.getTopIds(offerSummary.countPerFood, MenuInsightsHelper.LIST_LIMIT);
    const listedIds = [...new Set([...topIds, ...flopIds, ...awaitedIds, ...mostOfferedIds])];
    const upcomingFoodIds = upcomingOfferRows.map(row => MenuInsightsHelper.readId(row.food)).filter((id): id is string => !!id);
    const [foods, offerDates] = await Promise.all([this.readFoods([...new Set([...listedIds, ...upcomingFoodIds])], language), this.readOfferDates(listedIds, canteen, today)]);

    /** `allTime`: the stored average of all ratings instead of the ones in the period (for awaited foods). */
    const toFood = (id: string, allTime = false): MenuInsightsFood => {
      const food = foods.get(id);
      const periodRating = ratingsPerFood.get(id);
      const storedAverage = MenuInsightsHelper.readRating(food?.rating_average);
      return {
        id,
        name: food?.name ?? id,
        image: typeof food?.image === 'string' ? food.image : null,
        image_remote_url: typeof food?.image_remote_url === 'string' ? food.image_remote_url : null,
        rating_average: allTime ? storedAverage : (periodRating?.average ?? null),
        rating_count: allTime ? Number(food?.rating_amount ?? 0) || 0 : (periodRating?.count ?? 0),
        offer_count: offerSummary.countPerFood.get(id) ?? 0,
        waiting_count: waitingPerFood.get(id) ?? 0,
        last_offered: offerDates.last.get(id) ?? null,
        next_offered: offerDates.next.get(id) ?? null,
      };
    };

    // Markings
    const offerMarkings: MenuInsightsOfferMarkingRow[] = offerMarkingRows.map(row => ({ foodoffers_id: MenuInsightsHelper.readId(row.foodoffers_id), markings_id: MenuInsightsHelper.readId(row.markings_id) }));
    const coverage = MenuInsightsHelper.getMarkingCoverage(offers, offerMarkings);
    const profileMarkings: MenuInsightsProfileMarkingRow[] = profileMarkingRows.map(row => ({ markings_id: MenuInsightsHelper.readId(row.markings_id), like: row.like === true || row.like === 1, dislike: row.dislike === true || row.dislike === 1, count: MenuInsightsHelper.readCount(row) }));
    const profileMarkingCounts = MenuInsightsHelper.getProfileMarkingCounts(profileMarkings);
    const markings: (MenuInsightsMarking & { alias: string | null })[] = markingRows
      .map(row => {
        const id = String(row.id);
        const markingCoverage = coverage.get(id);
        const preference = profileMarkingCounts.get(id);
        const group = row.group && typeof row.group === 'object' ? (row.group as Row) : undefined;
        return {
          id,
          name: MenuInsightsService.getName(row, language) ?? id,
          short_code: typeof row.short_code === 'string' ? row.short_code : null,
          group_name: MenuInsightsService.getName(group, language) ?? null,
          image: typeof row.image === 'string' ? row.image : null,
          image_remote_url: typeof row.image_remote_url === 'string' ? row.image_remote_url : null,
          offer_count: markingCoverage?.offerCount ?? 0,
          offer_share: MenuInsightsHelper.getShare(markingCoverage?.offerCount ?? 0, offerSummary.total),
          day_coverage: MenuInsightsHelper.getShare(markingCoverage?.days.size ?? 0, offerSummary.offerDays),
          profile_likes: preference?.likes ?? 0,
          profile_dislikes: preference?.dislikes ?? 0,
          alias: typeof row.alias === 'string' ? row.alias : null,
        };
      })
      .filter(marking => marking.offer_count > 0 || marking.profile_likes > 0 || marking.profile_dislikes > 0)
      .sort((a, b) => b.offer_count - a.offer_count || a.name.localeCompare(b.name));
    const dietMarkingIds = markings.filter(marking => MenuInsightsHelper.isDietMarking(marking)).map(marking => marking.id);

    // Upcoming offers, each food once per day (several canteens may offer it)
    const markingsById = new Map(
      markingRows.map(row => {
        const id = String(row.id);
        const name = MenuInsightsService.getName(row, language) ?? id;
        return [id, { id, name, short_code: typeof row.short_code === 'string' ? row.short_code : null, diet: MenuInsightsHelper.isDietMarking({ alias: typeof row.alias === 'string' ? row.alias : null, short_code: typeof row.short_code === 'string' ? row.short_code : null, name }) }];
      })
    );
    const markingIdsByOffer = new Map<string, string[]>();
    for (const row of upcomingMarkingRows) {
      const offerId = MenuInsightsHelper.readId(row.foodoffers_id);
      const markingId = MenuInsightsHelper.readId(row.markings_id);
      if (offerId && markingId) {
        markingIdsByOffer.set(offerId, [...(markingIdsByOffer.get(offerId) ?? []), markingId]);
      }
    }
    const upcomingByDate = new Map<string, MenuInsightsUpcomingDay>(MenuInsightsHelper.getDates(upcomingRange).map(date => [date, { date, offers: [], has_diet_option: false }]));
    for (const row of upcomingOfferRows) {
      const date = typeof row.date === 'string' ? row.date.slice(0, 10) : null;
      const foodId = MenuInsightsHelper.readId(row.food);
      const day = date ? upcomingByDate.get(date) : undefined;
      if (!day || !foodId || day.offers.some(offer => offer.food.id === foodId)) {
        continue;
      }
      const offerMarkingList = (markingIdsByOffer.get(String(row.id)) ?? []).map(id => markingsById.get(id)).filter((marking): marking is NonNullable<typeof marking> => !!marking);
      day.offers.push({ food: toFood(foodId, true), markings: offerMarkingList.map(({ diet: _diet, ...marking }) => marking) });
      day.has_diet_option = day.has_diet_option || offerMarkingList.some(marking => marking.diet);
    }

    // Previous period
    const previousRatings = MenuInsightsHelper.getRatingDistribution(previousRatingRows.map(row => ({ food: null, rating: MenuInsightsHelper.readRating(row.rating), count: MenuInsightsHelper.readCount(row) })));
    const previousOffers = previousOfferRows[0] as { count?: unknown; countDistinct?: unknown } | undefined;

    // Visits
    const visits: MenuInsightsVisitRow[] = visitRows.map(row => ({ date: typeof row.date === 'string' ? row.date : null, canteen: MenuInsightsHelper.readId(row.canteen), count: MenuInsightsHelper.readCount(row) }));
    const visitSummary = MenuInsightsHelper.summarizeVisits(visits);
    const canteenNames = new Map(canteens.map(row => [String(row.id), (typeof row.alias === 'string' && row.alias) || String(row.id)]));

    // Languages
    const languageNames = new Map(languages.map(row => [String(row.code), (typeof row.name === 'string' && row.name) || String(row.code)]));
    const languageCounts: MenuInsightsNamedCount[] = languageRows
      .map(row => {
        const code = MenuInsightsHelper.readId(row.language);
        return { id: code ?? '', name: code ? (languageNames.get(code) ?? code) : '', count: MenuInsightsHelper.readCount(row) };
      })
      .filter(entry => entry.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      period,
      canteen,
      offers: {
        total: offerSummary.total,
        distinct_foods: offerSummary.distinctFoods,
        offer_days: offerSummary.offerDays,
        average_per_day: offerSummary.offerDays > 0 ? offerSummary.total / offerSummary.offerDays : 0,
        foods_offered_once: offerSummary.foodsOfferedOnce,
        most_offered: mostOfferedIds.map(id => toFood(id)),
      },
      ratings: {
        count: ratingDistribution.count,
        average: ratingDistribution.average,
        distribution: ratingDistribution.distribution,
        food_distribution: MenuInsightsHelper.getFoodStarDistribution(ratingsPerFood),
        rated_foods: [...ratingsPerFood.values()].filter(entry => entry.count >= MenuInsightsHelper.MIN_RATINGS).length,
        min_ratings: MenuInsightsHelper.MIN_RATINGS,
        good_share: MenuInsightsHelper.getGoodShare(ratingDistribution.distribution),
        top: topIds.map(id => toFood(id)),
        flop: flopIds.map(id => toFood(id)),
      },
      awaited: awaitedIds.map(id => toFood(id, true)),
      markings: markings.map(({ alias: _alias, ...marking }) => marking),
      days_without_diet_option: dietMarkingIds.length > 0 ? MenuInsightsHelper.countDaysWithout(offers, coverage, dietMarkingIds) : 0,
      food_labels: MenuInsightsService.toLabels(MenuInsightsHelper.getLabelCounts(MenuInsightsService.toLabelRows(foodLabelRows)), foodLabels),
      canteen_labels: MenuInsightsService.toLabels(MenuInsightsHelper.getLabelCounts(MenuInsightsService.toLabelRows(canteenLabelRows)), canteenLabels),
      visits: {
        total: visitSummary.total,
        profiles: MenuInsightsHelper.readCount({ count: (visitProfileRows[0] as { countDistinct?: unknown } | undefined)?.countDistinct }),
        per_weekday: visitSummary.perWeekday,
        per_canteen: [...visitSummary.perCanteen.entries()].map(([id, count]) => ({ id, name: canteenNames.get(id) ?? id, count })).sort((a, b) => b.count - a.count),
      },
      languages: languageCounts,
      profiles_total: languageCounts.reduce((sum, entry) => sum + entry.count, 0),
      previous: {
        from: previousPeriod.from,
        to: previousPeriod.to,
        offers: MenuInsightsHelper.readCount({ count: previousOffers?.count }),
        distinct_foods: MenuInsightsHelper.readCount({ count: previousOffers?.countDistinct }),
        rating_count: previousRatings.count,
        rating_average: previousRatings.average,
        good_share: MenuInsightsHelper.getGoodShare(previousRatings.distribution),
        visits: MenuInsightsHelper.readCount(previousVisitRows[0]),
      },
      upcoming: { from: upcomingRange.from, to: upcomingRange.to, days: [...upcomingByDate.values()] },
    };
  }

  /** The offers of the reference weeks, per day, with ratings and the latest comments per food. */
  private async readReferenceDays(range: { from: string; to: string }, canteen: string | null, language: string): Promise<MenuPlanningPastDay[]> {
    const rows = await this.readOffers(range, canteen, ['id', 'date', 'food', 'category', 'foodoffer_category.alias', 'foodoffer_category.translations.languages_code', 'foodoffer_category.translations.name']);
    const foodIds = [...new Set(rows.map(row => MenuInsightsHelper.readId(row.food)).filter((id): id is string => !!id))];
    const [foods, commentRows] = await Promise.all([
      this.readFoods(foodIds, language),
      foodIds.length > 0
        ? this.readSafe(CollectionNames.FOODS_FEEDBACKS, {
            fields: ['food', 'comment'],
            filter: { _and: [{ food: { _in: foodIds } }, { comment: { _nnull: true } }, { comment: { _nempty: true } }] },
            sort: ['-date_created'],
            limit: foodIds.length * MenuPlanningHelper.COMMENTS_PER_FOOD * 3,
          })
        : Promise.resolve([] as Row[]),
    ]);
    const commentsPerFood = new Map<string, string[]>();
    for (const row of commentRows) {
      const food = MenuInsightsHelper.readId(row.food);
      const comments = food ? (commentsPerFood.get(food) ?? []) : [];
      if (food && typeof row.comment === 'string' && comments.length < MenuPlanningHelper.COMMENTS_PER_FOOD) {
        commentsPerFood.set(food, [...comments, MenuPlanningHelper.shortenComment(row.comment)]);
      }
    }

    const days = new Map<string, MenuPlanningPastDay>();
    for (const row of rows) {
      const date = typeof row.date === 'string' ? row.date.slice(0, 10) : null;
      if (!date) {
        continue;
      }
      const day = days.get(date) ?? { date, offers: [] };
      const foodId = MenuInsightsHelper.readId(row.food);
      // Several canteens offer the same food: once per day is enough for the AI.
      if (foodId && day.offers.some(offer => offer.food_id === foodId)) {
        continue;
      }
      const food = foodId ? foods.get(foodId) : undefined;
      const categoryRow = row.foodoffer_category && typeof row.foodoffer_category === 'object' ? (row.foodoffer_category as Row) : undefined;
      day.offers.push({
        food_id: foodId,
        name: food?.name ?? foodId ?? '?',
        category: MenuInsightsService.getName(categoryRow, language) ?? ((typeof row.category === 'string' && row.category) || null),
        rating_average: MenuInsightsHelper.readRating(food?.rating_average),
        rating_count: Number(food?.rating_amount ?? 0) || 0,
        comments: foodId ? (commentsPerFood.get(foodId) ?? []) : [],
      });
      days.set(date, day);
    }
    return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  /** The context of the planned weeks and, when a provider is configured, the suggestion of the AI. */
  async plan(request: MenuPlanningRequest): Promise<MenuPlanningResult> {
    const range = MenuPlanningHelper.getRange(request.year, request.week, request.weeks);
    const referenceRange = MenuPlanningHelper.getReferenceRange(request.year, request.week, request.weeks);
    const [referenceDays, insights] = await Promise.all([this.readReferenceDays(referenceRange, request.canteen, request.language), this.getInsights({ canteen: request.canteen, days: 365, language: request.language })]);

    const context: MenuPlanningContext = {
      range,
      reference_range: referenceRange,
      reference_days: referenceDays,
      offers_per_day: MenuPlanningHelper.getOffersPerDay(referenceDays),
      top_foods: insights.ratings.top,
      flop_foods: insights.ratings.flop,
      awaited_foods: insights.awaited,
      markings: insights.markings,
      languages: insights.languages,
    };

    const client = await DirectusOpenAiCompatibleClient.fromDirectusSettings(this.apiContext);
    if (!client) {
      return { context, suggestion: null, error_code: MenuPlanningErrorCode.AI_NOT_CONFIGURED };
    }
    try {
      const answer = await client.chatJson({ system: MenuPlanningHelper.buildSystemPrompt(request.language), user: MenuPlanningHelper.buildUserPrompt(request, context) });
      return { context, suggestion: MenuPlanningHelper.parseSuggestion(answer, request, context, client.getRecommenderLabel()), error_code: null };
    } catch (error) {
      this.apiContext.logger.error(`menu planning: the AI failed: ${error instanceof Error ? error.message : String(error)}`);
      return { context, suggestion: null, error_code: MenuPlanningErrorCode.AI_FAILED };
    }
  }
}
