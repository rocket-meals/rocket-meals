<script setup lang="ts">
/**
 * Page "Speiseplan-Analyse": numbers about the menu of one canteen or all of them in a period.
 *
 * - Key figures: offers, different dishes, days with offers, offers per day, dishes offered once,
 *   average rating and number of ratings.
 * - Ratings: single ratings per star and dishes per rounded average (how many reach 5, 4, … stars).
 * - Favourite, least liked, awaited (push reminder) and most often offered dishes.
 * - Markings: share of offers, days covered and how many profiles like or avoid them, plus the days
 *   without a vegetarian or vegan choice (is the menu balanced?).
 * - Food and canteen feedback labels, canteen visits ("Verabredungen") and the languages of the users.
 *
 * Canteen and period are remembered per browser. The numbers come from `menu-insights-endpoint`.
 */
import { useApi } from '@directus/extensions-sdk';
import { computed, onMounted, ref, watch } from 'vue';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { FoodFeedbackChatHelper, type FoodFeedbackCanteenOption } from '../../helpers/rocket-meals-module/FoodFeedbackChatHelper';
import { MenuInsightsHelper, MenuInsightsPeriod, type InsightBarItem, type MenuInsights, type MenuInsightsLabel } from '../../helpers/rocket-meals-module/MenuInsightsHelper';
import { ModuleListHelper } from '../../helpers/rocket-meals-module/ModuleListHelper';
import { RocketMealsModulePages } from '../../helpers/rocket-meals-module/RocketMealsModulePages';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';
import FilterSelect from '../filter-select.vue';
import ModuleNavigation from '../module-navigation.vue';
import InsightBarList from './insight-bar-list.vue';
import InsightCard from './insight-card.vue';
import InsightFoodList from './insight-food-list.vue';

const api = useApi();
const { translate, language } = useAppExtensionTranslate();

const page = RocketMealsModulePages.MENU_INSIGHTS;
const apiRoot = String(api.defaults?.baseURL ?? '/');

const SETTINGS_STORAGE_KEY = ModuleListHelper.getSettingsStorageKey('menu-insights');
const settingsStorage = typeof window !== 'undefined' ? window.localStorage : undefined;
const storedSettings = ModuleListHelper.readSettings<{ canteen?: string; period?: MenuInsightsPeriod }>(settingsStorage, SETTINGS_STORAGE_KEY);

/** `''` = all canteens. */
const canteenId = ref<string>(typeof storedSettings.canteen === 'string' ? storedSettings.canteen : '');
const period = ref<MenuInsightsPeriod>(ModuleListHelper.pickAllowed(storedSettings.period, MenuInsightsHelper.PERIODS, MenuInsightsHelper.DEFAULT_PERIOD));
const canteens = ref<FoodFeedbackCanteenOption[]>([]);
const insights = ref<MenuInsights | null>(null);
const loading = ref(false);
const loadError = ref(false);

const canteenItems = computed(() => [{ text: translate(BackendTranslationKeys.rocket_meals_module_all_canteens), value: '', icon: 'store' }, ...canteens.value.map(canteen => ({ text: canteen.alias || canteen.id, value: canteen.id, imageUrl: FoodFeedbackChatHelper.getCanteenImageUrl(canteen, apiRoot), icon: 'storefront' }))]);
const periodItems = computed(() => MenuInsightsHelper.PERIODS.map(value => ({ text: translate(MenuInsightsHelper.getPeriodLabelKey(value)), value, icon: 'date_range' })));

const STAR_COLORS: Record<number, string> = { 5: 'var(--theme--success)', 4: 'var(--theme--success)', 3: 'var(--theme--warning)', 2: 'var(--theme--danger)', 1: 'var(--theme--danger)' };
const LIKE_COLOR = 'var(--theme--success)';
const DISLIKE_COLOR = 'var(--theme--danger)';

async function loadCanteens() {
  try {
    const response = await api.get(FoodFeedbackChatHelper.CANTEENS_ENDPOINT, { params: FoodFeedbackChatHelper.buildCanteensQuery() });
    canteens.value = response.data?.data ?? [];
  } catch (error) {
    console.error('[rocket-meals-module] loading canteens failed', error);
    canteens.value = [];
  }
}

/** Answers of an earlier request that arrive after a newer one started are dropped. */
const requestCounter = ref(0);

async function load() {
  const request = ++requestCounter.value;
  loading.value = true;
  loadError.value = false;
  try {
    const result = await MenuInsightsHelper.load(api, { canteen: canteenId.value || null, period: period.value, language: language.value });
    if (request === requestCounter.value) {
      insights.value = result;
    }
  } catch (error) {
    console.error('[rocket-meals-module] loading the menu insights failed', error);
    if (request === requestCounter.value) {
      loadError.value = true;
    }
  } finally {
    if (request === requestCounter.value) {
      loading.value = false;
    }
  }
}

