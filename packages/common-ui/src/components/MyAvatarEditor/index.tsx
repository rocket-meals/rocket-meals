/**
 * MyAvatarEditor — History & known pitfalls for future AI agents
 *
 * NOTE FOR INSIDERS: Every scroll-related change in this modal stack MUST be
 * documented below so that all maintainers (Insider) can follow the full history
 * of fixes and understand why each decision was made.
 *
 * ─── SCROLL FIX 1 (stickyHeaderComponent → ListHeaderComponent) ───────────────
 *   The avatar preview was previously passed as `stickyHeaderComponent` to
 *   `MyScrollViewModal`, which renders it as a sibling View *outside* the
 *   `BottomSheetScrollView`. gorhom/bottom-sheet calculates the scrollable
 *   height from the full sheet height and does NOT account for sibling views
 *   above the scroll view. The result: the scroll view believed all content
 *   was already visible and refused to scroll to the end of the category list.
 *
 *   Fix: pass the avatar preview as `ListHeaderComponent` instead, so it lives
 *   *inside* the `BottomSheetScrollView`. This gives gorhom the correct height
 *   to work with. The avatar preview scrolls with the content (it is no longer
 *   pinned at the top while scrolling), which is acceptable.
 *
 * ─── SCROLL FIX 2 (remove flex:1 from MyScrollViewModal wrapper View) ─────────
 *   Even after Fix 1, scrolling was still broken. Root cause: `MyScrollViewModal`
 *   wrapped `BottomSheetScrollView` in a `<View style={{ flex: 1 }}>`. In gorhom
 *   v5, that wrapper expanded unconstrained inside the BottomSheet content
 *   container, causing gorhom to see contentHeight == containerHeight and
 *   therefore set scrollEnabled=false — even though content was visually clipped
 *   by the 80 % snap point.
 *
 *   Fix: removed `flex: 1` from both the outer wrapper View AND the
 *   `BottomSheetScrollView`/`BottomSheetFlatList` style prop in
 *   `MyScrollViewModal`. Gorhom manages the scroll-view height via its own
 *   BottomSheetContext; explicit flex sizing overrides that and breaks scrolling.
 *
 * ─── SCROLL FIX 3 (ListHeaderComponent → stickyHeaderComponent, inside scroll) ──
 *   After Fix 1 & 2 the avatar preview scrolled with the content (no longer pinned).
 *   To restore the sticky-header UX, `MyScrollViewModal` was updated: it no longer
 *   renders `stickyHeaderComponent` as a sibling View *outside* the
 *   `BottomSheetScrollView` (which caused Fix-1's height problem).  Instead it
 *   inserts the component *inside* the `BottomSheetScrollView` at a computed index
 *   and passes that index via `stickyHeaderIndices` to the scroll view.  This way
 *   gorhom correctly accounts for the header height in the scrollable range (because
 *   the element is inside the scroll view), while React Native's native sticky-header
 *   mechanism keeps it pinned to the top as the user scrolls.
 *
 *   Fix: changed `ListHeaderComponent` → `stickyHeaderComponent` in `showAvatarEditor`.
 *
 * ─── SCROLL FIX 4 (web: render stickyHeaderComponent outside scroll view) ──────
 *   On web, passing `stickyHeaderIndices` to `BottomSheetScrollView` breaks
 *   scrolling entirely: the sticky element interferes with the web scroll-height
 *   calculation, causing the scroll container to think there is nothing to scroll.
 *   On web the CSS layout engine correctly constrains the scroll view height even
 *   when the sticky header is a sibling View *outside* the scroll view — the
 *   gorhom native height-calculation issue (Fix 1) does not apply on web.
 *
 *   Fix: `MyScrollViewModal` detects `Platform.OS === 'web'` and renders
 *   `stickyHeaderComponent` as a sibling View above `BottomSheetScrollView`
 *   instead of using `stickyHeaderIndices`.  Native behaviour is unchanged.
 *
 * ─── SCROLL FIX 5 (web: flex:1 on container + scroll view) ──────────────────
 *   After Fix 4, the sticky header was rendered outside the scroll view on web,
 *   but scrolling was still broken.  Root cause: without `flex: 1` the outer
 *   container View and the `BottomSheetScrollView` expand to their full content
 *   height inside the fixed-height BottomSheet, so the browser never creates a
 *   scroll context.  On native this is intentional (SCROLL FIX 2 — `flex: 1`
 *   would cause gorhom to disable scroll), but on web the gorhom height-
 *   calculation issue does not apply.
 *
 *   Fix: `MyScrollViewModal` applies `{ flex: 1 }` to both the outer wrapper
 *   View and the `BottomSheetScrollView`/`BottomSheetFlatList` when
 *   `Platform.OS === 'web'`.  This constrains the scroll view to the remaining
 *   height inside the sheet, restoring scroll on web for all modals.
 *
 * ─── SCROLL FIX 6 (native: reset scroll offset when modal content changes) ───
 *   Symptom: after picking a value in a category sub-modal (e.g. a hairstyle)
 *   and returning to the editor, the sticky avatar header was not rendered
 *   until the user scrolled slightly.
 *   Root cause: the modal stack renders only the top-most item inside ONE
 *   BaseBottomSheet, and every stack item is a MyScrollViewModal at the same
 *   tree position — React therefore reuses the SAME component instance (and
 *   the same native scroll view including its content offset) and only swaps
 *   the children. The sticky header element inside the content, however, IS
 *   remounted, and RN's ScrollViewStickyHeader positions itself from scroll
 *   events only — until the first scroll event it assumes offset 0, so with
 *   the carried-over offset it is translated off-screen.
 *   Fix: `MyScrollViewModal` scrolls back to the top (native only) whenever
 *   its children change, keeping native offset and sticky-header state
 *   consistent. Side effect (intended): each modal content starts at the top
 *   instead of inheriting the previous content's offset. A mount effect can
 *   NOT work here because the component never remounts between contents.
 *
 * ─── NESTED SCROLLVIEW (do NOT add) ──────────────────────────────────────────
 *   Do NOT add another ScrollView / FlatList inside AvatarEditorModalContent.
 *   All scrolling must be handled by MyScrollViewModal's BottomSheetScrollView
 *   to avoid gesture conflicts with gorhom/bottom-sheet. Sub-modals
 *   (StylePickerModalContent, ComponentPickerModalContent, ColorPickerModalContent)
 *   are opened via a separate useMyScrollViewModal instance and each get their
 *   own BottomSheetScrollView — that is fine.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { GLView } from 'expo-gl';
import { Asset } from 'expo-asset';
import MyAvatar, { AvatarStyle, AvatarSize, STYLE_MAP, AvatarConfig, AvatarAppearanceProps, getStyleProbabilityKeys } from '../MyAvatar';
import { Style } from '@dicebear/core';
import { useMyScrollViewModal } from '../GlobalModal/useMyScrollViewModal';
import SettingsListGroupTitle from '../SettingsListGroupTitle';
import SettingsList from '../SettingsList';
import SettingsListLeftRight, { type SettingsListLeftRightItem } from '../SettingsListLeftRight/SettingsListLeftRight';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CommonUiComponentIds } from '../../constants/ComponentIds';
import { HAIR_COLORS, MICAH_HAIR_COLORS, SKIN_COLORS, PRESET_COLORS } from '../MyColorPicker';
import MyCustomColorPicker from '../MyCustomColorPicker';
import { myContrastColor } from '../../helpers/ColorHelper';
import { useTheme } from '../../context/ThemeContext';
import SettingsListSelectOptionSingle from '../SettingsListSelectOptionSingle/SettingsListSelectOptionSingle';
import SettingsListNumberInput from '../SettingsListNumberInput/SettingsListNumberInput';
import SettingsListBoolean from '../SettingsListBoolean/SettingsListBoolean';

export type { AvatarConfig } from '../MyAvatar';

/**
 * Namespaced avatar property key enums, organised by avatar style.
 * Use enum values together with `hiddenProps` in `UseAvatarEditorModalOptions`
 * to hide a prop from the editor UI and always inject it with a fixed value.
 *
 * @example
 * ```ts
 * hiddenProps: { [AvatarPropKey.OpenPeeps.SCALE]: '100' }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AvatarPropKey {
	export enum OpenPeeps {
		SCALE = 'scale',
		TRANSLATE_X = 'translateX',
		TRANSLATE_Y = 'translateY',
		ROTATE = 'rotate',
		FLIP = 'flip',
		CLIP = 'clip',
	}
	export enum Micah {
		EYES_COLOR = 'eyesColor',
		EYE_SHADOW_COLOR = 'eyeShadowColor',
		GLASSES_COLOR = 'glassesColor',
	}
}

type ConfigListener = (config: AvatarConfig) => void;

class ConfigObservable {
	private readonly listeners: Set<ConfigListener> = new Set();
	private current: AvatarConfig;
	private randomizeFn: (() => void) | null = null;

	constructor(initial: AvatarConfig) {
		this.current = initial;
	}

	subscribe(listener: ConfigListener) {
		this.listeners.add(listener);
		return () => { this.listeners.delete(listener); };
	}

	get() { return this.current; }

	set(config: AvatarConfig) {
		this.current = config;
		this.listeners.forEach(l => l(config));
	}

	setRandomizeFn(fn: () => void) {
		this.randomizeFn = fn;
	}

	randomize() {
		this.randomizeFn?.();
	}
}

type Mode = 'quickstart' | 'editor';

class ModeObservable {
	private mode: Mode;
	private readonly listeners: Set<(mode: Mode) => void> = new Set();

	constructor(initial: Mode) {
		this.mode = initial;
	}

	subscribe(listener: (mode: Mode) => void) {
		this.listeners.add(listener);
		return () => { this.listeners.delete(listener); };
	}

	get() { return this.mode; }

	set(mode: Mode) {
		this.mode = mode;
		this.listeners.forEach(l => l(mode));
	}
}

const DEFAULT_AVATAR_STYLE = AvatarStyle.AVATAAARS;

let _defaultAvatarConfig: AvatarConfig | null = null;
function getDefaultAvatarConfig(): AvatarConfig {
	if (!_defaultAvatarConfig) {
		_defaultAvatarConfig = {
			style: DEFAULT_AVATAR_STYLE,
			size: AvatarSize.LARGE,
			options: getDefaultOptionsForStyle(DEFAULT_AVATAR_STYLE),
		};
	}
	return _defaultAvatarConfig;
}

/** Built-in category keys (always available regardless of style). */
const BUILTIN_CATEGORY_STYLE = 'Style';

/**
 * Maps avatar attribute category keys to human-readable English labels.
 * Used as a fallback when no translate function is provided.
 */
const CATEGORY_LABEL_MAP: Record<string, string> = {
	[BUILTIN_CATEGORY_STYLE]: 'Style',
	skinColor: 'Skin Color',
	baseColor: 'Base Color',
	hair: 'Hair',
	hairColor: 'Hair Color',
	frontHair: 'Front Hair',
	rearHair: 'Rear Hair',
	sideburn: 'Sideburn',
	face: 'Face',
	head: 'Head',
	eyebrows: 'Eyebrows',
	eyebrowsColor: 'Eyebrow Color',
	brows: 'Brows',
	eyes: 'Eyes',
	eyesColor: 'Eye Color',
	eyeShadowColor: 'Eye Shadow',
	nose: 'Nose',
	noseColor: 'Nose Color',
	mouth: 'Mouth',
	mouthColor: 'Mouth Color',
	lips: 'Lips',
	beard: 'Beard',
	facialHair: 'Facial Hair',
	facialHairColor: 'Facial Hair Color',
	mustache: 'Mustache',
	ear: 'Ear',
	ears: 'Ears',
	earrings: 'Earrings',
	earringsColor: 'Earring Color',
	earringColor: 'Earring Color',
	glasses: 'Glasses',
	glassesColor: 'Glasses Color',
	accessories: 'Accessories',
	accessoriesColor: 'Accessory Color',
	features: 'Features',
	hairAccessoriesColor: 'Hair Accessory Color',
	frecklesColor: 'Freckles',
	cheek: 'Cheeks',
	clothing: 'Clothing',
	clothesColor: 'Clothes Color',
	clothingColor: 'Clothing Color',
	clothingGraphic: 'Clothing Graphic',
	clothes: 'Clothes',
	body: 'Body',
	bodyColor: 'Body Color',
	bodyIcon: 'Body Icon',
	shirt: 'Shirt',
	shirtColor: 'Shirt Color',
	top: 'Top',
	topColor: 'Top Color',
	hat: 'Hat',
	hatColor: 'Hat Color',
	hairAccessories: 'Hair Accessories',
	mask: 'Mask',
	headContrastColor: 'Head Contrast',
	sides: 'Sides',
	texture: 'Texture',
	shapeColor: 'Shape Color',
	backgroundColor: 'Background Color',
	gesture: 'Gesture',
	mood: 'Mood',
	style: 'Style',
};

/**
 * Returns a translated label for a category key.
 * Uses the translate function if provided, otherwise falls back to CATEGORY_LABEL_MAP or raw key.
 */
const getCategoryLabel = (key: string, translate?: (k: string) => string): string => {
	if (translate) return translate(`avatar_cat_${key}`);
	return CATEGORY_LABEL_MAP[key] ?? key;
};

/**
 * Maps avatar attribute category keys to MaterialCommunityIcons icon names.
 * Used to display a recognisable icon on the left side of each settings-list row.
 */
