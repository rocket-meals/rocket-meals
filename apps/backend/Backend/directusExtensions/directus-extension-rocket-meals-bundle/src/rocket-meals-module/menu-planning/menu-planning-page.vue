<script setup lang="ts">
/**
 * Page "Speiseplan-Planung (KI)", experimental: pick a canteen, the first calendar week and how many
 * weeks, optionally write notes for the AI, and get
 *
 * - the menu of the same weeks a year ago, with the rating and the latest comments of every dish, and
 * - a suggestion of the AI for every day of the planned weeks, each dish with a short reason, marked
 *   as known dish (offered before, leads to the food) or new idea, plus general hints.
 *
 * The AI also gets the favourite, least liked and awaited dishes of the last year, the markings and
 * the languages of the users (`MenuPlanningHelper.buildUserPrompt`). Nothing is stored: the
 * suggestion is a starting point for the kitchen team. Without a provider under Settings → AI only
 * the menu of last year is shown.
 */
import { useApi } from '@directus/extensions-sdk';
import { computed, onMounted, ref, watch } from 'vue';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { FoodFeedbackChatHelper, type FoodFeedbackCanteenOption } from '../../helpers/rocket-meals-module/FoodFeedbackChatHelper';
import { MenuInsightsHelper } from '../../helpers/rocket-meals-module/MenuInsightsHelper';
import { MenuPlanningErrorCode, MenuPlanningHelper, type MenuPlanningResult } from '../../helpers/rocket-meals-module/MenuPlanningHelper';
import { ModuleListHelper } from '../../helpers/rocket-meals-module/ModuleListHelper';
import { RocketMealsModulePages } from '../../helpers/rocket-meals-module/RocketMealsModulePages';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';
import FilterSelect from '../filter-select.vue';
import FoodFeedbackRating from '../food-feedbacks/food-feedback-rating.vue';
import ModuleNavigation from '../module-navigation.vue';
import InsightCard from '../menu-insights/insight-card.vue';

const api = useApi();
const { translate, language } = useAppExtensionTranslate();

const page = RocketMealsModulePages.MENU_PLANNING;
const apiRoot = String(api.defaults?.baseURL ?? '/');

const SETTINGS_STORAGE_KEY = ModuleListHelper.getSettingsStorageKey('menu-planning');
const settingsStorage = typeof window !== 'undefined' ? window.localStorage : undefined;
const storedSettings = ModuleListHelper.readSettings<{ canteen?: string; weeks?: number }>(settingsStorage, SETTINGS_STORAGE_KEY);

const nextWeek = MenuPlanningHelper.getNextIsoWeek();
/** `''` = all canteens. */
const canteenId = ref<string>(typeof storedSettings.canteen === 'string' ? storedSettings.canteen : '');
const year = ref<number>(nextWeek.year);
const week = ref<number>(nextWeek.week);
const weeks = ref<number>(ModuleListHelper.pickAllowed(storedSettings.weeks, [1, 2, 3, 4], 1));
const notes = ref('');

const canteens = ref<FoodFeedbackCanteenOption[]>([]);
const aiConfigured = ref<boolean | null>(null);
const result = ref<MenuPlanningResult | null>(null);
const planning = ref(false);
const planningFailed = ref(false);

const formatDate = (date: string, options?: Intl.DateTimeFormatOptions) => MenuInsightsHelper.formatDate(date, language.value, options);
const formatDay = (date: string) => formatDate(date, { weekday: 'long', day: '2-digit', month: '2-digit' });

const canteenItems = computed(() => [{ text: translate(BackendTranslationKeys.rocket_meals_module_all_canteens), value: '', icon: 'store' }, ...canteens.value.map(canteen => ({ text: canteen.alias || canteen.id, value: canteen.id, imageUrl: FoodFeedbackChatHelper.getCanteenImageUrl(canteen, apiRoot), icon: 'storefront' }))]);
const yearItems = computed(() => [nextWeek.year - 1, nextWeek.year, nextWeek.year + 1].map(value => ({ text: String(value), value, icon: 'event' })));
const weekItems = computed(() =>
  Array.from({ length: MenuPlanningHelper.getIsoWeeksInYear(year.value) }, (_, index) => {
    const value = index + 1;
    const range = MenuPlanningHelper.getRange(year.value, value, 1);
    return { text: `${translate(BackendTranslationKeys.rocket_meals_module_menu_planning_week_label, { week: value, year: year.value })} (${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_range, { from: formatDate(range.from, { day: '2-digit', month: '2-digit' }), to: formatDate(range.to, { day: '2-digit', month: '2-digit' }) })})`, value, icon: 'date_range' };
  })
);
const weeksItems = Array.from({ length: MenuPlanningHelper.MAX_WEEKS }, (_, index) => ({ text: String(index + 1), value: index + 1, icon: 'view_week' }));

watch(year, value => {
  week.value = Math.min(week.value, MenuPlanningHelper.getIsoWeeksInYear(value));
});