watch([canteenId, period], () => {
  ModuleListHelper.storeSettings(settingsStorage, SETTINGS_STORAGE_KEY, { canteen: canteenId.value, period: period.value });
  load();
});

onMounted(() => {
  loadCanteens();
  load();
});

const formatNumber = (value: number, digits = 0) => MenuInsightsHelper.formatNumber(value, language.value, digits);
const formatPercent = (share: number) => MenuInsightsHelper.formatPercent(share, language.value);

const keyFigures = computed(() => {
  const data = insights.value;
  if (!data) {
    return [];
  }
  return [
    { key: 'offers', icon: 'restaurant_menu', label: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_offers), value: formatNumber(data.offers.total) },
    { key: 'foods', icon: 'lunch_dining', label: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_distinct_foods), value: formatNumber(data.offers.distinct_foods) },
    { key: 'days', icon: 'calendar_month', label: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_offer_days), value: formatNumber(data.offers.offer_days) },
    { key: 'per-day', icon: 'view_day', label: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_offers_per_day), value: formatNumber(data.offers.average_per_day, 1) },
    { key: 'once', icon: 'new_releases', label: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_offered_once), value: formatNumber(data.offers.foods_offered_once) },
    { key: 'average', icon: 'star', label: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_rating_average), value: data.ratings.average === null ? '' : formatNumber(data.ratings.average, 2) },
    { key: 'ratings', icon: 'reviews', label: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_ratings), value: formatNumber(data.ratings.count) },
  ];
});

function toStarItems(entries: readonly { stars: number; count: number }[]): InsightBarItem[] {
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  return entries.map(entry => ({
    key: String(entry.stars),
    label: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_stars, { count: entry.stars }),
    icon: 'star',
    segments: [{ value: entry.count, color: STAR_COLORS[entry.stars] }],
    valueText: `${formatPercent(MenuInsightsHelper.getShare(entry.count, total))} · ${formatNumber(entry.count)}`,
  }));
}

const singleRatingItems = computed(() => toStarItems(insights.value?.ratings.distribution ?? []));
const foodRatingItems = computed(() => toStarItems(insights.value?.ratings.food_distribution ?? []));

const markingRows = computed(() => insights.value?.markings ?? []);
const maxMarkingPreference = computed(() => Math.max(0, ...markingRows.value.map(marking => marking.profile_likes + marking.profile_dislikes)));

const dietNote = computed(() => {
  const data = insights.value;
  if (!data || data.offers.offer_days === 0 || !data.markings.some(marking => MenuInsightsHelper.isDietMarking(marking))) {
    return undefined;
  }
  return data.days_without_diet_option > 0 ? translate(BackendTranslationKeys.rocket_meals_module_menu_insights_days_without_diet, { count: data.days_without_diet_option, days: data.offers.offer_days }) : translate(BackendTranslationKeys.rocket_meals_module_menu_insights_days_with_diet);
});

function toLabelItems(labels: readonly MenuInsightsLabel[]): InsightBarItem[] {
  return labels.map(label => ({
    key: label.id,
    label: label.name,
    icon: label.icon ?? 'label',
    segments: [
      { value: label.likes, color: LIKE_COLOR, title: `${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_likes)}: ${formatNumber(label.likes)}` },
      { value: label.dislikes, color: DISLIKE_COLOR, title: `${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_dislikes)}: ${formatNumber(label.dislikes)}` },
    ],
    valueText: `👍 ${formatNumber(label.likes)} · 👎 ${formatNumber(label.dislikes)}`,
  }));
}

const foodLabelItems = computed(() => toLabelItems(insights.value?.food_labels ?? []));
const canteenLabelItems = computed(() => toLabelItems(insights.value?.canteen_labels ?? []));

const weekdayItems = computed<InsightBarItem[]>(() => {
  const perWeekday = insights.value?.visits.per_weekday ?? [];
  const names = MenuInsightsHelper.getWeekdayNames(language.value);
  return names.map((name, index) => ({ key: String(index), label: name, segments: [{ value: perWeekday[index] ?? 0 }], valueText: formatNumber(perWeekday[index] ?? 0) }));
});

const visitCanteenItems = computed<InsightBarItem[]>(() => (insights.value?.visits.per_canteen ?? []).map(entry => ({ key: entry.id, label: entry.name, icon: 'storefront', segments: [{ value: entry.count }], valueText: formatNumber(entry.count) })));

