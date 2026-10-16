<script setup lang="ts">
/**
 * Page "Speiseplan-Analyse": numbers about the menu of one canteen or all of them in a period, in
 * three tabs, one per role. Little text: explanations are in info tooltips, details behind toggles
 * and hover.
 *
 * - "Lagebild" (controlling, management): the highlights as short chips (a click leads to the place
 *   with the details), key figures with their change against the period of the same length before,
 *   the rating distribution as one bar, and one card that switches between popular dishes, unpopular
 *   dishes and criticism.
 * - "Speiseplanung" (the people planning the menu): the planned menu of this or next week, filterable
 *   by poorly rated dishes, favourites and awaited dishes, one card that switches between what needs
 *   action (poorly rated and planned, awaited without date, favourite without date), the coverage of
 *   the markings, and a link to the AI menu planning.
 * - "Alle Auswertungen": one section at a time (ratings, dishes, feedback labels, canteen visits,
 *   languages).
 *
 * Canteen, period and tab are remembered per browser. The numbers come from `menu-insights-endpoint`.
 */
import { useApi } from '@directus/extensions-sdk';
import { computed, onMounted, ref, watch } from 'vue';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { FoodFeedbackChatHelper, type FoodFeedbackCanteenOption } from '../../helpers/rocket-meals-module/FoodFeedbackChatHelper';
import { MenuInsightsHelper, MenuInsightsPeriod, type InsightBarItem, type MenuInsights, type MenuInsightsFood, type MenuInsightsHighlight, type MenuInsightsLabel, type MenuInsightsTrend, type SegmentedControlOption, type WeekPlanHighlight } from '../../helpers/rocket-meals-module/MenuInsightsHelper';
import { ModuleListHelper } from '../../helpers/rocket-meals-module/ModuleListHelper';
import { RocketMealsModulePages } from '../../helpers/rocket-meals-module/RocketMealsModulePages';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';
import FilterSelect from '../filter-select.vue';
import ModuleNavigation from '../module-navigation.vue';
import InsightBarList from './insight-bar-list.vue';
import InsightCard from './insight-card.vue';
import InsightFoodList from './insight-food-list.vue';
import InsightWeekPlan from './insight-week-plan.vue';
import SegmentedControl from './segmented-control.vue';

const api = useApi();
const { translate, language } = useAppExtensionTranslate();

const page = RocketMealsModulePages.MENU_INSIGHTS;
const apiRoot = String(api.defaults?.baseURL ?? '/');

/** The three views of the page, one per role: controlling, menu planning, all numbers. */
enum MenuInsightsTab {
  OVERVIEW = 'overview',
  PLANNING = 'planning',
  DETAILS = 'details',
}
const TABS: readonly MenuInsightsTab[] = [MenuInsightsTab.OVERVIEW, MenuInsightsTab.PLANNING, MenuInsightsTab.DETAILS];
/** Entries of the short lists (dishes on "Lagebild", markings before "Details"). */
const SHORT_LIST_LIMIT = 5;

const SETTINGS_STORAGE_KEY = ModuleListHelper.getSettingsStorageKey('menu-insights');
const settingsStorage = typeof window !== 'undefined' ? window.localStorage : undefined;
const storedSettings = ModuleListHelper.readSettings<{ canteen?: string; period?: MenuInsightsPeriod; tab?: MenuInsightsTab }>(settingsStorage, SETTINGS_STORAGE_KEY);

/** `''` = all canteens. */
const canteenId = ref<string>(typeof storedSettings.canteen === 'string' ? storedSettings.canteen : '');
const period = ref<MenuInsightsPeriod>(ModuleListHelper.pickAllowed(storedSettings.period, MenuInsightsHelper.PERIODS, MenuInsightsHelper.DEFAULT_PERIOD));
const tab = ref<string | number>(ModuleListHelper.pickAllowed(storedSettings.tab, TABS, MenuInsightsTab.OVERVIEW));
const canteens = ref<FoodFeedbackCanteenOption[]>([]);
const insights = ref<MenuInsights | null>(null);
const loading = ref(false);
const loadError = ref(false);