const CATEGORY_ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
	// Built-in
	[BUILTIN_CATEGORY_STYLE]: 'palette-swatch-variant',
	// Skin / base
	skinColor: 'hand-back-right',
	baseColor: 'circle',
	// Hair
	hair: 'face-woman-shimmer',
	hairColor: 'palette',
	frontHair: 'face-woman-shimmer',
	rearHair: 'hair-dryer',
	sideburn: 'face-man-profile',
	// Face
	face: 'emoticon-outline',
	head: 'head',
	// Eyebrows
	eyebrows: 'emoticon-angry-outline',
	eyebrowsColor: 'palette',
	brows: 'emoticon-angry-outline',
	// Eyes
	eyes: 'eye',
	eyesColor: 'eye',
	eyeShadowColor: 'eye-circle',
	// Nose
	nose: 'triangle-outline',
	noseColor: 'triangle-outline',
	// Mouth / lips
	mouth: 'emoticon-kiss-outline',
	mouthColor: 'emoticon-kiss-outline',
	lips: 'emoticon-kiss-outline',
	// Beard / facial hair
	beard: 'face-man',
	facialHair: 'face-man',
	facialHairColor: 'face-man',
	mustache: 'mustache',
	// Ears / earrings
	ear: 'ear-hearing',
	ears: 'ear-hearing',
	earrings: 'diamond-stone',
	earringsColor: 'diamond-stone',
	earringColor: 'diamond-stone',
	// Glasses
	glasses: 'glasses',
	glassesColor: 'glasses',
	// Accessories / features
	accessories: 'necklace',
	accessoriesColor: 'necklace',
	features: 'star-outline',
	hairAccessoriesColor: 'bow-tie',
	frecklesColor: 'dots-circle',
	cheek: 'emoticon-happy-outline',
	// Clothing / body
	clothing: 'tshirt-crew',
	clothesColor: 'tshirt-crew',
	clothingColor: 'tshirt-crew',
	clothingGraphic: 'image-outline',
	clothes: 'tshirt-crew',
	body: 'human',
	bodyColor: 'human',
	bodyIcon: 'image-outline',
	shirt: 'tshirt-crew',
	shirtColor: 'tshirt-crew',
	// Hat / top
	top: 'hat-fedora',
	topColor: 'hat-fedora',
	hat: 'hat-fedora',
	hatColor: 'hat-fedora',
	hairAccessories: 'bow-tie',
	// Misc
	mask: 'face-mask',
	headContrastColor: 'contrast-circle',
	sides: 'robot',
	texture: 'texture',
	shapeColor: 'shape',
	backgroundColor: 'format-color-fill',
	gesture: 'hand-wave',
	mood: 'emoticon-outline',
	style: 'cog-outline',
};

/**
 * Per-style attribute order for a character-creation-style flow.
 * Each style defines its own logical order: skin/base first, then facial
 * features (each component paired with its matching color), then clothing
 * and accessories.
 * Keys not listed here are appended after the known keys in their original order.
 */
const ATTRIBUTE_ORDER_BY_STYLE: Partial<Record<AvatarStyle, string[]>> = {
	[AvatarStyle.ADVENTURER]: [
		'skinColor', 'hair', 'hairColor', 'eyebrows', 'eyes', 'mouth', 'features', 'earrings', 'glasses',
	],
	[AvatarStyle.ADVENTURER_NEUTRAL]: [
		'eyebrows', 'eyes', 'mouth', 'glasses', 'backgroundColor',
	],
	[AvatarStyle.AVATAAARS]: [
		'skinColor', 'hair', 'hairColor', 'eyebrows', 'eyes', 'mouth', 'nose', 'facialHair', 'facialHairColor',
		'clothing', 'clothesColor', 'clothingGraphic', 'top', 'hatColor', 'accessories', 'accessoriesColor',
		'style', 'backgroundColor',
	],
	[AvatarStyle.AVATAAARS_NEUTRAL]: [
		'eyebrows', 'eyes', 'mouth', 'backgroundColor',
	],
	[AvatarStyle.BIG_EARS]: [
		'skinColor', 'face', 'hair', 'hairColor', 'frontHair', 'ear', 'sideburn', 'cheek',
		'eyes', 'mouth', 'nose',
	],
	[AvatarStyle.BIG_EARS_NEUTRAL]: [
		'cheek', 'eyes', 'mouth', 'nose', 'backgroundColor',
	],
	[AvatarStyle.BIG_SMILE]: [
		'skinColor', 'hair', 'hairColor', 'eyes', 'mouth', 'accessories',
	],
	[AvatarStyle.BOTTTS]: [
		'baseColor', 'face', 'eyes', 'mouth', 'sides', 'texture', 'top',
	],
	[AvatarStyle.BOTTTS_NEUTRAL]: [
		'eyes', 'mouth', 'backgroundColor',
	],
	[AvatarStyle.CROODLES]: [
		'baseColor', 'face', 'eyes', 'mouth', 'nose', 'beard', 'mustache', 'top', 'topColor',
	],
	[AvatarStyle.CROODLES_NEUTRAL]: [
		'eyes', 'mouth', 'nose',
	],
	[AvatarStyle.DYLAN]: [
		'skinColor', 'hair', 'hairColor', 'mood', 'facialHair', 'backgroundColor',
	],
	[AvatarStyle.FUN_EMOJI]: [
		'eyes', 'mouth', 'backgroundColor',
	],
	[AvatarStyle.LORELEI]: [
		'skinColor', 'head', 'hair', 'hairColor', 'eyebrows', 'eyebrowsColor', 'eyes', 'eyesColor',
		'mouth', 'mouthColor', 'nose', 'noseColor', 'frecklesColor', 'beard',
		'earrings', 'earringsColor', 'glasses', 'glassesColor', 'hairAccessoriesColor',
	],
	[AvatarStyle.LORELEI_NEUTRAL]: [
		'eyebrows', 'eyebrowsColor', 'eyes', 'eyesColor', 'mouth', 'mouthColor',
		'nose', 'noseColor', 'frecklesColor', 'glasses', 'glassesColor', 'backgroundColor',
	],
	[AvatarStyle.MICAH]: [
		'baseColor', 'hair', 'hairColor', 'eyebrows', 'eyebrowsColor', 'eyes', 'eyesColor',
		'eyeShadowColor', 'mouth', 'mouthColor', 'nose', 'ears', 'facialHair', 'facialHairColor',
		'earrings', 'earringColor', 'glasses', 'glassesColor', 'shirt', 'shirtColor',
	],
	[AvatarStyle.MINIAVS]: [
		'skinColor', 'head', 'hair', 'hairColor', 'eyes', 'mouth', 'mustache',
		'body', 'bodyColor',
	],
	[AvatarStyle.NOTIONISTS]: [
		'beard', 'hair', 'brows', 'eyes', 'lips', 'nose', 'glasses',
		'body', 'bodyIcon', 'gesture',
	],
	[AvatarStyle.NOTIONISTS_NEUTRAL]: [
		'brows', 'eyes', 'lips', 'nose', 'glasses', 'backgroundColor',
	],
	[AvatarStyle.OPEN_PEEPS]: [
		'skinColor', 'head', 'headContrastColor', 'face', 'facialHair',
		'accessories', 'mask', 'clothingColor',
	],
	[AvatarStyle.PERSONAS]: [
		'skinColor', 'hair', 'hairColor', 'eyes', 'mouth', 'nose',
		'facialHair', 'body', 'clothingColor',
	],
	[AvatarStyle.PIXEL_ART]: [
		'skinColor', 'hair', 'hairColor', 'eyesColor', 'eyes', 'mouth', 'mouthColor',
		'beard', 'glasses', 'glassesColor', 'hat', 'hatColor',
		'clothing', 'clothingColor', 'accessories', 'accessoriesColor',
	],
	[AvatarStyle.PIXEL_ART_NEUTRAL]: [
		'eyes', 'eyesColor', 'mouth', 'mouthColor', 'glasses', 'glassesColor', 'backgroundColor',
	],
	[AvatarStyle.THUMBS]: [
		'face', 'eyes', 'eyesColor', 'mouth', 'mouthColor', 'shapeColor', 'backgroundColor',
	],
	[AvatarStyle.TOON_HEAD]: [
		'skinColor', 'head', 'hair', 'hairColor', 'rearHair', 'eyebrows', 'eyes', 'mouth',
		'beard', 'clothes', 'clothesColor',
	],
};

/** Sentinel value used to represent the "none" / disabled option for optional components. */
const NONE_OPTION = '__none__';

/**
 * Per-style numeric property defaults that are not surfaced as enum options
 * in the DiceBear schema but still need to be included in generated configs.
 * Values are stored as single-element string arrays to match the options format.
 */
const STYLE_NUMERIC_DEFAULTS: Partial<Record<AvatarStyle, Partial<Record<string, string>>>> = {
	[AvatarStyle.OPEN_PEEPS]: {
		[AvatarPropKey.OpenPeeps.SCALE]: '100',
	},
};

/**
 * Returns a default set of component options for the given avatar style.
 * For each component attribute, the value "default" is used when it exists
 * in the allowed enum values, otherwise the first available value is used.
 * For color attributes, the schema default is used if available, otherwise
 * the first preset color for that category is used.
 */
function getDefaultOptionsForStyle(style: AvatarStyle): Record<string, string[]> {
	const componentOptions = getStyleComponentOptions(style);
	const defaults: Record<string, string[]> = {};
	for (const [key, values] of Object.entries(componentOptions)) {
		const realValues = values.filter((v) => v !== NONE_OPTION);
		if (realValues.includes('default')) {
			defaults[key] = ['default'];
		} else if (realValues.length > 0) {
			defaults[key] = [realValues[0]];
		}
		// Probability is not stored – the renderer derives it from key presence at render time.
	}
	const colorKeys = getStyleColorKeys(style);
	for (const key of colorKeys) {
		const schemaDefaults = getSchemaDefaultColors(style, key);
		if (schemaDefaults.length > 0) {
			defaults[key] = [stripHashPrefix(schemaDefaults[0])];
		} else {
			const presetColors = getPresetColorsForKey(key, style);
			if (presetColors.length > 0) {
				defaults[key] = [stripHashPrefix(presetColors[0])];
			}
		}
	}
	// Apply per-style numeric defaults (e.g. scale=100 for openPeeps)
	const numericDefaults = STYLE_NUMERIC_DEFAULTS[style];
	if (numericDefaults) {
		for (const [key, value] of Object.entries(numericDefaults)) {
			if (value !== undefined) {
				defaults[key] = [value];
			}
		}
	}
	return defaults;
}

/**
 * Sorts avatar attribute keys (component + color) in a logical character-creation
 * order based on the current avatar style. Keys with a known position come first
 * (in that order), followed by any remaining keys in their original relative order.
 */
function sortAttributeKeys(keys: string[], style: AvatarStyle): string[] {
	const order = ATTRIBUTE_ORDER_BY_STYLE[style];
	if (!order) return keys;
	const knownSet = new Set(order);
	const knownKeys = order.filter((k) => keys.includes(k));
	const unknownKeys = keys.filter((k) => !knownSet.has(k));
	return [...knownKeys, ...unknownKeys];
}

/**
 * Returns the available component options (e.g. eyes, mouth, hair) for a given
 * DiceBear avatar style. Each key maps to its allowed enum values.
 * For components that have an associated probability property, a "none" option
 * is prepended so the user can disable the component.
 */
function getStyleComponentOptions(style: AvatarStyle): Record<string, string[]> {
	const dicebearStyle = STYLE_MAP[style] as Style<object> & { schema?: { properties?: Record<string, any> } };
	const properties = dicebearStyle?.schema?.properties;
	if (!properties) return {};

	const probabilityKeys = getStyleProbabilityKeys(style);
	const result: Record<string, string[]> = {};
	for (const [key, value] of Object.entries(properties)) {
		if (key.endsWith('Color') || key.includes('Probability')) continue;
		const items = (value as any)?.items;
		if (items?.enum && Array.isArray(items.enum) && items.enum.length > 1) {
			const options = items.enum as string[];
			if (probabilityKeys[key]) {
				result[key] = [NONE_OPTION, ...options];
			} else {
				result[key] = options;
			}
		}
	}
	return result;
}

/**
 * Returns the color property keys (e.g. hairColor, skinColor) for a given
 * DiceBear avatar style.
 */
function getStyleColorKeys(style: AvatarStyle): string[] {
	const dicebearStyle = STYLE_MAP[style] as Style<object> & { schema?: { properties?: Record<string, any> } };
	const properties = dicebearStyle?.schema?.properties;
	if (!properties) return [];
	return Object.keys(properties).filter((key) => key.endsWith('Color'));
}

/**
 * Returns the default hex color values (without '#') for a given color property key
 * from the DiceBear avatar style schema.
 */
function getSchemaDefaultColors(style: AvatarStyle, key: string): string[] {
	const dicebearStyle = STYLE_MAP[style] as Style<object> & { schema?: { properties?: Record<string, any> } };
	const prop = dicebearStyle?.schema?.properties?.[key];
	if (prop?.default && Array.isArray(prop.default)) {
		return prop.default as string[];
	}
	return [];
}

/**
 * Returns the predefined color palette appropriate for a given color property key.
 * Optionally pass the current avatar style for style-specific palettes.
 */
function getPresetColorsForKey(key: string, style?: AvatarStyle): string[] {
	if (style === AvatarStyle.MICAH) {
		if (key === 'hairColor' || key === 'eyebrowsColor' || key === 'facialHairColor') {
			return MICAH_HAIR_COLORS;
		}
	}
	const lower = key.toLowerCase();
	if (lower.includes('skin') || lower === 'basecolor') return SKIN_COLORS;
	if (lower.includes('hair')) return HAIR_COLORS;
	return PRESET_COLORS;
}

/** Strips the leading '#' from a hex color string if present. */
function stripHashPrefix(color: string): string {
	return color.startsWith('#') ? color.slice(1) : color;
}

/** Size used for avatar previews inside selection modals. */
const PREVIEW_AVATAR_SIZE = 100;

/**
 * Avatar preview appearance, forwarded unchanged from the top-level editor/MyAvatar caller
 * down through nearly every sub-component in this file (sticky header, pickers, presets, ...).
 */
type AvatarPreviewAppearanceProps = AvatarAppearanceProps & {
	accentColor?: string;
};

/**
 * Editor-wide behaviour/config, forwarded unchanged from the top-level editor options down into
 * the content components that need it.
 */
type AvatarEditorBehaviorProps = {
	debugMode?: boolean;
	/**
	 * Props that are always injected into the avatar config with a fixed value
	 * and are hidden from the editor UI. Use values from the `AvatarPropKey` namespace.
	 */
	hiddenProps?: Record<string, string>;
	/** Translation function for localising section headers, buttons, and category labels. */
	translate?: (key: string) => string;
	/**
	 * Experimental: shows a "Create from Photo" action (avataaars style only) that lets the
	 * user pick a photo and derives a matching skinColor/hairColor from it. Off by default -
	 * opt in per caller. All analysis happens on-device (see `analyzePhotoForAvataaars`
	 * below); the photo is never uploaded anywhere.
	 */
	enablePhotoImport?: boolean;
};

