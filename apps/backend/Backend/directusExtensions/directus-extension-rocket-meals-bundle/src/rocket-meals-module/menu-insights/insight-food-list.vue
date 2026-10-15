<script setup lang="ts">
/**
 * A compact list of foods of the page "Speiseplan-Analyse" (top, flop, awaited, most offered): one
 * line per food with picture, name (leads to the food in the content area), an icon whether it is
 * planned again and, depending on `mode`, the rating, the profiles waiting for it or how often it
 * was offered. Dates and counts are in the tooltips.
 */
import { useApi } from '@directus/extensions-sdk';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { MenuInsightsHelper, type MenuInsightsFood } from '../../helpers/rocket-meals-module/MenuInsightsHelper';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';

defineProps<{ foods: readonly MenuInsightsFood[]; mode: 'rating' | 'waiting' | 'offers' }>();

const api = useApi();
const apiRoot = String(api.defaults?.baseURL ?? '/');
const { translate, language } = useAppExtensionTranslate();

function getOfferedText(food: MenuInsightsFood): string {
  if (food.next_offered) {
    return translate(BackendTranslationKeys.rocket_meals_module_menu_insights_next_offered, { date: MenuInsightsHelper.formatDate(food.next_offered, language.value) });
  }
  if (food.last_offered) {
    return translate(BackendTranslationKeys.rocket_meals_module_menu_insights_last_offered, { date: MenuInsightsHelper.formatDate(food.last_offered, language.value) });
  }
  return translate(BackendTranslationKeys.rocket_meals_module_menu_insights_not_planned);
}
</script>

<template>
  <ol class="food-list">
    <li v-for="food in foods" :key="food.id" class="food-row">
      <router-link :to="MenuInsightsHelper.getFoodRoute(food.id)" class="food-image">
        <img v-if="MenuInsightsHelper.getImageUrl(food, apiRoot)" :src="MenuInsightsHelper.getImageUrl(food, apiRoot)" alt="" loading="lazy" />
        <v-icon v-else name="restaurant" small />
      </router-link>
      <router-link v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_open_food)" :to="MenuInsightsHelper.getFoodRoute(food.id)" class="food-name">{{ food.name }}</router-link>
      <v-icon v-tooltip.bottom="getOfferedText(food)" :name="food.next_offered ? 'event_available' : 'event_busy'" small class="planned-icon" :class="{ planned: !!food.next_offered }" :aria-label="getOfferedText(food)" />
      <span v-if="mode === 'rating'" v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_rating_count, { count: food.rating_count })" class="food-value">
        <template v-if="food.rating_average !== null">{{ MenuInsightsHelper.formatNumber(food.rating_average, language, 1) }}</template>
        <v-icon name="star" filled x-small class="star" />
      </span>
      <span v-else-if="mode === 'waiting'" v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_waiting, { count: food.waiting_count })" class="food-value waiting">
        <v-icon name="notifications_active" x-small />
        {{ food.waiting_count }}
      </span>
      <span v-else v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_offer_count, { count: food.offer_count })" class="food-value">{{ food.offer_count }}×</span>
    </li>
  </ol>
</template>

<style scoped>
.food-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.food-row {
  display: flex;
  gap: 0.625rem;
  align-items: center;
  min-inline-size: 0;
}

.food-image {
  --v-icon-color: var(--theme--foreground-subdued);

  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 2rem;
  block-size: 2rem;
  overflow: hidden;
  background: var(--theme--background-normal);
  border-radius: var(--theme--border-radius);
}

.food-image img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.food-name {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  color: inherit;
  white-space: nowrap;
  text-decoration: none;
  text-overflow: ellipsis;
}

.food-name:hover {
  color: var(--theme--primary);
  text-decoration: underline;
}

.planned-icon {
  --v-icon-color: var(--theme--foreground-subdued);

  flex: none;
  cursor: help;
}

.planned-icon.planned {
  --v-icon-color: var(--theme--success);
}

.food-value {
  display: inline-flex;
  flex: none;
  gap: 0.125rem;
  align-items: center;
  min-inline-size: 3rem;
  justify-content: flex-end;
  font-weight: 600;
  cursor: help;
}

.star {
  --v-icon-color: #f5b400;
}

.waiting {
  --v-icon-color: var(--theme--primary);

  color: var(--theme--primary);
}
</style>
