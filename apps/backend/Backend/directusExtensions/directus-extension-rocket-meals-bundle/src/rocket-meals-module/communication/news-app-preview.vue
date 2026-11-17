<script setup lang="ts">
/**
 * A phone that shows a news the way the app does, in one of the places the news is meant for:
 * the news list, the opened news, the popup over the food offers, or the compact card above the food
 * offers or at the end of the first day (`NewsFoodoffersHint` in the app). Dishes are grey blocks,
 * only the news is real. The text is shown as written (Markdown is not rendered).
 */
import { computed } from 'vue';
import { NewsDisplayLocations } from 'repo-depkit-common/src/EventHelper';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { NewsPreviewView, type NewsDraft } from '../../helpers/rocket-meals-module/NewsModuleHelper';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';

/** `imageUrl` is the square (popup, opened news), `listImageUrl` the band of the news list (about 2:1). */
const props = defineProps<{ draft: NewsDraft; view: NewsPreviewView; canteenName: string; imageUrl?: string; listImageUrl?: string }>();

const { translate, formatDateTime } = useAppExtensionTranslate();

const title = computed(() => props.draft.title.trim() || translate(BackendTranslationKeys.rocket_meals_module_no_title));
const dateLabel = computed(() => (props.draft.date ? formatDateTime(props.draft.date) : ''));
const showTopCard = computed(() => props.view === NewsPreviewView.FOODOFFERS && props.draft.locations.includes(NewsDisplayLocations.foodoffers_top));
const showBottomCard = computed(() => props.view === NewsPreviewView.FOODOFFERS && !showTopCard.value && props.draft.locations.includes(NewsDisplayLocations.foodoffers_bottom));
const isFoodoffers = computed(() => props.view === NewsPreviewView.FOODOFFERS || props.view === NewsPreviewView.POPUP);
const DISH_COUNT = 4;
</script>

<template>
  <div class="phone">
    <div class="screen">
      <div class="app-header">
        <v-icon :name="view === NewsPreviewView.DETAIL ? 'arrow_back' : 'menu'" small />
        <span class="app-header-title">{{ isFoodoffers ? canteenName : translate(BackendTranslationKeys.rocket_meals_module_news_app_title) }}</span>
      </div>

      <template v-if="view === NewsPreviewView.LIST">
        <div class="news-card highlighted">
          <div class="news-image">
            <img v-if="listImageUrl || imageUrl" :src="listImageUrl || imageUrl" alt="" />
          </div>
          <div class="news-card-body">
            <span class="news-date">{{ dateLabel }}</span>
            <span class="news-title">{{ title }}</span>
            <span class="news-text clamp">{{ draft.content }}</span>
          </div>
        </div>
        <div class="news-card">
          <div class="news-image" />
          <div class="news-card-body">
            <span class="placeholder-line short" />
            <span class="placeholder-line" />
          </div>
        </div>
      </template>

      <template v-else-if="view === NewsPreviewView.DETAIL">
        <div class="detail-image">
          <img v-if="imageUrl" :src="imageUrl" alt="" />
        </div>
        <div class="detail-body">
          <span class="news-date">{{ dateLabel }}</span>
          <span class="detail-title">{{ title }}</span>
          <span class="news-text">{{ draft.content }}</span>
          <span v-if="draft.url.trim()" class="app-button">{{ translate(BackendTranslationKeys.rocket_meals_module_news_preview_open_article) }}</span>
        </div>
      </template>

      <template v-else>
        <div v-if="showTopCard" class="hint-card">
          <v-icon name="campaign" x-small />
          <span class="hint-title">{{ title }}</span>
          <v-icon name="chevron_right" x-small />
        </div>
        <template v-if="!showBottomCard">
          <div class="day-header">{{ translate(BackendTranslationKeys.today) }}</div>
          <div class="dishes">
            <div v-for="index in DISH_COUNT" :key="index" class="dish" />
          </div>
        </template>
        <template v-else>
          <div class="dishes">
            <div v-for="index in DISH_COUNT / 2" :key="index" class="dish" />
          </div>
          <div class="hint-card">
            <v-icon name="campaign" x-small />
            <span class="hint-title">{{ title }}</span>
            <v-icon name="chevron_right" x-small />
          </div>
          <div class="day-divider" />
          <div class="day-header">{{ translate(BackendTranslationKeys.tomorrow) }}</div>
          <div class="dishes">
            <div v-for="index in DISH_COUNT / 2" :key="index" class="dish" />
          </div>
        </template>

        <template v-if="view === NewsPreviewView.POPUP">
          <div class="backdrop" />
          <div class="sheet">
            <span class="grabber" />
            <span class="app-button">{{ translate(BackendTranslationKeys.rocket_meals_module_news_preview_dismiss) }}</span>
            <span class="sheet-title">{{ title }}</span>
            <div v-if="imageUrl" class="sheet-image"><img :src="imageUrl" alt="" /></div>
            <span class="news-text">{{ draft.content }}</span>
            <span v-if="draft.showRatingButton" class="sheet-row">
              <v-icon name="star" x-small />
              {{ translate(BackendTranslationKeys.rocket_meals_module_news_preview_rate_app) }}
            </span>
            <span v-if="draft.showLoginButton" class="app-button">{{ translate(BackendTranslationKeys.rocket_meals_module_news_preview_login) }}</span>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* The colours are the app's (light theme), not Directus' – the preview shows the app. */
