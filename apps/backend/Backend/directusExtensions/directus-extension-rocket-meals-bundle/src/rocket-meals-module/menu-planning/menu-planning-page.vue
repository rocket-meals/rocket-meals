<script setup lang="ts">
/**
 * Page "Speiseplan-Planung (KI)", experimental: pick a canteen, the first calendar week and how many
 * weeks, optionally write notes for the AI, and get
 *
 * - the menu of the same weeks a year ago, with the rating and the latest comments of every dish, and
 * - a suggestion of the AI for every day of the planned weeks, each dish with a short reason, marked
 *   as known dish (offered before, leads to the food) or new idea, plus general hints.
 *
 * Compact on purpose: the form is one row (notes for the AI fold out), the result switches between
 * the suggestion and last year and between the weeks, one line per dish with reason, rating and
 * comments in its tooltip.
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
import { MenuInsightsHelper, type SegmentedControlOption } from '../../helpers/rocket-meals-module/MenuInsightsHelper';
import { MenuPlanningErrorCode, MenuPlanningHelper, type MenuPlanningDish, type MenuPlanningPastOffer, type MenuPlanningResult } from '../../helpers/rocket-meals-module/MenuPlanningHelper';
import { ModuleListHelper } from '../../helpers/rocket-meals-module/ModuleListHelper';
import { RocketMealsModulePages } from '../../helpers/rocket-meals-module/RocketMealsModulePages';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';
import FilterSelect from '../filter-select.vue';
import ModuleNavigation from '../module-navigation.vue';
import InsightCard from '../menu-insights/insight-card.vue';
import SegmentedControl from '../menu-insights/segmented-control.vue';

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
const formatDay = (date: string) => formatDate(date, { weekday: 'short', day: '2-digit', month: '2-digit' });
const notesOpen = ref(false);

const canteenItems = computed(() => [{ text: translate(BackendTranslationKeys.rocket_meals_module_all_canteens), value: '', icon: 'store' }, ...canteens.value.map(canteen => ({ text: canteen.alias || canteen.id, value: canteen.id, imageUrl: FoodFeedbackChatHelper.getCanteenImageUrl(canteen, apiRoot), icon: 'storefront' }))]);
const yearItems = computed(() => [nextWeek.year - 1, nextWeek.year, nextWeek.year + 1].map(value => ({ text: String(value), value, icon: 'event' })));
const weekItems = computed(() =>
  Array.from({ length: MenuPlanningHelper.getIsoWeeksInYear(year.value) }, (_, index) => {
    const value = index + 1;
    const range = MenuPlanningHelper.getRange(year.value, value, 1);
    return { text: `${translate(BackendTranslationKeys.rocket_meals_module_menu_planning_week_label, { week: value, year: year.value })} (${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_range, { from: formatDate(range.from, { day: '2-digit', month: '2-digit' }), to: formatDate(range.to, { day: '2-digit', month: '2-digit' }) })})`, value, icon: 'date_range' };
  })
);
const weeksItems = computed(() => Array.from({ length: MenuPlanningHelper.MAX_WEEKS }, (_, index) => ({ text: `${translate(BackendTranslationKeys.rocket_meals_module_menu_planning_weeks)}: ${index + 1}`, value: index + 1, icon: 'view_week' })));

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
    resultWeek.value = 0;
    result.value = await MenuPlanningHelper.plan(api, { canteen: canteenId.value || null, year: year.value, week: week.value, weeks: weeks.value, notes: notes.value, language: language.value ?? 'de' });
  } catch (error) {
    console.error('[rocket-meals-module] planning the menu failed', error);
    planningFailed.value = true;
  } finally {
    planning.value = false;
  }
  view.value = result.value?.suggestion ? 'suggestion' : 'reference';
}

onMounted(() => {
  loadCanteens();
  loadStatus();
});

const referenceWeeks = computed(() => MenuPlanningHelper.groupDaysByWeek(result.value?.context.reference_days ?? []));
const suggestion = computed(() => result.value?.suggestion ?? null);
const suggestionHasDishes = computed(() => (suggestion.value?.weeks ?? []).some(entry => entry.days.some(day => day.dishes.length > 0)));
/** What the result shows: the suggestion of the AI or last year. */
const view = ref<string | number>('suggestion');
const viewOptions = computed<SegmentedControlOption[]>(() => [...(suggestion.value ? [{ value: 'suggestion', icon: 'auto_awesome', text: translate(BackendTranslationKeys.rocket_meals_module_menu_planning_suggestion) }] : []), { value: 'reference', icon: 'history', text: translate(BackendTranslationKeys.rocket_meals_module_menu_planning_reference) }]);
/** Index of the shown week, the same for the suggestion and last year. */
const resultWeek = ref<string | number>(0);
const shownWeeks = computed<{ year: number; week: number }[]>(() => (view.value === 'suggestion' ? (suggestion.value?.weeks ?? []) : referenceWeeks.value));
const resultWeekOptions = computed<SegmentedControlOption[]>(() => shownWeeks.value.map((entry, index) => ({ value: index, text: translate(BackendTranslationKeys.rocket_meals_module_menu_planning_week_label, { week: entry.week, year: entry.year }) })));
const suggestionDays = computed(() => suggestion.value?.weeks[Number(resultWeek.value)]?.days ?? []);
const referenceDays = computed(() => referenceWeeks.value[Number(resultWeek.value)]?.days ?? []);
const suggestionNote = computed(() => {
  const current = suggestion.value;
  if (!current) {
    return '';
  }
  return [translate(BackendTranslationKeys.rocket_meals_module_menu_planning_suggested_by, { name: current.recommended_by_ai }), current.summary].filter(Boolean).join(' · ');
});
const hintsOpen = ref(false);

