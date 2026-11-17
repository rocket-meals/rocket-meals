/**
 * NewsModuleHelper.ts – the page "Kommunikation" of the module `Rocket Meals`: the news, where the
 * app shows them (`display_locations`: news list, popup, above or below the food offers), for which
 * canteens and in which time.
 *
 * The list (chips by location, archive filter, sort by date, search, pages), the draft the editor works on and the payload it
 * saves: the German text is the source, every other language is translated automatically unless
 * it was entered by hand (`let_be_translated` false). Translations and canteens are sent as full
 * lists, so every existing row keeps its id and nothing is deleted by accident.
 *
 * Plain logic without Vue or Directus app imports, so it can be unit tested in Node.
 */

import { CollectionNames } from 'repo-depkit-common/src/databaseTypes/CollectionNames';
import type * as DatabaseTypes from 'repo-depkit-common/src/databaseTypes/types';
import { getNewsDisplayLocations, NewsDisplayLocations, type NewsDisplayLocation } from 'repo-depkit-common/src/EventHelper';
import { DirectusImageHelper, type ImageFocalPoint } from 'repo-depkit-common/src/DirectusImageHelper';
import { getLanguageCodeFromRelation } from 'repo-depkit-common/src/translations/LanguageCodeHelper';
import { isSameBaseLanguage } from 'repo-depkit-common/src/translations/TranslationLanguage';
import { BackendTranslationKeys } from '../translations/BackendTranslationKeys';
import { ModuleListHelper, type ModuleStatusCountRequest, type ModuleStatusListRequest } from './ModuleListHelper';
import type { ModuleStatusPresentation } from './ModuleItemTypes';

type DirectusFilter = Record<string, unknown>;

export enum NewsListFilter {
  ALL = 'all',
  NEWS_LIST = 'news_list',
  POPUP = 'popup',
  FOODOFFERS = 'foodoffers',
}

/** Which news the list shows by their status, like the archive filter of Directus' collection view. */
export enum NewsArchiveFilter {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  ALL = 'all',
}

export enum NewsListSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
}

export enum NewsStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

/** Where the preview phone shows the news. */
export enum NewsPreviewView {
  LIST = 'list',
  DETAIL = 'detail',
  POPUP = 'popup',
  FOODOFFERS = 'foodoffers',
}

export type NewsListOptions = { pageSize?: number | null; archive?: NewsArchiveFilter; sort?: NewsListSort };

export type NewsListItem = Pick<DatabaseTypes.News, 'id' | 'alias' | 'status' | 'date' | 'date_end' | 'display_locations' | 'external_identifier' | 'image' | 'image_remote_url' | 'date_updated'> & {
  translations?: Partial<DatabaseTypes.NewsTranslations>[] | null;
  canteens?: { id?: number; canteens_id?: { id: string; alias?: string | null } | string | null }[] | null;
};

export type NewsTranslationDraft = { manual: boolean; title: string; content: string };

/** What the editor edits; dates in the format of `<input type="datetime-local">`. */
export type NewsDraft = {
  status: NewsStatus;
  locations: NewsDisplayLocation[];
  title: string;
  content: string;
  alias: string;
  /** Id of the image file, or null. */
  image: string | null;
  /** Remote URL of an image (e.g. of imported news), shown while no file is set. */
  imageRemoteUrl: string;
  date: string;
  dateEnd: string;
  url: string;
  canteenIds: string[];
  showOnIos: boolean;
  showOnAndroid: boolean;
  showOnWeb: boolean;
  appVersion: string;
  onlyAnonymousUsers: boolean;
  showRatingButton: boolean;
  showLoginButton: boolean;
  /** Per language code besides the source language. */
  translations: Record<string, NewsTranslationDraft>;
};

export type NewsLocationPresentation = ModuleStatusPresentation & { location: NewsDisplayLocation; hintKey: BackendTranslationKeys };

