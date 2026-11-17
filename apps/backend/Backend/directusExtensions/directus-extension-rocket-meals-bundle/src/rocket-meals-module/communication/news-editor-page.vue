<script setup lang="ts">
/**
 * Write or edit a news (`communication/new`, `communication/<id>`), with the app beside the form.
 *
 * 1. Where: news list, popup, above the food offers, at the end of the first day (several at once).
 * 2. Content: German title and text (Markdown, the Directus interface) and an image (a file, else
 *    the remote URL, e.g. of imported news). Every other
 *    language is translated automatically, unless it is entered by hand under "Erweitert".
 * 3. Canteens (only for popup and food offers; none means all), as tiles with a search.
 * 4. Time: visible from `date` until `date_end`.
 * 5. Buttons of the popup.
 * Advanced: platforms, app version, only users without account, the alias (else the German
 * title) and the translations. Saving sends everything at once (`NewsModuleHelper.buildPayload`).
 */
import { useApi, useStores } from '@directus/extensions-sdk';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { CollectionNames } from 'repo-depkit-common/src/databaseTypes/CollectionNames';
import type * as DatabaseTypes from 'repo-depkit-common/src/databaseTypes/types';
import type { NewsDisplayLocation } from 'repo-depkit-common/src/EventHelper';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { NewsModuleHelper, NewsPreviewView, type NewsDraft, type NewsTranslationDraft } from '../../helpers/rocket-meals-module/NewsModuleHelper';
import { RocketMealsModulePages } from '../../helpers/rocket-meals-module/RocketMealsModulePages';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';
import ModuleNavigation from '../module-navigation.vue';
import NewsAppPreview from './news-app-preview.vue';
import NewsImageFocalPoint, { type NewsImageFocalState } from './news-image-focal-point.vue';

type ModuleCanteen = { id: string; alias?: string | null; building?: { image?: string | null; image_remote_url?: string | null } | null };
type ModuleLanguage = { code: string; name?: string | null };

const props = defineProps<{ newsId: string }>();

const api = useApi();
const router = useRouter();
const { useFieldsStore, useNotificationsStore } = useStores();
const fieldsStore = useFieldsStore();
const notificationsStore = useNotificationsStore();
const { translate } = useAppExtensionTranslate();

const page = RocketMealsModulePages.COMMUNICATION;
const apiRoot = String(api.defaults?.baseURL ?? '/');

/**
 * The upload folder configured on the field `news.image` (the folder "News" below "Public Images").
 * Without it an upload lands in the root folder, which the app may not read, so the image stays
 * empty in the app.
 */
const imageFolder = computed<string | undefined>(() => fieldsStore.getField(CollectionNames.NEWS, 'image')?.meta?.options?.folder ?? undefined);

const isNew = computed(() => props.newsId === RocketMealsModulePages.NEW_ITEM_SEGMENT);
const existing = ref<DatabaseTypes.News | null>(null);
const draft = ref<NewsDraft>(NewsModuleHelper.createEmptyDraft());
const languages = ref<ModuleLanguage[]>([]);
const canteens = ref<ModuleCanteen[]>([]);
const loading = ref(false);
const loadError = ref(false);
const saving = ref(false);
const canteenSearch = ref('');
const previewView = ref<NewsPreviewView>(NewsPreviewView.LIST);
/** Size and focal point of the uploaded image, see `news-image-focal-point.vue`. */
const imageFocal = ref<NewsImageFocalState | null>(null);

const pageTitle = computed(() => (isNew.value ? translate(BackendTranslationKeys.rocket_meals_module_news_new) : draft.value.title.trim() || translate(BackendTranslationKeys.rocket_meals_module_no_title)));
const sourceLanguageCode = computed(() => NewsModuleHelper.getSourceLanguageCode(languages.value));
const translationLanguages = computed(() => NewsModuleHelper.getTranslationLanguages(languages.value));
const showCanteens = computed(() => NewsModuleHelper.isShownOutsideNewsList(draft.value));
const showPopupButtons = computed(() => draft.value.locations.includes('popup'));
const canSave = computed(() => NewsModuleHelper.canSave(draft.value) && !saving.value);