/**
 * Converts a (optionally '#'-prefixed) hex color string to an RGB triple.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const clean = stripHashPrefix(hex);
	return {
		r: parseInt(clean.substring(0, 2), 16),
		g: parseInt(clean.substring(2, 4), 16),
		b: parseInt(clean.substring(4, 6), 16),
	};
}

/**
 * Finds the closest color in `palette` to `rgb` by squared Euclidean distance in RGB space.
 * Returns the match without a leading '#', ready to store in an avatar config option.
 */
function nearestPaletteColor(rgb: { r: number; g: number; b: number }, palette: string[]): string {
	let closest = palette[0];
	let closestDistance = Infinity;
	for (const color of palette) {
		const candidate = hexToRgb(color);
		const distance =
			(candidate.r - rgb.r) ** 2 + (candidate.g - rgb.g) ** 2 + (candidate.b - rgb.b) ** 2;
		if (distance < closestDistance) {
			closestDistance = distance;
			closest = color;
		}
	}
	return stripHashPrefix(closest);
}

/**
 * Averages the R/G/B channels of a flat RGBA pixel buffer (as returned by canvas
 * `getImageData` or GL `readPixels`) within `[x0, x1) x [y0, y1)`, where row 0 is the TOP
 * of the image (canvas convention - the GL path flips its buffer to match before calling
 * this, see `flipPixelRowsVertically`).
 */
function averageRegion(
	pixels: Uint8Array | Uint8ClampedArray,
	bufferWidth: number,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
): { r: number; g: number; b: number } | null {
	let r = 0, g = 0, b = 0, count = 0;
	for (let y = Math.floor(y0); y < y1; y++) {
		for (let x = Math.floor(x0); x < x1; x++) {
			const i = (y * bufferWidth + x) * 4;
			r += pixels[i];
			g += pixels[i + 1];
			b += pixels[i + 2];
			count++;
		}
	}
	return count > 0 ? { r: r / count, g: g / count, b: b / count } : null;
}

/**
 * Derives a skinColor/hairColor pair from a square RGBA pixel buffer (top-left origin) by
 * averaging two regions - a top-center strip for hair, a center box for skin/face - and
 * snapping each average color to the nearest swatch in the app's existing avataaars
 * palettes. This is a lightweight heuristic (no ML model, no face detection).
 */
function analyzeRgbaPixels(
	pixels: Uint8Array | Uint8ClampedArray,
	size: number,
): { skinColor: string; hairColor: string } | null {
	const hairRegion = averageRegion(pixels, size, size * 0.3, size * 0.02, size * 0.7, size * 0.18);
	const skinRegion = averageRegion(pixels, size, size * 0.35, size * 0.4, size * 0.65, size * 0.6);
	if (!hairRegion || !skinRegion) return null;

	return {
		skinColor: nearestPaletteColor(skinRegion, SKIN_COLORS),
		hairColor: nearestPaletteColor(hairRegion, HAIR_COLORS),
	};
}

/**
 * EXPERIMENTAL - derives a skinColor/hairColor pair from a user photo picked via
 * `expo-image-picker`. All analysis (pixel decode + averaging) happens entirely on-device:
 * on web via an off-screen `<canvas>`, on native (iOS/Android) via a headless `expo-gl`
 * context. The photo itself is never uploaded or sent over the network - see
 * `analyzePhotoWeb`/`analyzePhotoNative` below for the platform-specific pixel readback.
 */
async function analyzePhotoForAvataaars(uri: string): Promise<{ skinColor: string; hairColor: string } | null> {
	return Platform.OS === 'web' ? analyzePhotoWeb(uri) : analyzePhotoNative(uri);
}

/** Web: draws the picked photo into an off-screen `<canvas>` and reads its pixels back. */
async function analyzePhotoWeb(uri: string): Promise<{ skinColor: string; hairColor: string } | null> {
	if (typeof document === 'undefined') return null;

	const image: HTMLImageElement = await new Promise((resolve, reject) => {
		const img = new (window as any).Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('Failed to load image'));
		img.src = uri;
	});

	const size = 100;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) return null;
	ctx.drawImage(image, 0, 0, size, size);

	const { data } = ctx.getImageData(0, 0, size, size);
	return analyzeRgbaPixels(data, size);
}

/** Number of pixels per side of the offscreen GL render target used for native photo analysis. */
const NATIVE_ANALYSIS_SIZE = 48;

const PASSTHROUGH_VERTEX_SHADER = `
	attribute vec2 aPosition;
	varying vec2 vUV;
	void main() {
		vUV = (aPosition + 1.0) * 0.5;
		gl_Position = vec4(aPosition, 0.0, 1.0);
	}
`;

const PASSTHROUGH_FRAGMENT_SHADER = `
	precision mediump float;
	varying vec2 vUV;
	uniform sampler2D uTexture;
	void main() {
		gl_FragColor = texture2D(uTexture, vUV);
	}
`;

function compileShader(gl: any, type: number, source: string) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	return shader;
}

/**
 * Reverses row order in-place semantics (returns a new buffer) so that row 0 becomes the
 * TOP of the rendered image. Needed because `gl.readPixels` always returns row 0 as the
 * BOTTOM of the framebuffer (OpenGL's window-coordinate origin is bottom-left), whereas
 * `analyzeRgbaPixels`'s region math assumes row 0 = top (matching canvas `getImageData`).
 */
function flipPixelRowsVertically(pixels: Uint8Array, width: number, height: number): Uint8Array {
	const rowBytes = width * 4;
	const flipped = new Uint8Array(pixels.length);
	for (let y = 0; y < height; y++) {
		const srcStart = y * rowBytes;
		const dstStart = (height - 1 - y) * rowBytes;
		flipped.set(pixels.subarray(srcStart, srcStart + rowBytes), dstStart);
	}
	return flipped;
}

/**
 * Native (iOS/Android): renders the picked photo into a small offscreen `expo-gl`
 * framebuffer (headless context, no visible GLView needed) and reads its pixels back via
 * `gl.readPixels`. Everything happens in-process on the device's GPU - no upload, no
 * network request, no ML model.
 */
async function analyzePhotoNative(uri: string): Promise<{ skinColor: string; hairColor: string } | null> {
	const gl: any = await GLView.createContextAsync();
	if (!gl) return null;

	try {
		const asset = Asset.fromURI(uri);
		await asset.downloadAsync();

		const sourceTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		// expo-gl patches texImage2D on native to also accept an (asset-like) object with a
		// `localUri`/`uri` property, decoding the file directly - not part of the WebGL type
		// definitions, hence the cast.
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset as any);

		const targetTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, targetTexture);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, NATIVE_ANALYSIS_SIZE, NATIVE_ANALYSIS_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null,
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		const framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);
		gl.viewport(0, 0, NATIVE_ANALYSIS_SIZE, NATIVE_ANALYSIS_SIZE);

		const program = gl.createProgram();
		gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, PASSTHROUGH_VERTEX_SHADER));
		gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, PASSTHROUGH_FRAGMENT_SHADER));
		gl.linkProgram(program);
		gl.useProgram(program);

		const quadBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		const positionLoc = gl.getAttribLocation(program, 'aPosition');
		gl.enableVertexAttribArray(positionLoc);
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
		gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);

		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		const pixels = new Uint8Array(NATIVE_ANALYSIS_SIZE * NATIVE_ANALYSIS_SIZE * 4);
		gl.readPixels(0, 0, NATIVE_ANALYSIS_SIZE, NATIVE_ANALYSIS_SIZE, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

		const topDownPixels = flipPixelRowsVertically(pixels, NATIVE_ANALYSIS_SIZE, NATIVE_ANALYSIS_SIZE);
		return analyzeRgbaPixels(topDownPixels, NATIVE_ANALYSIS_SIZE);
	} finally {
		await GLView.destroyContextAsync(gl);
	}
}

type AvatarEditorModalContentProps = AvatarPreviewAppearanceProps &
	AvatarEditorBehaviorProps & {
		initialConfig: AvatarConfig;
		configObservable: ConfigObservable;
		configRef: React.MutableRefObject<AvatarConfig>;
		/** Allowed avatar styles. If only one is provided, the style selector is hidden. */
		allowedStyles?: AvatarStyle[];
		/** Show an "Apply" button at the top to accept changes and close. */
		showApplyButton?: boolean;
		/** Called when the user presses "Apply". */
		onApply?: () => void;
		/** Called whenever the user makes any change in the editor. Used to track dirty state. */
		onChange?: () => void;
		/** Called when the user presses "Reset changes". After resetting, config is restored to initialConfig. */
		onReset?: () => void;
		/** Called when the user presses "Delete". */
		onDelete?: () => void;
	};

type AvatarStickyHeaderProps = AvatarPreviewAppearanceProps & {
	configObservable: ConfigObservable;
};

const AvatarStickyHeader: React.FC<AvatarStickyHeaderProps> = ({ configObservable, accentColor, rounded, backgroundColor }) => {
	const [config, setConfig] = useState<AvatarConfig>(configObservable.get());
	const { theme, isDark } = useTheme();

	useEffect(() => {
		return configObservable.subscribe(setConfig);
	}, [configObservable]);

	const diceButtonBg = accentColor ?? theme.screen.text;
	const diceIconColor = myContrastColor(diceButtonBg, theme, isDark);

	return (
		<View style={[styles.avatarContainer, { backgroundColor: theme.screen.background }]}>
			<MyAvatar
				config={{ ...config, size: AvatarSize.XLARGE }}
				borderRadius={AvatarSize.XLARGE / 2}
				rounded={rounded}
				backgroundColor={backgroundColor}
			/>
			<TouchableOpacity
				style={[styles.diceButton, { backgroundColor: diceButtonBg }]}
				onPress={() => configObservable.randomize()}
			>
				<MaterialCommunityIcons name="dice-multiple" size={24} color={diceIconColor} />
			</TouchableOpacity>
		</View>
	);
};

type AvatarStickyHeaderConditionalProps = AvatarPreviewAppearanceProps & {
	modeObservable: ModeObservable;
	configObservable: ConfigObservable;
};

const AvatarStickyHeaderConditional: React.FC<AvatarStickyHeaderConditionalProps> = ({
	modeObservable,
	configObservable,
	accentColor,
	rounded,
	backgroundColor,
}) => {
	const [mode, setMode] = useState<Mode>(modeObservable.get());

	useEffect(() => {
		return modeObservable.subscribe(setMode);
	}, [modeObservable]);

	if (mode === 'quickstart') return null;

	return <AvatarStickyHeader configObservable={configObservable} accentColor={accentColor} rounded={rounded} backgroundColor={backgroundColor} />;
};

type ColorPickerModalContentProps = AvatarPreviewAppearanceProps &
	Pick<AvatarEditorBehaviorProps, 'debugMode' | 'translate'> & {
		colors: string[];
		initialSelectedColor: string | null;
		onSelectAndClose: (color: string) => void;
		config: AvatarConfig;
		colorKey: string;
	};

const ColorPickerModalContent: React.FC<ColorPickerModalContentProps> = ({
	colors,
	initialSelectedColor,
	onSelectAndClose,
	accentColor,
	config,
	colorKey,
	rounded,
	backgroundColor,
	debugMode,
	translate,
}) => {
	const { theme, isDark } = useTheme();
	// Custom color chosen via the free color picker (hex input / hue slider / SV surface).
	const [customColor, setCustomColor] = useState<string | null>(initialSelectedColor);
	const customPreviewOptions = customColor
		? { ...(config.options ?? {}), [colorKey]: [stripHashPrefix(customColor)] }
		: config.options;
	const isCustomSelected =
		!!customColor && initialSelectedColor?.toLowerCase() === customColor.toLowerCase();
	return (
		<>
			<SettingsListGroupTitle title={translate ? translate('avatar_section_custom_color') : 'Custom Color'} />
			<MyCustomColorPicker
				color={customColor ?? undefined}
				onColorChange={setCustomColor}
			/>
			{customColor && (
				<SettingsListSelectOptionSingle
					label={translate ? translate('avatar_use_custom_color') : 'Use this color'}
					leftIcon={
						<View style={styles.previewAvatarWrapper}>
							<MyAvatar
								style={config.style}
								size={PREVIEW_AVATAR_SIZE}
								borderRadius={PREVIEW_AVATAR_SIZE / 2}
								rounded={rounded}
								backgroundColor={backgroundColor}
								options={customPreviewOptions}
							/>
						</View>
					}
					noIconIndent
					selectionColor={accentColor}
					isSelected={isCustomSelected}
					groupPosition="single"
					showSeparator={false}
					onPress={() => onSelectAndClose(customColor)}
					extraRightContent={
						<View
							style={[
								styles.colorSwatchLarge,
								{ backgroundColor: customColor, borderColor: myContrastColor(customColor, theme, isDark) },
							]}
						/>
					}
				/>
			)}
			<SettingsListGroupTitle title={translate ? translate('avatar_section_preset_colors') : 'Presets'} />
			{colors.map((color, index) => {
				const groupPosition =
					colors.length === 1
						? 'single'
						: index === 0
							? 'top'
							: index === colors.length - 1
								? 'bottom'
								: 'middle';
				const previewOptions = { ...(config.options ?? {}), [colorKey]: [stripHashPrefix(color)] };
				const borderColor = myContrastColor(color, theme, isDark);
				const colorCircle = (
					<View
						style={[
							styles.colorSwatchLarge,
							{ backgroundColor: color, borderColor },
						]}
					/>
				);
				const extraRightContent = debugMode ? (
					<View style={styles.colorSwatchRow}>
						{colorCircle}
						<Text style={[styles.hexLabel, { color: theme.screen.text }]}>{color}</Text>
					</View>
				) : colorCircle;
				return (
					<SettingsListSelectOptionSingle
						key={color}
						label=""
						leftIcon={
							<View style={styles.previewAvatarWrapper}>
								<MyAvatar
									style={config.style}
									size={PREVIEW_AVATAR_SIZE}
									borderRadius={PREVIEW_AVATAR_SIZE / 2}
									rounded={rounded}
									backgroundColor={backgroundColor}
									options={previewOptions}
								/>
							</View>
						}
						noIconIndent
						selectionColor={accentColor}
						isSelected={initialSelectedColor?.toLowerCase() === color.toLowerCase()}
						groupPosition={groupPosition}
						showSeparator={index !== colors.length - 1}
						onPress={() => onSelectAndClose(color)}
						extraRightContent={extraRightContent}
					/>
				);
			})}
		</>
	);
};

