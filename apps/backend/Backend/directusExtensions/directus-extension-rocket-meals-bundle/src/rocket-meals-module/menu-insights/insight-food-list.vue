<script setup lang="ts">
/**
 * A list of foods of the page "Speiseplan-Analyse" (top, flop, awaited, most offered): picture,
 * name (leads to the food in the content area), and depending on `mode` the rating, the profiles
 * waiting for it or how often it was offered, each with when it was last and is next offered.
 */
import { useApi } from '@directus/extensions-sdk';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { MenuInsightsHelper, type MenuInsightsFood } from '../../helpers/rocket-meals-module/MenuInsightsHelper';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';
import FoodFeedbackRating from '../food-feedbacks/food-feedback-rating.vue';

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
      <router-link v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_open_food)" :to="MenuInsightsHelper.getFoodRoute(food.id)" class="food-image">
        <img v-if="MenuInsightsHelper.getImageUrl(food, apiRoot)" :src="MenuInsightsHelper.getImageUrl(food, apiRoot)" alt="" loading="lazy" />
        <v-icon v-else name="restaurant" />
      </router-link>
      <div class="food-body">
        <router-link :to="MenuInsightsHelper.getFoodRoute(food.id)" class="food-name">{{ food.name }}</router-link>
        <span class="food-meta type-note" :class="{ planned: !!food.next_offered }">{{ getOfferedText(food) }}</span>
      </div>
      <div class="food-value">
        <template v-if="mode === 'rating'">
          <span class="rating">
            <strong v-if="food.rating_average !== null">{{ MenuInsightsHelper.formatNumber(food.rating_average, language, 1) }}</strong>
            <food-feedback-rating :rating="food.rating_average" />
          </span>
          <span class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_rating_count, { count: food.rating_count }) }}</span>
        </template>
        <template v-else-if="mode === 'waiting'">
          <strong class="waiting"><v-icon name="notifications_active" small />{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_waiting, { count: food.waiting_count }) }}</strong>
          <span v-if="food.rating_average !== null" class="type-note">★ {{ MenuInsightsHelper.formatNumber(food.rating_average, language, 1) }}</span>
        </template>
        <template v-else>
          <strong>{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_offer_count, { count: food.offer_count }) }}</strong>
          <span v-if="food.rating_average !== null" class="type-note">★ {{ MenuInsightsHelper.formatNumber(food.rating_average, language, 1) }}</span>
        </template>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.food-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.food-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  min-inline-size: 0;
}

.food-image {
  --v-icon-color: var(--theme--foreground-subdued);

  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 2.5rem;
  block-size: 2.5rem;
  overflow: hidden;
  background: var(--theme--background-normal);
  border-radius: var(--theme--border-radius);
}

.food-image img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.food-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 0;
}

.food-name {
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

.food-meta {
  color: var(--theme--foreground-subdued);
}

.food-meta.planned {
  color: var(--theme--success);
}

.food-value {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: flex-end;
  white-space: nowrap;
}

.rating,
.waiting {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
}

.waiting {
  --v-icon-color: var(--theme--primary);
}
</style>
