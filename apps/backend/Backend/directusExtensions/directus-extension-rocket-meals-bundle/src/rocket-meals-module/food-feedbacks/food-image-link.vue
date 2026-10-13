<script setup lang="ts">
/**
 * The picture of the food of a feedback (the restaurant icon without picture). With a food it links
 * to the food in the content area and highlights itself on hover; in a list row the row then stays
 * as it is (see `row-link` in `list-row.vue`) and the click does not open the row.
 */
import { computed } from 'vue';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { FoodFeedbackChatHelper, type FoodFeedbackListItem } from '../../helpers/rocket-meals-module/FoodFeedbackChatHelper';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';

const props = defineProps<{ feedback: Pick<FoodFeedbackListItem, 'food'>; apiRoot: string }>();

const { translate } = useAppExtensionTranslate();

const imageUrl = computed(() => FoodFeedbackChatHelper.getFoodImageUrl(props.feedback, props.apiRoot));
const foodRoute = computed(() => FoodFeedbackChatHelper.getFoodRoute(props.feedback));
const foodName = computed(() => FoodFeedbackChatHelper.getFoodName(props.feedback) ?? '');
const openLabel = computed(() => translate(BackendTranslationKeys.rocket_meals_module_open_food_item));
</script>

<template>
  <router-link v-if="foodRoute" v-tooltip.bottom="openLabel" class="food-image row-link" :to="foodRoute" :aria-label="openLabel" @click.stop @keydown.stop>
    <img v-if="imageUrl" :src="imageUrl" :alt="foodName" loading="lazy" />
    <v-icon v-else name="restaurant" />
  </router-link>
  <div v-else class="food-image">
    <img v-if="imageUrl" :src="imageUrl" :alt="foodName" loading="lazy" />
    <v-icon v-else name="restaurant" />
  </div>
</template>

<style scoped>
.food-image {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 4rem;
  block-size: 4rem;
  overflow: hidden;
  color: var(--theme--foreground-subdued);
  background: var(--theme--background-normal);
  border: var(--theme--border-width) solid transparent;
  border-radius: var(--theme--border-radius);
  transition: border-color var(--fast) var(--transition);
}

a.food-image:hover,
a.food-image:focus-visible {
  border-color: var(--theme--primary);
}

.food-image img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}
</style>