type StylePickerModalContentProps = AvatarPreviewAppearanceProps & {
	currentStyle: AvatarStyle;
	onSelectAndClose: (style: AvatarStyle) => void;
	allowedStyles?: AvatarStyle[];
};

const StylePickerModalContent: React.FC<StylePickerModalContentProps> = ({
	currentStyle,
	onSelectAndClose,
	accentColor,
	allowedStyles,
	rounded,
	backgroundColor,
}) => {
	const allStyles = allowedStyles ?? Object.values(AvatarStyle);
	return (
		<>
			{allStyles.map((style, index) => {
				const groupPosition =
					allStyles.length === 1
						? 'single'
						: index === 0
							? 'top'
							: index === allStyles.length - 1
								? 'bottom'
								: 'middle';
				return (
					<SettingsListSelectOptionSingle
						key={style}
						label={style}
						leftIcon={
							<View style={styles.previewAvatarWrapper}>
								<MyAvatar
									style={style}
									size={PREVIEW_AVATAR_SIZE}
									borderRadius={PREVIEW_AVATAR_SIZE / 2}
									rounded={rounded}
									backgroundColor={backgroundColor}
								/>
							</View>
						}
						noIconIndent
						selectionColor={accentColor}
						isSelected={currentStyle === style}
						groupPosition={groupPosition}
						showSeparator={index !== allStyles.length - 1}
						onPress={() => onSelectAndClose(style)}
					/>
				);
			})}
		</>
	);
};

type ComponentPickerModalContentProps = AvatarPreviewAppearanceProps & {
	categoryKey: string;
	values: string[];
	currentValue: string | null;
	config: AvatarConfig;
	onSelectAndClose: (value: string) => void;
};

const ComponentPickerModalContent: React.FC<ComponentPickerModalContentProps> = ({
	categoryKey,
	values,
	currentValue,
	config,
	onSelectAndClose,
	accentColor,
	rounded,
	backgroundColor,
}) => {
	return (
		<>
			{values.map((value, index) => {
				const groupPosition =
					values.length === 1
						? 'single'
						: index === 0
							? 'top'
							: index === values.length - 1
								? 'bottom'
								: 'middle';
				const isNone = value === NONE_OPTION;
				const previewOptions = { ...(config.options ?? {}) };
				if (isNone) {
					// Remove the component key so the renderer sets probability=0 (hidden).
					delete previewOptions[categoryKey];
				} else {
					previewOptions[categoryKey] = [value];
					// Probability is not stored – renderer derives it from key presence.
				}
				return (
					<SettingsListSelectOptionSingle
						key={value}
						label={isNone ? 'None' : value}
						leftIcon={
							<View style={styles.previewAvatarWrapper}>
								<MyAvatar
									style={config.style}
									size={PREVIEW_AVATAR_SIZE}
									borderRadius={PREVIEW_AVATAR_SIZE / 2}
									rounded={rounded}
									backgroundColor={backgroundColor}
									options={previewOptions}
								/>
							</View>
						}
						noIconIndent
						selectionColor={accentColor}
						isSelected={currentValue === value}
						groupPosition={groupPosition}
						showSeparator={index !== values.length - 1}
						onPress={() => onSelectAndClose(value)}
					/>
				);
			})}
		</>
	);
};

type DebugJsonInputProps = {
	config: AvatarConfig;
	onApply: (config: AvatarConfig) => void;
	accentColor?: string;
	theme: any;
};

const DebugJsonInput: React.FC<DebugJsonInputProps> = ({ config, onApply, accentColor, theme }) => {
	const [jsonText, setJsonText] = useState<string>(JSON.stringify(config, null, 2));
	const [error, setError] = useState<string | null>(null);

	// Keep the text input in sync when config changes externally
	React.useEffect(() => {
		setJsonText(JSON.stringify(config, null, 2));
	}, [config]);

	const handleShow = () => {
		try {
			const parsed = JSON.parse(jsonText);
			if (!parsed || typeof parsed !== 'object') {
				setError('JSON must be an object.');
				return;
			}
			if (!parsed.style || !STYLE_MAP[parsed.style as AvatarStyle]) {
				setError('Invalid or missing "style". Must be a valid AvatarStyle.');
				return;
			}
			if (!parsed.size || typeof parsed.size !== 'number') {
				setError('Invalid or missing "size". Must be a number.');
				return;
			}
			setError(null);
			onApply(parsed as AvatarConfig);
		} catch (e) {
			setError('Invalid JSON: ' + (e instanceof Error ? e.message : String(e)));
		}
	};

	return (
		<>
			<Text style={[styles.debugJson, { color: theme.screen.text }]}>
				{JSON.stringify(config, null, 2)}
			</Text>
			<TextInput
				style={[styles.debugJsonInput, { color: theme.screen.text, borderColor: theme.screen.text + '33' }]}
				multiline
				value={jsonText}
				onChangeText={(text) => {
					setJsonText(text);
					setError(null);
				}}
				placeholder="Paste JSON config here..."
				placeholderTextColor={theme.screen.text + '66'}
			/>
			{error && <Text style={styles.debugJsonError}>{error}</Text>}
			<TouchableOpacity
				style={[styles.debugShowButton, { backgroundColor: accentColor ?? theme.screen.text }]}
				onPress={handleShow}
			>
				<Text style={[styles.debugShowButtonText, { color: myContrastColor(accentColor ?? theme.screen.text, theme, false) }]}>
					Show
				</Text>
			</TouchableOpacity>
		</>
	);
};

