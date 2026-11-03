export enum AppScreens {
  LOGIN = 'login',
  FOOD_OFFERS = 'foodoffers',
  EATING_HABITS = 'eating-habits',
  ACCOUNT_BALANCE = 'account-balance',
  CAMPUS = 'campus',
  HOUSING = 'housing',
  NEWS = 'news',
  COURSE_TIMETABLE = 'course-timetable',
  SETTINGS = 'settings',
  DATA_ACCESS = 'data-access',
  SUPPORT_FAQ = 'support-FAQ',
  LICENSE_INFORMATION = 'licenseInformation',
  MANAGEMENT = 'management',
  STATISTICS = 'statistics',
  LABELS = 'labels',
  EVENTS = 'events',
  EXPERIMENTELL = 'experimentell',
  FAQ_FOOD = 'faq-food',
  FAQ_LIVING = 'faq-living',
  FEEDBACK_SUPPORT = 'feedback-support',
  FORMS = 'forms',
  FORM_CATEGORIES = 'form-categories',
  FORM_SUBMISSIONS = 'form-submissions',
  FORM_SUBMISSION = 'form-submission',
  HOUSING_DELETE_USER = 'delete-user',
  INVENTORY_ITEMS = 'inventory-items',
  MAP = 'map',
  NOTIFICATION = 'notification',
  SUPPORT_TICKET = 'support-ticket',
  VERTICAL_IMAGE_SCROLL = 'vertical-image-scroll',
  WIKIS = 'wikis',
  BIG_SCREEN = 'bigScreen',
  FOOD_PLAN_DAY = 'foodPlanDay',
  FOOD_PLAN_LIST = 'foodPlanList',
  FOOD_PLAN_WEEK = 'foodPlanWeek',
  LIST_DAY_SCREEN = 'list-day-screen',
  LIST_WEEK_SCREEN = 'list-week-screen',
  RSS_FEED = 'rss-feed',
  RSS_FEED_CONFIG = 'rss-feed-config',
}

export interface AppLinkParam {
  key: string;
  value: string | number | boolean;
}

// Public host serving the tenant web apps (e.g. https://rocket-meals.de/swosy/...).
export const ROCKET_MEALS_WEB_HOST = 'https://rocket-meals.de';

// Query parameter the wikis screen uses to look up a wiki page
// (see apps/frontend/app/app/(wikis)/wikis/index.tsx).
export const WIKIS_CUSTOM_ID_PARAM = 'custom_id';

// Well-known wiki custom_ids referenced outside the app itself
// (app store metadata, Google SSO consent screen, ...).
export enum WikiCustomIds {
  PRIVACY_POLICY = 'privacy-policy',
}

export class AppLinks {
  static build(path: AppScreens | string, params: AppLinkParam[] = []): string {
    const query = params.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(String(p.value))}`).join('&');
    return query ? `${path}?${query}` : path;
  }

  static foodOffers(params: AppLinkParam[] = []): string {
    return this.build(AppScreens.FOOD_OFFERS, params);
  }

  static campus(params: AppLinkParam[] = []): string {
    return this.build(AppScreens.CAMPUS, params);
  }

  // Public web url of a tenant app screen, e.g. https://rocket-meals.de/swosy/data-access
  static getPublicWebUrl(tenantBaseUrl: string, path: AppScreens | string, params: AppLinkParam[] = []): string {
    return `${ROCKET_MEALS_WEB_HOST}${tenantBaseUrl}/${this.build(path, params)}`;
  }

  // Public web url of a tenant's wiki page, e.g.
  // https://rocket-meals.de/swosy/wikis?custom_id=privacy-policy - used as the privacy
  // policy link in the app stores and the Google SSO consent screen.
  static getPublicWikiUrl(tenantBaseUrl: string, customId: WikiCustomIds | string): string {
    return this.getPublicWebUrl(tenantBaseUrl, AppScreens.WIKIS, [{ key: WIKIS_CUSTOM_ID_PARAM, value: customId }]);
  }

  static getGithubPagesBaseUrl(repositoryOwner: string, repositoryName: string): string {
    return `https://${repositoryOwner}.github.io/${repositoryName}`;
  }

  static getGithubPagesUrl(repositoryOwner: string, repositoryName: string, path: AppScreens | string, params: AppLinkParam[] = []) {
    const baseUrl = this.getGithubPagesBaseUrl(repositoryOwner, repositoryName);
    const fullPath = this.build(path, params);
    return `${baseUrl}/${fullPath}`;
  }
}

export const APP_ROUTES = Object.values(AppScreens);
