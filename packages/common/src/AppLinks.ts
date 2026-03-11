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
  PRICE_GROUP = 'price-group',
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
  LEAFLET_MAP = 'leaflet-map',
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
  FOOD_WISHLIST = 'food-wishlist',
}

export interface AppLinkParam {
  key: string;
  value: string | number | boolean;
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