const statusItems = computed(() => NewsModuleHelper.STATUSES.map(status => ({ text: translate(NewsModuleHelper.getStatusPresentation(status).labelKey), value: status })));
const locationTiles = computed(() => NewsModuleHelper.LOCATIONS.map(location => ({ ...NewsModuleHelper.getLocationPresentation(location), selected: draft.value.locations.includes(location) })));
const platformItems = computed(() => [
  { key: 'showOnIos' as const, label: 'iOS' },
  { key: 'showOnAndroid' as const, label: 'Android' },
  { key: 'showOnWeb' as const, label: 'Web' },
]);

function assetUrl(id: string | null | undefined, width: number, height: number): string | undefined {
  if (!id) {
    return undefined;
  }
  const root = apiRoot.endsWith('/') ? apiRoot : `${apiRoot}/`;
  return `${root}assets/${encodeURIComponent(id)}?width=${width}&height=${height}&fit=cover&quality=80`;
}

/**
 * The uploaded image as the app crops it (a square around the focal point, also one that is not
 * saved yet), else the remote URL. Same URL and order as in the app and the list.
 */
const imageUrl = computed(() => {
  const focalPoint = imageFocal.value?.fileId === draft.value.image ? imageFocal.value.current : null;
  return NewsModuleHelper.getImageUrl({ image: draft.value.image, image_remote_url: draft.value.imageRemoteUrl }, apiRoot, 300, 300, focalPoint);
});
const remoteImageUrl = computed(() => (draft.value.image ? undefined : draft.value.imageRemoteUrl.trim() || undefined));

const canteenTiles = computed(() => {
  const query = canteenSearch.value.trim().toLowerCase();
  return canteens.value
    .filter(canteen => !query || (canteen.alias ?? '').toLowerCase().includes(query))
    .map(canteen => ({
      id: canteen.id,
      name: canteen.alias || canteen.id,
      imageUrl: canteen.building?.image_remote_url || assetUrl(canteen.building?.image, 360, 180),
      selected: draft.value.canteenIds.includes(canteen.id),
    }));
});
const canteenHint = computed(() => (draft.value.canteenIds.length === 0 ? translate(BackendTranslationKeys.rocket_meals_module_news_canteens_all_hint) : translate(BackendTranslationKeys.rocket_meals_module_news_canteens_selected, { count: draft.value.canteenIds.length, total: canteens.value.length })));
const previewCanteenName = computed(() => {
  const selected = canteens.value.find(canteen => draft.value.canteenIds.includes(canteen.id)) ?? canteens.value[0];
  return selected?.alias || translate(BackendTranslationKeys.rocket_meals_module_news_all_canteens);
});

const previewViews = computed(() => NewsModuleHelper.getPreviewViews(draft.value));
const activePreviewView = computed(() => (previewViews.value.includes(previewView.value) ? previewView.value : (previewViews.value[0] ?? NewsPreviewView.DETAIL)));
const previewViewItems = computed(() =>
  previewViews.value.map(view => ({
    value: view,
    label: translate(
      {
        [NewsPreviewView.LIST]: BackendTranslationKeys.rocket_meals_module_news_location_news_list,
        [NewsPreviewView.DETAIL]: BackendTranslationKeys.rocket_meals_module_news_preview_detail,
        [NewsPreviewView.POPUP]: BackendTranslationKeys.rocket_meals_module_news_location_popup,
        [NewsPreviewView.FOODOFFERS]: BackendTranslationKeys.rocket_meals_module_news_filter_foodoffers,
      }[view]
    ),
  }))
);

const timeHint = computed(() => (draft.value.dateEnd ? translate(BackendTranslationKeys.rocket_meals_module_news_time_hint_end) : translate(BackendTranslationKeys.rocket_meals_module_news_time_hint_open)));

function toggleLocation(location: NewsDisplayLocation) {
  const wasSelected = draft.value.locations.includes(location);
  draft.value.locations = NewsModuleHelper.toggleLocation(draft.value.locations, location);
  if (!wasSelected) {
    // Show where the news just went.
    previewView.value = location === 'news_list' ? NewsPreviewView.LIST : location === 'popup' ? NewsPreviewView.POPUP : NewsPreviewView.FOODOFFERS;
  }
}

