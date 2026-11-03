import { ServerHelper } from 'repo-depkit-common';

// Screens that are not part of AppScreens (the screenshot generator shoots every AppScreens
// entry, and detail pages, monitors or experiments do not belong into the store screenshots).
// They are audited all the same, so every route under apps/frontend/app/app is covered.
//
// Detail pages need a real id: `resolve` names a public collection on the test server, the
// first item's field becomes the query parameter. Collections the public role cannot read
// (chats, inventory_items) are audited without an id, which shows their empty state.

export interface AdditionalRoute {
  /** Name in the report */
  name: string;
  /** Path relative to the base url, without route groups like (app) */
  path: string;
  /** Static query parameters */
  params?: Record<string, string>;
  /** Query parameter filled with the first item of a collection on the server */
  resolve?: { param: string; collection: string; field?: string };
}

export const ADDITIONAL_ROUTES: AdditionalRoute[] = [
  { name: 'start (index)', path: '' },
  { name: 'not-found', path: 'this-page-does-not-exist' },
  { name: 'foodoffers/details', path: 'foodoffers/details', resolve: { param: 'foodId', collection: 'foodoffers', field: 'food' } },
  { name: 'campus/details', path: 'campus/details', resolve: { param: 'id', collection: 'buildings' } },
  { name: 'housing/details', path: 'housing/details', resolve: { param: 'id', collection: 'apartments' } },
  { name: 'housing-analytics', path: 'housing-analytics' },
  { name: 'housing-analytics/[report]', path: 'housing-analytics/defect-rate' },
  { name: 'inventory-items/details', path: 'inventory-items/details' },
  { name: 'chats', path: 'chats' },
  { name: 'chats/details', path: 'chats/details' },
  { name: 'collectible-events', path: 'collectible-events' },
  { name: 'collectible-event', path: 'collectible-event' },
  { name: 'collectible-event-monitor', path: 'collectible-event-monitor' },
  { name: 'form-queue', path: 'form-queue' },
  { name: 'image-full-screen', path: 'image-full-screen', params: { uri: 'favicon.ico' } },
  { name: 'list-week-screen/details', path: 'list-week-screen/details', resolve: { param: 'canteens_id', collection: 'canteens' } },
  { name: 'public/app-download', path: 'public/app-download' },
  { name: 'public/app-download-management', path: 'public/app-download-management' },
  { name: 'public/give-feedback', path: 'public/give-feedback' },
  { name: 'public/mcp-instruction', path: 'public/mcp-instruction' },
  { name: 'experimentell/account-required-example', path: 'experimentell/account-required-example' },
  { name: 'experimentell/api-request', path: 'experimentell/api-request' },
  { name: 'experimentell/avatar-scroll-list', path: 'experimentell/avatar-scroll-list' },
  { name: 'experimentell/avatars', path: 'experimentell/avatars' },
  { name: 'experimentell/date-helper', path: 'experimentell/date-helper' },
  { name: 'experimentell/debug-logout', path: 'experimentell/debug-logout' },
  { name: 'experimentell/expo-update-test', path: 'experimentell/expo-update-test' },
  { name: 'experimentell/food-wishlist', path: 'experimentell/food-wishlist' },
  { name: 'experimentell/game-ideas', path: 'experimentell/game-ideas' },
  { name: 'experimentell/giro-card-iban', path: 'experimentell/giro-card-iban' },
  { name: 'experimentell/haptics', path: 'experimentell/haptics' },
  { name: 'experimentell/inventory-items', path: 'experimentell/inventory-items' },
  { name: 'experimentell/inventory-items/create', path: 'experimentell/inventory-items/create' },
  { name: 'experimentell/map-with-custom-images-and-buildings', path: 'experimentell/map-with-custom-images-and-buildings' },
  { name: 'experimentell/markdown-test', path: 'experimentell/markdown-test' },
  { name: 'experimentell/onboarding', path: 'experimentell/onboarding' },
  { name: 'experimentell/playbook', path: 'experimentell/playbook' },
  { name: 'experimentell/playbook/[component]', path: 'experimentell/playbook/SettingsList' },
  { name: 'experimentell/rate-app', path: 'experimentell/rate-app' },
  { name: 'experimentell/store-versions', path: 'experimentell/store-versions' },
  { name: 'experimentell/text-recognition-test', path: 'experimentell/text-recognition-test' },
];

export const DEFAULT_SERVER_URL = ServerHelper.TEST_SERVER_CONFIG.server_url;

async function fetchFirstValue(serverUrl: string, collection: string, field: string): Promise<string | undefined> {
  try {
    const response = await fetch(`${serverUrl}/items/${collection}?limit=1&fields=${field}&filter[${field}][_nnull]=true`);
    if (!response.ok) return undefined;
    const body = (await response.json()) as { data?: Record<string, unknown>[] };
    const value = body.data?.[0]?.[field];
    return value === undefined || value === null ? undefined : String(value);
  } catch {
    return undefined;
  }
}

/** Query parameters of a route, with the `resolve` parameter looked up on the server. */
export async function buildAdditionalRouteParams(route: AdditionalRoute, serverUrl: string): Promise<Record<string, string>> {
  const params: Record<string, string> = { ...route.params };
  if (route.resolve) {
    const value = await fetchFirstValue(serverUrl, route.resolve.collection, route.resolve.field ?? 'id');
    if (value) {
      params[route.resolve.param] = value;
    } else {
      console.warn(`  could not resolve ${route.resolve.param} from ${route.resolve.collection}, auditing ${route.name} without it`);
    }
  }
  return params;
}