const languageItems = computed<InsightBarItem[]>(() => {
  const data = insights.value;
  if (!data) {
    return [];
  }
  return data.languages.map(entry => ({
    key: entry.id || 'none',
    label: entry.id ? entry.name : translate(BackendTranslationKeys.rocket_meals_module_menu_insights_language_unknown),
    icon: 'translate',
    segments: [{ value: entry.count }],
    valueText: `${formatPercent(MenuInsightsHelper.getShare(entry.count, data.profiles_total))} · ${formatNumber(entry.count)}`,
  }));
});

const rangeText = computed(() => {
  const data = insights.value;
  return data ? translate(BackendTranslationKeys.rocket_meals_module_menu_insights_range, { from: MenuInsightsHelper.formatDate(data.period.from, language.value), to: MenuInsightsHelper.formatDate(data.period.to, language.value) }) : '';
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

    <template #actions>
      <v-button v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_refresh)" rounded icon secondary :loading="loading" @click="load">
        <v-icon name="refresh" />
      </v-button>
    </template>

    <div class="menu-insights">
      <div class="toolbar">
        <div class="toolbar-item">
          <filter-select v-model="canteenId" :items="canteenItems" />
        </div>
        <div class="toolbar-item">
          <filter-select v-model="period" :items="periodItems" />
        </div>
        <span v-if="rangeText" class="range type-note">{{ rangeText }}</span>
      </div>

      <v-notice v-if="loadError" type="danger">{{ translate(BackendTranslationKeys.rocket_meals_module_load_failed) }}</v-notice>

      <template v-if="insights">
        <div class="key-figures" :class="{ stale: loading }">
          <div v-for="figure in keyFigures" :key="figure.key" class="key-figure">
            <v-icon :name="figure.icon" class="key-icon" />
            <div class="key-body">
              <span class="key-value">{{ figure.value }}</span>
              <span class="key-label type-note">{{ figure.label }}</span>
            </div>
          </div>
        </div>

        <div class="cards" :class="{ stale: loading }">
          <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_ratings)" icon="star_rate" :empty="insights.ratings.count === 0">
            <h3 class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_ratings_single) }}</h3>
            <insight-bar-list :items="singleRatingItems" />
            <h3 class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_ratings_foods) }}</h3>
            <insight-bar-list :items="foodRatingItems" />
            <p class="hint type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_ratings_foods_note, { count: insights.ratings.min_ratings, foods: insights.ratings.rated_foods }) }}</p>
          </insight-card>

          <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_top)" icon="thumb_up" :empty="insights.ratings.top.length === 0">
            <insight-food-list :foods="insights.ratings.top" mode="rating" />
          </insight-card>

          <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_flop)" icon="thumb_down" :empty="insights.ratings.flop.length === 0">
            <insight-food-list :foods="insights.ratings.flop" mode="rating" />
          </insight-card>

          <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_awaited)" icon="notifications_active" :note="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_awaited_note)" :empty="insights.awaited.length === 0">
            <insight-food-list :foods="insights.awaited" mode="waiting" />
          </insight-card>

          <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_most_offered)" icon="repeat" :empty="insights.offers.most_offered.length === 0">
            <insight-food-list :foods="insights.offers.most_offered" mode="offers" />
          </insight-card>

          <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_markings)" icon="label_important" :note="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_markings_note)" :empty="markingRows.length === 0" wide>
            <v-notice v-if="dietNote" :type="insights.days_without_diet_option > 0 ? 'warning' : 'success'">{{ dietNote }}</v-notice>
            <div class="table-scroll">
              <table class="markings">
                <thead>
                  <tr>
                    <th />
                    <th class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_markings_offers) }}</th>
                    <th class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_markings_days) }}</th>
                    <th class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_likes) }} / {{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_dislikes) }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="marking in markingRows" :key="marking.id">
                    <td class="marking-name">
                      <img v-if="MenuInsightsHelper.getImageUrl(marking, apiRoot, 24)" class="marking-image" :src="MenuInsightsHelper.getImageUrl(marking, apiRoot, 24)" alt="" loading="lazy" />
                      <span v-else-if="marking.short_code" class="short-code">{{ marking.short_code }}</span>
                      <span class="marking-text">
                        <span>{{ marking.name }}</span>
                        <span v-if="marking.group_name" class="type-note">{{ marking.group_name }}</span>
                      </span>
                    </td>
                    <td>
                      <span class="cell-bar">
                        <span class="track"><span class="fill" :style="{ inlineSize: `${Math.round(marking.offer_share * 100)}%` }" /></span>
                        <span class="type-note">{{ formatPercent(marking.offer_share) }} · {{ formatNumber(marking.offer_count) }}</span>
                      </span>
                    </td>
                    <td>
                      <span class="cell-bar">
                        <span class="track"><span class="fill days" :style="{ inlineSize: `${Math.round(marking.day_coverage * 100)}%` }" /></span>
                        <span class="type-note">{{ formatPercent(marking.day_coverage) }}</span>
                      </span>
                    </td>
                    <td>
                      <span class="cell-bar">
                        <span class="track">
                          <span class="fill like" :style="{ inlineSize: `${MenuInsightsHelper.getBarPercent(marking.profile_likes, maxMarkingPreference)}%` }" />
                          <span class="fill dislike" :style="{ inlineSize: `${MenuInsightsHelper.getBarPercent(marking.profile_dislikes, maxMarkingPreference)}%` }" />
                        </span>
                        <span class="type-note">👍 {{ formatNumber(marking.profile_likes) }} · 👎 {{ formatNumber(marking.profile_dislikes) }}</span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </insight-card>

          <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_food_labels)" icon="sell" :empty="foodLabelItems.length === 0">
            <insight-bar-list :items="foodLabelItems" />
          </insight-card>

          <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_canteen_labels)" icon="storefront" :empty="canteenLabelItems.length === 0">
            <insight-bar-list :items="canteenLabelItems" />
          </insight-card>

          <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_visits)" icon="groups" :empty="insights.visits.total === 0">
            <div class="mini-figures">
              <span
                ><strong>{{ formatNumber(insights.visits.total) }}</strong> <span class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_visits_total) }}</span></span
              >
              <span
                ><strong>{{ formatNumber(insights.visits.profiles) }}</strong> <span class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_visits_profiles) }}</span></span
              >
            </div>
            <h3 class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_visits_weekday) }}</h3>
            <insight-bar-list :items="weekdayItems" />
            <template v-if="!insights.canteen && visitCanteenItems.length > 1">
              <h3 class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_visits_canteen) }}</h3>
              <insight-bar-list :items="visitCanteenItems" />
            </template>
          </insight-card>

          <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_languages)" icon="translate" :note="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_languages_note, { count: insights.profiles_total })" :empty="languageItems.length === 0">
            <insight-bar-list :items="languageItems" />
          </insight-card>
        </div>
      </template>

      <div v-else-if="loading" class="cards">
        <v-skeleton-loader v-for="index in 6" :key="index" type="block-list-item-dense" />
      </div>
    </div>
  </private-view>