const canteenItems = computed(() => [{ text: translate(BackendTranslationKeys.rocket_meals_module_all_canteens), value: '', icon: 'store' }, ...canteens.value.map(canteen => ({ text: canteen.alias || canteen.id, value: canteen.id, imageUrl: FoodFeedbackChatHelper.getCanteenImageUrl(canteen, apiRoot), icon: 'storefront' }))]);
const periodItems = computed(() => MenuInsightsHelper.PERIODS.map(value => ({ text: translate(MenuInsightsHelper.getPeriodLabelKey(value)), value, icon: 'date_range' })));

const STAR_COLORS: Record<number, string> = { 5: 'var(--theme--success)', 4: '#7ccf8f', 3: 'var(--theme--warning)', 2: '#f08a8a', 1: 'var(--theme--danger)' };
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

function storeSettings() {
  ModuleListHelper.storeSettings(settingsStorage, SETTINGS_STORAGE_KEY, { canteen: canteenId.value, period: period.value, tab: tab.value });
}

watch([canteenId, period], () => {
  storeSettings();
  load();
});
watch(tab, storeSettings);

onMounted(() => {
  loadCanteens();
  load();
});

const formatNumber = (value: number, digits = 0) => MenuInsightsHelper.formatNumber(value, language.value, digits);
const formatPercent = (share: number) => MenuInsightsHelper.formatPercent(share, language.value);
const formatDate = (date: string) => MenuInsightsHelper.formatDate(date, language.value);

const tabOptions = computed<SegmentedControlOption[]>(() => [
  { value: MenuInsightsTab.OVERVIEW, icon: 'monitoring', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_tab_overview) },
  { value: MenuInsightsTab.PLANNING, icon: 'calendar_view_week', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_tab_planning) },
  { value: MenuInsightsTab.DETAILS, icon: 'table_chart', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_tab_details) },
]);
const tabNote = computed(() => {
  switch (tab.value) {
    case MenuInsightsTab.OVERVIEW:
      return translate(BackendTranslationKeys.rocket_meals_module_menu_insights_tab_overview_note);
    case MenuInsightsTab.PLANNING:
      return translate(BackendTranslationKeys.rocket_meals_module_menu_insights_tab_planning_note);
    default:
      return translate(BackendTranslationKeys.rocket_meals_module_menu_insights_tab_details_note);
  }
});
const rangeText = computed(() => {
  const data = insights.value;
  return data ? translate(BackendTranslationKeys.rocket_meals_module_menu_insights_range, { from: formatDate(data.period.from), to: formatDate(data.period.to) }) : '';
});

function toLabelItems(labels: readonly MenuInsightsLabel[], valueText: (label: MenuInsightsLabel) => string): InsightBarItem[] {
  return labels.map(label => ({
    key: label.id,
    label: label.name,
    icon: label.icon ?? 'label',
    segments: [
      { value: label.likes, color: LIKE_COLOR, title: `${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_likes)}: ${formatNumber(label.likes)}` },
      { value: label.dislikes, color: DISLIKE_COLOR, title: `${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_dislikes)}: ${formatNumber(label.dislikes)}` },
    ],
    valueText: valueText(label),
  }));
}

// ----- Lagebild -----

const todayString = MenuInsightsHelper.toDateString(new Date());
const highlights = computed(() => (insights.value ? MenuInsightsHelper.getHighlights(insights.value, language.value) : []));

const comparedToText = computed(() => {
  const previous = insights.value?.previous;
  return previous ? translate(BackendTranslationKeys.rocket_meals_module_menu_insights_compared_to, { from: formatDate(previous.from), to: formatDate(previous.to) }) : '';
});

type TrendFigure = { key: string; icon: string; label: string; value: string; delta?: string; tooltip: string; direction: MenuInsightsTrend['direction']; good: boolean | null };