/** Category and reason of a suggested dish for its tooltip. */
function getDishDetails(dish: MenuPlanningDish): string {
  const kind = translate(dish.food_id ? BackendTranslationKeys.rocket_meals_module_menu_planning_known_food : BackendTranslationKeys.rocket_meals_module_menu_planning_new_dish);
  return [dish.name, kind, dish.category, dish.reason].filter(Boolean).join(' · ');
}

/** Category, rating and comments of last year's dish for its tooltip. */
function getOfferDetails(offer: MenuPlanningPastOffer): string {
  const rating = offer.rating_average !== null ? `★ ${MenuInsightsHelper.formatNumber(offer.rating_average, language.value, 1)} (${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_rating_count, { count: offer.rating_count })})` : '';
  return [offer.name, offer.category, rating, ...offer.comments.map(comment => `„${comment}“`)].filter(Boolean).join(' · ');
}

function getRatingTone(offer: MenuPlanningPastOffer): string {
  if (MenuInsightsHelper.isWeak({ rating_average: offer.rating_average, rating_count: offer.rating_count })) {
    return 'weak';
  }
  return MenuInsightsHelper.isStrong({ rating_average: offer.rating_average, rating_count: offer.rating_count }) ? 'strong' : 'neutral';
}

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
      <div class="form">
        <div class="field">
          <filter-select v-model="canteenId" :items="canteenItems" :disabled="planning" />
        </div>
        <div class="field small">
          <filter-select v-model="year" :items="yearItems" :disabled="planning" />
        </div>
        <div class="field wide">
          <filter-select v-model="week" :items="weekItems" :disabled="planning" />
        </div>
        <div class="field">
          <filter-select v-model="weeks" :items="weeksItems" :disabled="planning" />
        </div>
        <div class="actions">
          <v-button v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_menu_planning_notes)" secondary icon :active="notesOpen || notes.length > 0" :disabled="planning" @click="notesOpen = !notesOpen">
            <v-icon name="edit_note" />
          </v-button>
          <v-button :loading="planning" @click="plan">
            <v-icon name="auto_awesome" left />
            {{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_start) }}
          </v-button>
          <span v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_menu_planning_intro)" class="experimental">
            <v-icon name="science" x-small />
            {{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_experimental) }}
          </span>
        </div>
        <v-textarea v-if="notesOpen" v-model="notes" class="notes" :placeholder="translate(BackendTranslationKeys.rocket_meals_module_menu_planning_notes_placeholder)" :disabled="planning" :nullable="false" />
      </div>

      <v-notice v-if="aiConfigured === false" type="warning">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_ai_not_configured) }}</v-notice>
      <v-notice v-if="planning" type="info" icon="hourglass_top">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_working) }}</v-notice>
      <v-notice v-if="errorText" :type="result?.error_code === MenuPlanningErrorCode.AI_NOT_CONFIGURED ? 'warning' : 'danger'">{{ errorText }}</v-notice>

      <insight-card v-if="result" :title="view === 'suggestion' ? translate(BackendTranslationKeys.rocket_meals_module_menu_planning_suggestion) : translate(BackendTranslationKeys.rocket_meals_module_menu_planning_reference)" :icon="view === 'suggestion' ? 'auto_awesome' : 'history'" :note="view === 'suggestion' ? suggestionNote : translate(BackendTranslationKeys.rocket_meals_module_menu_insights_range, { from: formatDate(result.context.reference_range.from), to: formatDate(result.context.reference_range.to) })">
        <template #header>
          <segmented-control v-if="viewOptions.length > 1" v-model="view" :options="viewOptions" />
        </template>
        <segmented-control v-if="resultWeekOptions.length > 1" v-model="resultWeek" :options="resultWeekOptions" class="align-start" />

        <template v-if="view === 'suggestion' && suggestion">
          <p v-if="!suggestionHasDishes" class="type-note muted">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_no_dishes) }}</p>
          <div class="days">
            <div v-for="day in suggestionDays" :key="day.date" class="day">
              <div class="day-title type-label">{{ formatDay(day.date) }}</div>
              <ul class="dishes">
                <li v-for="(dish, index) in day.dishes" :key="index" v-tooltip.bottom="getDishDetails(dish)" class="dish" :class="dish.food_id ? 'known' : 'new'">
                  <span class="mark" />
                  <router-link v-if="dish.food_id" :to="MenuInsightsHelper.getFoodRoute(dish.food_id)" class="dish-name">{{ dish.name }}</router-link>
                  <span v-else class="dish-name">{{ dish.name }}</span>
                </li>
              </ul>
            </div>
          </div>
          <template v-if="suggestion.hints.length > 0">
            <v-button x-small secondary class="align-start" @click="hintsOpen = !hintsOpen">
              <v-icon :name="hintsOpen ? 'expand_less' : 'expand_more'" left x-small />
              {{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_hints) }} ({{ suggestion.hints.length }})
            </v-button>
            <ul v-if="hintsOpen" class="hints">
              <li v-for="(hint, index) in suggestion.hints" :key="index">{{ hint }}</li>
            </ul>
          </template>
        </template>

        <template v-else>
          <p v-if="referenceWeeks.length === 0" class="type-note muted">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_planning_reference_empty) }}</p>
          <div class="days">
            <div v-for="day in referenceDays" :key="day.date" class="day">
              <div class="day-title type-label">{{ formatDay(day.date) }}</div>
              <ul class="dishes">
                <li v-for="(offer, index) in day.offers" :key="index" v-tooltip.bottom="getOfferDetails(offer)" class="dish" :class="getRatingTone(offer)">
                  <span class="mark" />
                  <router-link v-if="offer.food_id" :to="MenuInsightsHelper.getFoodRoute(offer.food_id)" class="dish-name">{{ offer.name }}</router-link>
                  <span v-else class="dish-name">{{ offer.name }}</span>
                  <v-icon v-if="offer.comments.length > 0" name="chat_bubble" x-small class="comment-icon" />
                </li>
              </ul>
            </div>
          </div>
        </template>
      </insight-card>
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
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.field {
  flex: 1 1 11rem;
  min-inline-size: 0;
}

