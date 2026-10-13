<script setup lang="ts">
/**
 * One row of a list of the module `Rocket Meals`: a card that opens the item on click, with a
 * checkbox in front when the item can be selected. The content goes into the default slot. An element
 * of the content with its own target (class `row-link`, e.g. the food image) highlights itself on
 * hover instead of the row.
 */
defineProps<{ selectable?: boolean; selected?: boolean }>();
defineEmits<{ open: []; 'update:selected': [selected: boolean] }>();
</script>

<template>
  <div class="row" :class="{ selected }" tabindex="0" @click="$emit('open')" @keydown.enter.self="$emit('open')" @keydown.space.self.prevent="$emit('open')"><!-- Web:S6845 is suppressed for this file in sonar-project.properties (NOSONAR does not work in templates/CSS): the row is interactive (click, Enter and Space open it) but cannot take role="button": a button's children are presentational, which would hide the nested selection checkbox from screen readers -->
    <div class="row-select" @click.stop @keydown.stop>
      <v-checkbox v-if="selectable" :model-value="selected" @update:model-value="$emit('update:selected', $event)" />
    </div>
    <slot />
  </div>
</template>

<style scoped>
.row {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem 1.25rem;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
  cursor: pointer;
  transition: border-color var(--fast) var(--transition);
}

.row:hover:not(:has(.row-link:hover)),
.row:focus-visible,
.row.selected {
  border-color: var(--theme--primary);
}

.row-select {
  flex: none;
  inline-size: 1.5rem;
  padding-block-start: 0.25rem;
  cursor: default;
}
</style>