export class NewsModuleHelper {
  static readonly NEWS_ENDPOINT = `/items/${CollectionNames.NEWS}`;
  static readonly LANGUAGES_ENDPOINT = `/items/${CollectionNames.LANGUAGES}`;
  static readonly CANTEENS_ENDPOINT = `/items/${CollectionNames.CANTEENS}`;

  /** The language the editor writes in; every other one is translated from it. */
  static readonly SOURCE_LANGUAGE = 'de';

  public static readonly FILTERS: readonly NewsListFilter[] = [NewsListFilter.ALL, NewsListFilter.NEWS_LIST, NewsListFilter.POPUP, NewsListFilter.FOODOFFERS];
  public static readonly ARCHIVE_FILTERS: readonly NewsArchiveFilter[] = [NewsArchiveFilter.ACTIVE, NewsArchiveFilter.ARCHIVED, NewsArchiveFilter.ALL];
  public static readonly SORTS: readonly NewsListSort[] = [NewsListSort.NEWEST, NewsListSort.OLDEST];
  public static readonly STATUSES: readonly NewsStatus[] = [NewsStatus.PUBLISHED, NewsStatus.DRAFT, NewsStatus.ARCHIVED];
  public static readonly LOCATIONS: readonly NewsDisplayLocation[] = [NewsDisplayLocations.news_list, NewsDisplayLocations.popup, NewsDisplayLocations.foodoffers_top, NewsDisplayLocations.foodoffers_bottom];

  public static readonly LIST_FIELDS: readonly string[] = ['id', 'alias', 'status', 'date', 'date_end', 'display_locations', 'external_identifier', 'image', 'image_remote_url', 'date_updated', 'translations.id', 'translations.languages_code', 'translations.title', 'canteens.id', 'canteens.canteens_id.id', 'canteens.canteens_id.alias'];
  public static readonly DETAIL_FIELDS: readonly string[] = ['*', 'translations.*', 'canteens.id', 'canteens.canteens_id'];

  // ---------- list ----------

  static buildArchiveFilter(archive: NewsArchiveFilter = NewsArchiveFilter.ACTIVE): DirectusFilter | null {
    switch (archive) {
      case NewsArchiveFilter.ARCHIVED:
        return { status: { _eq: NewsStatus.ARCHIVED } };
      case NewsArchiveFilter.ALL:
        return null;
      default:
        return { status: { _neq: NewsStatus.ARCHIVED } };
    }
  }

  static buildLocationFilter(filter: NewsListFilter): DirectusFilter | null {
    const contains = (location: NewsDisplayLocation) => ({ display_locations: { _contains: location } });
    switch (filter) {
      case NewsListFilter.ALL:
        return null;
      case NewsListFilter.NEWS_LIST:
        // Imported and older news have no locations and stand in the list.
        return { _or: [{ display_locations: { _null: true } }, contains(NewsDisplayLocations.news_list)] };
      case NewsListFilter.POPUP:
        return contains(NewsDisplayLocations.popup);
      case NewsListFilter.FOODOFFERS:
        return { _or: [contains(NewsDisplayLocations.foodoffers_top), contains(NewsDisplayLocations.foodoffers_bottom)] };
    }
  }

  /** The location chip and the archive filter together; also the filter of the export. */
  static buildFilter(filter: NewsListFilter, archive: NewsArchiveFilter = NewsArchiveFilter.ACTIVE): DirectusFilter {
    const parts = [NewsModuleHelper.buildArchiveFilter(archive), NewsModuleHelper.buildLocationFilter(filter)].filter((part): part is DirectusFilter => part !== null);
    if (parts.length === 0) {
      return {};
    }
    return parts.length === 1 ? parts[0]! : { _and: parts };
  }

  static getSort(sort: NewsListSort = NewsListSort.NEWEST): string {
    return sort === NewsListSort.OLDEST ? 'date' : '-date';
  }

  static buildListQuery(request: ModuleStatusListRequest<NewsListFilter, NewsListOptions>) {
    return ModuleListHelper.buildListQuery({ fields: NewsModuleHelper.LIST_FIELDS, filter: NewsModuleHelper.buildFilter(request.filter, request.options?.archive), sort: NewsModuleHelper.getSort(request.options?.sort), page: request.page, pageSize: request.options?.pageSize, search: request.search });
  }

