<script setup lang="ts">
/**
 * A horizontal bar chart of the page "Speiseplan-Analyse": one row per entry with label (and picture
 * or icon), a bar of one or more segments (e.g. likes and dislikes) and the value as text. All bars
 * are scaled to the largest row, so the rows compare at a glance.
 */
import { computed } from 'vue';
import { MenuInsightsHelper, type InsightBarItem } from '../../helpers/rocket-meals-module/MenuInsightsHelper';

const props = defineProps<{ items: readonly InsightBarItem[] }>();

const max = computed(() => Math.max(0, ...props.items.map(item => item.segments.reduce((sum, segment) => sum + segment.value, 0))));
</script>

<template>
  <ul class="bar-list">
    <li v-for="item in items" :key="item.key" class="bar-row">
      <span class="bar-label">
        <img v-if="item.imageUrl" class="bar-image" :src="item.imageUrl" alt="" loading="lazy" />
        <v-icon v-else-if="item.icon" :name="item.icon" small class="bar-icon" />
        <router-link v-if="item.to" :to="item.to" class="label-text link" :title="item.label">{{ item.label }}</router-link>
        <span v-else class="label-text" :title="item.label">{{ item.label }}</span>
      </span>
      <span class="bar-track">
        <span v-for="(segment, index) in item.segments" :key="index" v-tooltip.bottom="segment.title" class="bar-segment" :style="{ inlineSize: `${MenuInsightsHelper.getBarPercent(segment.value, max)}%`, background: segment.color ?? 'var(--theme--primary)' }" />
      </span>
      <span class="bar-value type-note">{{ item.valueText }}</span>
    </li>
  </ul>
</template>

<style scoped>
.bar-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.bar-row {
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) minmax(4rem, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
}

.bar-label {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  min-inline-size: 0;
}

.label-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.link {
  color: inherit;
  text-decoration: none;
}

.link:hover {
  color: var(--theme--primary);
  text-decoration: underline;
}

.bar-image {
  flex: none;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  object-fit: cover;
  border-radius: 50%;
}

.bar-icon {
  --v-icon-color: var(--theme--foreground-subdued);

  flex: none;
}

.bar-track {
  display: flex;
  block-size: 0.75rem;
  overflow: hidden;
  background: var(--theme--background-normal);
  border-radius: 999px;
}

.bar-segment {
  display: block;
  block-size: 100%;
}

.bar-value {
  min-inline-size: 3rem;
  text-align: end;
  white-space: nowrap;
}
</style>
