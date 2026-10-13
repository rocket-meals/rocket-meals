/**
 * FoodFeedbackChatHelper.ts – the Directus side of the page "Speise-Feedbacks" in the module
 * `Rocket Meals`: which fields and endpoints it reads, how a status looks (label, icon, colour).
 *
 * The rules themselves – status of a feedback, filters, who may be answered, how a chat is
 * created, who wrote a message – live in `repo-depkit-common` (`FoodFeedbackChatStatusHelper`,
 * `ChatHelper`, `RelationHelper`), so the apps and the hooks use exactly the same ones.
 *
 * Plain logic without Vue or Directus app imports, so it can be unit tested in Node.
 */

// Not the package index: this file is bundled into the Directus app, see BackendTranslator.ts.
import { CollectionNames } from 'repo-depkit-common/src/databaseTypes/CollectionNames';
import { FoodFeedbackChatFilter, FoodFeedbackChatStatus, FoodFeedbackChatStatusHelper } from 'repo-depkit-common/src/FoodFeedbackChatStatusHelper';
import { BackendTranslationKeys } from '../translations/BackendTranslationKeys';
import { ModuleListHelper, type ModuleStatusCountRequest, type ModuleStatusListRequest } from './ModuleListHelper';
import type { ModuleChatMessage } from './ChatQueryHelper';
import type { ModuleCanteenRelation, ModuleChatRelation, ModuleImageItem, ModuleItem, ModuleItemWithImage, ModuleProfileSummary, ModuleStatusPresentation } from './ModuleItemTypes';

export type FoodFeedbackStatusPresentation = ModuleStatusPresentation;

/** A food feedback with what every page of the module shows of it: the list and the ticker of "Live-Puls". */
export type ModuleFoodFeedback = ModuleItem & {
  rating?: number | null;
  comment?: string | null;
  food?: ModuleImageItem | string | null;
  canteen?: ModuleCanteenRelation;
};

/** The fields the list needs from a feedback, with the relations it expands. */
export type FoodFeedbackListItem = ModuleFoodFeedback & {
  profile?: (ModuleProfileSummary & { date_updated?: string | null; language?: string | { code?: string | null } | null }) | string | null;
  chat?: ModuleChatRelation;
};

/** A message of a support chat – the same shape for every chat of the module, see `ChatQueryHelper`. */
export type FoodFeedbackChatMessage = ModuleChatMessage;

/** Order of the list. */
export enum FoodFeedbackListSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  RATING_WORST = 'rating_worst',
  RATING_BEST = 'rating_best',
}

/** Groups of star ratings the list can be limited to. */
export enum FoodFeedbackRatingFilter {
  ALL = 'all',
  BAD = 'bad',
  MEDIUM = 'medium',
  GOOD = 'good',
  NONE = 'none',
}

/** What a feedback has to contain to be listed. Several selected = any of them. */
export enum FoodFeedbackContentFilter {
  WITH_COMMENT = 'with_comment',
  WITH_RATING = 'with_rating',
}

/** Everything the list can be narrowed down by, besides the status chips. */
export type FoodFeedbackListOptions = {
  /** Only feedbacks with one of these contents; empty = with comment or rating. Default: with comment. */
  contents?: readonly FoodFeedbackContentFilter[] | null;
  /** Only feedbacks of these canteens; empty = all canteens. */
  canteenIds?: readonly string[] | null;
  /** Part of the food name. */
  foodSearch?: string | null;
  rating?: FoodFeedbackRatingFilter | null;
  sort?: FoodFeedbackListSort | null;
  pageSize?: number | null;
};

/** A canteen of the canteen filter, with its picture. */
export type FoodFeedbackCanteenOption = ModuleImageItem;

type DirectusFilter = Record<string, unknown>;

