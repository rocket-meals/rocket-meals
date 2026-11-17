import { describe, expect, it } from '@jest/globals';
import type * as DatabaseTypes from 'repo-depkit-common/src/databaseTypes/types';
import { NewsArchiveFilter, NewsListFilter, NewsListSort, NewsModuleHelper, NewsPreviewView, NewsStatus } from '../NewsModuleHelper';
import { RocketMealsModulePages } from '../RocketMealsModulePages';

const existingNews = {
  id: 'n1',
  alias: 'Grillabend',
  image: { id: 'file-1' },
  image_remote_url: 'https://example.org/remote.jpg',
  status: 'draft',
  date: '2026-10-19T08:00:00',
  date_end: null,
  url: null,
  display_locations: ['news_list', 'popup'],
  show_on_ios: true,
  show_on_android: false,
  show_on_web: null,
  show_on_app_version: '<21.0.0',
  show_only_anonymous_users: true,
  show_app_rating_button: false,
  show_login_screen_button: true,
  canteens: [
    { id: 11, canteens_id: 'c1' },
    { id: 12, canteens_id: { id: 'c2' } },
  ],
  translations: [
    { id: 1, languages_code: 'de-DE', title: 'Grillabend', content: 'Text', be_source_for_translations: true, let_be_translated: false },
    { id: 2, languages_code: 'en-US', title: 'Barbecue', content: 'Text en', let_be_translated: true },
    { id: 3, languages_code: 'fr-FR', title: 'Barbecue soir', content: 'Texte', let_be_translated: false },
  ],
} as unknown as DatabaseTypes.News;

describe('NewsModuleHelper – list', () => {
  it('is a page of the module', () => {
    expect(RocketMealsModulePages.PAGES).toContain(RocketMealsModulePages.COMMUNICATION);
    expect(RocketMealsModulePages.getRoute(RocketMealsModulePages.COMMUNICATION, 'n1')).toBe('/rocket-meals/communication/n1');
  });

  it('filters by location, active news by default', () => {
    expect(NewsModuleHelper.buildFilter(NewsListFilter.ALL)).toEqual({ status: { _neq: 'archived' } });
    expect(JSON.stringify(NewsModuleHelper.buildFilter(NewsListFilter.NEWS_LIST))).toContain('"_null":true');
    expect(JSON.stringify(NewsModuleHelper.buildFilter(NewsListFilter.FOODOFFERS))).toContain('foodoffers_bottom');
  });

  it('combines the location with the archive filter', () => {
    expect(NewsModuleHelper.buildFilter(NewsListFilter.ALL, NewsArchiveFilter.ARCHIVED)).toEqual({ status: { _eq: 'archived' } });
    expect(NewsModuleHelper.buildFilter(NewsListFilter.ALL, NewsArchiveFilter.ALL)).toEqual({});
    expect(NewsModuleHelper.buildFilter(NewsListFilter.POPUP, NewsArchiveFilter.ALL)).toEqual({ display_locations: { _contains: 'popup' } });
    expect(NewsModuleHelper.buildFilter(NewsListFilter.POPUP, NewsArchiveFilter.ARCHIVED)).toEqual({ _and: [{ status: { _eq: 'archived' } }, { display_locations: { _contains: 'popup' } }] });
  });

  it('builds list and count queries, newest first by default', () => {
    const query = NewsModuleHelper.buildListQuery({ filter: NewsListFilter.POPUP, page: 2, search: 'grill', options: {} });
    expect(query.sort).toBe('-date');
    expect(query.page).toBe(2);
    expect(String(query.filter)).toContain('popup');
    expect(String(query.fields)).toContain('image_remote_url');
    expect(NewsModuleHelper.buildListQuery({ filter: NewsListFilter.ALL, page: 1, options: { sort: NewsListSort.OLDEST } }).sort).toBe('date');
    const count = NewsModuleHelper.buildCountQuery({ filter: NewsListFilter.ALL, options: { archive: NewsArchiveFilter.ARCHIVED } });
    expect(count.aggregate).toBeDefined();
    expect(count.filter).toContain('"_eq":"archived"');
  });

  it('builds the image URL, else the remote image', () => {
    expect(NewsModuleHelper.getImageUrl({ image: 'file-1' }, '/api', 320, 200)).toBe('/api/assets/file-1?fit=cover&width=660&height=440&quality=80');
    expect(NewsModuleHelper.getImageUrl({ image: { id: 'file-2' } as DatabaseTypes.DirectusFiles }, '/api/', 10, 10)).toBe('/api/assets/file-2?fit=cover&width=440&height=440&quality=80');
    expect(NewsModuleHelper.getImageUrl({ image: null, image_remote_url: 'https://example.org/a.jpg' }, '/', 10, 10)).toBe('https://example.org/a.jpg');
    expect(NewsModuleHelper.getImageUrl({ image: null }, '/', 10, 10)).toBeUndefined();
  });

  it('reads the German title, the locations and the canteens', () => {
    expect(NewsModuleHelper.getTitle(existingNews)).toBe('Grillabend');
    expect(NewsModuleHelper.getTitle({ alias: 'Nur Alias', translations: [] })).toBe('Nur Alias');
    expect(NewsModuleHelper.getLocationPresentations({ display_locations: null }).map(entry => entry.location)).toEqual(['news_list']);
    expect(NewsModuleHelper.getCanteenNames({ id: 'x', canteens: [{ canteens_id: { id: 'c1', alias: 'Mensa' } }, { canteens_id: 'c2' }] })).toEqual(['Mensa']);
  });
});

