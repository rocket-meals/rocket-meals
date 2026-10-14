<script setup lang="ts">
/**
 * One section of the pages "Speiseplan-Analyse" and "Speiseplan-Planung (KI)": a card with icon and
 * title, an optional note below the title and the content. With `empty` the content is replaced by
 * the hint "no data in this period".
 */
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';

withDefaults(defineProps<{ title: string; icon: string; note?: string; empty?: boolean; wide?: boolean }>(), { note: undefined, empty: false, wide: false });

const { translate } = useAppExtensionTranslate();
</script>

<template>
  <section class="insight-card" :class="{ wide }">
    <header class="card-header">
      <v-icon :name="icon" class="card-icon" />
      <h2 class="type-title">{{ title }}</h2>
      <span class="spacer" />
      <slot name="header" />
    </header>
    <p v-if="note" class="note type-note">{{ note }}</p>
    <p v-if="empty" class="empty type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_menu_insights_no_data) }}</p>
    <slot v-else />
  </section>
</template>

<style scoped>
.insight-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-inline-size: 0;
  padding: 1rem 1.25rem;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
}

.insight-card.wide {
  grid-column: 1 / -1;
}

.card-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.card-header h2 {
  font-size: 1rem;
}

.card-icon {
  --v-icon-color: var(--theme--primary);
}

.spacer {
  flex: 1;
}

.note,
.empty {
  margin: 0;
  color: var(--theme--foreground-subdued);
}
</style>