export class FoodFeedbackChatHelper {
  public static readonly SORTS: readonly FoodFeedbackListSort[] = [FoodFeedbackListSort.NEWEST, FoodFeedbackListSort.OLDEST, FoodFeedbackListSort.RATING_WORST, FoodFeedbackListSort.RATING_BEST];
  public static readonly RATING_FILTERS: readonly FoodFeedbackRatingFilter[] = [FoodFeedbackRatingFilter.ALL, FoodFeedbackRatingFilter.BAD, FoodFeedbackRatingFilter.MEDIUM, FoodFeedbackRatingFilter.GOOD, FoodFeedbackRatingFilter.NONE];
  public static readonly CONTENT_FILTERS: readonly FoodFeedbackContentFilter[] = [FoodFeedbackContentFilter.WITH_COMMENT, FoodFeedbackContentFilter.WITH_RATING];
  /** Support mainly answers comments, so only those are listed until more is asked for. */
  public static readonly DEFAULT_CONTENT_FILTERS: readonly FoodFeedbackContentFilter[] = [FoodFeedbackContentFilter.WITH_COMMENT];

  /** Edge length in px of the food image in the list (requested at twice the size for HiDPI). */
  public static readonly FOOD_IMAGE_SIZE = 64;
  /** Edge length in px of the canteen picture in the canteen filter. */
  public static readonly CANTEEN_IMAGE_SIZE = 24;

  /** Fields of the list. */
  public static readonly LIST_FIELDS = ['id', 'comment', 'rating', 'date_created', 'date_updated', 'food.id', 'food.alias', 'food.image', 'food.image_remote_url', 'canteen.id', 'canteen.alias', 'profile.id', 'profile.nickname', 'profile.avatar', 'profile.date_updated', 'profile.language', 'chat.id', 'chat.conversation_state', 'chat.date_updated'];

  static readonly CANTEENS_ENDPOINT = `/items/${CollectionNames.CANTEENS}`;
  static readonly FOOD_FEEDBACKS_ENDPOINT = `/items/${CollectionNames.FOODS_FEEDBACKS}`;

  static getStatusPresentation(status: FoodFeedbackChatStatus): FoodFeedbackStatusPresentation {
    switch (status) {
      case FoodFeedbackChatStatus.NEW:
        return { labelKey: BackendTranslationKeys.rocket_meals_module_status_new, icon: 'fiber_new', color: 'var(--theme--primary)' };
      case FoodFeedbackChatStatus.WAITING_FOR_SUPPORT:
        return {
          labelKey: BackendTranslationKeys.rocket_meals_module_status_waiting_for_support,
          icon: 'schedule',
          color: 'var(--theme--warning)',
        };
      case FoodFeedbackChatStatus.WAITING_FOR_USER:
        return {
          labelKey: BackendTranslationKeys.rocket_meals_module_status_waiting_for_user,
          icon: 'mark_chat_read',
          color: 'var(--theme--success)',
        };
      case FoodFeedbackChatStatus.RESOLVED:
        return {
          labelKey: BackendTranslationKeys.rocket_meals_module_status_resolved,
          icon: 'task_alt',
          color: 'var(--theme--foreground-subdued)',
        };
    }
  }

  static getFilterLabelKey(filter: FoodFeedbackChatFilter): BackendTranslationKeys {
    switch (filter) {
      case FoodFeedbackChatFilter.OPEN:
        return BackendTranslationKeys.rocket_meals_module_filter_open;
      case FoodFeedbackChatFilter.ALL:
        return BackendTranslationKeys.rocket_meals_module_filter_all;
      default:
        return FoodFeedbackChatHelper.getStatusPresentation(filter as unknown as FoodFeedbackChatStatus).labelKey;
    }
  }

  /** The Directus `sort` of an order; ties are broken by date, newest first. */
  static getSortParameter(sort?: FoodFeedbackListSort | null): string {
    switch (sort) {
      case FoodFeedbackListSort.OLDEST:
        return 'date_created';
      case FoodFeedbackListSort.RATING_WORST:
        return 'rating,-date_created';
      case FoodFeedbackListSort.RATING_BEST:
        return '-rating,-date_created';
      default:
        return '-date_created';
    }
  }