const trendFigures = computed<TrendFigure[]>(() => {
  const data = insights.value;
  if (!data) {
    return [];
  }
  const previous = data.previous;
  const figure = (key: string, icon: string, labelKey: BackendTranslationKeys, current: number | null, before: number | null, format: (value: number) => string, relative: boolean, upIsGood: boolean | null): TrendFigure => {
    const trend = MenuInsightsHelper.getTrend(current, before, relative);
    const sign = trend.delta !== null && trend.delta > 0 ? '+' : '';
    const delta = trend.delta === null || trend.direction === 'flat' ? undefined : `${sign}${relative ? formatPercent(trend.delta) : formatNumber(trend.delta, 2)}`;
    const tooltip = before === null ? comparedToText.value : `${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_previous_value, { value: format(before) })} · ${comparedToText.value}`;
    return { key, icon, label: translate(labelKey), value: current === null ? '' : format(current), delta, tooltip, direction: trend.direction, good: upIsGood === null || !trend.direction ? null : (trend.direction === 'up') === upIsGood };
  };
  return [figure('average', 'star', BackendTranslationKeys.rocket_meals_module_menu_insights_rating_average, data.ratings.average, previous.rating_average, value => formatNumber(value, 2), false, true), figure('good-share', 'sentiment_satisfied', BackendTranslationKeys.rocket_meals_module_menu_insights_good_share, data.ratings.good_share, previous.good_share, formatPercent, false, true), figure('ratings', 'reviews', BackendTranslationKeys.rocket_meals_module_menu_insights_ratings, data.ratings.count, previous.rating_count, value => formatNumber(value), true, true), figure('offers', 'restaurant_menu', BackendTranslationKeys.rocket_meals_module_menu_insights_offers, data.offers.total, previous.offers, value => formatNumber(value), true, null), figure('foods', 'lunch_dining', BackendTranslationKeys.rocket_meals_module_menu_insights_distinct_foods, data.offers.distinct_foods, previous.distinct_foods, value => formatNumber(value), true, true), figure('visits', 'groups', BackendTranslationKeys.rocket_meals_module_menu_insights_visits, data.visits.total, previous.visits, value => formatNumber(value), true, true)];
});

/** The single ratings as segments of one bar, 5 stars first. */
const ratingSegments = computed(() => {
  const distribution = insights.value?.ratings.distribution ?? [];
  const total = distribution.reduce((sum, entry) => sum + entry.count, 0);
  return distribution
    .filter(entry => entry.count > 0)
    .map(entry => {
      const share = MenuInsightsHelper.getShare(entry.count, total);
      return { stars: entry.stars, share, color: STAR_COLORS[entry.stars], title: `${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_stars, { count: entry.stars })}: ${formatPercent(share)} · ${formatNumber(entry.count)}` };
    });
});

/** The labels of food and canteen feedbacks with more thumbs down than up, most thumbs down first, both together. */
const complaintItems = computed<InsightBarItem[]>(() => {
  const data = insights.value;
  if (!data) {
    return [];
  }
  const labels = [...data.food_labels.map(label => ({ ...label, icon: label.icon ?? 'restaurant' })), ...data.canteen_labels.map(label => ({ ...label, id: `canteen-${label.id}`, icon: label.icon ?? 'storefront' }))];
  return toLabelItems(
    labels
      .filter(label => label.dislikes > label.likes)
      .sort((a, b) => b.dislikes - a.dislikes)
      .slice(0, SHORT_LIST_LIMIT),
    label => `${formatNumber(label.dislikes)} 👎`
  );
});

const dishList = ref<string | number>('top');
const dishListOptions = computed<SegmentedControlOption[]>(() => [
  { value: 'top', icon: 'thumb_up', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_toggle_top) },
  { value: 'flop', icon: 'thumb_down', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_toggle_flop) },
  { value: 'criticism', icon: 'report', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_toggle_criticism), count: complaintItems.value.length },
]);

// ----- Speiseplanung -----