  static buildCountQuery(request: ModuleStatusCountRequest<NewsListFilter, NewsListOptions>) {
    return ModuleListHelper.buildCountQuery({ filter: NewsModuleHelper.buildFilter(request.filter, request.options?.archive), search: request.search });
  }

  static getArchiveFilterLabelKey(archive: NewsArchiveFilter): BackendTranslationKeys {
    switch (archive) {
      case NewsArchiveFilter.ACTIVE:
        return BackendTranslationKeys.rocket_meals_module_news_archive_active;
      case NewsArchiveFilter.ARCHIVED:
        return BackendTranslationKeys.rocket_meals_module_news_archive_archived;
      case NewsArchiveFilter.ALL:
        return BackendTranslationKeys.rocket_meals_module_news_archive_all;
    }
  }

  static getSortLabelKey(sort: NewsListSort): BackendTranslationKeys {
    return sort === NewsListSort.OLDEST ? BackendTranslationKeys.rocket_meals_module_sort_oldest : BackendTranslationKeys.rocket_meals_module_sort_newest;
  }

  static getSortIcon(sort: NewsListSort): string {
    return sort === NewsListSort.OLDEST ? 'history' : 'update';
  }

  /**
   * The image of the news as the app loads it for a box of `width` × `height`: the uploaded file cut
   * once by Directus around its focal point in the format of the box (`DirectusImageHelper`, the same
   * URL as in the app: square for the popup, about 2:1 for the news list), relative to the app's API
   * root (the session cookie authorises it); else the remote URL of imported news; else `undefined`.
   */
  static getImageUrl(news: Pick<NewsListItem, 'image' | 'image_remote_url'> & { date_updated?: string | null }, apiRoot: string, width: number, height: number, focalPoint?: ImageFocalPoint | null): string | undefined {
    const size = DirectusImageHelper.getCropSizeForBox(width, height);
    return DirectusImageHelper.getItemImageUrl(news, fileId => DirectusImageHelper.buildCroppedAssetUrl({ serverUrl: apiRoot, fileId, ...size, focalPoint, version: news.date_updated })) ?? undefined;
  }

  static buildDetailQuery() {
    return { fields: NewsModuleHelper.DETAIL_FIELDS.join(',') };
  }

  static buildLanguagesQuery() {
    return { fields: 'code,name', limit: -1, sort: 'code' };
  }

  /** The canteens for the tiles, with the image of their building. */
  static buildCanteensQuery() {
    return { fields: 'id,alias,building.image,building.image_remote_url', limit: -1, sort: 'sort,alias' };
  }

  static getFilterLabelKey(filter: NewsListFilter): BackendTranslationKeys {
    switch (filter) {
      case NewsListFilter.ALL:
        return BackendTranslationKeys.rocket_meals_module_filter_all;
      case NewsListFilter.NEWS_LIST:
        return BackendTranslationKeys.rocket_meals_module_news_location_news_list;
      case NewsListFilter.POPUP:
        return BackendTranslationKeys.rocket_meals_module_news_location_popup;
      case NewsListFilter.FOODOFFERS:
        return BackendTranslationKeys.rocket_meals_module_news_filter_foodoffers;
    }
  }

  static getStatusPresentation(status: string | null | undefined): ModuleStatusPresentation {
    switch (status) {
      case NewsStatus.DRAFT:
        return { labelKey: BackendTranslationKeys.rocket_meals_module_news_status_draft, icon: 'edit_note', color: 'var(--theme--foreground-subdued)' };
      case NewsStatus.ARCHIVED:
        return { labelKey: BackendTranslationKeys.rocket_meals_module_news_status_archived, icon: 'archive', color: 'var(--theme--warning)' };
      default:
        return { labelKey: BackendTranslationKeys.rocket_meals_module_news_status_published, icon: 'public', color: 'var(--theme--primary)' };
    }
  }