const AvatarEditorModalContent: React.FC<AvatarEditorModalContentProps> = ({
	initialConfig,
	accentColor,
	configObservable,
	configRef,
	debugMode,
	allowedStyles,
	showApplyButton,
	onApply,
	onChange,
	onReset,
	onDelete,
	hiddenProps,
	rounded,
	backgroundColor,
	translate,
	enablePhotoImport,
}) => {
	const [config, setConfig] = useState<AvatarConfig>(configRef.current);
	const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
	const { show: showCategoryModal, close: closeCategoryModal } = useMyScrollViewModal();
	const { theme, isDark } = useTheme();

	const hiddenPropKeys = useMemo(() => new Set(Object.keys(hiddenProps ?? {})), [hiddenProps]);

	// In debug mode the style restriction is lifted so testers can switch between all
	// DiceBear styles (micah, avataaars, ...) regardless of the app's configured default.
	const effectiveAllowedStyles = debugMode ? Object.values(AvatarStyle) : (allowedStyles ?? Object.values(AvatarStyle));

	const applyHiddenProps = useCallback(
		(cfg: AvatarConfig): AvatarConfig => {
			// In debug mode, skip applying hidden props so users can view and edit them freely.
			if (debugMode) return cfg;
			if (!hiddenProps || Object.keys(hiddenProps).length === 0) return cfg;
			const newOptions = { ...(cfg.options ?? {}) };
			for (const [key, value] of Object.entries(hiddenProps)) {
				if (value !== undefined) {
					newOptions[key] = [value];
				}
			}
			return { ...cfg, options: newOptions };
		},
		[hiddenProps, debugMode],
	);

	const handleChange = (newConfig: AvatarConfig) => {
		const withHidden = applyHiddenProps(newConfig);
		setConfig(withHidden);
		configRef.current = withHidden;
		configObservable.set(withHidden);
		onChange?.();
	};

	const handleResetToInitial = () => {
		const withHidden = applyHiddenProps(initialConfig);
		setConfig(withHidden);
		configRef.current = withHidden;
		configObservable.set(withHidden);
		// Do NOT call onChange here – this is a reset, not a user modification.
		onReset?.();
	};

	/** EXPERIMENTAL - see `analyzePhotoForAvataaars` above for what this does and does not do. */
	const handleImportFromPhoto = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) return;
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			quality: 1,
		});
		if (result.canceled || !result.assets?.[0]?.uri) return;

		setIsAnalyzingPhoto(true);
		try {
			const analyzed = await analyzePhotoForAvataaars(result.assets[0].uri);
			if (!analyzed) {
				Alert.alert(
					translate ? translate('avatar_photo_import_title') : 'Create from Photo',
					translate ? translate('avatar_photo_import_failed') : 'Could not analyze this photo.',
				);
				return;
			}
			handleChange({
				...config,
				options: {
					...(config.options ?? {}),
					skinColor: [analyzed.skinColor],
					hairColor: [analyzed.hairColor],
				},
			});
			Alert.alert(
				translate ? translate('avatar_photo_import_title') : 'Create from Photo',
				translate
					? translate('avatar_photo_import_success')
					: 'Applied! Skin tone and hair color were derived from your photo. The analysis happened entirely on your device – the photo was never uploaded.',
			);
		} finally {
			setIsAnalyzingPhoto(false);
		}
	};

	const componentOptions = useMemo(() => getStyleComponentOptions(config.style), [config.style]);
	const componentKeys = useMemo(() => Object.keys(componentOptions), [componentOptions]);
	const colorKeys = useMemo(() => getStyleColorKeys(config.style), [config.style]);

	const handleStyleChange = (newStyle: AvatarStyle) => {
		handleChange({ ...config, style: newStyle, options: getDefaultOptionsForStyle(newStyle) });
	};

	const probabilityKeys = useMemo(() => getStyleProbabilityKeys(config.style), [config.style]);

	const handleOptionChange = (key: string, value: string) => {
		const newOptions = { ...(config.options ?? {}) };
		if (value === NONE_OPTION) {
			// Remove the component key; the renderer will set probability=0 since key is absent.
			delete newOptions[key];
		} else {
			newOptions[key] = [value];
			// Probability is not stored – the renderer derives it from key presence at render time.
		}
		handleChange({ ...config, options: newOptions });
	};

	const getSelectedOptionValue = (key: string): string | null => {
		const selected = config.options?.[key];
		// For optional components (those with a probability key), absence of the key means "none".
		if (probabilityKeys[key] && (!selected || (Array.isArray(selected) && selected.length === 0))) {
			return NONE_OPTION;
		}
		if (Array.isArray(selected) && selected.length > 0) return selected[0];
		return null;
	};

	const handleRandomize = () => {
		const newComponentOptions = getStyleComponentOptions(config.style);
		const newColorKeys = getStyleColorKeys(config.style);
		const newProbabilityKeys = getStyleProbabilityKeys(config.style);
		const randomOptions: Record<string, string[] | boolean | number> = {};
		for (const [key, values] of Object.entries(newComponentOptions)) {
			const realValues = values.filter((v) => v !== NONE_OPTION);
			if (realValues.length === 0) continue;
			// For openPeeps, mask is always none (key absent = renderer sets probability=0)
			if (config.style === AvatarStyle.OPEN_PEEPS && key === 'mask' && newProbabilityKeys[key]) {
				continue;
			}
			// For optional components, include "none" as a possible random selection
			if (newProbabilityKeys[key]) {
				const allValues = [NONE_OPTION, ...realValues];
				const randomValue = allValues[Math.floor(Math.random() * allValues.length)];
				if (randomValue !== NONE_OPTION) {
					randomOptions[key] = [randomValue];
				}
				// Probability not stored – renderer derives it from key presence.
			} else {
				randomOptions[key] = [realValues[Math.floor(Math.random() * realValues.length)]];
			}
		}
		for (const key of newColorKeys) {
			// Skip hidden prop keys – they are always pinned to a fixed value
			if (hiddenPropKeys.has(key)) continue;
			// For Micah, eyebrowsColor and facialHairColor are derived from hairColor below
			if (config.style === AvatarStyle.MICAH && (key === 'eyebrowsColor' || key === 'facialHairColor')) continue;
			const presetColors = getPresetColorsForKey(key, config.style);
			const randomColor = presetColors[Math.floor(Math.random() * presetColors.length)];
			randomOptions[key] = [stripHashPrefix(randomColor)];
		}
		// For Micah: coordinate eyebrowsColor (= hairColor) and facialHairColor (one step lighter)
		if (config.style === AvatarStyle.MICAH) {
			const hairColorValue = randomOptions['hairColor']?.[0] as string | undefined;
			if (hairColorValue !== undefined) {
				if (!hiddenPropKeys.has('eyebrowsColor')) {
					randomOptions['eyebrowsColor'] = [hairColorValue];
				}
				if (!hiddenPropKeys.has('facialHairColor')) {
					// MICAH_HAIR_COLORS is ordered dark→light (index 0=Black … index 8=Light Gray),
					// so index + 1 yields one step lighter.
					const hairIndex = MICAH_HAIR_COLORS.findIndex(
						(c) => stripHashPrefix(c) === hairColorValue,
					);
					const lighterIndex = hairIndex !== -1
						? Math.min(hairIndex + 1, MICAH_HAIR_COLORS.length - 1)
						: 0;
					randomOptions['facialHairColor'] = [stripHashPrefix(MICAH_HAIR_COLORS[lighterIndex])];
				}
			}
		}
		// Preserve boolean flags (flip, clip) and numeric options (scale, translateX, translateY, rotate)
		// so that user-set positioning/orientation is not lost on randomize.
		const preserveKeys: string[] = [
			AvatarPropKey.OpenPeeps.FLIP,
			AvatarPropKey.OpenPeeps.CLIP,
			AvatarPropKey.OpenPeeps.SCALE,
			AvatarPropKey.OpenPeeps.TRANSLATE_X,
			AvatarPropKey.OpenPeeps.TRANSLATE_Y,
			AvatarPropKey.OpenPeeps.ROTATE,
		];
		for (const key of preserveKeys) {
			if (config.options?.[key] !== undefined) {
				randomOptions[key] = config.options[key]!;
			}
		}
		// Preserve hidden prop values so they are never lost during randomize,
		// even in debug mode where applyHiddenProps is skipped.
		if (hiddenProps) {
			for (const [key, value] of Object.entries(hiddenProps)) {
				if (value !== undefined) {
					randomOptions[key] = [value];
				}
			}
		}
		handleChange({ ...config, options: randomOptions });
	};

	const handleRandomizeRef = useRef(handleRandomize);
	handleRandomizeRef.current = handleRandomize;
	useEffect(() => {
		configObservable.setRandomizeFn(() => handleRandomizeRef.current());
	}, [configObservable]);

	const handleCopyConfig = async () => {
		await Clipboard.setStringAsync(JSON.stringify(config, null, 2));
	};

	const handleOpenStylePicker = () => {
		showCategoryModal({
			title: BUILTIN_CATEGORY_STYLE,
			children: (
				<StylePickerModalContent
					currentStyle={config.style}
					accentColor={accentColor}
					allowedStyles={effectiveAllowedStyles}
					rounded={rounded}
					backgroundColor={backgroundColor}
					onSelectAndClose={(style) => {
						handleStyleChange(style);
						closeCategoryModal();
					}}
				/>
			),
		});
	};

	const handleOpenComponentPicker = (key: string) => {
		const values = componentOptions[key];
		if (!values) return;
		showCategoryModal({
			title: key,
			children: (
				<ComponentPickerModalContent
					categoryKey={key}
					values={values}
					currentValue={getSelectedOptionValue(key)}
					config={config}
					accentColor={accentColor}
					rounded={rounded}
					backgroundColor={backgroundColor}
					onSelectAndClose={(value) => {
						handleOptionChange(key, value);
						closeCategoryModal();
					}}
				/>
			),
		});
	};

	const handleOpenColorPicker = (key: string) => {
		const presetColors = getPresetColorsForKey(key, config.style);
		const rawVal = config.options?.[key];
		const storedHex = Array.isArray(rawVal) ? rawVal[0] ?? null : null;
		let displayHex = storedHex;
		if (!displayHex) {
			const schemaDefaults = getSchemaDefaultColors(config.style, key);
			if (schemaDefaults.length > 0) {
				displayHex = schemaDefaults[0];
			}
		}
		const selectedColor = displayHex ? '#' + displayHex : null;

		showCategoryModal({
			title: key,
			children: (
				<ColorPickerModalContent
					colors={presetColors}
					initialSelectedColor={selectedColor}
					accentColor={accentColor}
					config={config}
					colorKey={key}
					rounded={rounded}
					backgroundColor={backgroundColor}
					debugMode={debugMode}
					translate={translate}
					onSelectAndClose={(color) => {
						handleOptionChange(key, stripHashPrefix(color));
						closeCategoryModal();
					}}
				/>
			),
		});
	};

	/** Get the handler for opening a category's selection modal. */
	const getCategoryHandler = (cat: string): (() => void) => {
		if (cat === BUILTIN_CATEGORY_STYLE) return handleOpenStylePicker;
		if (colorKeys.includes(cat)) return () => handleOpenColorPicker(cat);
		return () => handleOpenComponentPicker(cat);
	};

	const getCategoryOptions = (cat: string): SettingsListLeftRightItem<string>[] => {
		if (cat === BUILTIN_CATEGORY_STYLE) {
			return effectiveAllowedStyles.map((style) => ({ id: style, label: style }));
		}
		if (colorKeys.includes(cat)) {
			return getPresetColorsForKey(cat, config.style).map((color) => {
				const hex = stripHashPrefix(color);
				return { id: hex, label: '' };
			});
		}
		const values = componentOptions[cat] ?? [];
		return values.map((value) => ({ id: value, label: value === NONE_OPTION ? 'None' : value }));
	};

	const getCategorySelectedOption = (cat: string): string | null => {
		if (cat === BUILTIN_CATEGORY_STYLE) return config.style;
		if (colorKeys.includes(cat)) {
			const v = config.options?.[cat];
			return Array.isArray(v) ? v[0] ?? null : null;
		}
		return getSelectedOptionValue(cat);
	};

	const handleCategorySelect = (cat: string, item: SettingsListLeftRightItem<string>) => {
		if (cat === BUILTIN_CATEGORY_STYLE) {
			handleStyleChange(item.id as AvatarStyle);
		} else {
			handleOptionChange(cat, item.id);
		}
	};

	const sortedAttributeKeys = useMemo(
		() => sortAttributeKeys([...componentKeys, ...colorKeys], config.style),
		[componentKeys, colorKeys, config.style],
	);

	// Hide categories that have only one option (no meaningful choice) and hidden props
	const visibleAttributeKeys = useMemo(() => {
		return sortedAttributeKeys.filter((cat) => {
			// Always hide hidden props from the main category list; they appear in the "Hidden Props" debug section instead.
			if (hiddenPropKeys.has(cat)) return false;
			if (colorKeys.includes(cat)) {
				// Color keys always have multiple presets, keep them
				return true;
			}
			const values = componentOptions[cat];
			if (!values) return true;
			// Filter out the none option for counting real choices
			const realValues = values.filter((v) => v !== NONE_OPTION);
			return realValues.length > 1;
		});
	}, [sortedAttributeKeys, colorKeys, componentOptions, hiddenPropKeys, debugMode]);

	// Hide style selector when only one style is allowed
	const showStyleCategory = effectiveAllowedStyles.length > 1;
	const allCategories = [
		...(showStyleCategory ? [BUILTIN_CATEGORY_STYLE] : []),
		...visibleAttributeKeys,
	];

	const diceButtonBg = accentColor ?? theme.screen.text;
	const diceIconColor = myContrastColor(diceButtonBg, theme, isDark);
	const hasHiddenProps = !!(hiddenProps && Object.keys(hiddenProps).length > 0);

	return (
		<View style={styles.content}>
			{showApplyButton && onApply && (
				<>
					<SettingsList
						title={translate ? translate('avatar_apply') : 'Apply'}
						onPress={onApply}
						leftIcon={<MaterialCommunityIcons name="check-circle" size={20} />}
						iconBgColor={accentColor}
						groupPosition="single"
					/>
				</>
			)}

			<SettingsListGroupTitle title={translate ? translate('avatar_section_category') : 'Category'} />
			{allCategories.map((cat, index) => {
				const groupPosition =
					allCategories.length === 1
						? 'single'
						: index === 0
							? 'top'
							: index === allCategories.length - 1
								? 'bottom'
								: 'middle';
				const rawColor = colorKeys.includes(cat) ? config.options?.[cat] : null;
				const colorKey = Array.isArray(rawColor) ? rawColor[0] ?? null : null;
				const swatchColor = colorKey ? '#' + colorKey : undefined;
				const swatchBorderColor = swatchColor ? myContrastColor(swatchColor, theme, isDark) : undefined;

				const iconName = CATEGORY_ICON_MAP[cat] ?? 'help-circle-outline';

				return (
					<SettingsListLeftRight
						key={cat}
						label={getCategoryLabel(cat, translate)}
						options={getCategoryOptions(cat)}
						selectedOption={getCategorySelectedOption(cat)}
						onSelect={(item) => handleCategorySelect(cat, item)}
						onPress={getCategoryHandler(cat)}
						leftIcon={<MaterialCommunityIcons name={iconName} size={20} />}
						iconBgColor={accentColor}
						groupPosition={groupPosition}
						showSeparator={index !== allCategories.length - 1}
						extraRightElement={
							swatchColor ? (
								<View
									style={[
										styles.colorSwatch,
										{ backgroundColor: swatchColor, borderColor: swatchBorderColor },
									]}
								/>
							) : undefined
						}
					/>
				);
			})}

			<SettingsListGroupTitle title={translate ? translate('avatar_section_actions') : 'Actions'} />
			<SettingsList
				title={translate ? translate('avatar_randomize') : 'Randomize'}
				onPress={handleRandomize}
				leftIcon={<MaterialCommunityIcons name="dice-multiple" size={20} />}
				iconBgColor={accentColor}
				groupPosition="single"
			/>

			{enablePhotoImport && config.style === AvatarStyle.AVATAAARS && (
				<>
					<SettingsListGroupTitle
						title={translate ? translate('avatar_section_experimental') : 'Experimental'}
					/>
					<SettingsList
						nativeID={CommonUiComponentIds.AVATAR_EDITOR_PHOTO_IMPORT_BUTTON}
						title={translate ? translate('avatar_photo_import') : 'Create from Photo (Beta)'}
						value={
							translate
								? translate('avatar_photo_import_hint')
								: 'Suggest a matching skin tone & hair color from a photo – analysis stays on this device'
						}
						onPress={isAnalyzingPhoto ? undefined : handleImportFromPhoto}
						leftIcon={
							isAnalyzingPhoto ? (
								<ActivityIndicator size="small" color={accentColor ?? theme.screen.text} />
							) : (
								<MaterialCommunityIcons name="face-recognition" size={20} />
							)
						}
						iconBgColor={accentColor}
						groupPosition="single"
					/>
				</>
			)}

			{debugMode && (
				<View style={styles.debugSection}>
					<SettingsListGroupTitle title={translate ? translate('avatar_section_debug') : 'Debug'} />
					<SettingsList
						title={translate ? translate('avatar_copy_config') : 'Copy Config'}
						onPress={handleCopyConfig}
						leftIcon={<MaterialCommunityIcons name="content-copy" size={20} />}
						iconBgColor={accentColor}
						groupPosition="single"
						showSeparator={false}
					/>
					<>
						<SettingsListGroupTitle title="Hidden Props" />
						<SettingsListNumberInput
							title="translateX"
							leftIcon={<MaterialCommunityIcons name="arrow-left-right" size={20} />}
							iconBgColor={accentColor}
							groupPosition="top"
							showSeparator={true}
							initialValue={(() => {
								const tx = config.options?.translateX;
								if (Array.isArray(tx)) return Number.parseInt(tx[0] ?? '0', 10);
								return config.style === AvatarStyle.OPEN_PEEPS ? -6 : 0;
							})()}
							value={(() => {
								const tx = config.options?.translateX;
								if (Array.isArray(tx)) return String(tx[0]);
								return config.style === AvatarStyle.OPEN_PEEPS ? '-6 (default)' : undefined;
							})()}
							min={-100}
							max={100}
							step={1}
							allowDisable={true}
							disableLabel="Reset (undefined)"
							onDisable={() => {
								const newOptions = { ...(config.options ?? {}) };
								delete newOptions[AvatarPropKey.OpenPeeps.TRANSLATE_X];
								handleChange({ ...config, options: newOptions });
							}}
							onSave={(newValue) => {
								handleChange({
									...config,
									options: { ...(config.options ?? {}), [AvatarPropKey.OpenPeeps.TRANSLATE_X]: [String(newValue)] },
								});
							}}
						/>
						<SettingsListNumberInput
							title="translateY"
							leftIcon={<MaterialCommunityIcons name="arrow-up-down" size={20} />}
							iconBgColor={accentColor}
							groupPosition="middle"
							showSeparator={true}
							initialValue={(() => {
								const ty = config.options?.translateY;
								return Array.isArray(ty) ? Number.parseInt(ty[0] ?? '0', 10) : 0;
							})()}
							value={(() => {
								const ty = config.options?.translateY;
								return Array.isArray(ty) ? String(ty[0]) : undefined;
							})()}
							min={-100}
							max={100}
							step={1}
							allowDisable={true}
							disableLabel="Reset (undefined)"
							onDisable={() => {
								const newOptions = { ...(config.options ?? {}) };
								delete newOptions[AvatarPropKey.OpenPeeps.TRANSLATE_Y];
								handleChange({ ...config, options: newOptions });
							}}
							onSave={(newValue) => {
								handleChange({
									...config,
									options: { ...(config.options ?? {}), [AvatarPropKey.OpenPeeps.TRANSLATE_Y]: [String(newValue)] },
								});
							}}
						/>
						<SettingsListNumberInput
							title="rotate"
							leftIcon={<MaterialCommunityIcons name="rotate-right" size={20} />}
							iconBgColor={accentColor}
							groupPosition="middle"
							showSeparator={true}
							initialValue={(() => {
								const rot = config.options?.rotate;
								return Array.isArray(rot) ? Number.parseInt(rot[0] ?? '0', 10) : 0;
							})()}
							value={(() => {
								const rot = config.options?.rotate;
								return Array.isArray(rot) ? String(rot[0]) : undefined;
							})()}
							min={0}
							max={360}
							step={1}
							allowDisable={true}
							disableLabel="Reset (undefined)"
							onDisable={() => {
								const newOptions = { ...(config.options ?? {}) };
								delete newOptions[AvatarPropKey.OpenPeeps.ROTATE];
								handleChange({ ...config, options: newOptions });
							}}
							onSave={(newValue) => {
								handleChange({
									...config,
									options: { ...(config.options ?? {}), [AvatarPropKey.OpenPeeps.ROTATE]: [String(newValue)] },
								});
							}}
						/>
						{(() => {
							const rawFlip = config.options?.flip;
							const isFlipEnabled =
								typeof rawFlip === 'boolean' ? rawFlip :
								Array.isArray(rawFlip) ? rawFlip[0] === 'true' :
								false;
							return (
								<SettingsListBoolean
									title="flip"
									leftIcon={<MaterialCommunityIcons name="flip-horizontal" size={20} />}
									iconBgColor={accentColor}
									groupPosition="middle"
									showSeparator={true}
									isEnabled={isFlipEnabled}
									onToggle={() => {
										handleChange({
											...config,
											options: { ...(config.options ?? {}), [AvatarPropKey.OpenPeeps.FLIP]: !isFlipEnabled },
										});
									}}
								/>
							);
						})()}
						{(() => {
							const rawClip = config.options?.clip;
							const isClipEnabled =
								typeof rawClip === 'boolean' ? rawClip :
								Array.isArray(rawClip) ? rawClip[0] === 'true' :
								false;
							return (
								<SettingsListBoolean
									title="clip"
									leftIcon={<MaterialCommunityIcons name="content-cut" size={20} />}
									iconBgColor={accentColor}
									groupPosition={hasHiddenProps ? 'middle' : 'bottom'}
									showSeparator={hasHiddenProps}
									isEnabled={isClipEnabled}
									onToggle={() => {
										handleChange({
											...config,
											options: { ...(config.options ?? {}), [AvatarPropKey.OpenPeeps.CLIP]: !isClipEnabled },
										});
									}}
								/>
							);
						})()}
						{hasHiddenProps &&
							Object.entries(hiddenProps ?? {}).map(([key, value], index, arr) => {
								const groupPosition =
									arr.length === 1
										? 'bottom'
										: index === 0
											? 'middle'
											: index === arr.length - 1
												? 'bottom'
												: 'middle';
								if (key === AvatarPropKey.OpenPeeps.SCALE) {
									const scaleVal = config.options?.scale;
									const scaleArr = Array.isArray(scaleVal) ? scaleVal : null;
									return (
										<SettingsListNumberInput
											key={key}
											title={key}
											leftIcon={<MaterialCommunityIcons name="magnify" size={20} />}
											iconBgColor={accentColor}
											groupPosition={groupPosition}
											showSeparator={index !== arr.length - 1}
											initialValue={
												scaleArr !== null
													? Number.parseInt(scaleArr[0] ?? String(value), 10)
													: Number.parseInt(value, 10)
											}
											value={
												scaleArr !== null
													? String(scaleArr[0])
													: `${value} (hidden)`
											}
											min={50}
											max={200}
											step={1}
											onSave={(newValue) => {
												handleChange({
													...config,
													options: { ...(config.options ?? {}), [AvatarPropKey.OpenPeeps.SCALE]: [String(newValue)] },
												});
											}}
										/>
									);
								}
								return (
									<SettingsList
										key={key}
										title={key}
										value={String(value)}
										leftIcon={<MaterialCommunityIcons name="lock" size={20} />}
										iconBgColor={accentColor}
										groupPosition={groupPosition}
										showSeparator={index !== arr.length - 1}
									/>
								);
							})}
					</>
				<DebugJsonInput
						config={config}
						onApply={handleChange}
						accentColor={accentColor}
						theme={theme}
					/>
				</View>
				)}
				{(onReset || onDelete) && (
					<View style={{ height: 16 }} />
				)}
				{onReset && (
					<SettingsList
						title={translate ? translate('avatar_reset_changes') : 'Reset changes'}
						onPress={handleResetToInitial}
						leftIcon={<MaterialCommunityIcons name="refresh" size={20} />}
						iconBgColor={accentColor}
						groupPosition="single"
					/>
				)}
				{onDelete && (
					<>
						{onReset && <View style={{ height: 8 }} />}
						<SettingsList
							title={translate ? translate('delete') : 'Delete'}
							onPress={onDelete}
							leftIcon={<MaterialCommunityIcons name="delete" size={20} />}
							iconBgColor="#ef4444"
							groupPosition="single"
						/>
					</>
				)}
		</View>
	);
};