/** 0 = this week, 1 = next week. */
const week = ref<string | number>(0);
const weekOptions = computed<SegmentedControlOption[]>(() => [
  { value: 0, text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_this_week) },
  { value: 1, text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_next_week) },
]);
/** The days of the chosen week: Monday to Friday, Saturday and Sunday only when something is planned. */
const weekDays = computed(() => {
  const days = insights.value?.upcoming.days ?? [];
  const start = Number(week.value) * 7;
  return days.slice(start, start + 7).filter((day, index) => index < 5 || day.offers.length > 0);
});
const weekOffers = computed(() => weekDays.value.flatMap(day => day.offers));

const weekHighlight = ref<string | number>('all');
const weekHighlightOptions = computed<SegmentedControlOption[]>(() => [
  { value: 'all', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_filter_all) },
  { value: 'weak', icon: 'thumb_down', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_badge_weak), count: weekOffers.value.filter(offer => MenuInsightsHelper.isWeak(offer.food)).length },
  { value: 'strong', icon: 'favorite', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_badge_strong), count: weekOffers.value.filter(offer => MenuInsightsHelper.isStrong(offer.food)).length },
  { value: 'awaited', icon: 'notifications_active', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_filter_awaited), count: weekOffers.value.filter(offer => offer.food.waiting_count > 0).length },
]);
const weekPlanNote = computed(() => translate(BackendTranslationKeys.rocket_meals_module_menu_insights_week_plan_note, { weak: formatNumber(MenuInsightsHelper.WEAK_RATING, 1), strong: formatNumber(MenuInsightsHelper.STRONG_RATING, 1) }));

const weakPlanned = computed<MenuInsightsFood[]>(() => MenuInsightsHelper.getWeakUpcomingFoods(insights.value?.upcoming.days ?? [], todayString));
const awaitedUnplanned = computed<MenuInsightsFood[]>(() => (insights.value?.awaited ?? []).filter(food => !food.next_offered));
const topUnplanned = computed<MenuInsightsFood[]>(() => (insights.value?.ratings.top ?? []).filter(food => !food.next_offered));

const todo = ref<string | number>('weak');
const todoOptions = computed<SegmentedControlOption[]>(() => [
  { value: 'weak', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_todo_weak), count: weakPlanned.value.length },
  { value: 'awaited', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_todo_awaited), count: awaitedUnplanned.value.length },
  { value: 'top', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_todo_top), count: topUnplanned.value.length },
]);
const todoFoods = computed(() => {
  switch (todo.value) {
    case 'awaited':
      return awaitedUnplanned.value;
    case 'top':
      return topUnplanned.value;
    default:
      return weakPlanned.value;
  }
});
const todoNote = computed(() => {
  switch (todo.value) {
    case 'awaited':
      return translate(BackendTranslationKeys.rocket_meals_module_menu_insights_awaited_unplanned_note);
    case 'top':
      return translate(BackendTranslationKeys.rocket_meals_module_menu_insights_top_unplanned_note);
    default:
      return translate(BackendTranslationKeys.rocket_meals_module_menu_insights_weak_planned_note);
  }
});

/** Days covered per marking as bars of 100 %, share of offers and preferences in the tooltip. */
const markingItems = computed<InsightBarItem[]>(() =>
  (insights.value?.markings ?? []).map(marking => ({
    key: marking.id,
    label: marking.short_code ? `${marking.short_code} · ${marking.name}` : marking.name,
    imageUrl: MenuInsightsHelper.getImageUrl(marking, apiRoot, 24),
    segments: [
      {
        value: marking.day_coverage,
        color: marking.day_coverage < 0.5 ? 'var(--theme--warning)' : undefined,
        title: `${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_markings_offers)}: ${formatPercent(marking.offer_share)} · 👍 ${formatNumber(marking.profile_likes)} · 👎 ${formatNumber(marking.profile_dislikes)}`,
      },
    ],
    valueText: formatPercent(marking.day_coverage),
  }))
);
const markingsExpanded = ref(false);
const dietText = computed(() => {
  const data = insights.value;
  if (!data || data.offers.offer_days === 0 || !data.markings.some(marking => MenuInsightsHelper.isDietMarking(marking))) {
    return '';
  }
  return data.days_without_diet_option > 0 ? translate(BackendTranslationKeys.rocket_meals_module_menu_insights_days_without_diet, { count: data.days_without_diet_option, days: data.offers.offer_days }) : translate(BackendTranslationKeys.rocket_meals_module_menu_insights_days_with_diet);
});
const markingsNote = computed(() => [translate(BackendTranslationKeys.rocket_meals_module_menu_insights_markings_days), dietText.value].filter(Boolean).join(' · '));