  /** The Directus filter of a rating group (stars 1–5), `undefined` for all ratings. */
  static buildRatingFilter(rating?: FoodFeedbackRatingFilter | null): DirectusFilter | undefined {
    switch (rating) {
      case FoodFeedbackRatingFilter.BAD:
        return { rating: { _between: [1, 2] } };
      case FoodFeedbackRatingFilter.MEDIUM:
        return { rating: { _eq: 3 } };
      case FoodFeedbackRatingFilter.GOOD:
        return { rating: { _between: [4, 5] } };
      case FoodFeedbackRatingFilter.NONE:
        return { rating: { _null: true } };
      default:
        return undefined;
    }
  }

  /** The selected contents; `undefined` = the default, empty = all contents. */
  static getContents(contents?: readonly FoodFeedbackContentFilter[] | null): FoodFeedbackContentFilter[] {
    const known = (contents ?? FoodFeedbackChatHelper.DEFAULT_CONTENT_FILTERS).filter(content => FoodFeedbackChatHelper.CONTENT_FILTERS.includes(content));
    return known.length > 0 ? known : [...FoodFeedbackChatHelper.CONTENT_FILTERS];
  }

  /** Whether the rating filter applies – only when feedbacks with a rating are listed. */
  static isRatingFilterAvailable(contents?: readonly FoodFeedbackContentFilter[] | null): boolean {
    return FoodFeedbackChatHelper.getContents(contents).includes(FoodFeedbackContentFilter.WITH_RATING);
  }

  /** The rating groups offered: "without rating" only makes sense when feedbacks with only a comment are listed too. */
  static getRatingFilters(contents?: readonly FoodFeedbackContentFilter[] | null): FoodFeedbackRatingFilter[] {
    const withComment = FoodFeedbackChatHelper.getContents(contents).includes(FoodFeedbackContentFilter.WITH_COMMENT);
    return FoodFeedbackChatHelper.RATING_FILTERS.filter(rating => withComment || rating !== FoodFeedbackRatingFilter.NONE);
  }

  /** The Directus filter of the selected contents, any of them has to be present. */
  static buildContentFilter(contents?: readonly FoodFeedbackContentFilter[] | null): DirectusFilter {
    const parts = FoodFeedbackChatHelper.getContents(contents).map(content => (content === FoodFeedbackContentFilter.WITH_RATING ? { rating: { _nnull: true } } : { comment: { _nempty: true } }));
    return parts.length === 1 ? parts[0]! : { _or: parts };
  }

  /** The status filter combined with content, canteen, food and rating of the options. */
  static buildFilter(filter: FoodFeedbackChatFilter, options: FoodFeedbackListOptions = {}): DirectusFilter {
    const statusFilter = FoodFeedbackChatStatusHelper.buildStatusFilter(filter);
    const contentAndStatus = [FoodFeedbackChatHelper.buildContentFilter(options.contents), ...(statusFilter ? [statusFilter] : [])];
    const parts: DirectusFilter[] = [{ _and: contentAndStatus }];
    const canteenIds = (options.canteenIds ?? []).filter(id => !!id);
    if (canteenIds.length > 0) {
      parts.push({ canteen: { _in: canteenIds } });
    }
    const foodSearch = options.foodSearch?.trim();
    if (foodSearch) {
      parts.push({ food: { alias: { _icontains: foodSearch } } });
    }
    const ratingFilter = FoodFeedbackChatHelper.isRatingFilterAvailable(options.contents) ? FoodFeedbackChatHelper.buildRatingFilter(options.rating) : undefined;
    if (ratingFilter) {
      parts.push(ratingFilter);
    }
    return parts.length === 1 ? parts[0]! : { _and: parts };
  }

  /** URL parameters of the list request. Newest feedbacks first unless sorted otherwise. */
  static buildListQuery(request: ModuleStatusListRequest<FoodFeedbackChatFilter, FoodFeedbackListOptions>) {
    const options = request.options ?? {};
    return ModuleListHelper.buildListQuery({ fields: FoodFeedbackChatHelper.LIST_FIELDS, filter: FoodFeedbackChatHelper.buildFilter(request.filter, options), sort: FoodFeedbackChatHelper.getSortParameter(options.sort), page: request.page, pageSize: options.pageSize, search: request.search });
  }