export type AvatarPreset = {
	name: string;
	skinColor?: string[];
	head?: string[];
	headContrastColor?: string[];
	face?: string[];
	facialHair?: string[];
	accessories?: string[];
	mask?: string[];
	[key: string]: string[] | string | undefined;
};

/**
 * Predefined avatar presets for the OPEN_PEEPS style.
 * Each preset defines a recognisable character that users can pick as a quick-start.
 */
const OPEN_PEEPS_PRESETS: AvatarPreset[] = [
	{
		name: 'Student Glasses',
		skinColor: ['edb98a'],
		head: ['short2'],
		headContrastColor: ['4a312c'],
		face: ['smile'],
		facialHair: [],
		accessories: ['glasses'],
		mask: [],
	},
	{
		name: 'Clean Short',
		skinColor: ['ffdbb4'],
		head: ['short3'],
		headContrastColor: ['2c1b18'],
		face: ['calm'],
		facialHair: [],
		accessories: [],
		mask: [],
	},
	{
		name: 'Long Straight',
		skinColor: ['edb98a'],
		head: ['long'],
		headContrastColor: ['724133'],
		face: ['smile'],
		facialHair: [],
		accessories: [],
		mask: [],
	},
	{
		name: 'Curly',
		skinColor: ['d08b5b'],
		head: ['longCurly'],
		headContrastColor: ['2c1b18'],
		face: ['smileBig'],
		facialHair: [],
		accessories: [],
		mask: [],
	},
	{
		name: 'Afro',
		skinColor: ['694d3d'],
		head: ['afro'],
		headContrastColor: ['2c1b18'],
		face: ['calm'],
		facialHair: [],
		accessories: [],
		mask: [],
	},
	{
		name: 'Bald Beard',
		skinColor: ['ae5d29'],
		head: ['noHair1'],
		headContrastColor: ['4a312c'],
		face: ['serious'],
		facialHair: ['full'],
		accessories: [],
		mask: [],
	},
	{
		name: 'Moustache',
		skinColor: ['edb98a'],
		head: ['short4'],
		headContrastColor: ['b58143'],
		face: ['smile'],
		facialHair: ['moustache2'],
		accessories: [],
		mask: [],
	},
	{
		name: 'Beanie',
		skinColor: ['d08b5b'],
		head: ['hatBeanie'],
		headContrastColor: ['c93305'],
		face: ['smile'],
		facialHair: [],
		accessories: [],
		mask: [],
	},
	{
		name: 'Glasses Long',
		skinColor: ['694d3d'],
		head: ['longBangs'],
		headContrastColor: ['2c1b18'],
		face: ['calm'],
		facialHair: [],
		accessories: ['glasses2'],
		mask: [],
	},
	{
		name: 'Red Tone',
		skinColor: ['ffdbb4'],
		head: ['mediumStraight'],
		headContrastColor: ['c93305'],
		face: ['smile'],
		facialHair: [],
		accessories: [],
		mask: [],
	},
	{
		name: 'Androgyn',
		skinColor: ['d08b5b'],
		head: ['medium2'],
		headContrastColor: ['4a312c'],
		face: ['calm'],
		facialHair: [],
		accessories: [],
		mask: [],
	},
	{
		name: 'Contrast Glasses',
		skinColor: ['694d3d'],
		head: ['short5'],
		headContrastColor: ['d6b370'],
		face: ['smileBig'],
		facialHair: [],
		accessories: ['glasses5'],
		mask: [],
	},
];

/**
 * Predefined avatar presets for the MICAH style.
 * All color values are sourced from the shared palette constants – no raw hex strings.
 * Use `stripHashPrefix(PALETTE_CONSTANT[index])` to convert a '#'-prefixed palette entry
 * to the un-prefixed format expected by avatar config options.
 */