// ----- Alle Auswertungen -----

const detailSection = ref<string | number>('ratings');
const detailOptions = computed<SegmentedControlOption[]>(() => [
  { value: 'ratings', icon: 'star_rate', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_ratings) },
  { value: 'dishes', icon: 'restaurant', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_dishes) },
  { value: 'labels', icon: 'sell', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_section_labels) },
  { value: 'visits', icon: 'groups', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_visits) },
  { value: 'languages', icon: 'translate', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_languages) },
]);

/** A click on a highlight leads to where its details are. */
function openHighlight(highlight: MenuInsightsHighlight) {
  switch (highlight.key) {
    case 'weak-planned':
      tab.value = MenuInsightsTab.PLANNING;
      todo.value = 'weak';
      weekHighlight.value = 'weak';
      return;
    case 'no-diet':
      tab.value = MenuInsightsTab.PLANNING;
      weekHighlight.value = 'all';
      return;
    case 'awaited':
      tab.value = MenuInsightsTab.PLANNING;
      todo.value = 'awaited';
      return;
    case 'food-complaint':
    case 'canteen-complaint':
      dishList.value = 'criticism';
      return;
    case 'visits':
      tab.value = MenuInsightsTab.DETAILS;
      detailSection.value = 'visits';
      return;
    default:
      tab.value = MenuInsightsTab.DETAILS;
      detailSection.value = 'ratings';
  }
}

/** The plain figures of the period at the top of "Alle Auswertungen". */
const detailFigures = computed(() => {
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
  ];
});

function toStarItems(entries: readonly { stars: number; count: number }[]): InsightBarItem[] {
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  return entries.map(entry => ({
    key: String(entry.stars),
    label: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_stars, { count: entry.stars }),
    icon: 'star',
    segments: [{ value: entry.count, color: STAR_COLORS[entry.stars], title: formatNumber(entry.count) }],
    valueText: formatPercent(MenuInsightsHelper.getShare(entry.count, total)),
  }));
}

const singleRatingItems = computed(() => toStarItems(insights.value?.ratings.distribution ?? []));
const foodRatingItems = computed(() => toStarItems(insights.value?.ratings.food_distribution ?? []));

const detailDishList = ref<string | number>('top');
const detailDishOptions = computed<SegmentedControlOption[]>(() => [
  { value: 'top', icon: 'thumb_up', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_toggle_top) },
  { value: 'flop', icon: 'thumb_down', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_toggle_flop) },
  { value: 'awaited', icon: 'notifications_active', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_filter_awaited) },
  { value: 'offers', icon: 'repeat', text: translate(BackendTranslationKeys.rocket_meals_module_menu_insights_most_offered) },
]);
const detailDishes = computed<{ foods: MenuInsightsFood[]; mode: 'rating' | 'waiting' | 'offers' }>(() => {
  const data = insights.value;
  switch (detailDishList.value) {
    case 'flop':
      return { foods: data?.ratings.flop ?? [], mode: 'rating' };
    case 'awaited':
      return { foods: data?.awaited ?? [], mode: 'waiting' };
    case 'offers':
      return { foods: data?.offers.most_offered ?? [], mode: 'offers' };
    default:
      return { foods: data?.ratings.top ?? [], mode: 'rating' };
  }
});