  static getLocationPresentation(location: NewsDisplayLocation): NewsLocationPresentation {
    switch (location) {
      case NewsDisplayLocations.popup:
        return { location, labelKey: BackendTranslationKeys.rocket_meals_module_news_location_popup, hintKey: BackendTranslationKeys.rocket_meals_module_news_location_popup_hint, icon: 'open_in_new', color: 'var(--theme--primary)' };
      case NewsDisplayLocations.foodoffers_top:
        return { location, labelKey: BackendTranslationKeys.rocket_meals_module_news_location_foodoffers_top, hintKey: BackendTranslationKeys.rocket_meals_module_news_location_foodoffers_top_hint, icon: 'vertical_align_top', color: 'var(--theme--success)' };
      case NewsDisplayLocations.foodoffers_bottom:
        return { location, labelKey: BackendTranslationKeys.rocket_meals_module_news_location_foodoffers_bottom, hintKey: BackendTranslationKeys.rocket_meals_module_news_location_foodoffers_bottom_hint, icon: 'vertical_align_bottom', color: 'var(--theme--success)' };
      default:
        return { location: NewsDisplayLocations.news_list, labelKey: BackendTranslationKeys.rocket_meals_module_news_location_news_list, hintKey: BackendTranslationKeys.rocket_meals_module_news_location_news_list_hint, icon: 'newspaper', color: 'var(--theme--foreground-subdued)' };
    }
  }

  static getLocationPresentations(news: Pick<DatabaseTypes.News, 'display_locations'>): NewsLocationPresentation[] {
    return getNewsDisplayLocations(news).map(location => NewsModuleHelper.getLocationPresentation(location));
  }

  /** The German title, else the first title, else the alias. */
  static getTitle(news: { alias?: string | null; translations?: Partial<DatabaseTypes.NewsTranslations>[] | null }): string | undefined {
    const translations = Array.isArray(news.translations) ? news.translations : [];
    const source = translations.find(translation => isSameBaseLanguage(getLanguageCodeFromRelation(translation.languages_code), NewsModuleHelper.SOURCE_LANGUAGE));
    const title = source?.title?.trim() || translations.find(translation => translation.title?.trim())?.title?.trim() || news.alias?.trim();
    return title || undefined;
  }

  static getCanteenNames(news: NewsListItem): string[] {
    return (news.canteens ?? []).map(entry => (entry?.canteens_id && typeof entry.canteens_id === 'object' ? entry.canteens_id.alias : null)).filter((name): name is string => !!name);
  }

  static isImported(news: Pick<DatabaseTypes.News, 'external_identifier'>): boolean {
    return !!news.external_identifier;
  }

  // ---------- editor ----------

  /** `2026-10-19T08:00:00` (Directus) → `2026-10-19T08:00` (datetime-local). */
  static toInputDateTime(value: string | null | undefined): string {
    return value ? value.slice(0, 16) : '';
  }

  /** `2026-10-19T08:00` → `2026-10-19T08:00:00`; empty stays empty (null). */
  static fromInputDateTime(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  }

  static createEmptyDraft(now: Date = new Date()): NewsDraft {
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return {
      status: NewsStatus.PUBLISHED,
      locations: [NewsDisplayLocations.news_list],
      title: '',
      content: '',
      alias: '',
      image: null,
      imageRemoteUrl: '',
      date,
      dateEnd: '',
      url: '',
      canteenIds: [],
      showOnIos: true,
      showOnAndroid: true,
      showOnWeb: true,
      appVersion: '',
      onlyAnonymousUsers: false,
      showRatingButton: false,
      showLoginButton: false,
      translations: {},
    };
  }

  static isSourceTranslation(translation: Partial<DatabaseTypes.NewsTranslations>): boolean {
    return isSameBaseLanguage(getLanguageCodeFromRelation(translation.languages_code), NewsModuleHelper.SOURCE_LANGUAGE);
  }