function toggleCanteen(canteenId: string) {
  const ids = draft.value.canteenIds;
  draft.value.canteenIds = ids.includes(canteenId) ? ids.filter(id => id !== canteenId) : [...ids, canteenId];
}

function translationOf(code: string): NewsTranslationDraft {
  return draft.value.translations[code] ?? { manual: false, title: '', content: '' };
}

function updateTranslation(code: string, patch: Partial<NewsTranslationDraft>) {
  draft.value.translations = { ...draft.value.translations, [code]: { ...translationOf(code), ...patch } };
}

async function load() {
  loading.value = true;
  try {
    const [languagesResponse, canteensResponse, newsResponse] = await Promise.all([api.get(NewsModuleHelper.LANGUAGES_ENDPOINT, { params: NewsModuleHelper.buildLanguagesQuery() }), api.get(NewsModuleHelper.CANTEENS_ENDPOINT, { params: NewsModuleHelper.buildCanteensQuery() }), isNew.value ? Promise.resolve(null) : api.get(`${NewsModuleHelper.NEWS_ENDPOINT}/${encodeURIComponent(props.newsId)}`, { params: NewsModuleHelper.buildDetailQuery() })]);
    languages.value = languagesResponse.data?.data ?? [];
    canteens.value = canteensResponse.data?.data ?? [];
    existing.value = newsResponse?.data?.data ?? null;
    draft.value = existing.value ? NewsModuleHelper.draftFromNews(existing.value) : NewsModuleHelper.createEmptyDraft();
    previewView.value = NewsModuleHelper.getPreviewViews(draft.value)[0] ?? NewsPreviewView.DETAIL;
    loadError.value = false;
  } catch (error) {
    console.error('[rocket-meals-module] loading news failed', error);
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

/** Stores a changed focal point on the image file, so the app crops around it. */
async function saveFocalPoint() {
  const focal = imageFocal.value;
  if (!focal || focal.fileId !== draft.value.image || (focal.current?.x === focal.saved?.x && focal.current?.y === focal.saved?.y)) {
    return;
  }
  try {
    await api.patch(`/files/${encodeURIComponent(focal.fileId)}`, { focal_point_x: focal.current?.x ?? null, focal_point_y: focal.current?.y ?? null });
    imageFocal.value = { ...focal, saved: focal.current };
  } catch (error) {
    console.error('[rocket-meals-module] saving the focal point failed', error);
    notificationsStore.add({ title: translate(BackendTranslationKeys.rocket_meals_module_news_focal_point_save_failed), type: 'error' });
  }
}

async function save() {
  if (!canSave.value) {
    return;
  }
  saving.value = true;
  try {
    await saveFocalPoint();
    const payload = NewsModuleHelper.buildPayload(draft.value, existing.value, sourceLanguageCode.value);
    if (isNew.value) {
      const response = await api.post(NewsModuleHelper.NEWS_ENDPOINT, payload, { params: { fields: 'id' } });
      notificationsStore.add({ title: translate(BackendTranslationKeys.rocket_meals_module_news_saved), type: 'success' });
      await router.replace(RocketMealsModulePages.getRoute(page, String(response.data?.data?.id)));
    } else {
      await api.patch(`${NewsModuleHelper.NEWS_ENDPOINT}/${encodeURIComponent(props.newsId)}`, payload);
      notificationsStore.add({ title: translate(BackendTranslationKeys.rocket_meals_module_news_saved), type: 'success' });
      await load();
    }
  } catch (error) {
    console.error('[rocket-meals-module] saving news failed', error);
    notificationsStore.add({ title: translate(BackendTranslationKeys.rocket_meals_module_news_save_failed), type: 'error' });
  } finally {
    saving.value = false;
  }
}

onMounted(load);
watch(() => props.newsId, load);
</script>

<template>
  <private-view :title="pageTitle" :icon="page.icon" show-back :back-to="RocketMealsModulePages.getRoute(page)">
    <template #headline>
      <v-breadcrumb
        :items="[
          { name: RocketMealsModulePages.MODULE_NAME, to: RocketMealsModulePages.getRoute() },
          { name: translate(page.labelKey), to: RocketMealsModulePages.getRoute(page) },
        ]"
      />
    </template>

    <template #navigation>
      <module-navigation />
    </template>

    <template #actions>
      <div class="status-select">
        <v-select v-model="draft.status" :items="statusItems" inline :disabled="saving" />
      </div>
      <v-button v-if="!isNew" v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_news_open_item)" rounded icon secondary :to="`/content/${CollectionNames.NEWS}/${newsId}`" :aria-label="translate(BackendTranslationKeys.rocket_meals_module_news_open_item)">
        <v-icon name="open_in_new" />
      </v-button>
      <v-button v-tooltip.bottom="translate(BackendTranslationKeys.save)" rounded icon :disabled="!canSave" :loading="saving" :aria-label="translate(BackendTranslationKeys.save)" @click="save">
        <v-icon name="check" />
      </v-button>
    </template>

    <div class="editor-page">
      <v-notice v-if="loadError" type="danger">{{ translate(BackendTranslationKeys.rocket_meals_module_load_failed) }}</v-notice>
      <v-progress-circular v-else-if="loading" indeterminate />

      <template v-else>
        <div class="form">
          <section class="section">
            <h2 class="section-title type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_section_where) }}</h2>
            <div class="location-tiles">
              <button v-for="tile in locationTiles" :key="tile.location" type="button" class="tile location-tile" :class="{ selected: tile.selected }" :aria-pressed="tile.selected" @click="toggleLocation(tile.location)">
                <span class="tile-check"><v-icon :name="tile.selected ? 'check_box' : 'check_box_outline_blank'" small /></span>
                <v-icon :name="tile.icon" />
                <span class="tile-label">{{ translate(tile.labelKey) }}</span>
                <span class="type-note">{{ translate(tile.hintKey) }}</span>
              </button>
            </div>
            <p class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_news_locations_hint) }}</p>
          </section>

          <section class="section">
            <h2 class="section-title type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_section_content) }}</h2>
            <label class="field" for="news-title">
              <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_field_title) }}</span>
              <v-input id="news-title" v-model="draft.title" :disabled="saving" />
            </label>
            <div class="field">
              <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_field_content) }}</span>
              <interface-input-rich-text-md :value="draft.content" :disabled="saving" @input="draft.content = $event ?? ''" />
            </div>
            <div class="field">
              <span class="type-label">{{ translate(BackendTranslationKeys.image) }}</span>
              <interface-file-image :value="draft.image" :disabled="saving" :folder="imageFolder" collection="news" field="image" @input="draft.image = $event ?? null" />
            </div>
            <news-image-focal-point v-model:state="imageFocal" :file-id="draft.image" :api-root="apiRoot" :disabled="saving" />
            <label class="field" for="news-image-remote-url">
              <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_field_image_remote_url) }}</span>
              <v-input id="news-image-remote-url" v-model="draft.imageRemoteUrl" type="url" placeholder="https://" :disabled="saving" />
              <span class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_news_image_remote_url_hint) }}</span>
              <img v-if="remoteImageUrl" class="remote-image" :src="remoteImageUrl" alt="" />
            </label>
          </section>

          <section v-if="showCanteens" class="section">
            <h2 class="section-title type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_section_canteens) }}</h2>
            <div class="canteen-toolbar">
              <v-input v-model="canteenSearch" type="search" :placeholder="translate(BackendTranslationKeys.rocket_meals_module_news_canteen_search)">
                <template #prepend><v-icon name="search" small /></template>
              </v-input>
              <v-checkbox :model-value="draft.canteenIds.length === 0" :label="translate(BackendTranslationKeys.rocket_meals_module_news_all_canteens)" @update:model-value="draft.canteenIds = []" />
            </div>
            <div class="canteen-tiles">
              <button v-for="tile in canteenTiles" :key="tile.id" type="button" class="tile canteen-tile" :class="{ selected: tile.selected }" :aria-pressed="tile.selected" @click="toggleCanteen(tile.id)">
                <span class="canteen-image">
                  <img v-if="tile.imageUrl" :src="tile.imageUrl" alt="" />
                  <v-icon v-else name="restaurant" />
                  <span class="tile-check"><v-icon :name="tile.selected ? 'check_box' : 'check_box_outline_blank'" small /></span>
                </span>
                <span class="tile-label">{{ tile.name }}</span>
              </button>
              <p v-if="canteenTiles.length === 0" class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_news_canteens_none_found) }}</p>
            </div>
            <p class="type-note">{{ canteenHint }} {{ translate(BackendTranslationKeys.rocket_meals_module_news_canteens_scope_hint) }}</p>
          </section>

          <section class="section">
            <h2 class="section-title type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_section_time) }}</h2>
            <div class="field-row">
              <label class="field" for="news-date">
                <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_field_date) }}</span>
                <v-input id="news-date" v-model="draft.date" type="datetime-local" :disabled="saving" />
              </label>
              <label class="field" for="news-date-end">
                <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_field_date_end) }}</span>
                <v-input id="news-date-end" v-model="draft.dateEnd" type="datetime-local" :disabled="saving" />
              </label>
            </div>
            <p class="type-note">{{ timeHint }}</p>
            <label class="field" for="news-url">
              <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_field_url) }}</span>
              <v-input id="news-url" v-model="draft.url" type="url" placeholder="https://" :disabled="saving" />
            </label>
          </section>

          <section v-if="showPopupButtons" class="section">
            <h2 class="section-title type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_section_buttons) }}</h2>
            <v-checkbox v-model="draft.showRatingButton" :label="translate(BackendTranslationKeys.rocket_meals_module_news_button_rating)" :disabled="saving" />
            <v-checkbox v-model="draft.showLoginButton" :label="translate(BackendTranslationKeys.rocket_meals_module_news_button_login)" :disabled="saving" />
          </section>

          <v-detail class="advanced" :label="translate(BackendTranslationKeys.rocket_meals_module_news_advanced)">
            <div class="advanced-content">
              <template v-if="showCanteens">
                <div class="field">
                  <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_platforms) }}</span>
                  <div class="platforms">
                    <v-checkbox v-for="platform in platformItems" :key="platform.key" v-model="draft[platform.key]" :label="platform.label" :disabled="saving" />
                  </div>
                </div>
                <label class="field" for="news-app-version">
                  <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_app_version) }}</span>
                  <v-input id="news-app-version" v-model="draft.appVersion" :placeholder="translate(BackendTranslationKeys.rocket_meals_module_news_app_version_placeholder)" :disabled="saving" />
                </label>
                <v-checkbox v-model="draft.onlyAnonymousUsers" :label="translate(BackendTranslationKeys.rocket_meals_module_news_only_anonymous)" :disabled="saving" />
              </template>

              <label class="field" for="news-alias">
                <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_alias) }}</span>
                <v-input id="news-alias" v-model="draft.alias" :placeholder="draft.title" :disabled="saving" />
                <span class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_news_alias_hint) }}</span>
              </label>

              <div class="field">
                <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_translations) }}</span>
                <div class="translations">
                  <div v-for="language in translationLanguages" :key="language.code" class="translation-row">
                    <span class="translation-language">{{ language.name }}</span>
                    <div class="translation-value">
                      <template v-if="translationOf(language.code).manual">
                        <v-input :model-value="translationOf(language.code).title" :aria-label="language.name" :disabled="saving" @update:model-value="updateTranslation(language.code, { title: $event })" />
                        <v-textarea :model-value="translationOf(language.code).content" :aria-label="language.name" :disabled="saving" @update:model-value="updateTranslation(language.code, { content: $event })" />
                      </template>
                      <span v-else class="type-note">{{ translationOf(language.code).title || translate(BackendTranslationKeys.rocket_meals_module_news_translation_auto) }}</span>
                    </div>
                    <v-button small secondary :disabled="saving" @click="updateTranslation(language.code, { manual: !translationOf(language.code).manual })">
                      {{ translate(translationOf(language.code).manual ? BackendTranslationKeys.rocket_meals_module_news_translation_use_auto : BackendTranslationKeys.rocket_meals_module_news_translation_use_manual) }}
                    </v-button>
                  </div>
                </div>
              </div>
            </div>
          </v-detail>
        </div>

        <aside class="preview">
          <h2 class="section-title type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_preview) }}</h2>
          <div class="preview-views" role="group">
            <v-button v-for="item in previewViewItems" :key="item.value" x-small :secondary="item.value !== activePreviewView" @click="previewView = item.value">{{ item.label }}</v-button>
          </div>
          <news-app-preview :draft="draft" :view="activePreviewView" :canteen-name="previewCanteenName" :image-url="imageUrl" />
        </aside>
      </template>
    </div>
  </private-view>
