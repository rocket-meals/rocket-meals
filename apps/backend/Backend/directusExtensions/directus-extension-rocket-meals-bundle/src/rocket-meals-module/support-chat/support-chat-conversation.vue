<script setup lang="ts">
/**
 * The conversation of a support chat: the request that opened it as first bubble, the messages
 * (user left, support right) and the input to answer. Shared by the chat pages of food feedbacks
 * and app feedbacks and the page of a chat; loading and sending stay with the page (`send`).
 * Messages of users carry the avatar of their profile, a click on it opens the profile page.
 */
import { computed, nextTick, ref, useId, watch } from 'vue';
import { ChatHelper } from 'repo-depkit-common/src/ChatHelper';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { FoodFeedbackChatHelper, type FoodFeedbackChatMessage } from '../../helpers/rocket-meals-module/FoodFeedbackChatHelper';
import type { ModuleProfile } from '../../helpers/rocket-meals-module/ProfileDetailsHelper';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';
import { ActionRecommendationModuleHelper } from '../../helpers/rocket-meals-module/ActionRecommendationModuleHelper';
import ProfileAvatar from '../profiles/profile-avatar.vue';

const props = defineProps<{
  /** The request of the user, e.g. the comment of a food feedback. */
  opening?: { text: string; date?: string | null } | null;
  messages: readonly FoodFeedbackChatMessage[];
  canWrite: boolean;
  /** Shown instead of messages when there are none yet. */
  emptyText: string;
  placeholder?: string;
  /** A note right above the input, e.g. that a store review has only one public answer. */
  hint?: string;
  /** The author of the request: avatar and "Nutzer: <Nickname>" of the opening bubble. */
  userProfile?: ModuleProfile | string | null;
  /** Sends a text; resolves `true` when it was sent, so the input is cleared. */
  send: (text: string) => Promise<boolean>;
  /** A suggested answer (e.g. the draft reply of an AI recommendation): shown as placeholder and insertable with a button. */
  suggestion?: string | null;
  /** Puts the suggestion into the input as soon as it is there, e.g. after "Chat mit Vorschlag starten". */
  useSuggestion?: boolean;
}>();

const { translate, formatDateTime } = useAppExtensionTranslate();

/** Links the visually hidden label to the input; unique per instance of this component. */
const composerInputId = useId();

/** "Nutzer: <Nickname>" when the message (or the request) has a nickname, otherwise "Nutzer". */
function getUserLabel(message?: FoodFeedbackChatMessage): string {
  const nickname = (message ? FoodFeedbackChatHelper.getNickname(message.profile) : undefined) ?? FoodFeedbackChatHelper.getNickname(props.userProfile);
  return nickname ? translate(BackendTranslationKeys.rocket_meals_module_user_with_nickname, { nickname }) : translate(BackendTranslationKeys.rocket_meals_module_user);
}

/** Edge length in px of the avatar next to a message of the user. */
const AVATAR_SIZE = 32;

const newMessage = ref('');
const sending = ref(false);
const messagesContainer = ref<HTMLElement>();
const composerInput = ref<HTMLTextAreaElement>();

/**
 * The AI's suggestion shown in full above the input (the draft reply of the recommendation). It is
 * only taken over with "In Eingabe übernehmen", so nothing typed is ever overwritten. Hidden while the
 * input already holds exactly this text.
 */
const currentSuggestion = computed(() => props.suggestion ?? null);
const showSuggestion = computed(() => !!currentSuggestion.value && props.canWrite && newMessage.value.trim() !== currentSuggestion.value.trim());

function insertSuggestion() {
  if (currentSuggestion.value) {
    newMessage.value = currentSuggestion.value;
    nextTick(() => composerInput.value?.focus());
  }
}

/** Only once: a suggestion that arrives later must not overwrite what was typed in the meantime. */
let suggestionUsed = false;
watch(
  () => props.suggestion,
  suggestion => {
    if (props.useSuggestion && suggestion && !suggestionUsed && !newMessage.value) {
      suggestionUsed = true;
      insertSuggestion();
    }
  },
  { immediate: true }
);

