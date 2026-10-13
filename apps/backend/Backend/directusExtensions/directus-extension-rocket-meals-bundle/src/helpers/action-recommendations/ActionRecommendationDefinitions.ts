/**
 * ActionRecommendationDefinitions.ts – which collections can get action recommendations, and what
 * each of them offers.
 *
 * Fixed in code on purpose: a collection says itself which fields may be sent to the AI (an allowlist,
 * personal data such as `profile` or `contact_email` never leaves the server) and which actions make
 * sense for it. A new collection only needs an entry here (plus the labels of new actions in the
 * backend catalog), the endpoint, the prompt and the table `action_recommendations` are shared.
 *
 * No Vue and no Directus imports: the endpoint and the module pages both use it.
 */

import { CollectionNames } from 'repo-depkit-common/src/databaseTypes/CollectionNames';
import { isSameBaseLanguage } from 'repo-depkit-common/src/translations/TranslationLanguage';
import { BackendTranslationKeys } from '../translations/BackendTranslationKeys';

/** Everything that can be recommended. The value is stored in `action_recommendations.action`. */
export enum ActionRecommendationAction {
  REPLY = 'reply',
  MARK_RESOLVED = 'mark_resolved',
}

/**
 * The status of a recommendation, stored in `action_recommendations.status` (the archive field of the
 * collection): `processing` while the AI is asked, then a `draft` with the recommendation or `failed`
 * (see `logs`). Once someone dealt with the item it is closed: `accepted` when the recommended action
 * was taken, `rejected` when another one was taken or it was turned down, `archived` when there was
 * nothing to take (still processing or failed).
 */
export enum ActionRecommendationStatus {
  PROCESSING = 'processing',
  DRAFT = 'draft',
  FAILED = 'failed',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

/** The statuses of a recommendation nobody has dealt with yet: shown in the module, replaced by a new one. */
export const OPEN_ACTION_RECOMMENDATION_STATUSES: readonly ActionRecommendationStatus[] = [ActionRecommendationStatus.PROCESSING, ActionRecommendationStatus.DRAFT, ActionRecommendationStatus.FAILED];

export type ActionRecommendationActionInfo = {
  /** What the AI is told the action means (prompt text, never shown in the UI). */
  promptDescription: string;
  labelKey: BackendTranslationKeys;
  icon: string;
};

export const ACTION_RECOMMENDATION_ACTIONS: Record<ActionRecommendationAction, ActionRecommendationActionInfo> = {
  [ActionRecommendationAction.REPLY]: {
    promptDescription: 'Antworten: der Eintrag enthält eine Frage, ein konkretes Problem oder Kritik, auf die eine Antwort hilft. Schreibe dann einen kurzen, freundlichen Antwortvorschlag, den der Support so als erste Chat-Nachricht an die Person schicken würde.',
    labelKey: BackendTranslationKeys.rocket_meals_module_action_recommendation_action_reply,
    icon: 'reply',
  },
  [ActionRecommendationAction.MARK_RESOLVED]: {
    promptDescription: 'Als erledigt markieren, ohne zu antworten: kein konkreter Inhalt, reines Lob, Unsinn, Spam oder Beleidigung, eine Antwort bringt niemandem etwas.',
    labelKey: BackendTranslationKeys.rocket_meals_module_mark_resolved,
    icon: 'task_alt',
  },
};

export type ActionRecommendationDefinition = {
  collection: CollectionNames;
  /** What an item of the collection is, for the AI (prompt text). */
  promptContext: string;
  /** The only fields of an item that are sent to the AI, besides `id`; also of relations (`food.alias`). */
  fields: readonly string[];
  /** The actions the AI may recommend for an item of this collection. */
  actions: readonly ActionRecommendationAction[];
  /** Only items with text in one of these fields are worth a recommendation or a summary. */
  textFields: readonly string[];
  /** A field the items of a summary can be grouped by, e.g. all feedbacks of one food. */
  summaryGroupField?: string;
  /** The relation to the author's profile: its `language` decides the language of a draft reply. Never sent to the AI. */
  authorProfileField?: string;
  /** For items with a support chat: its messages go into the prompt, so the recommendation knows the conversation. */
  chat?: ActionRecommendationChatDefinition;
};

export type ActionRecommendationChatDefinition = {
  /** The relation to `chats`. */
  field: string;
};

export class ActionRecommendationDefinitions {
  static readonly DEFINITIONS: readonly ActionRecommendationDefinition[] = [
    {
      collection: CollectionNames.FOODS_FEEDBACKS,
      promptContext: 'Rückmeldungen von Gästen einer Mensa zu einer Speise: ein Kommentar, eine Bewertung von 1 (schlecht) bis 5 (gut), der Name der Speise ("food.alias"), die Mensa ("canteen.alias") und der Tag, an dem die Speise angeboten wurde ("foodoffer.date").',
      fields: ['comment', 'rating', 'food.alias', 'canteen.alias', 'foodoffer.date'],
      textFields: ['comment'],
      actions: [ActionRecommendationAction.REPLY, ActionRecommendationAction.MARK_RESOLVED],
      summaryGroupField: 'food',
      authorProfileField: 'profile',
      chat: { field: 'chat' },
    },
    {
      collection: CollectionNames.APP_FEEDBACKS,
      promptContext: 'Rückmeldungen zur Mensa- und Campus-App, aus dem Feedback-Formular der App oder als Bewertung im App Store bzw. Google Play. "positive" sagt, ob die Rückmeldung positiv gemeint ist.',
      fields: ['title', 'content', 'positive'],
      textFields: ['title', 'content'],
      actions: [ActionRecommendationAction.REPLY, ActionRecommendationAction.MARK_RESOLVED],
      authorProfileField: 'profile',
    },
  ];