.phone {
  inline-size: 300px;
  max-inline-size: 100%;
  padding: 0.5rem;
  background: #111;
  border-radius: 2.5rem;
  box-shadow:
    0 0 0 2px #333,
    0 12px 32px rgb(0 0 0 / 0.25);
}

.screen {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  aspect-ratio: 9 / 19;
  overflow: hidden;
  color: #000;
  font-size: 12px;
  background: #fff;
  border-radius: 2rem;
}

.app-header {
  --v-icon-color: #000;

  display: flex;
  gap: 0.625rem;
  align-items: center;
  padding: 1.5rem 1rem 0.25rem;
}

.app-header-title {
  overflow: hidden;
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.news-card {
  margin: 0 0.625rem;
  overflow: hidden;
  background: #f0f0f0;
  border-radius: 0.75rem;
}

.news-card.highlighted {
  box-shadow: 0 0 0 2px var(--theme--primary);
}

/*
 * The images are the crops the app loads (around the focal point): the news list card is as wide as
 * the phone and 180 high and gets a band of about 2:1, the popup box is 300 high and shows the whole
 * square (contain).
 */
.news-image,
.detail-image {
  aspect-ratio: 370 / 180;
  background: #c9c9c9;
}

.detail-image {
  aspect-ratio: auto;
  block-size: 9rem;
}

.news-image img,
.detail-image img,
.sheet-image img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.news-card-body,
.detail-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.625rem 0.75rem;
}

.detail-body {
  gap: 0.5rem;
  padding: 0.75rem 1rem;
}

.news-date {
  color: #555;
  font-size: 10px;
}

.news-title {
  font-weight: 600;
  font-size: 13px;
  line-height: 1.3;
}

.detail-title,
.sheet-title {
  font-weight: 700;
  font-size: 18px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.sheet-title {
  text-align: center;
}

.news-text {
  line-height: 1.5;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.clamp {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.placeholder-line {
  block-size: 0.5rem;
  background: #d6d6d6;
  border-radius: 0.25rem;
}

.placeholder-line.short {
  inline-size: 40%;
}

.app-button {
  align-self: center;
  padding: 0.4rem 0.75rem;
  color: #fff;
  font-size: 11px;
  background: #0b4f9c;
  border-radius: 0.375rem;
}

.hint-card {
  --v-icon-color: #333;

  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0.25rem 0.5rem;
  padding: 0.5rem 0.625rem;
  background: #f0f0f0;
  border-inline-start: 4px solid #1e5ba8;
  border-radius: 0.625rem;
  box-shadow: 0 0 0 2px var(--theme--primary);
}

.hint-title {
  flex: 1;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.day-header {
  padding: 0.25rem 0.75rem 0;
  font-size: 13px;
}

.day-divider {
  block-size: 1px;
  margin: 0.5rem 0.5rem 0;
  background: #999;
}

.dishes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  padding: 0 0.5rem;
}

.dish {
  block-size: 7rem;
  background: #e2e2e2;
  border-block-end: 3px solid #e5506a;
  border-radius: 0.625rem;
}

.backdrop {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 0.45);
}

.sheet {
  --v-icon-color: #333;

  position: absolute;
  inset: 8.5rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: stretch;
  padding: 0.75rem 1rem;
  overflow: hidden;
  background: #fff;
  border-radius: 1.25rem 1.25rem 0 0;
}

.grabber {
  align-self: center;
  inline-size: 3.5rem;
  block-size: 4px;
  background: #8a8a8a;
  border-radius: 2px;
}

.sheet-image {
  flex-shrink: 0;
  aspect-ratio: 358 / 300;
  overflow: hidden;
}

.sheet-image img {
  object-fit: contain;
}

.sheet-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0.625rem;
  background: #f0f0f0;
  border-radius: 0.625rem;
}
</style>
