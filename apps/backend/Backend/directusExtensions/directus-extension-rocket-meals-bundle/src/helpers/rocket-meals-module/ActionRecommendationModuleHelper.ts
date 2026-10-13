/**
 * ActionRecommendationModuleHelper.ts – what the endpoint `action-recommendations` and the module
 * pages share: routes, the fields of a stored recommendation, error codes, and the reads and writes
 * of the pages (open recommendations of the listed items, close one as accepted or rejected once its item
 * was dealt with).
 *
 * Takes the Directus app's API client (`useApi()`) as parameter, so it has no Vue imports and runs in
 * the Node tests.
 */

import { ActionRecommendationAction, ActionRecommendationDefinitions, ActionRecommendationStatus, OPEN_ACTION_RECOMMENDATION_STATUSES } from '../action-recommendations/ActionRecommendationDefinitions';

/** Why a request to the endpoint failed, sent as `code` next to `error`. */
export enum ActionRecommendationErrorCode {
  UNKNOWN_COLLECTION = 'unknown_collection',
  AI_NOT_CONFIGURED = 'ai_not_configured',
  AI_FAILED = 'ai_failed',
}

/** A stored recommendation as the pages read it. */
export type ModuleActionRecommendation = {
  id: string;
  collection?: string | null;
  item?: string | null;
  action?: string | null;
  reason?: string | null;
  draft_reply?: string | null;
  status?: string | null;
  logs?: string | null;
  recommended_by_ai?: string | null;
  recommended_by_profile?: string | { id?: string; nickname?: string | null } | null;
  date_created?: string | null;
};

export type ActionRecommendationApiClient = {
  get: (url: string, config?: { params?: Record<string, unknown> }) => Promise<{ data?: any }>;
  patch: (url: string, data?: unknown) => Promise<{ data?: any }>;
};

/** `GET /action-recommendations/status`: what the AI can do on this server. */
export type ActionRecommendationAiStatus = { ai_configured: boolean; enabled: boolean };

export type ActionRecommendationPostClient = {
  get: (url: string, config?: { params?: Record<string, unknown> }) => Promise<{ data?: any }>;
  post: (url: string, data?: unknown) => Promise<{ data?: any }>;
};

export class ActionRecommendationModuleHelper {
  static readonly ENDPOINT_ID = 'action-recommendations';
  static readonly RECOMMEND_ROUTE = '/recommend';
  static readonly SUMMARIZE_ROUTE = '/summarize';
  static readonly STATUS_ROUTE = '/status';

  static getEndpointUrl(route: string): string {
    return `/${ActionRecommendationModuleHelper.ENDPOINT_ID}${route}`;
  }

  /** Whether an AI provider is configured; a failing request counts as not configured. */
  static async loadAiStatus(api: ActionRecommendationPostClient): Promise<ActionRecommendationAiStatus> {
    try {
      const response = await api.get(ActionRecommendationModuleHelper.getEndpointUrl(ActionRecommendationModuleHelper.STATUS_ROUTE));
      return { ai_configured: response.data?.data?.ai_configured === true, enabled: response.data?.data?.enabled === true };
    } catch (error) {
      console.error('[rocket-meals-module] loading the AI status failed', error);
      return { ai_configured: false, enabled: false };
    }
  }

  /**
   * Asks the AI for recommendations for the items, in the background: resolves as soon as the rows
   * exist (`processing`), the page reloads them until they are done. Several requests for more items
   * than one request takes. Throws when a request fails.
   */
  static async requestRecommendations(api: ActionRecommendationPostClient, collection: string, itemIds: readonly string[], language: string | undefined): Promise<void> {
    for (let start = 0; start < itemIds.length; start += ActionRecommendationDefinitions.MAX_ITEMS_PER_REQUEST) {
      await api.post(ActionRecommendationModuleHelper.getEndpointUrl(ActionRecommendationModuleHelper.RECOMMEND_ROUTE), { // NOSONAR S9382 - sequential on purpose: one batch after the other
        collection,
        ids: itemIds.slice(start, start + ActionRecommendationDefinitions.MAX_ITEMS_PER_REQUEST),
        language,
        background: true,
      });
    }
  }

  static readonly ITEMS_ENDPOINT = '/items/action_recommendations';

  /** The fields of `action_recommendations` the module shows. */
  static readonly FIELDS = ['id', 'collection', 'item', 'action', 'reason', 'draft_reply', 'status', 'logs', 'recommended_by_ai', 'recommended_by_profile', 'user_created', 'date_created'];

  /** The icon of recommendations everywhere in the module. */
  static readonly ICON = 'auto_awesome';

  /** Query parameter of a chat page: put the draft reply into the input right away. */
  static readonly USE_DRAFT_QUERY = 'use_draft';

  /** How often a page reloads the recommendations while the AI is still being asked. */
  static readonly PROCESSING_REFRESH_INTERVAL_MS = 5000;

  /** Open (asked, answered or failed, not yet dealt with) recommendations of the given items, newest first. */
  static buildOpenQuery(collection: string, itemIds: readonly (string | number)[]): Record<string, unknown> {
    return {
      fields: ActionRecommendationModuleHelper.FIELDS.join(','),
      filter: JSON.stringify({ _and: [{ collection: { _eq: collection } }, { item: { _in: itemIds.map(String) } }, { status: { _in: [...OPEN_ACTION_RECOMMENDATION_STATUSES] } }] }),
      sort: '-date_created',
      limit: -1,
    };
  }