describe('NewsModuleHelper – editor', () => {
  it('starts a new news as published, in the news list, from now on', () => {
    const draft = NewsModuleHelper.createEmptyDraft(new Date(2026, 9, 16, 9, 5));
    expect(draft.status).toBe(NewsStatus.PUBLISHED);
    expect(draft.locations).toEqual(['news_list']);
    expect(draft.date).toBe('2026-10-16T09:05');
    expect(NewsModuleHelper.canSave(draft)).toBe(false);
  });

  it('reads a news into a draft', () => {
    const draft = NewsModuleHelper.draftFromNews(existingNews);
    expect(draft).toMatchObject({
      status: 'draft',
      locations: ['news_list', 'popup'],
      title: 'Grillabend',
      content: 'Text',
      alias: '',
      image: 'file-1',
      imageRemoteUrl: 'https://example.org/remote.jpg',
      date: '2026-10-19T08:00',
      dateEnd: '',
      canteenIds: ['c1', 'c2'],
      showOnIos: true,
      showOnAndroid: false,
      showOnWeb: true,
      appVersion: '<21.0.0',
      onlyAnonymousUsers: true,
      showLoginButton: true,
    });
    expect(draft.translations['en-US']).toEqual({ manual: false, title: 'Barbecue', content: 'Text en' });
    expect(draft.translations['fr-FR']?.manual).toBe(true);
  });

  it('toggles locations in a fixed order and never leaves none', () => {
    expect(NewsModuleHelper.toggleLocation(['popup'], 'news_list')).toEqual(['news_list', 'popup']);
    expect(NewsModuleHelper.toggleLocation(['popup'], 'popup')).toEqual(['news_list']);
  });

  it('offers the preview views of the chosen locations', () => {
    expect(NewsModuleHelper.getPreviewViews({ locations: ['news_list'] })).toEqual([NewsPreviewView.LIST, NewsPreviewView.DETAIL]);
    expect(NewsModuleHelper.getPreviewViews({ locations: ['popup', 'foodoffers_bottom'] })).toEqual([NewsPreviewView.DETAIL, NewsPreviewView.POPUP, NewsPreviewView.FOODOFFERS]);
  });

  it('builds a new news with the German source and a hand written language', () => {
    const draft = { ...NewsModuleHelper.createEmptyDraft(new Date(2026, 9, 16, 9, 5)), title: ' Grillabend ', content: 'Text', canteenIds: ['c1'], translations: { 'en-US': { manual: true, title: 'Barbecue', content: 'Text en' }, 'fr-FR': { manual: false, title: '', content: '' } } };
    const payload = NewsModuleHelper.buildPayload(draft, null, 'de-DE');
    expect(payload).toMatchObject({ status: 'published', alias: 'Grillabend', display_locations: ['news_list'], image: null, image_remote_url: null, date: '2026-10-16T09:05:00', date_end: null, url: null, show_on_app_version: null });
    expect(payload.canteens).toEqual([{ canteens_id: 'c1' }]);
    expect(payload.translations).toEqual([
      { languages_code: 'de-DE', title: 'Grillabend', content: 'Text', be_source_for_translations: true, let_be_translated: false },
      { languages_code: 'en-US', title: 'Barbecue', content: 'Text en', let_be_translated: false, be_source_for_translations: false },
    ]);
  });

  it('keeps every existing row on update and only changes what was edited', () => {
    const draft = { ...NewsModuleHelper.draftFromNews(existingNews), alias: 'eigener-alias', canteenIds: ['c2', 'c3'] };
    draft.translations = { ...draft.translations, 'fr-FR': { manual: false, title: '', content: '' } };
    const payload = NewsModuleHelper.buildPayload(draft, existingNews, 'de-DE');
    expect(payload.alias).toBe('eigener-alias');
    expect(payload.image_remote_url).toBe('https://example.org/remote.jpg');
    expect(payload.canteens).toEqual([{ id: 12 }, { canteens_id: 'c3' }]);
    expect(payload.translations).toEqual([
      { id: 1, title: 'Grillabend', content: 'Text', be_source_for_translations: true, let_be_translated: false },
      { id: 2, let_be_translated: true, be_source_for_translations: false },
      { id: 3, let_be_translated: true, be_source_for_translations: false },
    ]);
  });

  it('converts the input dates', () => {
    expect(NewsModuleHelper.toInputDateTime('2026-10-19T08:00:00')).toBe('2026-10-19T08:00');
    expect(NewsModuleHelper.fromInputDateTime('2026-10-19T08:00')).toBe('2026-10-19T08:00:00');
    expect(NewsModuleHelper.fromInputDateTime(' ')).toBeNull();
  });

  it('lists the languages besides German', () => {
    const languages = [{ code: 'de-DE', name: 'Deutsch' }, { code: 'en-US', name: 'English' }, { code: 'ar' }];
    expect(NewsModuleHelper.getSourceLanguageCode(languages)).toBe('de-DE');
    expect(NewsModuleHelper.getTranslationLanguages(languages)).toEqual([
      { code: 'en-US', name: 'English' },
      { code: 'ar', name: 'ar' },
    ]);
  });
});