async function sendMessage() {
  const text = newMessage.value.trim();
  if (!text || sending.value || !props.canWrite) {
    return;
  }
  sending.value = true;
  try {
    if (await props.send(text)) {
      newMessage.value = '';
    }
  } finally {
    sending.value = false;
  }
}

/**
 * Like the chat of Claude: Enter sends, Shift+Enter starts a new line. On touch devices Enter
 * stays a new line – there is a send button right next to it. Ctrl/⌘+Enter always sends.
 */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.isComposing) {
    return;
  }
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  if (event.ctrlKey || event.metaKey || (!event.shiftKey && !isTouchDevice)) {
    event.preventDefault();
    sendMessage();
  }
}

/** The input grows with its text up to a maximum height, then scrolls. */
const COMPOSER_MAX_HEIGHT_PX = 240;
function resizeComposer() {
  const input = composerInput.value;
  if (!input) {
    return;
  }
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
}
watch(newMessage, () => nextTick(resizeComposer));

function scrollToBottom() {
  nextTick(() => {
    const container = messagesContainer.value;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });
}
/** Scrolls down on the first load and whenever a message arrives. */
watch(() => props.messages.length, scrollToBottom, { immediate: true });
</script>

<template>
  <div ref="messagesContainer" class="messages">
    <div v-if="opening" class="message-row from-user">
      <profile-avatar class="message-avatar" :profile="userProfile" :size="AVATAR_SIZE" />
      <div class="message">
        <div class="message-author type-note">{{ getUserLabel() }}</div>
        <div class="bubble">{{ opening.text }}</div>
        <div class="message-date type-note">{{ formatDateTime(opening.date) }}</div>
      </div>
    </div>

    <div v-for="message in messages" :key="message.id" class="message-row" :class="ChatHelper.isSupportMessage(message) ? 'from-support' : 'from-user'">
      <profile-avatar v-if="!ChatHelper.isSupportMessage(message)" class="message-avatar" :profile="message.profile ?? userProfile" :size="AVATAR_SIZE" />
      <div class="message">
        <div class="message-author type-note">
          <template v-if="ChatHelper.isSupportMessage(message)">
            {{ translate(BackendTranslationKeys.rocket_meals_module_support) }}
            <template v-if="FoodFeedbackChatHelper.getSupportAuthorName(message)"> · {{ FoodFeedbackChatHelper.getSupportAuthorName(message) }}</template>
          </template>
          <template v-else>{{ getUserLabel(message) }}</template>
        </div>
        <div class="bubble">{{ message.message }}</div>
        <div class="message-date type-note">{{ formatDateTime(message.date_created) }}</div>
      </div>
    </div>

    <div v-if="messages.length === 0" class="empty type-note">{{ emptyText }}</div>
  </div>

  <div v-if="showSuggestion" class="suggestion">
    <div class="suggestion-header type-note">
      <v-icon :name="ActionRecommendationModuleHelper.ICON" x-small />
      <span>{{ translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_suggestion_title) }}</span>
    </div>
    <div class="suggestion-text">{{ currentSuggestion }}</div>
    <div class="suggestion-actions">
      <v-button small :disabled="sending" @click="insertSuggestion">
        <v-icon name="south" left small />
        {{ translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_insert_draft) }}
      </v-button>
    </div>
  </div>

  <div v-if="hint" class="composer-note type-note">
    <v-icon name="info" x-small />
    <span>{{ hint }}</span>
  </div>

  <!-- A click anywhere in the box focuses the input. Only a mouse shortcut: keyboard users reach the textarea directly, so the box itself is presentational. -->
  <div class="composer" role="presentation" :class="{ disabled: !canWrite }" @click="composerInput?.focus()"><!-- Web:MouseEventWithoutKeyboardEquivalentCheck is suppressed for this file in sonar-project.properties (NOSONAR does not work in templates/CSS): mouse-only shortcut, see comment above: keyboard users focus the textarea directly, no keyboard equivalent is needed -->
    <label class="visually-hidden" :for="composerInputId">{{ placeholder ?? translate(BackendTranslationKeys.rocket_meals_module_message_placeholder) }}</label>
    <textarea :id="composerInputId" ref="composerInput" v-model="newMessage" class="composer-input" rows="1" :placeholder="placeholder ?? translate(BackendTranslationKeys.rocket_meals_module_message_placeholder)" :disabled="!canWrite || sending" @keydown="onKeydown" />
    <div class="composer-actions">
      <span class="composer-hint type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_send_hint) }}</span>
      <button v-tooltip.top="translate(BackendTranslationKeys.send)" class="send-button" :disabled="!canWrite || sending || newMessage.trim().length === 0" :aria-label="translate(BackendTranslationKeys.send)" @click.stop="sendMessage">
        <v-progress-circular v-if="sending" indeterminate x-small />
        <v-icon v-else name="arrow_upward" small />
      </button>
    </div>
  </div>
