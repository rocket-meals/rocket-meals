/**
 * ActionRecommendationPrompt.ts – the prompts for action recommendations and summaries, and the
 * strict check of the AI's answers. Shared by every collection in `ActionRecommendationDefinitions`.
 *
 * Like `FeatureWishModeration`, an answer only ever becomes a suggestion, and only what the AI was
 * asked about counts: unknown items, actions the collection does not offer or empty answers are
 * dropped and reported in `ignored`.
 */

import { ACTION_RECOMMENDATION_ACTIONS, ActionRecommendationAction, ActionRecommendationDefinitions, type ActionRecommendationDefinition } from './ActionRecommendationDefinitions';

/** An item as read from the database: `id` plus the allowlisted fields. */
export type ActionRecommendationSourceItem = { id: string | number } & Record<string, unknown>;

/** One recommendation the AI gave for one item. */
export type ParsedActionRecommendation = {
  item: string;
  action: ActionRecommendationAction;
  reason: string;
  draft_reply: string | null;
};

export type ActionRecommendationParseResult = { recommendations: ParsedActionRecommendation[]; ignored: string[] };

export type ActionRecommendationSummary = { summary: string; key_points: string[] };

export type ChatPrompt = { system: string; user: string };

/** Who wrote a message of a support chat, as the AI is told: the guest or the support (never a name). */
export enum ChatReplyRole {
  GUEST = 'guest',
  SUPPORT = 'support',
}

export type ChatReplyMessage = { role: ChatReplyRole; text: string };

const REASON_MAX_LENGTH = 1000;
const DRAFT_REPLY_MAX_LENGTH = 2000;
const SUMMARY_MAX_LENGTH = 4000;
const KEY_POINTS_MAX = 10;
const KEY_POINT_MAX_LENGTH = 300;
const ITEM_TEXT_MAX_LENGTH = 2000;

/** Replies read like a short chat message, not like a letter. */
const REPLY_LENGTH_RULE = 'Halte die Antwort kurz wie eine Chat-Nachricht: höchstens zwei kurze Sätze und höchstens 250 Zeichen, ohne Anrede-Floskeln, ohne Aufzählungen oder Beispiele, höchstens eine Rückfrage.';

const WRITING_RULE = 'Verwende keine Gedankenstriche und keine Semikolons, sondern Kommas, Doppelpunkte oder neue Sätze.';

