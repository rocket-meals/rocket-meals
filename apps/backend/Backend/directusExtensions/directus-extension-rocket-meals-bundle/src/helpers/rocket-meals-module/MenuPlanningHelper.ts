/**
 * MenuPlanningHelper.ts – data side of the experimental page "Speiseplan-Planung (KI)"
 * (`menu-planning-page.vue`): for one or more calendar weeks, what was offered in the same weeks a
 * year ago (with ratings and comments) and a suggestion of the AI what to offer this time.
 *
 * Source: `POST /rocket-meals-menu-insights/planning` (`menu-insights-endpoint`). The server collects
 * the context (`MenuPlanningContext`), this helper builds the prompt out of it and checks the answer
 * of the AI, so both are testable without a provider.
 *
 * No Vue and no Directus server imports in here, so the file can be bundled into the Directus app.
 */

import { MenuInsightsHelper, type MenuInsightsFood, type MenuInsightsMarking, type MenuInsightsNamedCount } from './MenuInsightsHelper';

export type MenuPlanningRequest = {
  canteen: string | null;
  /** ISO year and ISO week of the first planned week. */
  year: number;
  week: number;
  /** Number of planned weeks, 1 … `MAX_WEEKS`. */
  weeks: number;
  /** Free text of the planner for the AI, e.g. "Mittwoch Aktionstag Indien". */
  notes: string;
  /** Language of the page; the AI answers in it. */
  language: string;
};

export type MenuPlanningPastOffer = {
  food_id: string | null;
  name: string;
  category: string | null;
  /** Average of all ratings of the food, `null` without ratings. */
  rating_average: number | null;
  rating_count: number;
  /** The latest comments on the food, shortened. */
  comments: string[];
};

export type MenuPlanningPastDay = {
  date: string;
  offers: MenuPlanningPastOffer[];
};

export type MenuPlanningDish = {
  name: string;
  /** Id of a known food when the AI suggests one that was offered before, otherwise `null`. */
  food_id: string | null;
  category: string | null;
  reason: string;
};

export type MenuPlanningDay = {
  date: string;
  dishes: MenuPlanningDish[];
};

export type MenuPlanningWeek = {
  year: number;
  week: number;
  days: MenuPlanningDay[];
};

export type MenuPlanningSuggestion = {
  summary: string;
  weeks: MenuPlanningWeek[];
  hints: string[];
  /** Provider and model, e.g. `OpenRouter · gpt-4o`. */
  recommended_by_ai: string;
};

/** Everything the AI gets to see, besides the request. */
export type MenuPlanningContext = {
  range: { from: string; to: string };
  reference_range: { from: string; to: string };
  reference_days: MenuPlanningPastDay[];
  /** Typical number of offers per day in the reference weeks. */
  offers_per_day: number;
  top_foods: MenuInsightsFood[];
  flop_foods: MenuInsightsFood[];
  awaited_foods: MenuInsightsFood[];
  markings: MenuInsightsMarking[];
  languages: MenuInsightsNamedCount[];
};

export enum MenuPlanningErrorCode {
  AI_NOT_CONFIGURED = 'ai_not_configured',
  AI_FAILED = 'ai_failed',
  INVALID_REQUEST = 'invalid_request',
}

export type MenuPlanningResult = {
  context: MenuPlanningContext;
  suggestion: MenuPlanningSuggestion | null;
  /** Why there is no suggestion: no provider configured or the AI failed. */
  error_code: MenuPlanningErrorCode | null;
};

export type MenuPlanningResponse = { data: MenuPlanningResult };