export const MICAH_PRESETS: AvatarPreset[] = [
	{
		name: 'Turban Scruff',
		hair: ['turban'],
		ears: ['detached'],
		eyebrows: ['up'],
		eyes: ['eyes'],
		facialHair: ['scruff'],
		mouth: ['smile'],
		nose: ['pointed'],
		shirt: ['collared'],
		baseColor:       [stripHashPrefix(SKIN_COLORS[7])],          // ae5d29 – Medium
		earringColor:    [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		eyebrowsColor:   [stripHashPrefix(MICAH_HAIR_COLORS[1])],    // 2c1b18 – Dark Brown
		facialHairColor: [stripHashPrefix(MICAH_HAIR_COLORS[1])],    // 2c1b18 – Dark Brown
		hairColor:       [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		mouthColor:      [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		shirtColor:      [stripHashPrefix(PRESET_COLORS[15])],       // 047857 – Emerald
		eyesColor:       [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		eyeShadowColor:  [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		glassesColor:    [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
	},
	{
		name: 'Pixie Cyan',
		hair: ['pixie'],
		ears: ['detached'],
		eyebrows: ['up'],
		eyes: ['eyes'],
		facialHair: ['none'],
		mouth: ['smile'],
		nose: ['pointed'],
		shirt: ['crew'],
		baseColor:       [stripHashPrefix(SKIN_COLORS[5])],          // e0a96d – Golden Tan
		earringColor:    [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		eyebrowsColor:   [stripHashPrefix(PRESET_COLORS[34])],       // 06b6d4 – Cyan
		facialHairColor: [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		hairColor:       [stripHashPrefix(PRESET_COLORS[34])],       // 06b6d4 – Cyan
		mouthColor:      [stripHashPrefix(PRESET_COLORS[19])],       // f43f5e – Rose
		shirtColor:      [stripHashPrefix(PRESET_COLORS[4])],        // 4b5563 – Slate Gray
		eyesColor:       [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		eyeShadowColor:  [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		glassesColor:    [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
	},
	{
		name: 'Full Hair Laugh',
		hair: ['full'],
		ears: ['detached'],
		eyebrows: ['eyelashesUp'],
		eyes: ['eyes'],
		facialHair: ['none'],
		mouth: ['laughing'],
		nose: ['pointed'],
		shirt: ['open'],
		baseColor:       [stripHashPrefix(SKIN_COLORS[3])],          // ffdbac – Warm Light
		earringColor:    [stripHashPrefix(PRESET_COLORS[31])],       // ec4899 – Pink
		eyebrowsColor:   [stripHashPrefix(MICAH_HAIR_COLORS[2])],    // 4a312c – Brown
		facialHairColor: [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		hairColor:       [stripHashPrefix(MICAH_HAIR_COLORS[2])],    // 4a312c – Brown
		mouthColor:      [stripHashPrefix(PRESET_COLORS[18])],       // b91c1c – Dark Red
		shirtColor:      [stripHashPrefix(PRESET_COLORS[7])],        // 3b82f6 – Blue
		eyesColor:       [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		eyeShadowColor:  [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		glassesColor:    [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
	},
	{
		name: 'Danny Phantom',
		hair: ['dannyPhantom'],
		ears: ['detached'],
		eyebrows: ['eyelashesUp'],
		eyes: ['eyes'],
		facialHair: ['none'],
		glasses: ['round'],
		mouth: ['smile'],
		nose: ['pointed'],
		shirt: ['collared'],
		baseColor:       [stripHashPrefix(SKIN_COLORS[2])],          // fddbb4 – Very Light
		earringColor:    [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		eyebrowsColor:   [stripHashPrefix(PRESET_COLORS[11])],       // 1f2937 – Charcoal
		facialHairColor: [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		hairColor:       [stripHashPrefix(PRESET_COLORS[11])],       // 1f2937 – Charcoal
		mouthColor:      [stripHashPrefix(PRESET_COLORS[18])],       // b91c1c – Dark Red
		shirtColor:      [stripHashPrefix(PRESET_COLORS[17])],       // ef4444 – Red
		eyesColor:       [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		eyeShadowColor:  [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		glassesColor:    [stripHashPrefix(PRESET_COLORS[11])],       // 1f2937 – Charcoal
	},
	{
		name: 'Mr Clean',
		hair: ['mrClean'],
		ears: ['detached'],
		eyebrows: ['up'],
		eyes: ['eyes'],
		facialHair: ['none'],
		mouth: ['smile'],
		nose: ['pointed'],
		shirt: ['open'],
		baseColor:       [stripHashPrefix(SKIN_COLORS[8])],          // 694d3d – Medium Dark
		earringColor:    [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		eyebrowsColor:   [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		facialHairColor: [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		hairColor:       [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		mouthColor:      [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		shirtColor:      [stripHashPrefix(PRESET_COLORS[10])],       // 1e293b – Dark Slate
		eyesColor:       [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		eyeShadowColor:  [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		glassesColor:    [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
	},
	{
		name: 'Fonze',
		hair: ['fonze'],
		ears: ['detached'],
		eyebrows: ['up'],
		eyes: ['eyes'],
		facialHair: ['none'],
		mouth: ['smile'],
		nose: ['pointed'],
		shirt: ['crew'],
		baseColor:       [stripHashPrefix(SKIN_COLORS[1])],          // ffe0bd – Porcelain
		earringColor:    [stripHashPrefix(PRESET_COLORS[10])],       // 1e293b – Dark Slate
		eyebrowsColor:   [stripHashPrefix(MICAH_HAIR_COLORS[3])],    // 724133 – Light Brown
		facialHairColor: [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		hairColor:       [stripHashPrefix(MICAH_HAIR_COLORS[3])],    // 724133 – Light Brown
		mouthColor:      [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		shirtColor:      [stripHashPrefix(PRESET_COLORS[3])],        // 525252 – Dark Gray
		eyesColor:       [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		eyeShadowColor:  [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		glassesColor:    [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
	},
	{
		name: 'Pixie Amber',
		hair: ['pixie'],
		ears: ['detached'],
		eyebrows: ['up'],
		eyes: ['eyes'],
		facialHair: ['none'],
		glasses: ['round'],
		mouth: ['smile'],
		nose: ['pointed'],
		shirt: ['crew'],
		baseColor:       [stripHashPrefix(SKIN_COLORS[3])],          // ffdbac – Warm Light
		earringColor:    [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		eyebrowsColor:   [stripHashPrefix(PRESET_COLORS[38])],       // 78350f – Dark Amber
		facialHairColor: [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		hairColor:       [stripHashPrefix(PRESET_COLORS[38])],       // 78350f – Dark Amber
		mouthColor:      [stripHashPrefix(PRESET_COLORS[18])],       // b91c1c – Dark Red
		shirtColor:      [stripHashPrefix(PRESET_COLORS[26])],       // f59e0b – Amber Gold
		eyesColor:       [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		eyeShadowColor:  [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		glassesColor:    [stripHashPrefix(PRESET_COLORS[11])],       // 1f2937 – Charcoal
	},
	{
		name: 'Scruff Surprised',
		ears: ['detached'],
		eyebrows: ['up'],
		eyes: ['eyes'],
		facialHair: ['scruff'],
		glasses: ['square'],
		mouth: ['surprised'],
		nose: ['pointed'],
		shirt: ['collared'],
		baseColor:       [stripHashPrefix(SKIN_COLORS[2])],          // fddbb4 – Very Light
		earringColor:    [stripHashPrefix(PRESET_COLORS[9])],        // 1e3a8a – Navy
		eyebrowsColor:   [stripHashPrefix(MICAH_HAIR_COLORS[1])],    // 2c1b18 – Dark Brown
		facialHairColor: [stripHashPrefix(MICAH_HAIR_COLORS[8])],    // d0cfc5 – Light Gray
		hairColor:       [stripHashPrefix(MICAH_HAIR_COLORS[3])],    // 724133 – Light Brown
		mouthColor:      [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		shirtColor:      [stripHashPrefix(PRESET_COLORS[6])],        // bfdbfe – Light Blue
		eyesColor:       [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
		eyeShadowColor:  [stripHashPrefix(SKIN_COLORS[0])],          // ffffff – White
		glassesColor:    [stripHashPrefix(MICAH_HAIR_COLORS[0])],    // 000000 – Black
	},
];

/**
 * Predefined avatar presets for the AVATAAARS style (the default style).
 * The quick-start selection should let as many users as possible find a starting
 * point they identify with, so each preset intentionally represents a different
 * group of people (gender expressions, skin tones, hair types, religious head
 * coverings, age groups, glasses wearers, ...). The comment above each preset
 * documents which group it is meant to represent.
 * All color values are sourced from the shared palette constants – no raw hex strings.
 */
export const AVATAAARS_PRESETS: AvatarPreset[] = [
	// Young woman with long blonde hair – represents feminine-presenting users with long hair.
	{
		name: 'Long Straight',
		top: ['straight01'],
		hairColor:   [stripHashPrefix(HAIR_COLORS[6])],    // d6b370 – Blonde
		eyebrows: ['defaultNatural'],
		eyes: ['default'],
		mouth: ['smile'],
		facialHair: [],
		accessories: [],
		clothing: ['shirtScoopNeck'],
		clothesColor: [stripHashPrefix(PRESET_COLORS[19])], // f43f5e – Rose
		skinColor:   [stripHashPrefix(SKIN_COLORS[3])],     // ffdbac – Warm Light
	},
	// Young man with a short haircut and hoodie – represents masculine-presenting, casual users.
	{
		name: 'Short Hoodie',
		top: ['shortFlat'],
		hairColor:   [stripHashPrefix(HAIR_COLORS[1])],     // 2c1b18 – Dark Brown
		eyebrows: ['defaultNatural'],
		eyes: ['default'],
		mouth: ['smile'],
		facialHair: [],
		accessories: [],
		clothing: ['hoodie'],
		clothesColor: [stripHashPrefix(PRESET_COLORS[7])],  // 3b82f6 – Blue
		skinColor:   [stripHashPrefix(SKIN_COLORS[4])],     // edb98a – Light
	},
	// Woman wearing a hijab – represents Muslim users / users with religious head coverings.
	{
		name: 'Hijab',
		top: ['hijab'],
		hatColor:    [stripHashPrefix(PRESET_COLORS[15])],  // 047857 – Emerald
		eyebrows: ['defaultNatural'],
		eyes: ['happy'],
		mouth: ['smile'],
		facialHair: [],
		accessories: [],
		clothing: ['blazerAndShirt'],
		clothesColor: [stripHashPrefix(PRESET_COLORS[4])],  // 4b5563 – Slate Gray
		skinColor:   [stripHashPrefix(SKIN_COLORS[6])],     // d08b5b – Medium Light
	},
	// Man wearing a turban with a full beard – represents Sikh users.
	{
		name: 'Turban Beard',
		top: ['turban'],
		hatColor:    [stripHashPrefix(PRESET_COLORS[9])],   // 1e3a8a – Navy
		eyebrows: ['defaultNatural'],
		eyes: ['default'],
		mouth: ['smile'],
		facialHair: ['beardMedium'],
		facialHairColor: [stripHashPrefix(HAIR_COLORS[1])], // 2c1b18 – Dark Brown
		accessories: [],
		clothing: ['shirtCrewNeck'],
		clothesColor: [stripHashPrefix(PRESET_COLORS[0])],  // ffffff – White
		skinColor:   [stripHashPrefix(SKIN_COLORS[7])],     // ae5d29 – Medium
	},
	// Person with a natural afro and darker skin tone – represents Black users / afro-textured hair.
	{
		name: 'Afro',
		top: ['fro'],
		hairColor:   [stripHashPrefix(HAIR_COLORS[0])],     // 000000 – Black
		eyebrows: ['defaultNatural'],
		eyes: ['default'],
		mouth: ['twinkle'],
		facialHair: [],
		accessories: [],
		clothing: ['shirtVNeck'],
		clothesColor: [stripHashPrefix(PRESET_COLORS[26])], // f59e0b – Amber Gold
		skinColor:   [stripHashPrefix(SKIN_COLORS[8])],     // 694d3d – Medium Dark
	},
	// Bald man with a light beard – represents bald users / users with facial hair.
	{
		name: 'Bald Beard',
		top: [],
		eyebrows: ['defaultNatural'],
		eyes: ['default'],
		mouth: ['serious'],
		facialHair: ['beardLight'],
		facialHairColor: [stripHashPrefix(HAIR_COLORS[2])], // 4a312c – Brown
		accessories: [],
		clothing: ['shirtCrewNeck'],
		clothesColor: [stripHashPrefix(PRESET_COLORS[10])], // 1e293b – Dark Slate
		skinColor:   [stripHashPrefix(SKIN_COLORS[5])],     // e0a96d – Golden Tan
	},
	// Older person with gray hair and prescription glasses – represents older users and glasses wearers.
	{
		name: 'Gray Glasses',
		top: ['shortWaved'],
		hairColor:   [stripHashPrefix(HAIR_COLORS[10])],    // b7a69e – Gray
		eyebrows: ['defaultNatural'],
		eyes: ['default'],
		mouth: ['smile'],
		facialHair: [],
		accessories: ['prescription02'],
		accessoriesColor: [stripHashPrefix(PRESET_COLORS[11])], // 1f2937 – Charcoal
		clothing: ['collarAndSweater'],
		clothesColor: [stripHashPrefix(PRESET_COLORS[14])], // 15803d – Dark Green
		skinColor:   [stripHashPrefix(SKIN_COLORS[3])],     // ffdbac – Warm Light
	},
	// Woman with big curly hair and a medium skin tone – represents users with curly hair types.
	{
		name: 'Curly',
		top: ['curly'],
		hairColor:   [stripHashPrefix(HAIR_COLORS[2])],     // 4a312c – Brown
		eyebrows: ['defaultNatural'],
		eyes: ['happy'],
		mouth: ['smile'],
		facialHair: [],
		accessories: [],
		clothing: ['overall'],
		clothesColor: [stripHashPrefix(PRESET_COLORS[17])], // ef4444 – Red
		skinColor:   [stripHashPrefix(SKIN_COLORS[6])],     // d08b5b – Medium Light
	},
	// Person with dreadlocks – represents users wearing locs.
	{
		name: 'Dreads',
		top: ['dreads01'],
		hairColor:   [stripHashPrefix(HAIR_COLORS[1])],     // 2c1b18 – Dark Brown
		eyebrows: ['defaultNatural'],
		eyes: ['default'],
		mouth: ['smile'],
		facialHair: [],
		accessories: [],
		clothing: ['shirtVNeck'],
		clothesColor: [stripHashPrefix(PRESET_COLORS[35])], // 0e7490 – Dark Teal
		skinColor:   [stripHashPrefix(SKIN_COLORS[9])],     // 4a312c – Dark
	},
	// Red-haired (auburn) person – represents red-haired users.
	{
		name: 'Auburn Long',
		top: ['longButNotTooLong'],
		hairColor:   [stripHashPrefix(HAIR_COLORS[4])],     // a55728 – Auburn
		eyebrows: ['raisedExcitedNatural'],
		eyes: ['default'],
		mouth: ['smile'],
		facialHair: [],
		accessories: [],
		clothing: ['shirtScoopNeck'],
		clothesColor: [stripHashPrefix(PRESET_COLORS[13])], // 22c55e – Green
		skinColor:   [stripHashPrefix(SKIN_COLORS[1])],     // ffe0bd – Porcelain
	},
	// Androgynous person with shaved sides and a fashion hair color – represents non-binary / queer users.
	{
		name: 'Shaved Sides',
		top: ['shavedSides'],
		hairColor:   [stripHashPrefix(HAIR_COLORS[15])],    // 9b59b6 – Purple
		eyebrows: ['defaultNatural'],
		eyes: ['default'],
		mouth: ['smile'],
		facialHair: [],
		accessories: [],
		clothing: ['shirtVNeck'],
		clothesColor: [stripHashPrefix(PRESET_COLORS[11])], // 1f2937 – Charcoal
		skinColor:   [stripHashPrefix(SKIN_COLORS[4])],     // edb98a – Light
	},
	// Woman with a black bob haircut – represents East Asian users / users with straight dark hair.
	{
		name: 'Black Bob',
		top: ['bob'],
		hairColor:   [stripHashPrefix(HAIR_COLORS[0])],     // 000000 – Black
		eyebrows: ['defaultNatural'],
		eyes: ['default'],
		mouth: ['smile'],
		facialHair: [],
		accessories: [],
		clothing: ['blazerAndSweater'],
		clothesColor: [stripHashPrefix(PRESET_COLORS[30])], // fbcfe8 – Light Pink
		skinColor:   [stripHashPrefix(SKIN_COLORS[2])],     // fddbb4 – Very Light
	},
];

/**
 * Map of avatar styles to their predefined presets.
 * Styles without presets will use random avatars for quick-start selection.
 */
const AVATAR_PRESETS_BY_STYLE: Partial<Record<AvatarStyle, AvatarPreset[]>> = {
	[AvatarStyle.AVATAAARS]: AVATAAARS_PRESETS,
	[AvatarStyle.OPEN_PEEPS]: OPEN_PEEPS_PRESETS,
	[AvatarStyle.MICAH]: MICAH_PRESETS,
};

/**
 * Converts a preset into a full AvatarConfig for a given style.
 */
export function presetToConfig(preset: AvatarPreset, style: AvatarStyle, size: AvatarSize): AvatarConfig {
	const options: Record<string, string[]> = {};
	for (const [key, value] of Object.entries(preset)) {
		if (key === 'name') continue;
		if (Array.isArray(value) && value.length > 0) {
			options[key] = value;
			// Probability not stored – renderer derives it from key presence.
		}
		// Empty array means disabled: omit the key so the renderer sets probability=0.
	}
	return { style, size, options };
}

/**
 * Generates 12 random avatar configs for a given style.
 * These are ephemeral preview avatars that may change on each generation.
 */
/**
 * Generates a single random AvatarConfig for the given style and size.
 * Exported so callers (e.g. onboarding carousel) can produce fresh random
 * avatars without importing the full editor.
 */
export function generateRandomAvatarConfig(style: AvatarStyle, size: AvatarSize): AvatarConfig {
	const componentOptions = getStyleComponentOptions(style);
	const colorKeys = getStyleColorKeys(style);
	const probabilityKeys = getStyleProbabilityKeys(style);
	const randomOptions: Record<string, string[]> = {};

	for (const [key, values] of Object.entries(componentOptions)) {
		const realValues = values.filter((v) => v !== NONE_OPTION);
		if (realValues.length === 0) continue;
		if (style === AvatarStyle.OPEN_PEEPS && key === 'mask' && probabilityKeys[key]) {
			continue;
		}
		if (probabilityKeys[key]) {
			const allValues = [NONE_OPTION, ...realValues];
			const randomValue = allValues[Math.floor(Math.random() * allValues.length)];
			if (randomValue !== NONE_OPTION) {
				randomOptions[key] = [randomValue];
			}
		} else {
			randomOptions[key] = [realValues[Math.floor(Math.random() * realValues.length)]];
		}
	}
	for (const key of colorKeys) {
		const presetColors = getPresetColorsForKey(key, style);
		const randomColor = presetColors[Math.floor(Math.random() * presetColors.length)];
		randomOptions[key] = [stripHashPrefix(randomColor)];
	}
	return { style, size, options: randomOptions };
}

function generateRandomPresets(style: AvatarStyle, size: AvatarSize): AvatarConfig[] {
	const configs: AvatarConfig[] = [];
	for (let i = 0; i < 12; i++) {
		configs.push(generateRandomAvatarConfig(style, size));
	}
	return configs;
}

/**
 * Returns 12 preset AvatarConfigs for the given style.
 * Uses defined presets if available, otherwise generates random ones.
 */
function getPresetsForStyle(style: AvatarStyle, size: AvatarSize): AvatarConfig[] {
	const presets = AVATAR_PRESETS_BY_STYLE[style];
	if (presets && presets.length > 0) {
		return presets.map((p) => presetToConfig(p, style, size));
	}
	return generateRandomPresets(style, size);
}

/** Size used for preset grid avatars. */
const PRESET_AVATAR_SIZE = 72;

type PresetSelectionModalContentProps = AvatarPreviewAppearanceProps &
	Pick<AvatarEditorBehaviorProps, 'translate'> & {
		allowedStyles: AvatarStyle[];
		size: AvatarSize;
		onSelectPreset: (config: AvatarConfig) => void;
		onCustomize: () => void;
	};

const PresetSelectionModalContent: React.FC<PresetSelectionModalContentProps> = ({
	allowedStyles,
	size,
	accentColor,
	onSelectPreset,
	onCustomize,
	rounded,
	backgroundColor,
	translate,
}) => {
	const { theme } = useTheme();

	// Use the first allowed style for presets (if only one style, use that)
	const style = allowedStyles[0] ?? DEFAULT_AVATAR_STYLE;
	const presets = useMemo(() => getPresetsForStyle(style, size), [style, size]);

	return (
		<View style={styles.content}>
			<SettingsListGroupTitle title={translate ? translate('avatar_section_quickstart') : 'Quick Start'} />
			<Text style={[styles.quickstartHint, { color: theme.screen.placeholder }]}>
				{translate ? translate('avatar_quickstart_pick_hint') : 'Choose a basis to start'}
			</Text>
			<View style={styles.presetGrid}>
				{presets.map((presetConfig, index) => (
					<TouchableOpacity
						key={index}
						style={styles.presetItem}
						onPress={() => onSelectPreset(presetConfig)}
					>
						<MyAvatar
							config={{ ...presetConfig, size: PRESET_AVATAR_SIZE as AvatarSize }}
							borderRadius={PRESET_AVATAR_SIZE / 2}
							rounded={rounded}
							backgroundColor={backgroundColor}
						/>
					</TouchableOpacity>
				))}
			</View>

			<SettingsListGroupTitle title={translate ? translate('avatar_section_actions') : 'Actions'} />
			<SettingsList
				title={translate ? translate('avatar_customize') : 'Customize'}
				value={translate ? translate('avatar_customize_hint') : 'Customize avatar completely from scratch'}
				onPress={onCustomize}
				leftIcon={<MaterialCommunityIcons name="tune-variant" size={20} />}
				iconBgColor={accentColor}
				groupPosition="single"
			/>
		</View>
	);
};

export type UseAvatarEditorModalOptions = AvatarPreviewAppearanceProps &
	AvatarEditorBehaviorProps & {
		title?: string;
		/** Restrict which avatar styles are available. If only one style is provided, the style selector is hidden. */
		allowedStyles?: AvatarStyle[];
		/** If true, show a delete button (for optional avatar). */
		allowDelete?: boolean;
	};

export type OpenAvatarEditorProps = {
	/** If provided, the editor opens directly in edit mode. If null/undefined, the QuickStart preset picker is shown first. */
	currentAvatar?: AvatarConfig | null;
	onDone: (config: AvatarConfig) => void;
	/** Called when the user confirms deletion. The modal is closed automatically. */
	onDelete?: () => void;
	options?: UseAvatarEditorModalOptions;
};

type AvatarEditorUnifiedContentProps = AvatarPreviewAppearanceProps &
	AvatarEditorBehaviorProps & {
		modeObservable: ModeObservable;
		configObservable: ConfigObservable;
		configRef: React.MutableRefObject<AvatarConfig>;
		onApply: () => void;
		onChange?: () => void;
		onReset?: () => void;
		onDelete?: () => void;
		allowedStyles: AvatarStyle[];
		size: AvatarSize;
	};

const AvatarEditorUnifiedContent: React.FC<AvatarEditorUnifiedContentProps> = ({
	modeObservable,
	configObservable,
	configRef,
	onApply,
	onChange,
	onReset,
	onDelete,
	allowedStyles,
	size,
	accentColor,
	debugMode,
	hiddenProps,
	rounded,
	backgroundColor,
	translate,
	enablePhotoImport,
}) => {
	const [mode, setMode] = useState<Mode>(modeObservable.get());

	useEffect(() => {
		return modeObservable.subscribe(setMode);
	}, [modeObservable]);

	const switchToEditor = useCallback(
		(config: AvatarConfig) => {
			configRef.current = { ...config };
			configObservable.set({ ...config });
			modeObservable.set('editor');
			onChange?.();
		},
		[configRef, configObservable, modeObservable, onChange],
	);

	if (mode === 'quickstart') {
		const defaultStyle = allowedStyles[0] ?? DEFAULT_AVATAR_STYLE;
		return (
			<PresetSelectionModalContent
				allowedStyles={allowedStyles}
				size={size}
				accentColor={accentColor}
				rounded={rounded}
				backgroundColor={backgroundColor}
				translate={translate}
				onSelectPreset={switchToEditor}
				onCustomize={() => {
					switchToEditor({
						style: defaultStyle,
						size,
						options: getDefaultOptionsForStyle(defaultStyle),
					});
				}}
			/>
		);
	}

	return (
		<AvatarEditorModalContent
			initialConfig={configRef.current}
			accentColor={accentColor}
			configObservable={configObservable}
			configRef={configRef}
			debugMode={debugMode}
			allowedStyles={allowedStyles}
			showApplyButton={false}
			onApply={onApply}
			onChange={onChange}
			onReset={onReset}
			onDelete={onDelete}
			hiddenProps={hiddenProps}
			rounded={rounded}
			backgroundColor={backgroundColor}
			translate={translate}
			enablePhotoImport={enablePhotoImport}
		/>
	);
};

export const useAvatarEditorModal = () => {
	const { show, close } = useMyScrollViewModal();
	const configRef = useRef<AvatarConfig>(getDefaultAvatarConfig());
	const observableRef = useRef<ConfigObservable>(new ConfigObservable(getDefaultAvatarConfig()));

	/**
	 * Shows the avatar editor directly (Component 1 flow: Edit existing avatar).
	 * When the modal is closed, onClose is called with the final config.
	 */
	const showAvatarEditor = useCallback(
		(initialConfig: AvatarConfig, onClose: (config: AvatarConfig) => void, options?: UseAvatarEditorModalOptions) => {
			configRef.current = { ...initialConfig };
			observableRef.current = new ConfigObservable({ ...initialConfig });

			const allowedStyles = options?.allowedStyles ?? Object.values(AvatarStyle);

			show({
				title: options?.title ?? 'Avatar Editor',
				onClose: () => {
					onClose(configRef.current);
				},
				stickyHeaderComponent: (
					<AvatarStickyHeader
						configObservable={observableRef.current}
						accentColor={options?.accentColor}
						rounded={options?.rounded}
						backgroundColor={options?.backgroundColor}
					/>
				),
				children: (
					<AvatarEditorModalContent
						initialConfig={initialConfig}
						accentColor={options?.accentColor}
						configObservable={observableRef.current}
						configRef={configRef}
						debugMode={options?.debugMode}
						allowedStyles={allowedStyles}
						showApplyButton={true}
						onApply={() => {
							onClose(configRef.current);
							close();
						}}
						hiddenProps={options?.hiddenProps}
						rounded={options?.rounded}
						backgroundColor={options?.backgroundColor}
						translate={options?.translate}
					/>
				),
			});
		},
		[show, close],
	);

	/**
	 * Shows the preset selection (Component 2 flow: Create new from start).
	 * After selecting a preset, the editor is opened for customization.
	 * onDone is called when the user applies the final config.
	 */
	const showPresetSelection = useCallback(
		(onDone: (config: AvatarConfig) => void, options?: UseAvatarEditorModalOptions) => {
			const allowedStyles = options?.allowedStyles ?? Object.values(AvatarStyle);
			const defaultStyle = allowedStyles[0] ?? DEFAULT_AVATAR_STYLE;
			const size = AvatarSize.LARGE;

			const openEditorWithConfig = (presetConfig: AvatarConfig) => {
				configRef.current = { ...presetConfig };
				observableRef.current = new ConfigObservable({ ...presetConfig });

				show({
					title: options?.title ?? 'Avatar Editor',
					onClose: () => {
						onDone(configRef.current);
					},
					stickyHeaderComponent: (
						<AvatarStickyHeader
							configObservable={observableRef.current}
							accentColor={options?.accentColor}
							rounded={options?.rounded}
							backgroundColor={options?.backgroundColor}
						/>
					),
					children: (
						<AvatarEditorModalContent
							initialConfig={presetConfig}
							accentColor={options?.accentColor}
							configObservable={observableRef.current}
							configRef={configRef}
							debugMode={options?.debugMode}
							allowedStyles={allowedStyles}
							showApplyButton={true}
							onApply={() => {
								onDone(configRef.current);
								close();
							}}
							hiddenProps={options?.hiddenProps}
							rounded={options?.rounded}
							backgroundColor={options?.backgroundColor}
							translate={options?.translate}
						/>
					),
				});
			};

			const openCustomizeFromScratch = () => {
				const defaultConfig: AvatarConfig = {
					style: defaultStyle,
					size,
					options: getDefaultOptionsForStyle(defaultStyle),
				};
				openEditorWithConfig(defaultConfig);
			};

			show({
				title: options?.title ?? 'Choose Avatar',
				children: (
					<PresetSelectionModalContent
						allowedStyles={allowedStyles}
						size={size}
						accentColor={options?.accentColor}
						rounded={options?.rounded}
						backgroundColor={options?.backgroundColor}
						translate={options?.translate}
						onSelectPreset={openEditorWithConfig}
						onCustomize={openCustomizeFromScratch}
					/>
				),
			});
		},
		[show, close],
	);

	/**
	 * QuickStart flow: opens the editor directly with a default config (single modal).
	 * No preset-selection step — user lands straight in the customize view.
	 * onDone is called when the user presses Apply or closes the modal.
	 */
	const showAvatarEditorQuickStart = useCallback(
		(onDone: (config: AvatarConfig) => void, options?: UseAvatarEditorModalOptions) => {
			const allowedStyles = options?.allowedStyles ?? Object.values(AvatarStyle);
			const defaultStyle = allowedStyles[0] ?? DEFAULT_AVATAR_STYLE;
			const size = AvatarSize.LARGE;

			const defaultConfig: AvatarConfig = {
				style: defaultStyle,
				size,
				options: getDefaultOptionsForStyle(defaultStyle),
			};

			configRef.current = { ...defaultConfig };
			observableRef.current = new ConfigObservable({ ...defaultConfig });

			show({
				title: options?.title ?? 'Avatar Editor',
				onClose: () => {
					onDone(configRef.current);
				},
				stickyHeaderComponent: (
					<AvatarStickyHeader
						configObservable={observableRef.current}
						accentColor={options?.accentColor}
						rounded={options?.rounded}
						backgroundColor={options?.backgroundColor}
					/>
				),
				children: (
					<AvatarEditorModalContent
						initialConfig={defaultConfig}
						accentColor={options?.accentColor}
						configObservable={observableRef.current}
						configRef={configRef}
						debugMode={options?.debugMode}
						allowedStyles={allowedStyles}
						showApplyButton={true}
						onApply={() => {
							onDone(configRef.current);
							close();
						}}
						hiddenProps={options?.hiddenProps}
						rounded={options?.rounded}
						backgroundColor={options?.backgroundColor}
						translate={options?.translate}
					/>
				),
			});
		},
		[show, close],
	);

	/**
	 * Unified single-modal flow: opens QuickStart if currentAvatar is null/undefined,
	 * or jumps directly to the editor if currentAvatar is provided.
	 * The sticky header is only rendered in editor mode.
	 * onDone is called only when the user has made at least one change (dirty flag).
	 * onDelete is called when the user presses the Delete button inside the editor.
	 */
	const openAvatarEditor = useCallback(
		({ currentAvatar, onDone, onDelete, options }: OpenAvatarEditorProps) => {
			const allowedStyles = options?.allowedStyles ?? Object.values(AvatarStyle);
			const defaultStyle = allowedStyles[0] ?? DEFAULT_AVATAR_STYLE;
			const size = AvatarSize.LARGE;

			// Avatars in a style that is no longer allowed (e.g. legacy micah avatars after the
			// switch to avataaars as default) are kept untouched for display, but cannot be edited
			// anymore: the editor starts in quickstart mode so the user creates a new avatar in the
			// current default style. Closing without a change keeps the stored legacy avatar because
			// saving only happens via the dirty flag. Debug mode lifts this restriction (there the
			// style selector offers all styles anyway).
			const isLegacyStyle =
				currentAvatar != null && !options?.debugMode && !allowedStyles.includes(currentAvatar.style);
			const editableAvatar = isLegacyStyle ? null : currentAvatar;

			const initialMode: Mode = editableAvatar != null ? 'editor' : 'quickstart';
			let initialConfig: AvatarConfig = editableAvatar ?? {
				style: defaultStyle,
				size,
				options: getDefaultOptionsForStyle(defaultStyle),
			};

			// Apply hidden props to the initial config so forced values are enforced from the start.
			if (!options?.debugMode && options?.hiddenProps) {
				const newOptions = { ...(initialConfig.options ?? {}) };
				for (const [key, value] of Object.entries(options.hiddenProps)) {
					newOptions[key] = [value];
				}
				initialConfig = { ...initialConfig, options: newOptions };
			}

			configRef.current = { ...initialConfig };
			observableRef.current = new ConfigObservable({ ...initialConfig });
			const modeObservable = new ModeObservable(initialMode);

			// Dirty tracking: only save when the user has actually made a change.
			const isDirtyRef = { current: false };

			show({
				title: options?.title ?? 'Avatar Editor',
				onClose: () => {
					if (isDirtyRef.current) {
						onDone(configRef.current);
					}
				},
				stickyHeaderComponent: (
					<AvatarStickyHeaderConditional
						modeObservable={modeObservable}
						configObservable={observableRef.current}
						accentColor={options?.accentColor}
						rounded={options?.rounded}
						backgroundColor={options?.backgroundColor}
					/>
				),
				children: (
					<AvatarEditorUnifiedContent
						modeObservable={modeObservable}
						configObservable={observableRef.current}
						configRef={configRef}
						onApply={() => {
							isDirtyRef.current = true;
							onDone(configRef.current);
							close();
						}}
						onChange={() => { isDirtyRef.current = true; }}
						onReset={() => { isDirtyRef.current = false; }}
						onDelete={onDelete ? () => { isDirtyRef.current = false; onDelete(); close(); } : undefined}
						allowedStyles={allowedStyles}
						size={size}
						accentColor={options?.accentColor}
						debugMode={options?.debugMode}
						hiddenProps={options?.hiddenProps}
						rounded={options?.rounded}
						backgroundColor={options?.backgroundColor}
						translate={options?.translate}
						enablePhotoImport={options?.enablePhotoImport}
					/>
				),
			});
		},
		[show, close],
	);

	return { showAvatarEditor, showPresetSelection, showAvatarEditorQuickStart, openAvatarEditor, close };
};

const styles = StyleSheet.create({
	content: {
		width: '100%',
	},
	avatarContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
		position: 'relative',
	},
	diceButton: {
		position: 'absolute',
		top: 24,
		right: 0,
		padding: 8,
		borderRadius: 10,
	},
	colorSwatch: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 1.5,
	},
	colorSwatchLarge: {
		width: PREVIEW_AVATAR_SIZE,
		height: PREVIEW_AVATAR_SIZE,
		borderRadius: PREVIEW_AVATAR_SIZE / 2,
		borderWidth: 1.5,
	},
	colorSwatchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	hexLabel: {
		fontSize: 11,
		fontFamily: 'monospace',
	},
	previewAvatarWrapper: {
		marginRight: 10,
	},
	quickstartHint: {
		fontSize: 13,
		paddingHorizontal: 16,
		paddingBottom: 4,
	},
	presetGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		paddingVertical: 12,
		gap: 12,
	},
	presetItem: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 8,
		borderRadius: 12,
	},
	debugJson: {
		fontFamily: 'monospace',
		fontSize: 12,
		padding: 12,
	},
	debugJsonInput: {
		fontFamily: 'monospace',
		fontSize: 12,
		padding: 12,
		marginHorizontal: 12,
		borderWidth: 1,
		borderRadius: 8,
		minHeight: 120,
		textAlignVertical: 'top',
	},
	debugJsonError: {
		color: '#ef4444',
		fontSize: 12,
		paddingHorizontal: 12,
		paddingTop: 4,
	},
	debugShowButton: {
		marginHorizontal: 12,
		marginTop: 8,
		marginBottom: 12,
		paddingVertical: 10,
		borderRadius: 8,
		alignItems: 'center',
	},
	debugShowButtonText: {
		fontFamily: 'Poppins_700Bold',
		fontSize: 14,
	},
	debugSection: {
		borderWidth: 2,
		borderColor: 'red',
		borderRadius: 12,
		marginTop: 16,
		overflow: 'hidden',
	},
});
