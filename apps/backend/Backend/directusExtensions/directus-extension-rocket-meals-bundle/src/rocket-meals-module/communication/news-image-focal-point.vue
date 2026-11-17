<script setup lang="ts">
/**
 * The square the app cuts from the news image, shown on the whole image.
 *
 * The app shows uploaded images as a 1:1 crop that Directus cuts around the file's focal point
 * (`DirectusImageHelper`). For a square image there is nothing to choose. For any other format
 * (e.g. 16:9) without a focal point, smartcrop suggests the square right away. "Set focal point"
 * lets the editor click or drag the point by hand. The point is kept in `state` and saved on the file
 * (`directus_files.focal_point_x/y`) when the news is saved.
 */
import { useApi } from '@directus/extensions-sdk';
import { computed, ref, watch } from 'vue';
import smartcrop from 'smartcrop';
import { DirectusImageHelper, type ImageFocalPoint } from 'repo-depkit-common/src/DirectusImageHelper';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';

export type NewsImageFocalState = {
  fileId: string;
  width: number;
  height: number;
  /** The point stored on the file, `null` if it has none. */
  saved: ImageFocalPoint | null;
  /** The point to show and save, `null` for the middle. */
  current: ImageFocalPoint | null;
};

const props = defineProps<{ fileId: string | null; apiRoot: string; state: NewsImageFocalState | null; disabled?: boolean }>();
const emit = defineEmits<{ (event: 'update:state', state: NewsImageFocalState | null): void }>();

const api = useApi();
const { translate } = useAppExtensionTranslate();

/** Edge length of the copy smartcrop analyses. Small enough to be fast, large enough to be right. */
const ANALYSIS_SIZE = 512;
/** Width of the whole image shown here, at twice the size for HiDPI. */
const DISPLAY_WIDTH = 1200;

const loading = ref(false);
const suggesting = ref(false);
const editing = ref(false);
const dragging = ref(false);
const frame = ref<HTMLElement | null>(null);

const root = computed(() => (props.apiRoot.endsWith('/') ? props.apiRoot : `${props.apiRoot}/`));
const dimensions = computed(() => (props.state ? { width: props.state.width, height: props.state.height } : null));
const isSquare = computed(() => !dimensions.value || DirectusImageHelper.isSquare(dimensions.value));
const fullImageUrl = computed(() => (props.fileId ? `${root.value}assets/${encodeURIComponent(props.fileId)}?width=${DISPLAY_WIDTH}&fit=inside&quality=80` : undefined));
const hasChanges = computed(() => !!props.state && !samePoint(props.state.current, props.state.saved));

/** The square in percent of the whole image, for the overlay. */
const region = computed(() => {
  if (!props.state || !dimensions.value) {
    return null;
  }
  const square = DirectusImageHelper.getSquareRegion(dimensions.value, props.state.current);
  return {
    left: (square.left / dimensions.value.width) * 100,
    top: (square.top / dimensions.value.height) * 100,
    width: (square.size / dimensions.value.width) * 100,
    height: (square.size / dimensions.value.height) * 100,
  };
});

const marker = computed(() => {
  if (!props.state || !dimensions.value) {
    return null;
  }
  const point = props.state.current ?? DirectusImageHelper.getCenter(dimensions.value);
  return { left: (point.x / dimensions.value.width) * 100, top: (point.y / dimensions.value.height) * 100 };
});

function samePoint(a: ImageFocalPoint | null, b: ImageFocalPoint | null): boolean {
  return a?.x === b?.x && a?.y === b?.y;
}

function update(current: ImageFocalPoint | null) {
  if (props.state) {
    emit('update:state', { ...props.state, current });
  }
}

/** Loads the image and lets smartcrop find the best square; its middle is the focal point. */
async function suggestFocalPoint(state: NewsImageFocalState): Promise<ImageFocalPoint | null> {
  const image = new Image();
  image.src = `${root.value}assets/${encodeURIComponent(state.fileId)}?width=${ANALYSIS_SIZE}&height=${ANALYSIS_SIZE}&fit=inside&quality=80`;
  await image.decode();
  const analysed = { width: image.naturalWidth, height: image.naturalHeight };
  const side = Math.min(analysed.width, analysed.height);
  const result = await smartcrop.crop(image, { width: side, height: side, minScale: 1 });
  return DirectusImageHelper.focalPointFromCrop(result.topCrop, analysed, state);
}

async function chooseAutomatically(state: NewsImageFocalState) {
  suggesting.value = true;
  try {
    const point = await suggestFocalPoint(state);
    if (props.state?.fileId === state.fileId) {
      update(point);
    }
  } catch (error) {
    console.error('[rocket-meals-module] smartcrop failed', error);
  } finally {
    suggesting.value = false;
  }
}