/** The part of the Directus app's axios instance used here. */
export type MenuPlanningApiClient = {
  get: (url: string) => Promise<{ data?: any }>;
  post: (url: string, body: unknown) => Promise<{ data?: any }>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export class MenuPlanningHelper {
  public static readonly PLANNING_ROUTE = '/planning';
  public static readonly STATUS_ROUTE = '/planning/status';
  public static readonly PLANNING_ENDPOINT = `${MenuInsightsHelper.ENDPOINT}${MenuPlanningHelper.PLANNING_ROUTE}`;
  public static readonly STATUS_ENDPOINT = `${MenuInsightsHelper.ENDPOINT}${MenuPlanningHelper.STATUS_ROUTE}`;

  public static readonly MAX_WEEKS = 4;
  public static readonly MAX_NOTES_LENGTH = 1000;
  /** Comments per food of the reference weeks and their length, so the prompt stays small. */
  public static readonly COMMENTS_PER_FOOD = 3;
  public static readonly MAX_COMMENT_LENGTH = 200;
  /** Limits of what is taken from the AI answer. */
  public static readonly MAX_DISHES_PER_DAY = 15;
  public static readonly MAX_TEXT_LENGTH = 500;
  public static readonly MAX_HINTS = 10;

  static async getStatus(api: MenuPlanningApiClient): Promise<{ ai_configured: boolean }> {
    const response = await api.get(MenuPlanningHelper.STATUS_ENDPOINT);
    return { ai_configured: response.data?.data?.ai_configured === true };
  }

  static async plan(api: MenuPlanningApiClient, request: MenuPlanningRequest): Promise<MenuPlanningResult> {
    const response = await api.post(MenuPlanningHelper.PLANNING_ENDPOINT, request);
    return (response.data as MenuPlanningResponse).data;
  }

  /** Monday (UTC) of an ISO week. Week 1 is the week with the 4th of January. */
  static getMondayOfIsoWeek(year: number, week: number): Date {
    const january4 = new Date(Date.UTC(year, 0, 4));
    const weekday = (january4.getUTCDay() + 6) % 7;
    return new Date(january4.getTime() - weekday * DAY_MS + (week - 1) * 7 * DAY_MS);
  }

  /** ISO year and week of a date. */
  static getIsoWeek(date: Date): { year: number; week: number } {
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const weekday = (day.getUTCDay() + 6) % 7;
    // The Thursday of the same week decides about the year.
    const thursday = new Date(day.getTime() + (3 - weekday) * DAY_MS);
    const year = thursday.getUTCFullYear();
    const week = 1 + Math.round((thursday.getTime() - MenuPlanningHelper.getMondayOfIsoWeek(year, 1).getTime() - 3 * DAY_MS) / (7 * DAY_MS));
    return { year, week };
  }

  /** 52 or 53. */
  static getIsoWeeksInYear(year: number): number {
    return MenuPlanningHelper.getIsoWeek(new Date(Date.UTC(year, 11, 28))).week;
  }

  /** The week after the current one, the default of the page. */
  static getNextIsoWeek(today: Date = new Date()): { year: number; week: number } {
    return MenuPlanningHelper.getIsoWeek(new Date(today.getTime() + 7 * DAY_MS));
  }

  /** Monday of the first and Sunday of the last planned week, as `YYYY-MM-DD`. */
  static getRange(year: number, week: number, weeks: number): { from: string; to: string } {
    const monday = MenuPlanningHelper.getMondayOfIsoWeek(year, week);
    const sunday = new Date(monday.getTime() + (weeks * 7 - 1) * DAY_MS);
    return { from: MenuInsightsHelper.toDateString(monday), to: MenuInsightsHelper.toDateString(sunday) };
  }

  /**
   * The same weeks a year earlier. A week 53 that the earlier year does not have becomes its week 52,
   * so "the same time last year" always exists.
   */
  static getReferenceRange(year: number, week: number, weeks: number): { from: string; to: string } {
    const referenceYear = year - 1;
    const referenceWeek = Math.min(week, MenuPlanningHelper.getIsoWeeksInYear(referenceYear));
    return MenuPlanningHelper.getRange(referenceYear, referenceWeek, weeks);
  }

  /** The planned weeks as ISO year and week, e.g. KW 52, KW 1 of the next year. */
  static getPlannedWeeks(year: number, week: number, weeks: number): { year: number; week: number }[] {
    const monday = MenuPlanningHelper.getMondayOfIsoWeek(year, week);
    return Array.from({ length: weeks }, (_, index) => MenuPlanningHelper.getIsoWeek(new Date(monday.getTime() + index * 7 * DAY_MS)));
  }

  /** Checks and normalises a request body; `null` when year or week are not usable. */
  static parseRequest(body: unknown): MenuPlanningRequest | null {
    const raw = (body ?? {}) as Record<string, unknown>;
    const year = Number.parseInt(String(raw.year ?? ''), 10);
    const week = Number.parseInt(String(raw.week ?? ''), 10);
    if (!Number.isFinite(year) || year < 2000 || year > 2200 || !Number.isFinite(week) || week < 1 || week > MenuPlanningHelper.getIsoWeeksInYear(year)) {
      return null;
    }
    const weeksRaw = Number.parseInt(String(raw.weeks ?? '1'), 10);
    const weeks = Number.isFinite(weeksRaw) ? Math.min(MenuPlanningHelper.MAX_WEEKS, Math.max(1, weeksRaw)) : 1;
    const canteen = typeof raw.canteen === 'string' && raw.canteen.trim() ? raw.canteen.trim() : null;
    const notes = typeof raw.notes === 'string' ? raw.notes.trim().slice(0, MenuPlanningHelper.MAX_NOTES_LENGTH) : '';
    const language = typeof raw.language === 'string' && raw.language.trim() ? raw.language.trim().slice(0, 16) : 'de';
    return { canteen, year, week, weeks, notes, language };
  }

  /** A comment shortened to `MAX_COMMENT_LENGTH`, with line breaks as spaces. */
  static shortenComment(comment: string): string {
    const text = comment.split(/\s+/).join(' ').trim();
    return text.length > MenuPlanningHelper.MAX_COMMENT_LENGTH ? `${text.slice(0, MenuPlanningHelper.MAX_COMMENT_LENGTH - 1)}…` : text;
  }

  /** Average number of offers on the days with offers. */
  static getOffersPerDay(days: readonly MenuPlanningPastDay[]): number {
    const withOffers = days.filter(day => day.offers.length > 0);
    if (withOffers.length === 0) {
      return 0;
    }
    return Math.round(withOffers.reduce((sum, day) => sum + day.offers.length, 0) / withOffers.length);
  }

  /** The instructions for the AI; the data follows in the user message. */
  static buildSystemPrompt(language: string): string {
    return ['You help the kitchen team of a university canteen (Studierendenwerk) to plan the menu of the coming weeks.', 'You get the menu of the same weeks one year ago with the ratings (1 to 5 stars) and comments of the guests, the best and worst rated dishes of the last year, the dishes guests are waiting for (they asked for a push message when it is offered), how often each marking (allergens, additives, diets like vegan or vegetarian) was offered compared to how many guests like or avoid it, and the languages of the app users.', 'Suggest a balanced menu for every planned day on which the canteen offered food in the reference weeks (usually Monday to Friday): keep well rated dishes, replace or improve badly rated ones, bring back awaited dishes, offer a vegetarian or vegan choice every day, avoid repeating the same dish within a week and vary the cuisines. When many users speak a language, you may suggest dishes of that culture now and then.', 'Plan about as many dishes per day as in the reference weeks. Prefer dishes the canteen already offered (use their food_id), mark new ideas with food_id null.', `Write all texts (summary, reasons, hints, names of new dishes) in the language with the code "${language}". Keep names of known dishes as given.`, 'Answer with one JSON object only, no other text, in this shape:', '{"summary": string, "weeks": [{"year": number, "week": number, "days": [{"date": "YYYY-MM-DD", "dishes": [{"name": string, "food_id": string | null, "category": string | null, "reason": string}]}]}], "hints": [string]}', '"reason" says in one short sentence why the dish fits (e.g. rating, wish of the guests, balance). "hints" are at most 5 general observations for the planners.'].join('\n');
  }

  /** The data for the AI, as compact JSON. */
  static buildUserPrompt(request: MenuPlanningRequest, context: MenuPlanningContext): string {
    const toFood = (food: MenuInsightsFood) => ({ food_id: food.id, name: food.name, rating_average: MenuPlanningHelper.roundRating(food.rating_average), rating_count: food.rating_count, waiting: food.waiting_count || undefined });
    const data = {
      planned_weeks: MenuPlanningHelper.getPlannedWeeks(request.year, request.week, request.weeks),
      planned_range: context.range,
      notes_of_the_planners: request.notes || undefined,
      dishes_per_day_last_year: context.offers_per_day,
      menu_same_weeks_last_year: context.reference_days.map(day => ({
        date: day.date,
        dishes: day.offers.map(offer => ({ food_id: offer.food_id, name: offer.name, category: offer.category ?? undefined, rating_average: MenuPlanningHelper.roundRating(offer.rating_average), rating_count: offer.rating_count, comments: offer.comments.length > 0 ? offer.comments : undefined })),
      })),
      best_rated_last_year: context.top_foods.map(toFood),
      worst_rated_last_year: context.flop_foods.map(toFood),
      awaited_by_guests: context.awaited_foods.map(toFood),
      markings: context.markings.map(marking => ({ name: marking.name, group: marking.group_name ?? undefined, share_of_offers: Math.round(marking.offer_share * 100) / 100, share_of_days: Math.round(marking.day_coverage * 100) / 100, guests_like: marking.profile_likes, guests_avoid: marking.profile_dislikes })),
      languages_of_users: context.languages.map(language => ({ language: language.name, users: language.count })),
    };
    return JSON.stringify(data);
  }

  private static roundRating(value: number | null): number | null {
    return value === null ? null : Math.round(value * 10) / 10;
  }

  private static readText(value: unknown, maxLength: number = MenuPlanningHelper.MAX_TEXT_LENGTH): string {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
  }

  /**
   * The answer of the AI as suggestion. Only planned weeks and days inside the planned range are
   * kept, unknown `food_id`s become `null`, texts are cut to `MAX_TEXT_LENGTH`.
   */
  static parseSuggestion(answer: unknown, request: MenuPlanningRequest, context: MenuPlanningContext, recommendedByAi: string): MenuPlanningSuggestion {
    const raw = (answer ?? {}) as Record<string, unknown>;
    const knownFoodIds = new Set<string>();
    for (const day of context.reference_days) {
      for (const offer of day.offers) {
        if (offer.food_id) {
          knownFoodIds.add(offer.food_id);
        }
      }
    }
    for (const food of [...context.top_foods, ...context.flop_foods, ...context.awaited_foods]) {
      knownFoodIds.add(food.id);
    }

    const daysByDate = new Map<string, MenuPlanningDish[]>();
    const rawWeeks = Array.isArray(raw.weeks) ? raw.weeks : [];
    for (const rawWeek of rawWeeks) {
      const rawDays = Array.isArray((rawWeek as { days?: unknown })?.days) ? ((rawWeek as { days: unknown[] }).days ?? []) : [];
      for (const rawDay of rawDays) {
        const date = MenuPlanningHelper.readText((rawDay as { date?: unknown })?.date, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < context.range.from || date > context.range.to) {
          continue;
        }
        const rawDishes = Array.isArray((rawDay as { dishes?: unknown })?.dishes) ? (rawDay as { dishes: unknown[] }).dishes : [];
        const dishes = rawDishes
          .map(rawDish => {
            const dish = (rawDish ?? {}) as Record<string, unknown>;
            const foodId = typeof dish.food_id === 'string' && knownFoodIds.has(dish.food_id) ? dish.food_id : null;
            return { name: MenuPlanningHelper.readText(dish.name, 200), food_id: foodId, category: MenuPlanningHelper.readText(dish.category, 100) || null, reason: MenuPlanningHelper.readText(dish.reason) };
          })
          .filter(dish => dish.name.length > 0);
        daysByDate.set(date, [...(daysByDate.get(date) ?? []), ...dishes].slice(0, MenuPlanningHelper.MAX_DISHES_PER_DAY));
      }
    }

    const weeks = MenuPlanningHelper.getPlannedWeeks(request.year, request.week, request.weeks).map(({ year, week }) => {
      const { from, to } = MenuPlanningHelper.getRange(year, week, 1);
      const days = [...daysByDate.entries()]
        .filter(([date]) => date >= from && date <= to)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dishes]) => ({ date, dishes }));
      return { year, week, days };
    });

    const hints = (Array.isArray(raw.hints) ? raw.hints : [])
      .map(hint => MenuPlanningHelper.readText(hint))
      .filter(hint => hint.length > 0)
      .slice(0, MenuPlanningHelper.MAX_HINTS);

    return { summary: MenuPlanningHelper.readText(raw.summary, 2000), weeks, hints, recommended_by_ai: recommendedByAi };
  }

  /** Groups the reference days by ISO week, for the table "same weeks last year". */
  static groupDaysByWeek<T extends { date: string }>(days: readonly T[]): { year: number; week: number; days: T[] }[] {
    const groups = new Map<string, { year: number; week: number; days: T[] }>();
    for (const day of days) {
      const { year, week } = MenuPlanningHelper.getIsoWeek(new Date(`${day.date}T00:00:00Z`));
      const key = `${year}-${week}`;
      const group = groups.get(key) ?? { year, week, days: [] };
      group.days.push(day);
      groups.set(key, group);
    }
    return [...groups.values()];
  }
}