  /** The language of a draft reply when the server has no default language. */
  static readonly FALLBACK_REPLY_LANGUAGE = 'de';
  /** The language of a draft reply to an author with another language than German. */
  static readonly FOREIGN_REPLY_LANGUAGE = 'en';

  /** At most this many items go to the AI in one call; a larger request is split into several calls. */
  static readonly MAX_ITEMS_PER_RECOMMENDATION = 25;
  /** At most this many items can be asked for in one request (e.g. the selection of a list page). */
  static readonly MAX_ITEMS_PER_REQUEST = 100;
  /** At most this many messages of a chat, the newest, go into a recommendation. */
  static readonly MAX_CHAT_MESSAGES_PER_ITEM = 20;
  /** At most this many items, the newest first, go into one summary. */
  static readonly MAX_ITEMS_PER_SUMMARY = 200;

  static getDefinition(collection: unknown): ActionRecommendationDefinition | null {
    return ActionRecommendationDefinitions.DEFINITIONS.find(definition => definition.collection === collection) ?? null;
  }

  static isAction(value: unknown): value is ActionRecommendationAction {
    return Object.values(ActionRecommendationAction).includes(value as ActionRecommendationAction);
  }

  static getActionInfo(action: unknown): ActionRecommendationActionInfo | null {
    return ActionRecommendationDefinitions.isAction(action) ? ACTION_RECOMMENDATION_ACTIONS[action] : null;
  }

  /** The fields to read for an item: the id, the allowlist and the chat (only to find its messages). */
  static getReadFields(definition: ActionRecommendationDefinition): string[] {
    return ['id', ...definition.fields, ...(definition.chat ? [definition.chat.field] : [])];
  }

  /**
   * The language a draft reply is written in: authors without a language or with German get the
   * default language of the server (`directus_settings.default_language`), everybody else English.
   */
  static getReplyLanguage(authorLanguage: string | null | undefined, defaultLanguage: string | null | undefined): string {
    if (!authorLanguage?.trim() || isSameBaseLanguage(authorLanguage, 'de')) {
      return defaultLanguage?.trim() || ActionRecommendationDefinitions.FALLBACK_REPLY_LANGUAGE;
    }
    return ActionRecommendationDefinitions.FOREIGN_REPLY_LANGUAGE;
  }

  /** The language code of the author, read as `<authorProfileField>.language` (a code or a `languages` row). */
  static getAuthorLanguage(definition: ActionRecommendationDefinition, row: Record<string, unknown> | null | undefined): string | null {
    const profile = definition.authorProfileField ? row?.[definition.authorProfileField] : null;
    if (!profile || typeof profile !== 'object') {
      return null;
    }
    const language = (profile as { language?: unknown }).language;
    if (typeof language === 'string') {
      return language;
    }
    const code = (language as { code?: unknown } | null | undefined)?.code;
    return typeof code === 'string' ? code : null;
  }

  /** One line of `action_recommendations.logs`: the time and what happened. */
  static formatLogLine(date: Date, text: string): string {
    return `[${date.toISOString()}] ${text}`;
  }

  /** The value at a dotted path such as `food.alias`, or null when a relation on the way is missing. */
  static getPathValue(row: Record<string, unknown> | null | undefined, path: string): unknown {
    let value: unknown = row;
    for (const part of path.split('.')) {
      if (!value || typeof value !== 'object') {
        return null;
      }
      value = (value as Record<string, unknown>)[part];
    }
    return value ?? null;
  }

  /** The item ids of a request: strings or numbers, without duplicates and empty ones, at most `max`. */
  static parseItemIds(value: unknown, max: number = ActionRecommendationDefinitions.MAX_ITEMS_PER_REQUEST): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const ids = value.filter(id => typeof id === 'string' || typeof id === 'number').map(id => String(id).trim());
    return [...new Set(ids.filter(id => id.length > 0))].slice(0, max);
  }

  /** The language the AI writes in: a short code like `de` or `en-US`, German otherwise. */
  static parseLanguage(value: unknown): string {
    return typeof value === 'string' && /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/.test(value) ? value : 'de';
  }

  /** A Directus filter for items that have text in at least one text field. */
  static buildHasTextFilter(definition: ActionRecommendationDefinition): Record<string, unknown> {
    return { _or: definition.textFields.map(field => ({ [field]: { _nempty: true } })) };
  }
}