  static draftFromNews(news: DatabaseTypes.News): NewsDraft {
    const translations = (Array.isArray(news.translations) ? news.translations : []) as Partial<DatabaseTypes.NewsTranslations>[];
    const source = translations.find(translation => NewsModuleHelper.isSourceTranslation(translation)) ?? translations.find(translation => translation.be_source_for_translations);
    const others: Record<string, NewsTranslationDraft> = {};
    for (const translation of translations) {
      const code = getLanguageCodeFromRelation(translation.languages_code);
      if (!code || translation === source) {
        continue;
      }
      others[code] = { manual: translation.let_be_translated === false, title: translation.title ?? '', content: translation.content ?? '' };
    }
    const canteenIds = (Array.isArray(news.canteens) ? news.canteens : [])
      .map(entry => (entry && typeof entry === 'object' ? (entry as DatabaseTypes.NewsCanteens).canteens_id : null))
      .map(canteen => (canteen && typeof canteen === 'object' ? canteen.id : canteen))
      .filter((id): id is string => !!id);
    return {
      status: NewsModuleHelper.STATUSES.includes(news.status as NewsStatus) ? (news.status as NewsStatus) : NewsStatus.PUBLISHED,
      locations: getNewsDisplayLocations(news),
      title: source?.title ?? '',
      content: source?.content ?? '',
      alias: news.alias && news.alias !== source?.title ? news.alias : '',
      image: news.image && typeof news.image === 'object' ? news.image.id : (news.image ?? null),
      imageRemoteUrl: news.image_remote_url ?? '',
      date: NewsModuleHelper.toInputDateTime(news.date),
      dateEnd: NewsModuleHelper.toInputDateTime(news.date_end),
      url: news.url ?? '',
      canteenIds,
      showOnIos: news.show_on_ios !== false,
      showOnAndroid: news.show_on_android !== false,
      showOnWeb: news.show_on_web !== false,
      appVersion: news.show_on_app_version ?? '',
      onlyAnonymousUsers: !!news.show_only_anonymous_users,
      showRatingButton: !!news.show_app_rating_button,
      showLoginButton: !!news.show_login_screen_button,
      translations: others,
    };
  }

  static toggleLocation(locations: readonly NewsDisplayLocation[], location: NewsDisplayLocation): NewsDisplayLocation[] {
    const next = locations.includes(location) ? locations.filter(entry => entry !== location) : [...locations, location];
    // Keep the order of LOCATIONS; without any location the news stands in the list.
    const ordered = NewsModuleHelper.LOCATIONS.filter(entry => next.includes(entry));
    return ordered.length > 0 ? ordered : [NewsDisplayLocations.news_list];
  }

  static isShownOutsideNewsList(draft: Pick<NewsDraft, 'locations'>): boolean {
    return draft.locations.some(location => location !== NewsDisplayLocations.news_list);
  }

  static canSave(draft: Pick<NewsDraft, 'title'>): boolean {
    return draft.title.trim().length > 0;
  }

  /** The views the preview offers for the chosen locations; the opened news always. */
  static getPreviewViews(draft: Pick<NewsDraft, 'locations'>): NewsPreviewView[] {
    const has = (location: NewsDisplayLocation) => draft.locations.includes(location);
    const views: NewsPreviewView[] = [];
    if (has(NewsDisplayLocations.news_list)) {
      views.push(NewsPreviewView.LIST);
    }
    views.push(NewsPreviewView.DETAIL);
    if (has(NewsDisplayLocations.popup)) {
      views.push(NewsPreviewView.POPUP);
    }
    if (has(NewsDisplayLocations.foodoffers_top) || has(NewsDisplayLocations.foodoffers_bottom)) {
      views.push(NewsPreviewView.FOODOFFERS);
    }
    return views;
  }

