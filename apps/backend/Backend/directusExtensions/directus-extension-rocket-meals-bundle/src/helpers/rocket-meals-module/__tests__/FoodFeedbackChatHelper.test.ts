import { describe, expect, it } from '@jest/globals';
import { FoodFeedbackChatFilter, FoodFeedbackChatStatus, FoodFeedbackChatStatusHelper } from 'repo-depkit-common';
import { FoodFeedbackChatHelper, FoodFeedbackContentFilter, FoodFeedbackListSort, FoodFeedbackRatingFilter } from '../FoodFeedbackChatHelper';
import { ChatQueryHelper } from '../ChatQueryHelper';
import { FoodFeedbackChatActions } from '../FoodFeedbackChatActions';
import { ModuleListHelper } from '../ModuleListHelper';
import { RocketMealsModulePages } from '../RocketMealsModulePages';
import { AppExtensionLanguageHelper } from '../../app-extensions/AppExtensionLanguageHelper';
import { BackendTranslationKeys } from '../../translations/BackendTranslationKeys';

// The rules (status, filters, chat creation) are tested in repo-depkit-common; this covers the
// Directus side of the page: requests, presentation and texts.
describe('FoodFeedbackChatHelper', () => {
  describe('buildListQuery', () => {
    it('sorts newest first, pages, searches and uses the shared filter', () => {
      const query = FoodFeedbackChatHelper.buildListQuery({ filter: FoodFeedbackChatFilter.OPEN, page: 3, search: '  Pasta ' });
      expect(query.sort).toBe('-date_created');
      expect(query.limit).toBe(ModuleListHelper.PAGE_SIZE);
      expect(query.page).toBe(3);
      expect(query.search).toBe('Pasta');
      expect(query.meta).toBe('filter_count');
      expect(query.filter).toBe(JSON.stringify(FoodFeedbackChatStatusHelper.buildFilter(FoodFeedbackChatFilter.OPEN)));
      expect(String(query.fields)).toContain('chat.conversation_state');
      expect(String(query.fields)).toContain('profile.language');
    });

    it('omits an empty search and clamps the page', () => {
      const query = FoodFeedbackChatHelper.buildListQuery({ filter: FoodFeedbackChatFilter.ALL, page: 0, search: '   ' });
      expect(query.search).toBeUndefined();
      expect(query.page).toBe(1);
    });
  });

  it('counts with the shared filter', () => {
    expect(FoodFeedbackChatHelper.buildCountQuery({ filter: FoodFeedbackChatFilter.NEW })).toEqual({
      aggregate: JSON.stringify({ count: ['id'] }),
      filter: JSON.stringify(FoodFeedbackChatStatusHelper.buildFilter(FoodFeedbackChatFilter.NEW)),
    });
  });

  it('pages with the chosen page size', () => {
    expect(FoodFeedbackChatHelper.buildListQuery({ filter: FoodFeedbackChatFilter.ALL, page: 1, search: null, options: { pageSize: 100 } }).limit).toBe(100);
  });

  it('sorts by date or rating, ties newest first', () => {
    expect(FoodFeedbackChatHelper.getSortParameter(undefined)).toBe('-date_created');
    expect(FoodFeedbackChatHelper.getSortParameter(FoodFeedbackListSort.OLDEST)).toBe('date_created');
    expect(FoodFeedbackChatHelper.getSortParameter(FoodFeedbackListSort.RATING_WORST)).toBe('rating,-date_created');
    expect(FoodFeedbackChatHelper.buildListQuery({ filter: FoodFeedbackChatFilter.ALL, page: 1, search: null, options: { sort: FoodFeedbackListSort.RATING_BEST } }).sort).toBe('-rating,-date_created');
  });

  it('combines the status filter with canteens, food and rating', () => {
    const statusFilter = FoodFeedbackChatStatusHelper.buildFilter(FoodFeedbackChatFilter.OPEN);
    expect(FoodFeedbackChatHelper.buildFilter(FoodFeedbackChatFilter.OPEN)).toEqual(statusFilter);
    expect(FoodFeedbackChatHelper.buildFilter(FoodFeedbackChatFilter.OPEN, { canteenIds: [], foodSearch: '  ', rating: FoodFeedbackRatingFilter.ALL })).toEqual(statusFilter);
    expect(FoodFeedbackChatHelper.buildFilter(FoodFeedbackChatFilter.OPEN, { canteenIds: ['a', 'b'], foodSearch: ' Pasta ' })).toEqual({
      _and: [statusFilter, { canteen: { _in: ['a', 'b'] } }, { food: { alias: { _icontains: 'Pasta' } } }],
    });
    expect(FoodFeedbackChatHelper.buildRatingFilter(FoodFeedbackRatingFilter.GOOD)).toEqual({ rating: { _between: [4, 5] } });
    expect(FoodFeedbackChatHelper.buildRatingFilter(FoodFeedbackRatingFilter.NONE)).toEqual({ rating: { _null: true } });
  });

  describe('content filter', () => {
    const withComment = { comment: { _nempty: true } };
    const withRating = { rating: { _nnull: true } };
    const open = FoodFeedbackChatStatusHelper.buildStatusFilter(FoodFeedbackChatFilter.OPEN);

    it('lists only feedbacks with a comment by default', () => {
      expect(FoodFeedbackChatHelper.buildFilter(FoodFeedbackChatFilter.OPEN, { contents: [FoodFeedbackContentFilter.WITH_COMMENT] })).toEqual(FoodFeedbackChatStatusHelper.buildFilter(FoodFeedbackChatFilter.OPEN));
      expect(FoodFeedbackChatHelper.isRatingFilterAvailable(undefined)).toBe(false);
    });

    it('lists feedbacks with a rating, or with either when both or none are selected', () => {
      expect(FoodFeedbackChatHelper.buildFilter(FoodFeedbackChatFilter.OPEN, { contents: [FoodFeedbackContentFilter.WITH_RATING] })).toEqual({ _and: [withRating, open] });
      const either = { _and: [{ _or: [withComment, withRating] }, open] };
      expect(FoodFeedbackChatHelper.buildFilter(FoodFeedbackChatFilter.OPEN, { contents: [FoodFeedbackContentFilter.WITH_COMMENT, FoodFeedbackContentFilter.WITH_RATING] })).toEqual(either);
      expect(FoodFeedbackChatHelper.buildFilter(FoodFeedbackChatFilter.OPEN, { contents: [] })).toEqual(either);
      expect(FoodFeedbackChatHelper.buildFilter(FoodFeedbackChatFilter.ALL, { contents: [FoodFeedbackContentFilter.WITH_RATING] })).toEqual({ _and: [withRating] });
    });

    it('applies the rating filter only when feedbacks with a rating are listed', () => {
      expect(FoodFeedbackChatHelper.buildFilter(FoodFeedbackChatFilter.ALL, { rating: FoodFeedbackRatingFilter.BAD })).toEqual(FoodFeedbackChatStatusHelper.buildFilter(FoodFeedbackChatFilter.ALL));
      expect(FoodFeedbackChatHelper.buildFilter(FoodFeedbackChatFilter.ALL, { contents: [FoodFeedbackContentFilter.WITH_RATING], rating: FoodFeedbackRatingFilter.BAD })).toEqual({
        _and: [{ _and: [withRating] }, { rating: { _between: [1, 2] } }],
      });
    });

    it('offers "without rating" only when feedbacks with only a comment are listed too', () => {
      expect(FoodFeedbackChatHelper.getRatingFilters([FoodFeedbackContentFilter.WITH_RATING])).not.toContain(FoodFeedbackRatingFilter.NONE);
      expect(FoodFeedbackChatHelper.getRatingFilters([FoodFeedbackContentFilter.WITH_COMMENT, FoodFeedbackContentFilter.WITH_RATING])).toContain(FoodFeedbackRatingFilter.NONE);
    });

    it('has a label for every content filter', () => {
      for (const content of FoodFeedbackChatHelper.CONTENT_FILTERS) {
        expect(AppExtensionLanguageHelper.translate(FoodFeedbackChatHelper.getContentFilterLabelKey(content), 'de-DE').length).toBeGreaterThan(0);
      }
    });
  });

  it('counts with the same filters and search as the list', () => {
    const options = { canteenIds: ['a'], rating: FoodFeedbackRatingFilter.MEDIUM };
    const query = FoodFeedbackChatHelper.buildCountQuery({ filter: FoodFeedbackChatFilter.NEW, options, search: ' kalt ' });
    expect(query.filter).toBe(JSON.stringify(FoodFeedbackChatHelper.buildFilter(FoodFeedbackChatFilter.NEW, options)));
    expect(query.search).toBe('kalt');
  });

  it('has a label for every sort and rating filter', () => {
    for (const sort of FoodFeedbackChatHelper.SORTS) {
      expect(AppExtensionLanguageHelper.translate(FoodFeedbackChatHelper.getSortLabelKey(sort), 'de-DE').length).toBeGreaterThan(0);
    }
    for (const rating of FoodFeedbackChatHelper.RATING_FILTERS) {
      expect(AppExtensionLanguageHelper.translate(FoodFeedbackChatHelper.getRatingFilterLabelKey(rating), 'de-DE').length).toBeGreaterThan(0);
    }
  });

  it('has an icon for every sort, content and rating filter', () => {
    const icons = [...FoodFeedbackChatHelper.SORTS.map(FoodFeedbackChatHelper.getSortIcon), ...FoodFeedbackChatHelper.CONTENT_FILTERS.map(FoodFeedbackChatHelper.getContentFilterIcon), ...FoodFeedbackChatHelper.RATING_FILTERS.map(FoodFeedbackChatHelper.getRatingFilterIcon)];
    for (const icon of icons) {
      expect(icon.length).toBeGreaterThan(0);
    }
    expect(new Set(FoodFeedbackChatHelper.SORTS.map(FoodFeedbackChatHelper.getSortIcon)).size).toBe(FoodFeedbackChatHelper.SORTS.length);
    expect(FoodFeedbackChatHelper.getRatingFilterColor(FoodFeedbackRatingFilter.GOOD)).toBe('var(--theme--success)');
    expect(FoodFeedbackChatHelper.getRatingFilterColor(FoodFeedbackRatingFilter.ALL)).toBeUndefined();
  });

  it('shows the food image as thumbnail, else the remote url', () => {
    expect(FoodFeedbackChatHelper.getFoodImageUrl({ food: { id: 'f', image: 'file-1' } }, '/rocket-meals/api/')).toBe('/rocket-meals/api/assets/file-1?width=128&height=128&fit=cover&quality=80');
    expect(FoodFeedbackChatHelper.getFoodImageUrl({ food: { id: 'f', image: { id: 'file-2' } } }, '/api')).toBe('/api/assets/file-2?width=128&height=128&fit=cover&quality=80');
    expect(FoodFeedbackChatHelper.getFoodImageUrl({ food: { id: 'f', image: null, image_remote_url: 'https://x/y.jpg' } })).toBe('https://x/y.jpg');
    expect(FoodFeedbackChatHelper.getFoodImageUrl({ food: { id: 'f' } })).toBeUndefined();
    expect(FoodFeedbackChatHelper.getFoodImageUrl({ food: 'f' })).toBeUndefined();
    expect(FoodFeedbackChatHelper.getCanteenImageUrl({ id: 'c', image: 'file-3' }, '/api/')).toBe('/api/assets/file-3?width=48&height=48&fit=cover&quality=80');
    expect(FoodFeedbackChatHelper.getCanteenImageUrl({ id: 'c', image_remote_url: 'https://x/c.jpg' })).toBe('https://x/c.jpg');
    expect(FoodFeedbackChatHelper.getCanteenImageUrl({ id: 'c' })).toBeUndefined();
    expect(FoodFeedbackChatHelper.buildCanteensQuery().fields).toBe('id,alias,image,image_remote_url');
  });

  it('links the food image to the food in the content area', () => {
    expect(FoodFeedbackChatHelper.getFoodRoute({ food: { id: 'food 1', alias: 'Schnitzel' } })).toBe('/content/foods/food%201');
    expect(FoodFeedbackChatHelper.getFoodRoute({ food: 'f2' })).toBe('/content/foods/f2');
    expect(FoodFeedbackChatHelper.getFoodRoute({ food: null })).toBeUndefined();
    expect(FoodFeedbackChatHelper.getFoodRoute({})).toBeUndefined();
  });

  it('can mark open feedbacks with an author as done', () => {
    expect(FoodFeedbackChatHelper.canMarkResolved({ id: '1', comment: 'x', profile: 'p', chat: null })).toBe(true);
    expect(FoodFeedbackChatHelper.canMarkResolved({ id: '1', comment: 'x', profile: null, chat: null })).toBe(false);
    expect(FoodFeedbackChatHelper.canMarkResolved({ id: '1', comment: 'x', chat: { id: 'c', conversation_state: 'resolved' } })).toBe(false);
  });

  it('has a label, icon and colour for every status and a label for every filter', () => {
    for (const status of Object.values(FoodFeedbackChatStatus)) {
      const presentation = FoodFeedbackChatHelper.getStatusPresentation(status);
      expect(AppExtensionLanguageHelper.translate(presentation.labelKey, 'de-DE').length).toBeGreaterThan(0);
      expect(presentation.icon.length).toBeGreaterThan(0);
      expect(presentation.color).toMatch(/^var\(--theme--/);
    }
    for (const filter of FoodFeedbackChatStatusHelper.FILTERS) {
      expect(AppExtensionLanguageHelper.translate(FoodFeedbackChatHelper.getFilterLabelKey(filter), 'de-DE').length).toBeGreaterThan(0);
    }
    expect(AppExtensionLanguageHelper.translate(FoodFeedbackChatHelper.getFilterLabelKey(FoodFeedbackChatFilter.WAITING_FOR_USER), 'de-DE')).toBe('Beantwortet');
  });

  it('shows food and canteen by alias, falling back to the id', () => {
    expect(FoodFeedbackChatHelper.getFoodName({ food: { id: '7', alias: 'Pasta' } })).toBe('Pasta');
    expect(FoodFeedbackChatHelper.getFoodName({ food: { id: '7', alias: null } })).toBe('7');
    expect(FoodFeedbackChatHelper.getFoodName({ food: null })).toBeUndefined();
    expect(FoodFeedbackChatHelper.getCanteenName({ canteen: { id: 'c', alias: 'Hauptmensa' } })).toBe('Hauptmensa');
  });

  it('writes the chat title in the language of the author', () => {
    expect(AppExtensionLanguageHelper.translate(BackendTranslationKeys.rocket_meals_module_food_feedback_chat_alias, 'de-DE', { food: 'Pasta' })).toBe('Feedback zu Pasta');
    expect(AppExtensionLanguageHelper.translate(BackendTranslationKeys.rocket_meals_module_food_feedback_chat_alias, 'en-US', { food: 'Pasta' })).toBe('Feedback on Pasta');
  });

  it('names the support author', () => {
    expect(FoodFeedbackChatHelper.getSupportAuthorName({ id: 'm', user_created: { id: 'u', first_name: 'Nils', last_name: 'B' } })).toBe('Nils B');
    expect(FoodFeedbackChatHelper.getSupportAuthorName({ id: 'm', user_created: { id: 'u', email: 'a@b.de' } })).toBe('a@b.de');
    expect(FoodFeedbackChatHelper.getSupportAuthorName({ id: 'm', user_created: 'u' })).toBeUndefined();
  });
});

describe('FoodFeedbackChatActions.markResolved', () => {
  function createApi() {
    const calls: { method: string; url: string; data: unknown }[] = [];
    let nextChatId = 100;
    const api = {
      post: async (url: string, data?: unknown) => {
        calls.push({ method: 'post', url, data });
        return { data: { data: { id: String(nextChatId++) } } };
      },
      patch: async (url: string, data?: unknown) => {
        calls.push({ method: 'patch', url, data });
        return { data: {} };
      },
    };
    return { api, calls };
  }

  it('updates existing chats at once and creates chats for new feedbacks', async () => {
    const { api, calls } = createApi();
    const result = await FoodFeedbackChatActions.markResolved(api, [
      { id: 'f1', comment: 'a', chat: { id: 'c1', conversation_state: 'waiting_for_support' } },
      { id: 'f2', comment: 'b', chat: 'c2' },
      { id: 'f3', comment: 'c', profile: { id: 'p3', language: 'de-DE' }, food: { id: 'food', alias: 'Pasta' }, chat: null },
      { id: 'f4', comment: 'd', profile: null, chat: null },
    ]);
    expect(result.resolvedIds.sort()).toEqual(['f1', 'f2', 'f3']);
    expect(result.failedIds).toEqual(['f4']);
    expect(calls[0]).toEqual({ method: 'patch', url: ChatQueryHelper.CHATS_ENDPOINT, data: { keys: ['c1', 'c2'], data: { conversation_state: 'resolved' } } });
    expect(calls.some(call => call.method === 'patch' && call.url === `${FoodFeedbackChatHelper.FOOD_FEEDBACKS_ENDPOINT}/f3`)).toBe(true);
    expect(calls[calls.length - 1]).toEqual({ method: 'patch', url: `${ChatQueryHelper.CHATS_ENDPOINT}/100`, data: { conversation_state: 'resolved' } });
  });
});

describe('RocketMealsModulePages', () => {
  it('builds routes below the module', () => {
    expect(RocketMealsModulePages.getRoute()).toBe('/rocket-meals');
    expect(RocketMealsModulePages.getRoute(RocketMealsModulePages.FOOD_FEEDBACKS)).toBe('/rocket-meals/food-feedbacks');
    expect(RocketMealsModulePages.getRoute(RocketMealsModulePages.FOOD_FEEDBACKS, 'a b')).toBe('/rocket-meals/food-feedbacks/a%20b');
    expect(RocketMealsModulePages.getRoute(RocketMealsModulePages.APP_FEEDBACKS, 'f1')).toBe('/rocket-meals/app-feedbacks/f1');
    expect(RocketMealsModulePages.getRoute(RocketMealsModulePages.MCP_INSTRUCTION)).toBe('/rocket-meals/mcp-instruction');
  });

  it('lists the app feedbacks after the food feedbacks, then the feature wishes, the chats, the profiles, the MCP instruction, the live pulse, the friendship network and the workflows last', () => {
    expect(RocketMealsModulePages.PAGES).toEqual([RocketMealsModulePages.FOOD_FEEDBACKS, RocketMealsModulePages.APP_FEEDBACKS, RocketMealsModulePages.FEATURE_WISHES, RocketMealsModulePages.CHATS, RocketMealsModulePages.PROFILES, RocketMealsModulePages.MCP_INSTRUCTION, RocketMealsModulePages.LIVE_PULSE, RocketMealsModulePages.FRIENDSHIP_NETWORK, RocketMealsModulePages.WORKFLOWS]);
  });
});

describe('AppExtensionLanguageHelper.formatDateTime', () => {
  it('formats in the language of the user and ignores invalid dates', () => {
    expect(AppExtensionLanguageHelper.formatDateTime('2026-10-06T09:45:00Z', 'de-DE')).toContain('2026');
    expect(AppExtensionLanguageHelper.formatDateTime('not a date', 'de-DE')).toBe('');
    expect(AppExtensionLanguageHelper.formatDateTime(null, 'de-DE')).toBe('');
  });
});

describe('AppExtensionLanguageHelper.resolveUiLanguage', () => {
  it('follows the language Directus renders (<html lang>) first', () => {
    expect(AppExtensionLanguageHelper.resolveUiLanguage({ htmlLanguage: 'de-DE', userLanguage: 'en-US', projectDefaultLanguage: 'fr-FR', browserLanguage: 'tr-TR' })).toBe('de-DE');
  });

  it('falls back like Directus: user language, project default, then the browser', () => {
    expect(AppExtensionLanguageHelper.resolveUiLanguage({ userLanguage: 'en-US', projectDefaultLanguage: 'de-DE' })).toBe('en-US');
    expect(AppExtensionLanguageHelper.resolveUiLanguage({ userLanguage: null, projectDefaultLanguage: 'de-DE', browserLanguage: 'en-US' })).toBe('de-DE');
    expect(AppExtensionLanguageHelper.resolveUiLanguage({ browserLanguage: 'en-US' })).toBe('en-US');
    expect(AppExtensionLanguageHelper.resolveUiLanguage({})).toBeUndefined();
  });

  it('translates the navigation entry in the resolved language', () => {
    const navigationLabel = (language: string) => AppExtensionLanguageHelper.translate(BackendTranslationKeys.rocket_meals_module_food_feedbacks, language);
    expect(navigationLabel('de-DE')).toBe('Speise-Feedbacks');
    expect(navigationLabel('en-US')).toBe('Dish feedback');
  });
});

describe('FoodFeedbackChatHelper.getNickname', () => {
  it('returns the trimmed nickname of a loaded profile', () => {
    expect(FoodFeedbackChatHelper.getNickname({ nickname: '  Mensafan ' })).toBe('Mensafan');
  });

  it('is undefined without a loaded profile or nickname', () => {
    expect(FoodFeedbackChatHelper.getNickname(undefined)).toBeUndefined();
    expect(FoodFeedbackChatHelper.getNickname('profile-id')).toBeUndefined();
    expect(FoodFeedbackChatHelper.getNickname({ nickname: '   ' })).toBeUndefined();
  });

  it('labels the author as "Nutzer: <Nickname>"', () => {
    expect(AppExtensionLanguageHelper.translate(BackendTranslationKeys.rocket_meals_module_user_with_nickname, 'de-DE', { nickname: 'Mensafan' })).toBe('Nutzer: Mensafan');
  });
});