const likesAndDislikes = (label: MenuInsightsLabel) => `👍 ${formatNumber(label.likes)} · 👎 ${formatNumber(label.dislikes)}`;
const foodLabelItems = computed(() => toLabelItems(insights.value?.food_labels ?? [], likesAndDislikes));
const canteenLabelItems = computed(() => toLabelItems(insights.value?.canteen_labels ?? [], likesAndDislikes));

const weekdayItems = computed<InsightBarItem[]>(() => {
  const perWeekday = insights.value?.visits.per_weekday ?? [];
  return MenuInsightsHelper.getWeekdayNames(language.value).map((name, index) => ({ key: String(index), label: name, segments: [{ value: perWeekday[index] ?? 0 }], valueText: formatNumber(perWeekday[index] ?? 0) }));
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
    segments: [{ value: entry.count, title: formatNumber(entry.count) }],
    valueText: formatPercent(MenuInsightsHelper.getShare(entry.count, data.profiles_total)),
  }));
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
        <segmented-control v-model="tab" :options="tabOptions" large />
        <v-icon v-tooltip.bottom="tabNote" name="info" small class="info-icon" />
      </div>
      <div class="toolbar">
        <div class="toolbar-item">
          <filter-select v-model="canteenId" :items="canteenItems" />
        </div>
        <div v-tooltip.bottom="rangeText" class="toolbar-item">
          <filter-select v-model="period" :items="periodItems" />
        </div>
      </div>

      <v-notice v-if="loadError" type="danger">{{ translate(BackendTranslationKeys.rocket_meals_module_load_failed) }}</v-notice>

      <template v-if="insights">
        <!-- Lagebild -->
        <template v-if="tab === MenuInsightsTab.OVERVIEW">
          <div v-if="highlights.length > 0" class="highlights" :class="{ stale: loading }">
            <button v-for="highlight in highlights" :key="highlight.key" type="button" class="highlight" :class="highlight.tone" @click="openHighlight(highlight)">
              <v-icon :name="highlight.icon" small />
              <span>{{ translate(highlight.textKey, highlight.params) }}</span>
            </button>
          </div>

          <div class="key-figures" :class="{ stale: loading }">
            <div v-for="figure in trendFigures" :key="figure.key" v-tooltip.bottom="figure.tooltip" class="key-figure">
              <span class="key-label type-note"><v-icon :name="figure.icon" x-small />{{ figure.label }}</span>
              <span class="key-value">{{ figure.value }}</span>
              <span v-if="figure.delta" class="delta" :class="figure.good === null ? 'neutral' : figure.good ? 'good' : 'bad'">
                <v-icon :name="figure.direction === 'up' ? 'arrow_upward' : 'arrow_downward'" x-small />
                {{ figure.delta }}
              </span>
            </div>
          </div>

          <div class="columns" :class="{ stale: loading }">
            <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_ratings)" icon="star_rate" :note="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_ratings_single)" :empty="insights.ratings.count === 0">
              <div class="stacked-bar">
                <span v-for="segment in ratingSegments" :key="segment.stars" v-tooltip.bottom="segment.title" class="stacked-segment" :style="{ flexGrow: segment.share, background: segment.color }">
                  <span v-if="segment.share >= 0.08">{{ segment.stars }}★</span>
                </span>
              </div>
            </insight-card>

            <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_dishes)" icon="restaurant">
              <template #header>
                <segmented-control v-model="dishList" :options="dishListOptions" />
              </template>
              <insight-food-list v-if="dishList === 'top'" :foods="insights.ratings.top.slice(0, SHORT_LIST_LIMIT)" mode="rating" />
              <insight-food-list v-else-if="dishList === 'flop'" :foods="insights.ratings.flop.slice(0, SHORT_LIST_LIMIT)" mode="rating" />
              <insight-bar-list v-else :items="complaintItems" />
            </insight-card>
          </div>
        </template>

        <!-- Speiseplanung -->
        <template v-else-if="tab === MenuInsightsTab.PLANNING">
          <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_week_plan)" icon="calendar_view_week" :note="weekPlanNote" :class="{ stale: loading }">
            <template #header>
              <segmented-control v-model="week" :options="weekOptions" />
              <v-button small secondary :to="RocketMealsModulePages.getRoute(RocketMealsModulePages.MENU_PLANNING)">
                <v-icon name="auto_awesome" left small />
                {{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_open_planning) }}
              </v-button>
            </template>
            <segmented-control v-model="weekHighlight" :options="weekHighlightOptions" class="align-start" />
            <insight-week-plan :days="weekDays" :today="todayString" :highlight="weekHighlight as WeekPlanHighlight" />
          </insight-card>

          <div class="columns" :class="{ stale: loading }">
            <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_todo)" icon="checklist" :note="todoNote">
              <segmented-control v-model="todo" :options="todoOptions" class="align-start" />
              <insight-food-list v-if="todoFoods.length > 0" :foods="todoFoods" :mode="todo === 'awaited' ? 'waiting' : 'rating'" />
              <p v-else class="type-note muted">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_no_data) }}</p>
            </insight-card>

            <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_markings)" icon="label_important" :note="markingsNote" :empty="markingItems.length === 0">
              <template #header>
                <v-icon v-if="insights.days_without_diet_option > 0" v-tooltip.bottom="dietText" name="eco" small class="warning-icon" />
              </template>
              <insight-bar-list :items="markingsExpanded ? markingItems : markingItems.slice(0, SHORT_LIST_LIMIT)" :max="1" />
              <v-button v-if="markingItems.length > SHORT_LIST_LIMIT" x-small secondary class="align-start" @click="markingsExpanded = !markingsExpanded">
                <v-icon :name="markingsExpanded ? 'expand_less' : 'expand_more'" left x-small />
                {{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_more_details) }}
              </v-button>
            </insight-card>
          </div>
        </template>

        <!-- Alle Auswertungen -->
        <template v-else>
          <div class="key-figures" :class="{ stale: loading }">
            <div v-for="figure in detailFigures" :key="figure.key" v-tooltip.bottom="figure.label" class="key-figure plain">
              <span class="key-label type-note"><v-icon :name="figure.icon" x-small />{{ figure.label }}</span>
              <span class="key-value">{{ figure.value }}</span>
            </div>
          </div>
          <segmented-control v-model="detailSection" :options="detailOptions" class="align-start" />

          <div class="columns" :class="{ stale: loading }">
            <template v-if="detailSection === 'ratings'">
              <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_ratings_single)" icon="star_rate" :empty="insights.ratings.count === 0">
                <insight-bar-list :items="singleRatingItems" />
              </insight-card>
              <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_ratings_foods)" icon="restaurant" :note="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_ratings_foods_note, { count: insights.ratings.min_ratings, foods: insights.ratings.rated_foods })" :empty="insights.ratings.rated_foods === 0">
                <insight-bar-list :items="foodRatingItems" />
              </insight-card>
            </template>

            <insight-card v-else-if="detailSection === 'dishes'" :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_dishes)" icon="restaurant" :note="detailDishList === 'awaited' ? translate(BackendTranslationKeys.rocket_meals_module_menu_insights_awaited_note) : undefined" class="span-all">
              <segmented-control v-model="detailDishList" :options="detailDishOptions" class="align-start" />
              <insight-food-list v-if="detailDishes.foods.length > 0" :foods="detailDishes.foods" :mode="detailDishes.mode" class="two-columns" />
              <p v-else class="type-note muted">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_no_data) }}</p>
            </insight-card>

            <template v-else-if="detailSection === 'labels'">
              <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_food_labels)" icon="restaurant" :empty="foodLabelItems.length === 0">
                <insight-bar-list :items="foodLabelItems" />
              </insight-card>
              <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_canteen_labels)" icon="storefront" :empty="canteenLabelItems.length === 0">
                <insight-bar-list :items="canteenLabelItems" />
              </insight-card>
            </template>

            <template v-else-if="detailSection === 'visits'">
              <insight-card :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_visits_weekday)" icon="calendar_month" :note="`${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_visits_total)}: ${formatNumber(insights.visits.total)} · ${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_visits_profiles)}: ${formatNumber(insights.visits.profiles)}`" :empty="insights.visits.total === 0">
                <insight-bar-list :items="weekdayItems" />
              </insight-card>
              <insight-card v-if="!insights.canteen" :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_visits_canteen)" icon="storefront" :empty="visitCanteenItems.length === 0">
                <insight-bar-list :items="visitCanteenItems" />
              </insight-card>
            </template>

            <insight-card v-else :title="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_languages)" icon="translate" :note="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_languages_note, { count: insights.profiles_total })" :empty="languageItems.length === 0">
              <insight-bar-list :items="languageItems" />
            </insight-card>
          </div>
        </template>
      </template>

      <div v-else-if="loading" class="columns">
        <v-skeleton-loader v-for="index in 4" :key="index" type="block-list-item-dense" />
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
  flex: 0 1 14rem;
  min-inline-size: 10rem;
}