  /**
   * The body of a create (`existing` null) or update. Translations and canteens are sent as full
   * lists: existing rows by id (kept), new ones without (created).
   */
  static buildPayload(draft: NewsDraft, existing: DatabaseTypes.News | null, sourceLanguageCode: string): Partial<DatabaseTypes.News> & Record<string, unknown> {
    const title = draft.title.trim();
    const existingTranslations = (Array.isArray(existing?.translations) ? existing!.translations : []) as Partial<DatabaseTypes.NewsTranslations>[];
    const findExisting = (code: string) => existingTranslations.find(translation => getLanguageCodeFromRelation(translation.languages_code) === code);

    const source = existingTranslations.find(translation => NewsModuleHelper.isSourceTranslation(translation));
    const translations: Record<string, unknown>[] = [
      {
        ...(source?.id ? { id: source.id } : { languages_code: sourceLanguageCode }),
        title,
        content: draft.content,
        be_source_for_translations: true,
        let_be_translated: false,
      },
    ];
    const handledIds = new Set<unknown>([source?.id]);
    for (const [code, translation] of Object.entries(draft.translations)) {
      const current = findExisting(code);
      if (current?.id) {
        handledIds.add(current.id);
      }
      const reference = current?.id ? { id: current.id } : { languages_code: code };
      if (translation.manual) {
        translations.push({ ...reference, title: translation.title.trim(), content: translation.content, let_be_translated: false, be_source_for_translations: false });
      } else if (current?.id) {
        translations.push({ ...reference, let_be_translated: true, be_source_for_translations: false });
      }
    }
    for (const translation of existingTranslations) {
      if (translation.id && !handledIds.has(translation.id)) {
        translations.push({ id: translation.id });
      }
    }

    const existingCanteens = (Array.isArray(existing?.canteens) ? existing!.canteens : []) as DatabaseTypes.NewsCanteens[];
    const canteenOf = (entry: DatabaseTypes.NewsCanteens) => (entry.canteens_id && typeof entry.canteens_id === 'object' ? entry.canteens_id.id : entry.canteens_id);
    const keptCanteens = existingCanteens.filter(entry => draft.canteenIds.includes(String(canteenOf(entry)))).map(entry => ({ id: entry.id }));
    const keptIds = existingCanteens.filter(entry => draft.canteenIds.includes(String(canteenOf(entry)))).map(entry => String(canteenOf(entry)));
    const addedCanteens = draft.canteenIds.filter(id => !keptIds.includes(id)).map(id => ({ canteens_id: id }));

    return {
      status: draft.status,
      alias: draft.alias.trim() || title,
      display_locations: draft.locations,
      image: draft.image,
      image_remote_url: draft.imageRemoteUrl.trim() || null,
      date: NewsModuleHelper.fromInputDateTime(draft.date),
      date_end: NewsModuleHelper.fromInputDateTime(draft.dateEnd),
      url: draft.url.trim() || null,
      show_on_ios: draft.showOnIos,
      show_on_android: draft.showOnAndroid,
      show_on_web: draft.showOnWeb,
      show_on_app_version: draft.appVersion.trim() || null,
      show_only_anonymous_users: draft.onlyAnonymousUsers,
      show_app_rating_button: draft.showRatingButton,
      show_login_screen_button: draft.showLoginButton,
      canteens: [...keptCanteens, ...addedCanteens] as unknown as DatabaseTypes.NewsCanteens[],
      translations: translations as unknown as DatabaseTypes.NewsTranslations[],
    };
  }

  /** The languages of the table besides the source language, as the rows of "Übersetzungen". */
  static getTranslationLanguages(languages: readonly { code: string; name?: string | null }[]): { code: string; name: string }[] {
    return languages.filter(language => !isSameBaseLanguage(language.code, NewsModuleHelper.SOURCE_LANGUAGE)).map(language => ({ code: language.code, name: language.name || language.code }));
  }

  /** The code of the source language in the table (e.g. `de-DE`), `de-DE` when the table has none. */
  static getSourceLanguageCode(languages: readonly { code: string }[]): string {
    return languages.find(language => isSameBaseLanguage(language.code, NewsModuleHelper.SOURCE_LANGUAGE))?.code ?? 'de-DE';
  }
}