.field.small {
  flex: 0 1 8rem;
}

.field.wide {
  flex: 2 1 16rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.experimental {
  --v-icon-color: var(--theme--primary);

  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  padding: 0.125rem 0.5rem;
  color: var(--theme--primary);
  font-size: 0.75rem;
  background: var(--theme--primary-background, var(--theme--background-normal));
  border-radius: 999px;
  cursor: help;
}

.notes {
  flex: 1 1 100%;
}

.align-start {
  align-self: flex-start;
}

.muted {
  margin: 0;
  color: var(--theme--foreground-subdued);
}

.days {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));
  gap: 0.5rem;
}

.day {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-inline-size: 0;
  padding: 0.625rem;
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
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dish {
  display: flex;
  gap: 0.375rem;
  align-items: center;
  min-inline-size: 0;
  font-size: 0.8125rem;
  line-height: 1.3;
  cursor: help;
}

.mark {
  flex: none;
  inline-size: 0.5rem;
  block-size: 0.5rem;
  background: var(--theme--border-color);
  border-radius: 50%;
}

.known .mark,
.strong .mark {
  background: var(--theme--success);
}

.new .mark {
  background: var(--theme--primary);
}

.weak .mark {
  background: var(--theme--danger);
}

.dish-name {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  color: inherit;
  white-space: nowrap;
  text-decoration: none;
  text-overflow: ellipsis;
}

a.dish-name:hover {
  color: var(--theme--primary);
  text-decoration: underline;
}

.comment-icon {
  --v-icon-color: var(--theme--foreground-subdued);

  flex: none;
}

.hints {
  margin: 0;
  padding-inline-start: 1.25rem;
}
</style>