  /** URL parameters to count the feedbacks of one filter chip – with the same canteen, food and rating filter as the list. */
  static buildCountQuery(request: ModuleStatusCountRequest<FoodFeedbackChatFilter, FoodFeedbackListOptions>) {
    return ModuleListHelper.buildCountQuery({ filter: FoodFeedbackChatHelper.buildFilter(request.filter, request.options), search: request.search });
  }

  /** URL parameters to load the canteens for the canteen filter. */
  static buildCanteensQuery() {
    return { fields: 'id,alias,image,image_remote_url', sort: 'sort,alias', limit: -1 };
  }

  static getSortLabelKey(sort: FoodFeedbackListSort): BackendTranslationKeys {
    switch (sort) {
      case FoodFeedbackListSort.NEWEST:
        return BackendTranslationKeys.rocket_meals_module_sort_newest;
      case FoodFeedbackListSort.OLDEST:
        return BackendTranslationKeys.rocket_meals_module_sort_oldest;
      case FoodFeedbackListSort.RATING_WORST:
        return BackendTranslationKeys.rocket_meals_module_sort_rating_worst;
      case FoodFeedbackListSort.RATING_BEST:
        return BackendTranslationKeys.rocket_meals_module_sort_rating_best;
    }
  }

  static getSortIcon(sort: FoodFeedbackListSort): string {
    switch (sort) {
      case FoodFeedbackListSort.NEWEST:
        return 'update';
      case FoodFeedbackListSort.OLDEST:
        return 'history';
      case FoodFeedbackListSort.RATING_WORST:
        return 'trending_down';
      case FoodFeedbackListSort.RATING_BEST:
        return 'trending_up';
    }
  }

  static getContentFilterIcon(content: FoodFeedbackContentFilter): string {
    switch (content) {
      case FoodFeedbackContentFilter.WITH_COMMENT:
        return 'chat_bubble';
      case FoodFeedbackContentFilter.WITH_RATING:
        return 'star';
    }
  }

  static getRatingFilterIcon(rating: FoodFeedbackRatingFilter): string {
    switch (rating) {
      case FoodFeedbackRatingFilter.ALL:
        return 'star_half';
      case FoodFeedbackRatingFilter.BAD:
        return 'sentiment_dissatisfied';
      case FoodFeedbackRatingFilter.MEDIUM:
        return 'sentiment_neutral';
      case FoodFeedbackRatingFilter.GOOD:
        return 'sentiment_very_satisfied';
      case FoodFeedbackRatingFilter.NONE:
        return 'star_outline';
    }
  }

  /** A Directus theme colour of a rating group, `undefined` for the neutral ones. */
  static getRatingFilterColor(rating: FoodFeedbackRatingFilter): string | undefined {
    switch (rating) {
      case FoodFeedbackRatingFilter.BAD:
        return 'var(--theme--danger)';
      case FoodFeedbackRatingFilter.MEDIUM:
        return 'var(--theme--warning)';
      case FoodFeedbackRatingFilter.GOOD:
        return 'var(--theme--success)';
      default:
        return undefined;
    }
  }

  static getContentFilterLabelKey(content: FoodFeedbackContentFilter): BackendTranslationKeys {
    switch (content) {
      case FoodFeedbackContentFilter.WITH_COMMENT:
        return BackendTranslationKeys.rocket_meals_module_content_with_comment;
      case FoodFeedbackContentFilter.WITH_RATING:
        return BackendTranslationKeys.rocket_meals_module_content_with_rating;
    }
  }

  static getRatingFilterLabelKey(rating: FoodFeedbackRatingFilter): BackendTranslationKeys {
    switch (rating) {
      case FoodFeedbackRatingFilter.ALL:
        return BackendTranslationKeys.rocket_meals_module_rating_all;
      case FoodFeedbackRatingFilter.BAD:
        return BackendTranslationKeys.rocket_meals_module_rating_bad;
      case FoodFeedbackRatingFilter.MEDIUM:
        return BackendTranslationKeys.rocket_meals_module_rating_medium;
      case FoodFeedbackRatingFilter.GOOD:
        return BackendTranslationKeys.rocket_meals_module_rating_good;
      case FoodFeedbackRatingFilter.NONE:
        return BackendTranslationKeys.rocket_meals_module_rating_none;
    }
  }