  /** The newest recommendation per item; recommendations must come newest first. */
  static getNewestByItem(recommendations: readonly ModuleActionRecommendation[]): Record<string, ModuleActionRecommendation> {
    const byItem: Record<string, ModuleActionRecommendation> = {};
    for (const recommendation of recommendations) {
      const item = recommendation.item ? String(recommendation.item) : '';
      if (item && !byItem[item]) {
        byItem[item] = recommendation;
      }
    }
    return byItem;
  }

  /** Reads the open recommendations of the items; an empty list without items or when the read fails. */
  static async loadOpen(api: ActionRecommendationApiClient, collection: string, itemIds: readonly (string | number)[]): Promise<Record<string, ModuleActionRecommendation>> {
    if (itemIds.length === 0) {
      return {};
    }
    try {
      const response = await api.get(ActionRecommendationModuleHelper.ITEMS_ENDPOINT, { params: ActionRecommendationModuleHelper.buildOpenQuery(collection, itemIds) });
      return ActionRecommendationModuleHelper.getNewestByItem(response.data?.data ?? []);
    } catch (error) {
      // No permission on the table or the table does not exist yet: the page works as before.
      console.error('[rocket-meals-module] loading action recommendations failed', error);
      return {};
    }
  }

  /**
   * How a recommendation is closed once someone dealt with its item: `accepted` when `takenAction` is
   * the recommended one, `rejected` when another action was taken or it was turned down (`null`),
   * `archived` when it recommended nothing yet (still processing or failed).
   */
  static getClosingStatus(recommendation: ModuleActionRecommendation | null | undefined, takenAction: ActionRecommendationAction | null): ActionRecommendationStatus {
    const recommendedAction = ActionRecommendationModuleHelper.getRecommendedAction(recommendation);
    if (!recommendedAction) {
      return ActionRecommendationStatus.ARCHIVED;
    }
    return recommendedAction === takenAction ? ActionRecommendationStatus.ACCEPTED : ActionRecommendationStatus.REJECTED;
  }

  /**
   * Closes the recommendations of items someone dealt with, so they no longer show up: one request per
   * closing status (see {@link getClosingStatus}). `takenAction` is what was done, `null` when the
   * recommendation was turned down without doing anything.
   */
  static async close(api: ActionRecommendationApiClient, recommendations: readonly (ModuleActionRecommendation | null | undefined)[], takenAction: ActionRecommendationAction | null): Promise<void> {
    const keysByStatus = new Map<ActionRecommendationStatus, string[]>();
    for (const recommendation of recommendations) {
      if (!recommendation?.id) {
        continue;
      }
      const status = ActionRecommendationModuleHelper.getClosingStatus(recommendation, takenAction);
      keysByStatus.set(status, [...(keysByStatus.get(status) ?? []), recommendation.id]);
    }
    for (const [status, keys] of keysByStatus) {
      await api.patch(ActionRecommendationModuleHelper.ITEMS_ENDPOINT, { keys, data: { status } }); // NOSONAR S9382 - at most three statuses, one after the other
    }
  }

  /** The AI is still being asked. */
  static isProcessing(recommendation: ModuleActionRecommendation | null | undefined): boolean {
    return recommendation?.status === ActionRecommendationStatus.PROCESSING;
  }

  /** The AI failed or gave no valid answer; `logs` says why. */
  static isFailed(recommendation: ModuleActionRecommendation | null | undefined): boolean {
    return recommendation?.status === ActionRecommendationStatus.FAILED;
  }

  /** The last line of `logs`, what happened most recently. */
  static getLastLogLine(recommendation: ModuleActionRecommendation | null | undefined): string | null {
    const lines = (recommendation?.logs ?? '').split('\n').filter(line => line.trim().length > 0);
    return lines[lines.length - 1] ?? null;
  }

  static isAction(recommendation: ModuleActionRecommendation | null | undefined, action: ActionRecommendationAction): boolean {
    return recommendation?.action === action;
  }

  /** The action an answered recommendation recommends; null while processing, after a failure or for an unknown action. */
  static getRecommendedAction(recommendation: ModuleActionRecommendation | null | undefined): ActionRecommendationAction | null {
    if (recommendation?.status !== ActionRecommendationStatus.DRAFT || !ActionRecommendationDefinitions.isAction(recommendation.action)) {
      return null;
    }
    return recommendation.action;
  }

  /**
   * Whether the button of `action` is the highlighted (primary) one: with an answered recommendation
   * only the recommended action, otherwise `defaultAction` (what the page highlights without AI).
   */
  static isHighlighted(recommendation: ModuleActionRecommendation | null | undefined, action: ActionRecommendationAction, defaultAction: ActionRecommendationAction | null): boolean {
    return (ActionRecommendationModuleHelper.getRecommendedAction(recommendation) ?? defaultAction) === action;
  }

  /** The draft reply of a recommendation to reply, otherwise null. */
  static getDraftReply(recommendation: ModuleActionRecommendation | null | undefined): string | null {
    if (!ActionRecommendationModuleHelper.isAction(recommendation, ActionRecommendationAction.REPLY)) {
      return null;
    }
    const draft = recommendation?.draft_reply?.trim();
    return draft || null;
  }

  /** Who recommended it: provider and model of the AI, or the nickname of the profile. */
  static getRecommendedBy(recommendation: ModuleActionRecommendation | null | undefined): string | null {
    if (recommendation?.recommended_by_ai) {
      return recommendation.recommended_by_ai;
    }
    const profile = recommendation?.recommended_by_profile;
    if (profile && typeof profile === 'object') {
      return profile.nickname ?? profile.id ?? null;
    }
    return profile ?? null;
  }

  /** The label key of the recommended action, or null for an action this module does not know. */
  static getActionLabelKey(recommendation: ModuleActionRecommendation | null | undefined) {
    return ActionRecommendationDefinitions.getActionInfo(recommendation?.action)?.labelKey ?? null;
  }
}
