<script setup lang="ts">
/**
 * The planned menu of one calendar week on the tab "Speiseplanung" of the page "Speiseplan-Analyse":
 * one column per day (Monday to Friday, weekend days only when something is planned), one line per
 * dish. A coloured mark shows poorly rated dishes and favourites, a bell the dishes guests wait for,
 * a leaf in the day header a day without vegetarian or vegan choice. Rating, number of ratings and
 * markings are in the tooltip of the dish.
 *
 * With `highlight` the matching dishes stay, the others are dimmed, so the planner finds them at a
 * glance.
 */
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { MenuInsightsHelper, type MenuInsightsUpcomingDay, type MenuInsightsUpcomingOffer, type WeekPlanHighlight } from '../../helpers/rocket-meals-module/MenuInsightsHelper';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';

const props = withDefaults(defineProps<{ days: readonly MenuInsightsUpcomingDay[]; today: string; highlight?: WeekPlanHighlight }>(), { highlight: 'all' });

const { translate, language } = useAppExtensionTranslate();

function formatDay(date: string): string {
  return MenuInsightsHelper.formatDate(date, language.value, { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function getTone(offer: MenuInsightsUpcomingOffer): 'weak' | 'strong' | 'neutral' {
  if (MenuInsightsHelper.isWeak(offer.food)) {
    return 'weak';
  }
  return MenuInsightsHelper.isStrong(offer.food) ? 'strong' : 'neutral';
}

function isHighlighted(offer: MenuInsightsUpcomingOffer): boolean {
  switch (props.highlight) {
    case 'weak':
      return MenuInsightsHelper.isWeak(offer.food);
    case 'strong':
      return MenuInsightsHelper.isStrong(offer.food);
    case 'awaited':
      return offer.food.waiting_count > 0;
    default:
      return true;
  }
}

/** Rating, number of ratings, waiting guests and markings in one line for the tooltip. */
function getDetails(offer: MenuInsightsUpcomingOffer): string {
  const parts: string[] = [offer.food.name];
  if (offer.food.rating_average !== null) {
    parts.push(`★ ${MenuInsightsHelper.formatNumber(offer.food.rating_average, language.value, 1)} (${translate(BackendTranslationKeys.rocket_meals_module_menu_insights_rating_count, { count: offer.food.rating_count })})`);
  }
  if (offer.food.waiting_count > 0) {
    parts.push(translate(BackendTranslationKeys.rocket_meals_module_menu_insights_waiting, { count: offer.food.waiting_count }));
  }
  if (offer.markings.length > 0) {
    parts.push(offer.markings.map(marking => marking.name).join(', '));
  }
  return parts.join(' · ');
}
</script>

<template>
  <div class="week-plan">
    <div v-for="day in days" :key="day.date" class="day" :class="{ today: day.date === today, past: day.date < today }">
      <div class="day-header">
        <span class="type-label">{{ formatDay(day.date) }}</span>
        <v-icon v-if="day.offers.length > 0 && !day.has_diet_option" v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_menu_insights_no_diet_day)" name="eco" small class="no-diet" />
      </div>
      <span v-if="day.offers.length === 0" class="type-note empty">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_nothing_planned) }}</span>
      <ul class="offers">
        <li v-for="offer in day.offers" :key="offer.food.id" v-tooltip.bottom="getDetails(offer)" class="offer" :class="[getTone(offer), { dimmed: !isHighlighted(offer) }]">
          <span class="mark" />
          <router-link :to="MenuInsightsHelper.getFoodRoute(offer.food.id)" class="offer-name">{{ offer.food.name }}</router-link>
          <v-icon v-if="offer.food.waiting_count > 0" name="notifications_active" x-small class="bell" />
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.week-plan {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr));
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

.day.today {
  border-color: var(--theme--primary);
}

.day.past {
  opacity: 0.55;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--theme--primary);
}

.no-diet {
  --v-icon-color: var(--theme--warning);

  cursor: help;
}

.empty {
  color: var(--theme--foreground-subdued);
}

.offers {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.offer {
  display: flex;
  gap: 0.375rem;
  align-items: center;
  min-inline-size: 0;
  font-size: 0.8125rem;
  line-height: 1.3;
  transition: opacity var(--fast) var(--transition);
}

.offer.dimmed {
  opacity: 0.25;
}

.mark {
  flex: none;
  inline-size: 0.5rem;
  block-size: 0.5rem;
  background: var(--theme--border-color);
  border-radius: 50%;
}

.weak .mark {
  background: var(--theme--danger);
}

.strong .mark {
  background: var(--theme--success);
}

.offer-name {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  color: inherit;
  white-space: nowrap;
  text-decoration: none;
  text-overflow: ellipsis;
}

.offer-name:hover {
  color: var(--theme--primary);
  text-decoration: underline;
}

.bell {
  --v-icon-color: var(--theme--primary);

  flex: none;
}
</style>