function trimText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export class ActionRecommendationPrompt {
  /**
   * Only the allowlisted fields (long texts cut), the language of a draft reply and the messages of the
   * item's chat, each only with its role.
   */
  static toPromptItem(definition: ActionRecommendationDefinition, item: ActionRecommendationSourceItem, replyLanguage?: string, messages?: readonly ChatReplyMessage[]): Record<string, unknown> {
    const promptItem: Record<string, unknown> = { id: String(item.id) };
    if (replyLanguage) {
      promptItem.reply_language = replyLanguage;
    }
    for (const field of definition.fields) {
      const value = ActionRecommendationDefinitions.getPathValue(item, field);
      promptItem[field] = typeof value === 'string' ? value.slice(0, ITEM_TEXT_MAX_LENGTH) : (value ?? null);
    }
    if (messages && messages.length > 0) {
      promptItem.messages = messages.slice(-ActionRecommendationDefinitions.MAX_CHAT_MESSAGES_PER_ITEM).map(message => ({ role: message.role, text: message.text.slice(0, ITEM_TEXT_MAX_LENGTH) }));
    }
    return promptItem;
  }

  /**
   * `replyLanguages`: per item id the language of its draft reply (see `ActionRecommendationDefinitions.getReplyLanguage`).
   * `chatMessages`: per item id the messages of its support chat so far, oldest first.
   */
  static buildRecommendationPrompt(
    definition: ActionRecommendationDefinition,
    items: readonly ActionRecommendationSourceItem[],
    language: string,
    replyLanguages: Readonly<Record<string, string>> = {},
    chatMessages: Readonly<Record<string, readonly ChatReplyMessage[]>> = {}
  ): ChatPrompt {
    const chatRule = definition.chat
      ? `Hat ein Eintrag schon einen Chat mit dem Support, stehen dessen Nachrichten in "messages", jeweils mit der Rolle "${ChatReplyRole.GUEST}" (der Gast) oder "${ChatReplyRole.SUPPORT}" (der Support), ohne Namen. Berücksichtige den Verlauf: der Antwortvorschlag ist dann die nächste Nachricht des Supports, und ist das Anliegen geklärt, empfiehl "${ActionRecommendationAction.MARK_RESOLVED}".\n`
      : '';
    const actionLines = definition.actions.map(action => `- "${action}": ${ACTION_RECOMMENDATION_ACTIONS[action].promptDescription}`).join('\n');
    const system = `Du hilfst dem Support einer Mensa- und Campus-App, Einträge abzuarbeiten. Die Einträge sind: ${definition.promptContext}
Empfiehl für jeden Eintrag genau eine dieser Handlungen:
${actionLines}

Ein Mensch entscheidet am Ende, du gibst nur eine Empfehlung.
${chatRule}Schreibe die Begründung ("reason") kurz in der Sprache mit dem Code "${language}".
Einen Antwortvorschlag ("draft_reply") gibt es nur bei "${ActionRecommendationAction.REPLY}". ${REPLY_LENGTH_RULE}
Schreibe ihn in der Sprache mit dem Code aus "reply_language" des Eintrags (ohne Angabe: "${ActionRecommendationDefinitions.FALLBACK_REPLY_LANGUAGE}"), auch wenn der Eintrag selbst in einer anderen Sprache geschrieben ist. Sonst ist er null.
${WRITING_RULE}

Antworte ausschließlich mit einem JSON-Objekt in genau dieser Form, ohne weiteren Text:
{"recommendations":[{"id":"<id>","action":"${definition.actions.join('|')}","reason":"<kurze Begründung>","draft_reply":"<Antwortvorschlag oder null>"}]}`;
    const user = JSON.stringify({ items: items.map(item => ActionRecommendationPrompt.toPromptItem(definition, item, replyLanguages[String(item.id)], chatMessages[String(item.id)])) }, null, 2);
    return { system, user };
  }

  static parseRecommendations(answer: unknown, definition: ActionRecommendationDefinition, itemIds: ReadonlySet<string>): ActionRecommendationParseResult {
    const recommendations: ParsedActionRecommendation[] = [];
    const ignored: string[] = [];
    const entries = (answer as { recommendations?: unknown })?.recommendations;
    if (!Array.isArray(entries)) {
      return { recommendations, ignored: ['the answer has no "recommendations" list'] };
    }
    const handled = new Set<string>();
    for (const entry of entries) {
      const raw = entry as { id?: unknown; action?: unknown; reason?: unknown; draft_reply?: unknown };
      const item = raw?.id === undefined || raw?.id === null ? '' : String(raw.id);
      if (!itemIds.has(item)) {
        ignored.push(`unknown item "${item}"`);
        continue;
      }
      if (handled.has(item)) {
        ignored.push(`second recommendation for item "${item}"`);
        continue;
      }
      if (!ActionRecommendationDefinitions.isAction(raw.action) || !definition.actions.includes(raw.action)) {
        ignored.push(`action "${String(raw.action)}" is not offered for item "${item}"`);
        continue;
      }
      const reason = trimText(raw.reason, REASON_MAX_LENGTH);
      if (!reason) {
        ignored.push(`no reason for item "${item}"`);
        continue;
      }
      const draftReply = raw.action === ActionRecommendationAction.REPLY ? trimText(raw.draft_reply, DRAFT_REPLY_MAX_LENGTH) : '';
      handled.add(item);
      recommendations.push({ item, action: raw.action, reason, draft_reply: draftReply || null });
    }
    return { recommendations, ignored };
  }

  static buildSummaryPrompt(definition: ActionRecommendationDefinition, items: readonly ActionRecommendationSourceItem[], language: string): ChatPrompt {
    const system = `Du hilfst dem Support einer Mensa- und Campus-App. Fasse die folgenden Einträge zusammen. Die Einträge sind: ${definition.promptContext}
Nenne, was sich wiederholt, was gelobt und was kritisiert wird, und was sich daraus ableiten lässt. Erfinde nichts, was nicht in den Einträgen steht. Nenne keine Namen oder Kontaktdaten.
Schreibe in der Sprache mit dem Code "${language}".
${WRITING_RULE}

Antworte ausschließlich mit einem JSON-Objekt in genau dieser Form, ohne weiteren Text:
{"summary":"<Zusammenfassung in wenigen Sätzen>","key_points":["<Kernpunkt>"]}`;
    const user = JSON.stringify({ items: items.map(item => ActionRecommendationPrompt.toPromptItem(definition, item)) }, null, 2);
    return { system, user };
  }

  static parseSummary(answer: unknown): ActionRecommendationSummary {
    const raw = answer as { summary?: unknown; key_points?: unknown };
    const summary = trimText(raw?.summary, SUMMARY_MAX_LENGTH);
    if (!summary) {
      throw new Error('The answer of the AI has no summary.');
    }
    const keyPoints = Array.isArray(raw.key_points)
      ? raw.key_points
          .map(point => trimText(point, KEY_POINT_MAX_LENGTH))
          .filter(point => point.length > 0)
          .slice(0, KEY_POINTS_MAX)
      : [];
    return { summary, key_points: keyPoints };
  }
}