async function load(fileId: string | null) {
  editing.value = false;
  if (!fileId) {
    emit('update:state', null);
    return;
  }
  if (props.state?.fileId === fileId) {
    return;
  }
  loading.value = true;
  try {
    const response = await api.get(`/files/${encodeURIComponent(fileId)}`, { params: { fields: 'id,width,height,focal_point_x,focal_point_y' } });
    const file = response.data?.data;
    if (!file?.width || !file?.height) {
      emit('update:state', null);
      return;
    }
    const saved = DirectusImageHelper.readFocalPoint(file);
    const state: NewsImageFocalState = { fileId, width: file.width, height: file.height, saved, current: saved };
    emit('update:state', state);
    if (!saved && !DirectusImageHelper.isSquare(state)) {
      await chooseAutomatically(state);
    }
  } catch (error) {
    console.error('[rocket-meals-module] loading the image file failed', error);
    emit('update:state', null);
  } finally {
    loading.value = false;
  }
}

function pointFromEvent(event: PointerEvent): ImageFocalPoint | null {
  const element = frame.value;
  if (!element || !dimensions.value) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1) * dimensions.value.width;
  const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1) * dimensions.value.height;
  return DirectusImageHelper.normalizeFocalPoint(dimensions.value, { x, y });
}

function onPointerDown(event: PointerEvent) {
  if (!editing.value || props.disabled) {
    return;
  }
  dragging.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  update(pointFromEvent(event));
}

function onPointerMove(event: PointerEvent) {
  if (dragging.value) {
    update(pointFromEvent(event));
  }
}

function onPointerUp() {
  dragging.value = false;
}

function center() {
  if (dimensions.value) {
    update(DirectusImageHelper.getCenter(dimensions.value));
  }
}

watch(() => props.fileId, load, { immediate: true });
</script>

<template>
  <div v-if="fileId && (state || loading)" class="focal-point">
    <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_news_focal_point_title) }}</span>
    <v-progress-circular v-if="loading" indeterminate small />
    <template v-else-if="state">
      <div ref="frame" class="frame" :class="{ editing, square: isSquare }" :style="{ aspectRatio: `${state.width} / ${state.height}` }" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp">
        <img :src="fullImageUrl" alt="" draggable="false" />
        <div v-if="region && !isSquare" class="crop" :style="{ left: `${region.left}%`, top: `${region.top}%`, width: `${region.width}%`, height: `${region.height}%` }" />
        <span v-if="marker && !isSquare" class="marker" :style="{ left: `${marker.left}%`, top: `${marker.top}%` }" />
        <v-progress-circular v-if="suggesting" class="suggesting" indeterminate small />
      </div>

      <p class="type-note">
        {{ translate(isSquare ? BackendTranslationKeys.rocket_meals_module_news_focal_point_hint_square : editing ? BackendTranslationKeys.rocket_meals_module_news_focal_point_hint_editing : BackendTranslationKeys.rocket_meals_module_news_focal_point_hint_cropped) }}
      </p>

      <div v-if="!isSquare" class="actions">
        <v-button small :secondary="!editing" :disabled="disabled" @click="editing = !editing">
          <v-icon :name="editing ? 'check' : 'center_focus_strong'" small left />
          {{ translate(editing ? BackendTranslationKeys.rocket_meals_module_news_focal_point_done : BackendTranslationKeys.rocket_meals_module_news_focal_point_set) }}
        </v-button>
        <template v-if="editing">
          <v-button small secondary :disabled="disabled || suggesting" :loading="suggesting" @click="chooseAutomatically(state)">
            <v-icon name="auto_awesome" small left />
            {{ translate(BackendTranslationKeys.rocket_meals_module_news_focal_point_auto) }}
          </v-button>
          <v-button small secondary :disabled="disabled" @click="center">
            <v-icon name="filter_center_focus" small left />
            {{ translate(BackendTranslationKeys.rocket_meals_module_news_focal_point_center) }}
          </v-button>
        </template>
      </div>
      <p v-if="hasChanges" class="type-note unsaved">{{ translate(BackendTranslationKeys.rocket_meals_module_news_focal_point_unsaved) }}</p>
    </template>
  </div>
</template>

<style scoped>
.focal-point {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-inline-size: 32rem;
}

.frame {
  position: relative;
  inline-size: 100%;
  overflow: hidden;
  background: var(--theme--background-normal);
  border-radius: var(--theme--border-radius);
  touch-action: none;
  user-select: none;
}

.frame.editing {
  cursor: crosshair;
}

.frame img {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: contain;
  pointer-events: none;
}

/* Everything outside the square is dimmed: the app does not show it. */
.crop {
  position: absolute;
  box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.55);
  outline: 2px solid #fff;
  pointer-events: none;
}

.marker {
  position: absolute;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  background: var(--theme--primary);
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.suggesting {
  position: absolute;
  inset-block-start: 0.5rem;
  inset-inline-end: 0.5rem;
}

.type-note {
  margin: 0;
}

.unsaved {
  color: var(--theme--warning);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