</template>

<style scoped>
.editor-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 22rem);
  gap: 2rem;
  align-items: start;
  max-inline-size: 84rem;
  padding: var(--content-padding);
  padding-block-start: 0;
}

.editor-page > .v-notice,
.editor-page > .v-progress-circular {
  grid-column: 1 / -1;
}

@media (max-width: 70rem) {
  .editor-page {
    grid-template-columns: minmax(0, 1fr);
  }

  /* Below the form the preview scrolls with the page instead of sticking over it. */
  .preview {
    position: static;
  }
}

@media (max-width: 40rem) {
  .editor-page {
    gap: 1.5rem;
  }

  .status-select {
    min-inline-size: 7rem;
  }

  .location-tiles,
  .canteen-tiles {
    grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  }

  .translation-language {
    flex-basis: 100%;
    padding-block-start: 0;
  }
}

.status-select {
  min-inline-size: 9rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  min-inline-size: 0;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  margin: 0;
  color: var(--theme--foreground-subdued);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.type-note {
  margin: 0;
}

.field {
  display: flex;
  flex: 1 1 14rem;
  flex-direction: column;
  gap: 0.5rem;
  min-inline-size: 0;
}

.remote-image {
  inline-size: 100%;
  max-inline-size: 24rem;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  background: var(--theme--background-normal);
  border-radius: var(--theme--border-radius);
}

.field-row,
.canteen-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.canteen-toolbar > .v-input {
  flex: 1 1 16rem;
}

.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
  padding: 0.875rem;
  color: var(--theme--foreground);
  text-align: start;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
  cursor: pointer;
  transition: border-color var(--fast) var(--transition);
}