watch([canteenId, weeks], () => {
  ModuleListHelper.storeSettings(settingsStorage, SETTINGS_STORAGE_KEY, { canteen: canteenId.value, weeks: weeks.value });
});

async function loadCanteens() {
  try {
    const response = await api.get(FoodFeedbackChatHelper.CANTEENS_ENDPOINT, { params: FoodFeedbackChatHelper.buildCanteensQuery() });
    canteens.value = response.data?.data ?? [];
  } catch (error) {
    console.error('[rocket-meals-module] loading canteens failed', error);
    canteens.value = [];
  }
}

async function loadStatus() {
  try {
    aiConfigured.value = (await MenuPlanningHelper.getStatus(api)).ai_configured;
  } catch (error) {
    console.error('[rocket-meals-module] reading the AI status failed', error);
    aiConfigured.value = false;
  }
}

async function plan() {
  planning.value = true;
  planningFailed.value = false;
  try {
    result.value = await MenuPlanningHelper.plan(api, { canteen: canteenId.value || null, year: year.value, week: week.value, weeks: weeks.value, notes: notes.value, language: language.value ?? 'de' });
  } catch (error) {
    console.error('[rocket-meals-module] planning the menu failed', error);
    planningFailed.value = true;
  } finally {
    planning.value = false;
  }
}

onMounted(() => {
  loadCanteens();
  loadStatus();
});

const referenceWeeks = computed(() => MenuPlanningHelper.groupDaysByWeek(result.value?.context.reference_days ?? []));
const suggestion = computed(() => result.value?.suggestion ?? null);
const suggestionHasDishes = computed(() => (suggestion.value?.weeks ?? []).some(entry => entry.days.some(day => day.dishes.length > 0)));
const errorText = computed(() => {
  if (planningFailed.value) {
    return translate(BackendTranslationKeys.rocket_meals_module_load_failed);
  }
  switch (result.value?.error_code) {
    case MenuPlanningErrorCode.AI_NOT_CONFIGURED:
      // Already shown at the top of the page since the status check.
      return aiConfigured.value === false ? undefined : translate(BackendTranslationKeys.rocket_meals_module_menu_planning_ai_not_configured);
    case MenuPlanningErrorCode.AI_FAILED:
      return translate(BackendTranslationKeys.rocket_meals_module_menu_planning_ai_failed);
    default:
      return undefined;
  }
});
</script>