</template>

<style scoped>
.menu-insights {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: var(--content-padding);
  padding-block: 0 var(--content-padding-bottom);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.toolbar-item {
  flex: 0 1 16rem;
  min-inline-size: 10rem;
}

.range {
  color: var(--theme--foreground-subdued);
}

.stale {
  opacity: 0.6;
  transition: opacity var(--fast) var(--transition);
}

.key-figures {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.5rem;
}

.key-figure {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
}

.key-icon {
  --v-icon-color: var(--theme--primary);
}

.key-body {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.key-value {
  font-weight: 700;
  font-size: 1.375rem;
  line-height: 1.3;
}

.key-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 24rem), 1fr));
  gap: 1rem;
  align-items: start;
}

h3 {
  margin: 0.25rem 0 0;
}

.hint {
  margin: 0;
  color: var(--theme--foreground-subdued);
}

.mini-figures {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.mini-figures strong {
  font-size: 1.25rem;
}

.table-scroll {
  overflow-x: auto;
}

.markings {
  inline-size: 100%;
  border-collapse: collapse;
}

.markings th {
  padding: 0.25rem 0.5rem;
  text-align: start;
  white-space: nowrap;
}

.markings td {
  padding: 0.375rem 0.5rem;
  border-block-start: var(--theme--border-width) solid var(--theme--border-color-subdued);
}

.marking-name {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  min-inline-size: 12rem;
}

.marking-image {
  flex: none;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  object-fit: contain;
}

.short-code {
  flex: none;
  min-inline-size: 1.5rem;
  padding: 0 0.25rem;
  font-weight: 700;
  font-size: 0.75rem;
  text-align: center;
  background: var(--theme--background-normal);
  border-radius: var(--theme--border-radius);
}

.marking-text {
  display: flex;
  flex-direction: column;
}

.marking-text .type-note {
  color: var(--theme--foreground-subdued);
}

.cell-bar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  min-inline-size: 11rem;
}

.track {
  display: flex;
  flex: 1;
  block-size: 0.625rem;
  overflow: hidden;
  background: var(--theme--background-normal);
  border-radius: 999px;
}

.fill {
  display: block;
  block-size: 100%;
  background: var(--theme--primary);
}

.fill.days {
  background: var(--theme--secondary, var(--theme--primary));
}

.fill.like {
  background: var(--theme--success);
}

.fill.dislike {
  background: var(--theme--danger);
}

.cell-bar .type-note {
  flex: none;
  min-inline-size: 5.5rem;
  white-space: nowrap;
}
</style>