</template>

<style scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-block-size: 12rem;
  max-block-size: calc(100vh - 26rem);
  padding: 1.25rem;
  overflow-y: auto;
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
}

.message-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
  max-inline-size: 75%;
}

.message-row.from-user {
  align-self: flex-start;
}

.message-row.from-support {
  align-self: flex-end;
}

/* Next to the bubble, not next to the date below it. */
.message-avatar {
  margin-block-end: 1.375rem;
}

.message {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-inline-size: 0;
}

.from-support .message {
  align-items: flex-end;
}

.bubble {
  padding: 0.75rem 1rem;
  white-space: pre-line;
  overflow-wrap: anywhere;
  background: var(--theme--background-accent);
  border-radius: 1rem 1rem 1rem 0.25rem;
}

.from-support .bubble {
  color: var(--foreground-inverted, #fff);
  background: var(--theme--primary);
  border-radius: 1rem 1rem 0.25rem 1rem;
}

.empty {
  align-self: center;
  max-inline-size: 30rem;
  margin-block: auto;
  text-align: center;
}

/* The AI's suggestion: in full, set apart from the input, taken over only on request. */
.suggestion {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--theme--primary-background);
  border-inline-start: 3px solid var(--theme--primary);
  border-radius: var(--theme--border-radius);
}

.suggestion-header {
  display: flex;
  gap: 0.375rem;
  align-items: center;
  color: var(--theme--primary);
}

.suggestion-text {
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.suggestion-actions {
  display: flex;
  justify-content: flex-end;
}

.composer-note {
  display: flex;
  gap: 0.375rem;
  align-items: flex-start;
  padding: 0 1rem;
}

.composer-note .v-icon {
  flex: none;
  margin-block-start: 0.125rem;
}

/* Input like the chat of Claude: one rounded box, text on top, round send button bottom right. */
.composer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0.75rem 0.625rem 1rem;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: 1.5rem;
  cursor: text;
  transition: border-color var(--fast) var(--transition);
}

.composer:focus-within {
  border-color: var(--theme--primary);
}

.composer.disabled {
  cursor: default;
  opacity: 0.6;
}

.composer-input {
  inline-size: 100%;
  min-block-size: 1.5rem;
  max-block-size: 15rem;
  padding: 0.25rem 0;
  color: var(--theme--foreground);
  font: inherit;
  line-height: 1.5;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
}

.composer-input::placeholder {
  color: var(--theme--foreground-subdued);
}

.composer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-end;
}

.composer-hint {
  margin-inline-end: auto;
}

.send-button {
  --v-icon-color: var(--foreground-inverted, #fff);

  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  background: var(--theme--primary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition:
    background var(--fast) var(--transition),
    opacity var(--fast) var(--transition);
}

.send-button:hover:not(:disabled) {
  background: var(--theme--primary-accent);
}

.send-button:disabled {
  opacity: 0.35;
  cursor: default;
}

@media (pointer: coarse) {
  /* On touch devices Enter makes a new line, so the keyboard hint would be wrong. */
  .composer-hint {
    visibility: hidden;
  }

  /* iOS Safari zooms into inputs with a font smaller than 16px. */
  .composer-input {
    font-size: 16px;
  }
}
</style>