<template>
  <private-view :title="translate(page.labelKey)" :icon="page.icon">
    <template #headline>
      <v-breadcrumb :items="[{ name: RocketMealsModulePages.MODULE_NAME, to: RocketMealsModulePages.getRoute() }]" />
    </template>

    <template #navigation>
      <module-navigation />
    </template>

    <div class="menu-planning">
      <v-notice type="info" icon="science">
        <div>
          <strong>{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_experimental) }}.</strong>
          {{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_intro) }}
        </div>
      </v-notice>
      <v-notice v-if="aiConfigured === false" type="warning">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_ai_not_configured) }}</v-notice>

      <div class="form">
        <div class="field">
          <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_canteen) }}</span>
          <filter-select v-model="canteenId" :items="canteenItems" :disabled="planning" />
        </div>
        <div class="field small">
          <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_year) }}</span>
          <filter-select v-model="year" :items="yearItems" :disabled="planning" />
        </div>
        <div class="field wide">
          <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_week) }}</span>
          <filter-select v-model="week" :items="weekItems" :disabled="planning" />
        </div>
        <div class="field small">
          <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_weeks) }}</span>
          <filter-select v-model="weeks" :items="weeksItems" :disabled="planning" />
        </div>
        <div class="field full">
          <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_notes) }}</span>
          <v-textarea v-model="notes" :placeholder="translate(BackendTranslationKeys.rocket_meals_module_menu_planning_notes_placeholder)" :disabled="planning" :nullable="false" />
        </div>
        <div class="field full actions">
          <v-button :loading="planning" @click="plan">
            <v-icon name="auto_awesome" left />
            {{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_start) }}
          </v-button>
          <span v-if="planning" class="type-note working">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_working) }}</span>
        </div>
      </div>

      <v-notice v-if="errorText" :type="result?.error_code === MenuPlanningErrorCode.AI_NOT_CONFIGURED ? 'warning' : 'danger'">{{ errorText }}</v-notice>

      <template v-if="result">
        <insight-card v-if="suggestion" :title="translate(BackendTranslationKeys.rocket_meals_module_menu_planning_suggestion)" icon="auto_awesome" :note="translate(BackendTranslationKeys.rocket_meals_module_menu_planning_suggested_by, { name: suggestion.recommended_by_ai })">
          <p v-if="suggestion.summary" class="summary">{{ suggestion.summary }}</p>
          <p v-if="!suggestionHasDishes" class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_no_dishes) }}</p>
          <div v-for="plannedWeek in suggestion.weeks" :key="`${plannedWeek.year}-${plannedWeek.week}`" class="week">
            <h3 class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_week_label, { week: plannedWeek.week, year: plannedWeek.year }) }}</h3>
            <div class="days">
              <div v-for="day in plannedWeek.days" :key="day.date" class="day">
                <div class="day-title type-label">{{ formatDay(day.date) }}</div>
                <ul class="dishes">
                  <li v-for="(dish, index) in day.dishes" :key="index" class="dish">
                    <div class="dish-header">
                      <router-link v-if="dish.food_id" :to="MenuInsightsHelper.getFoodRoute(dish.food_id)" class="dish-name">{{ dish.name }}</router-link>
                      <span v-else class="dish-name">{{ dish.name }}</span>
                      <v-chip x-small :class="dish.food_id ? 'known' : 'new'">{{ translate(dish.food_id ? BackendTranslationKeys.rocket_meals_module_menu_planning_known_food : BackendTranslationKeys.rocket_meals_module_menu_planning_new_dish) }}</v-chip>
                    </div>
                    <span v-if="dish.category" class="type-note category">{{ dish.category }}</span>
                    <span v-if="dish.reason" class="type-note reason">{{ dish.reason }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <template v-if="suggestion.hints.length > 0">
            <h3 class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_hints) }}</h3>
            <ul class="hints">
              <li v-for="(hint, index) in suggestion.hints" :key="index">{{ hint }}</li>
            </ul>
          </template>
        </insight-card>

        <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_planning_reference)" icon="history" :note="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_range, { from: formatDate(result.context.reference_range.from), to: formatDate(result.context.reference_range.to) })">
          <p v-if="referenceWeeks.length === 0" class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_reference_empty) }}</p>
          <div v-for="referenceWeek in referenceWeeks" :key="`${referenceWeek.year}-${referenceWeek.week}`" class="week">
            <h3 class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_week_label, { week: referenceWeek.week, year: referenceWeek.year }) }}</h3>
            <div class="days">
              <div v-for="day in referenceWeek.days" :key="day.date" class="day">
                <div class="day-title type-label">{{ formatDay(day.date) }}</div>
                <ul class="dishes">
                  <li v-for="(offer, index) in day.offers" :key="index" class="dish">
                    <div class="dish-header">
                      <router-link v-if="offer.food_id" :to="MenuInsightsHelper.getFoodRoute(offer.food_id)" class="dish-name">{{ offer.name }}</router-link>
                      <span v-else class="dish-name">{{ offer.name }}</span>
                    </div>
                    <span class="rating-line">
                      <food-feedback-rating :rating="offer.rating_average" />
                      <span v-if="offer.rating_count > 0" class="type-note">{{ MenuInsightsHelper.formatNumber(offer.rating_average ?? 0, language, 1) }} · {{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_rating_count, { count: offer.rating_count }) }}</span>
                    </span>
                    <span v-if="offer.category" class="type-note category">{{ offer.category }}</span>
                    <span v-for="(comment, commentIndex) in offer.comments" :key="commentIndex" class="type-note comment">„{{ comment }}“</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </insight-card>
      </template>
    </div>
  </private-view>
</template>

<style scoped>
.menu-planning {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: var(--content-padding);
  padding-block: 0 var(--content-padding-bottom);
}

.form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
  gap: 0.75rem 1rem;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-inline-size: 0;
}

.field.wide {
  grid-column: span 2;
}

@media (max-width: 40rem) {
  .field.wide {
    grid-column: 1 / -1;
  }
}

.field.full {
  grid-column: 1 / -1;
}

.actions {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.working {
  color: var(--theme--foreground-subdued);
}

.summary {
  margin: 0;
  white-space: pre-line;
}

.week {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.week h3 {
  margin: 0.5rem 0 0;
}

.days {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
  gap: 0.75rem;
}

.day {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--theme--background);
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
}

.day-title {
  color: var(--theme--primary);
}

.dishes {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dish {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.dish-header {
  display: flex;
  gap: 0.375rem;
  align-items: flex-start;
  justify-content: space-between;
}

.dish-name {
  color: inherit;
  font-weight: 600;
  text-decoration: none;
}

a.dish-name:hover {
  color: var(--theme--primary);
  text-decoration: underline;
}

.known {
  --v-chip-color: var(--theme--success);
  --v-chip-background-color: var(--theme--success-background, var(--theme--background-normal));

  flex: none;
}

.new {
  --v-chip-color: var(--theme--primary);
  --v-chip-background-color: var(--theme--primary-background, var(--theme--background-normal));

  flex: none;
}

.category,
.reason,
.comment {
  color: var(--theme--foreground-subdued);
}

.comment {
  font-style: italic;
}

.rating-line {
  display: inline-flex;
  gap: 0.375rem;
  align-items: center;
}

.hints {
  margin: 0;
  padding-inline-start: 1.25rem;
}
</style>