.spacer {
  flex: 1;
}

.info-icon {
  --v-icon-color: var(--theme--foreground-subdued);

  cursor: help;
}

.stale {
  opacity: 0.6;
  transition: opacity var(--fast) var(--transition);
}

.highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.highlight {
  --v-icon-color: var(--theme--primary);

  display: inline-flex;
  gap: 0.375rem;
  align-items: center;
  padding: 0.375rem 0.75rem;
  color: var(--theme--foreground);
  font: inherit;
  font-size: 0.875rem;
  text-align: start;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: 999px;
  cursor: pointer;
}

.highlight:hover {
  border-color: var(--theme--border-color-accent);
}

.highlight.warning {
  --v-icon-color: var(--theme--warning);

  background: var(--theme--warning-background, var(--theme--background-subdued));
}

.highlight.positive {
  --v-icon-color: var(--theme--success);

  background: var(--theme--success-background, var(--theme--background-subdued));
}

.key-figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
  gap: 0.5rem;
}

.key-figure {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-inline-size: 0;
  padding: 0.75rem;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
  cursor: help;
}

.key-figure.plain {
  cursor: default;
}

.key-label {
  --v-icon-color: var(--theme--foreground-subdued);

  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  overflow: hidden;
  color: var(--theme--foreground-subdued);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.key-value {
  font-weight: 700;
  font-size: 1.5rem;
  line-height: 1.2;
}

.delta {
  display: inline-flex;
  gap: 0.125rem;
  align-items: center;
  align-self: flex-start;
  padding: 0 0.375rem;
  font-weight: 600;
  font-size: 0.75rem;
  border-radius: 999px;
}

.delta.good {
  --v-icon-color: var(--theme--success);

  color: var(--theme--success);
  background: var(--theme--success-background, var(--theme--background-normal));
}

.delta.bad {
  --v-icon-color: var(--theme--danger);

  color: var(--theme--danger);
  background: var(--theme--danger-background, var(--theme--background-normal));
}

.delta.neutral {
  color: var(--theme--foreground-subdued);
  background: var(--theme--background-normal);
}

.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
  gap: 1rem;
  align-items: start;
}

.span-all {
  grid-column: 1 / -1;
}

.two-columns {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  column-gap: 2rem;
}

.stacked-bar {
  display: flex;
  block-size: 2rem;
  overflow: hidden;
  border-radius: var(--theme--border-radius);
}

.stacked-segment {
  display: flex;
  flex-basis: 0;
  align-items: center;
  justify-content: center;
  min-inline-size: 2px;
  color: var(--white, #fff);
  font-weight: 600;
  font-size: 0.75rem;
  cursor: help;
}

.align-start {
  align-self: flex-start;
}

.warning-icon {
  --v-icon-color: var(--theme--warning);

  cursor: help;
}

.muted {
  margin: 0;
  color: var(--theme--foreground-subdued);
}
</style>