.tile:hover,
.tile:focus-visible {
  border-color: var(--theme--primary);
}

.tile.selected {
  --v-icon-color: var(--theme--primary);

  background: var(--theme--primary-background);
  border-color: var(--theme--primary);
}

.tile-check {
  position: absolute;
  inset-block-start: 0.5rem;
  inset-inline-end: 0.5rem;
}

.tile-label {
  font-weight: 600;
}

.location-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.75rem;
}

.canteen-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.75rem;
}

.canteen-tile {
  padding: 0;
  overflow: hidden;
}

.canteen-tile .tile-label {
  padding: 0 0.75rem 0.75rem;
}

.canteen-image {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: 100%;
  block-size: 5.5rem;
  background: var(--theme--background-normal);
}

.canteen-image img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.canteen-image .tile-check {
  padding: 0.125rem;
  background: var(--theme--background);
  border-radius: var(--theme--border-radius);
}

.advanced-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-block: 1rem;
}

.platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.translations {
  display: flex;
  flex-direction: column;
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
}

.translation-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.75rem;
}

.translation-row + .translation-row {
  border-block-start: var(--theme--border-width) solid var(--theme--border-color-subdued);
}

.translation-language {
  flex: 0 0 8rem;
  padding-block-start: 0.375rem;
  font-weight: 600;
}

.translation-value {
  display: flex;
  flex: 1 1 14rem;
  flex-direction: column;
  gap: 0.5rem;
  min-inline-size: 0;
  padding-block-start: 0.375rem;
}

.preview {
  position: sticky;
  inset-block-start: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.preview .section-title {
  align-self: stretch;
}

.preview-views {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  justify-content: center;
}
</style>