  /**
   * The URL of the food image: the Directus file (as thumbnail, relative to the app's API root –
   * the session cookie authorises it), else the remote URL of the food, else `undefined`.
   */
  static getFoodImageUrl(feedback: Pick<FoodFeedbackListItem, 'food'>, apiRoot: string = '/'): string | undefined {
    const food = feedback.food;
    if (!food || typeof food === 'string') {
      return undefined;
    }
    return FoodFeedbackChatHelper.getImageUrl(food, apiRoot, FoodFeedbackChatHelper.FOOD_IMAGE_SIZE);
  }

  /** The food in the content area of Directus, the target of a click on the food image; `undefined` without food. */
  static getFoodRoute(feedback: Pick<FoodFeedbackListItem, 'food'>): string | undefined {
    const food = feedback.food;
    const foodId = typeof food === 'string' ? food : food?.id;
    return foodId ? `/content/${CollectionNames.FOODS}/${encodeURIComponent(foodId)}` : undefined;
  }

  /** The URL of the canteen picture in the canteen filter, like {@link getFoodImageUrl}. */
  static getCanteenImageUrl(canteen: FoodFeedbackCanteenOption, apiRoot: string = '/'): string | undefined {
    return FoodFeedbackChatHelper.getImageUrl(canteen, apiRoot, FoodFeedbackChatHelper.CANTEEN_IMAGE_SIZE);
  }

  /** The Directus file as square thumbnail of twice `size` px (HiDPI), else the remote URL, else `undefined`. */
  private static getImageUrl(item: ModuleItemWithImage, apiRoot: string, size: number): string | undefined {
    const fileId = typeof item.image === 'object' && item.image !== null ? item.image.id : item.image;
    if (fileId) {
      const root = apiRoot.endsWith('/') ? apiRoot : `${apiRoot}/`;
      const edge = size * 2;
      return `${root}assets/${encodeURIComponent(fileId)}?width=${edge}&height=${edge}&fit=cover&quality=80`;
    }
    return item.image_remote_url || undefined;
  }

  /** Whether a feedback can be marked as done from the list: not done yet, and someone to show the chat to. */
  /** Only a done feedback can be opened again; it always has a chat, the status lives there. */
  static canReopen(feedback: FoodFeedbackListItem): boolean {
    return FoodFeedbackChatStatusHelper.getStatus(feedback) === FoodFeedbackChatStatus.RESOLVED;
  }

  static canMarkResolved(feedback: FoodFeedbackListItem): boolean {
    return FoodFeedbackChatStatusHelper.getStatus(feedback) !== FoodFeedbackChatStatus.RESOLVED && FoodFeedbackChatStatusHelper.canStartChat(feedback);
  }

  static getFoodName(feedback: Pick<FoodFeedbackListItem, 'food'>): string | undefined {
    const food = feedback.food;
    if (!food) {
      return undefined;
    }
    return typeof food === 'string' ? food : food.alias || food.id;
  }

  static getCanteenName(feedback: Pick<FoodFeedbackListItem, 'canteen'>): string | undefined {
    const canteen = feedback.canteen;
    if (!canteen) {
      return undefined;
    }
    return typeof canteen === 'string' ? canteen : canteen.alias || canteen.id;
  }

  /** The name of the backend user who wrote a support message, if known. */
  /** The trimmed nickname of a profile, `undefined` when it is not loaded or empty. */
  static getNickname(profile: { nickname?: string | null } | string | null | undefined): string | undefined {
    if (!profile || typeof profile === 'string') {
      return undefined;
    }
    return profile.nickname?.trim() || undefined;
  }

  static getSupportAuthorName(message: FoodFeedbackChatMessage): string | undefined {
    const user = message.user_created;
    if (!user || typeof user === 'string') {
      return undefined;
    }
    const name = [user.first_name, user.last_name].filter(part => !!part && part.trim().length > 0).join(' ');
    return name || user.email || undefined;
  }
}
