<script setup lang="ts">
/**
 * The planned menu of one calendar week on the tab "Speiseplanung" of the page "Speiseplan-Analyse":
 * one column per day (Monday to Friday, weekend days only when something is planned), each dish
 * with its rating of all time, its markings and badges for poorly rated dishes, favourites and the
 * profiles waiting for it. A day without a vegetarian or vegan choice is marked.
 */
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { MenuInsightsHelper, type MenuInsightsUpcomingDay } from '../../helpers/rocket-meals-module/MenuInsightsHelper';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';
import FoodFeedbackRating from '../food-feedbacks/food-feedback-rating.vue';

defineProps<{ days: readonly MenuInsightsUpcomingDay[]; today: string }>();

const { translate, language } = useAppExtensionTranslate();

function formatDay(date: string): string {
  return MenuInsightsHelper.formatDate(date, language.value, { weekday: 'short', day: '2-digit', month: '2-digit' });
}
</script>

<template>
  <div class="week-plan">
    <div v-for="day in days" :key="day.date" class="day" :class="{ today: day.date === today, past: day.date < today }">
      <div class="day-header">
        <span class="type-label">{{ formatDay(day.date) }}</span>
        <v-icon v-if="day.offers.length > 0 && !day.has_diet_option" v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_no_diet_day)" name="eco" small class="no-diet" />
      </div>
      <p v-if="day.offers.length === 0" class="type-note empty">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_nothing_planned) }}</p>
      <p v-else-if="!day.has_diet_option" class="type-note no-diet-text">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_no_diet_day) }}</p>
      <ul class="offers">
        <li v-for="offer in day.offers" :key="offer.food.id" class="offer" :class="{ weak: MenuInsightsHelper.isWeak(offer.food), strong: MenuInsightsHelper.isStrong(offer.food) }">
          <router-link :to="MenuInsightsHelper.getFoodRoute(offer.food.id)" class="offer-name">{{ offer.food.name }}</router-link>
          <span class="offer-meta">
            <food-feedback-rating :rating="offer.food.rating_average" />
            <span v-if="offer.food.rating_average !== null" class="type-note">{{ MenuInsightsHelper.formatNumber(offer.food.rating_average, language, 1) }} · {{ offer.food.rating_count }}</span>
          </span>
          <span class="badges">
            <span v-if="MenuInsightsHelper.isWeak(offer.food)" class="badge weak-badge">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_badge_weak) }}</span>
            <span v-if="MenuInsightsHelper.isStrong(offer.food)" class="badge strong-badge">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_badge_strong) }}</span>
            <span v-if="offer.food.waiting_count > 0" class="badge waiting-badge"><v-icon name="notifications_active" x-small />{{ offer.food.waiting_count }}</span>
            <span v-for="marking in offer.markings" :key="marking.id" v-tooltip.bottom="marking.name" class="badge marking-badge">{{ marking.short_code || marking.name }}</span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.week-plan {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr));
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

.day.today {
  border-color: var(--theme--primary);
}

.day.past {
  opacity: 0.6;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--theme--primary);
}

.no-diet {
  --v-icon-color: var(--theme--warning);
}

.empty {
  margin: 0;
  color: var(--theme--foreground-subdued);
}

.no-diet-text {
  margin: 0;
  color: var(--theme--warning);
}

.offers {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.offer {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding-inline-start: 0.5rem;
  border-inline-start: 3px solid var(--theme--border-color-subdued);
}

.offer.weak {
  border-inline-start-color: var(--theme--danger);
}

.offer.strong {
  border-inline-start-color: var(--theme--success);
}

.offer-name {
  overflow-wrap: anywhere;
  color: inherit;
  font-weight: 600;
  text-decoration: none;
}

.offer-name:hover {
  color: var(--theme--primary);
  text-decoration: underline;
}

.offer-meta {
  display: inline-flex;
  gap: 0.375rem;
  align-items: center;
  color: var(--theme--foreground-subdued);
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.badge {
  display: inline-flex;
  gap: 0.125rem;
  align-items: center;
  padding: 0 0.375rem;
  font-size: 0.75rem;
  line-height: 1.25rem;
  background: var(--theme--background-normal);
  border-radius: 999px;
}

.weak-badge {
  color: var(--theme--danger);
  background: var(--theme--danger-background, var(--theme--background-normal));
}

.strong-badge {
  color: var(--theme--success);
  background: var(--theme--success-background, var(--theme--background-normal));
}

.waiting-badge {
  --v-icon-color: var(--theme--primary);

  color: var(--theme--primary);
}

.marking-badge {
  color: var(--theme--foreground-subdued);
}
</style>
