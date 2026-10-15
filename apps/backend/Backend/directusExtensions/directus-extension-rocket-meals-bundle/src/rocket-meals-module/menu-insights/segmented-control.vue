<script setup lang="ts">
/**
 * A row of toggle buttons of the module `Rocket Meals` (tabs, week, list switches): one option is
 * active, each option can carry an icon and a count badge.
 */
import type { SegmentedControlOption } from '../../helpers/rocket-meals-module/MenuInsightsHelper';

defineProps<{ modelValue: string | number; options: readonly SegmentedControlOption[]; large?: boolean }>();
defineEmits<{ 'update:modelValue': [value: string | number] }>();
</script>

<template>
  <div class="segmented" :class="{ large }" role="tablist">
    <button v-for="option in options" :key="option.value" type="button" role="tab" class="segment" :class="{ active: modelValue === option.value }" :aria-selected="modelValue === option.value" @click="$emit('update:modelValue', option.value)">
      <v-icon v-if="option.icon" :name="option.icon" small />
      <span>{{ option.text }}</span>
      <span v-if="option.count !== undefined" class="count" :class="{ zero: option.count === 0 }">{{ option.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.25rem;
  background: var(--theme--background-normal);
  border-radius: var(--theme--border-radius);
}

.segment {
  --v-icon-color: currentColor;

  display: inline-flex;
  gap: 0.375rem;
  align-items: center;
  padding: 0.25rem 0.625rem;
  color: var(--theme--foreground-subdued);
  font: inherit;
  background: transparent;
  border: none;
  border-radius: var(--theme--border-radius);
  cursor: pointer;
}

.large .segment {
  padding: 0.5rem 1rem;
}

.segment:hover {
  color: var(--theme--foreground);
}

.segment.active {
  color: var(--theme--primary);
  font-weight: 600;
  background: var(--theme--background);
  box-shadow: 0 1px 2px rgb(0 0 0 / 10%);
}

.count {
  min-inline-size: 1.25rem;
  padding: 0 0.375rem;
  color: var(--white, #fff);
  font-weight: 700;
  font-size: 0.75rem;
  line-height: 1.25rem;
  text-align: center;
  background: var(--theme--primary);
  border-radius: 999px;
}

.count.zero {
  color: var(--theme--foreground-subdued);
  background: var(--theme--background-normal);
}
</style>
