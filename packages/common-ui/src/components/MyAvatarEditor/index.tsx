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
 * ─── NESTED SCROLLVIEW (do NOT add) ──────────────────────────────────────────
 *   Do NOT add another ScrollView / FlatList inside AvatarEditorModalContent.
 *   All scrolling must be handled by MyScrollViewModal's BottomSheetScrollView
 *   to avoid gesture conflicts with gorhom/bottom-sheet. Sub-modals
 *   (StylePickerModalContent, ComponentPickerModalContent, ColorPickerModalContent)
 *   are opened via a separate useMyScrollViewModal instance and each get their
 *   own BottomSheetScrollView — that is fine.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import MyAvatar, { AvatarStyle, AvatarSize, STYLE_MAP, AvatarConfig, getStyleProbabilityKeys } from '../MyAvatar';
import { Style } from '@dicebear/core';
import { useMyScrollViewModal } from '../GlobalModal/useMyScrollViewModal';
import SettingsListGroupTitle from '../SettingsListGroupTitle';
import SettingsList from '../SettingsList';
import SettingsListLeftRight, { type SettingsListLeftRightItem } from '../SettingsListLeftRight/SettingsListLeftRight';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HAIR_COLORS, SKIN_COLORS, PRESET_COLORS } from '../MyColorPicker';
import { myContrastColor } from '../../helpers/ColorHelper';
import { useTheme } from '../../context/ThemeContext';
import SettingsListSelectOptionSingle from '../SettingsListSelectOptionSingle/SettingsListSelectOptionSingle';
import SettingsListNumberInput from '../SettingsListNumberInput/SettingsListNumberInput';

export type { AvatarConfig } from '../MyAvatar';

/**
 * Namespaced avatar property key enums, organised by avatar style.
 * Use enum values together with `lockedProps` in `UseAvatarEditorModalOptions`
 * to hide a prop from the editor UI and always inject it with a fixed value.
 *
 * @example
 * ```ts
 * lockedProps: { [AvatarPropKey.OpenPeeps.SCALE]: '100' }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AvatarPropKey {
	export enum OpenPeeps {
		SCALE = 'scale',
		TRANSLATE_X = 'translateX',
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

const DEFAULT_AVATAR_STYLE = AvatarStyle.LORELEI;

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
			const presetColors = getPresetColorsForKey(key);
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
 */
function getPresetColorsForKey(key: string): string[] {
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

type AvatarEditorModalContentProps = {
	initialConfig: AvatarConfig;
	accentColor?: string;
	configObservable: ConfigObservable;
	configRef: React.MutableRefObject<AvatarConfig>;
	debugMode?: boolean;
	/** Allowed avatar styles. If only one is provided, the style selector is hidden. */
	allowedStyles?: AvatarStyle[];
	/** Show an "Apply" button at the top to accept changes and close. */
	showApplyButton?: boolean;
	/** Called when the user presses "Apply". */
	onApply?: () => void;
	/**
	 * Props that are always injected into the avatar config with a fixed value
	 * and are hidden from the editor UI. Use values from the `AvatarPropKey` namespace.
	 */
	lockedProps?: Record<string, string>;
	/** Forwarded from the caller's MyAvatar: when true (default), previews are circles. */
	rounded?: boolean;
	/** Forwarded from the caller's MyAvatar: background colour shown behind previews. */
	backgroundColor?: string;
};

type AvatarStickyHeaderProps = {
	configObservable: ConfigObservable;
	accentColor?: string;
	rounded?: boolean;
	backgroundColor?: string;
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

type AvatarStickyHeaderConditionalProps = {
	modeObservable: ModeObservable;
	configObservable: ConfigObservable;
	accentColor?: string;
	rounded?: boolean;
	backgroundColor?: string;
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

type ColorPickerModalContentProps = {
	colors: string[];
	initialSelectedColor: string | null;
	onSelectAndClose: (color: string) => void;
	accentColor?: string;
	config: AvatarConfig;
	colorKey: string;
	rounded?: boolean;
	backgroundColor?: string;
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
}) => {
	return (
		<>
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
					/>
				);
			})}
		</>
	);
};

type StylePickerModalContentProps = {
	currentStyle: AvatarStyle;
	onSelectAndClose: (style: AvatarStyle) => void;
	accentColor?: string;
	allowedStyles?: AvatarStyle[];
	rounded?: boolean;
	backgroundColor?: string;
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

type ComponentPickerModalContentProps = {
	categoryKey: string;
	values: string[];
	currentValue: string | null;
	config: AvatarConfig;
	onSelectAndClose: (value: string) => void;
	accentColor?: string;
	rounded?: boolean;
	backgroundColor?: string;
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
	lockedProps,
	rounded,
	backgroundColor,
}) => {
	const [config, setConfig] = useState<AvatarConfig>(configRef.current);
	const { show: showCategoryModal, close: closeCategoryModal } = useMyScrollViewModal();
	const { theme, isDark } = useTheme();

	const lockedPropKeys = useMemo(() => new Set(Object.keys(lockedProps ?? {})), [lockedProps]);

	const effectiveAllowedStyles = allowedStyles ?? Object.values(AvatarStyle);

	const applyLockedProps = useCallback(
		(cfg: AvatarConfig): AvatarConfig => {
			// In debug mode, skip applying locked props so users can view and edit them freely.
			if (debugMode) return cfg;
			if (!lockedProps || Object.keys(lockedProps).length === 0) return cfg;
			const newOptions = { ...(cfg.options ?? {}) };
			for (const [key, value] of Object.entries(lockedProps)) {
				if (value !== undefined) {
					newOptions[key] = [value];
				}
			}
			return { ...cfg, options: newOptions };
		},
		[lockedProps, debugMode],
	);

	const handleChange = (newConfig: AvatarConfig) => {
		const withLocked = applyLockedProps(newConfig);
		setConfig(withLocked);
		configRef.current = withLocked;
		configObservable.set(withLocked);
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
		if (probabilityKeys[key] && (!selected || selected.length === 0)) {
			return NONE_OPTION;
		}
		if (selected && selected.length > 0) return selected[0];
		return null;
	};

	const handleRandomize = () => {
		const newComponentOptions = getStyleComponentOptions(config.style);
		const newColorKeys = getStyleColorKeys(config.style);
		const newProbabilityKeys = getStyleProbabilityKeys(config.style);
		const randomOptions: Record<string, string[]> = {};
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
			const presetColors = getPresetColorsForKey(key);
			const randomColor = presetColors[Math.floor(Math.random() * presetColors.length)];
			randomOptions[key] = [stripHashPrefix(randomColor)];
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
		const presetColors = getPresetColorsForKey(key);
		const storedHex = config.options?.[key]?.[0] ?? null;
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
			return getPresetColorsForKey(cat).map((color) => {
				const hex = stripHashPrefix(color);
				return { id: hex, label: '' };
			});
		}
		const values = componentOptions[cat] ?? [];
		return values.map((value) => ({ id: value, label: value === NONE_OPTION ? 'None' : value }));
	};

	const getCategorySelectedOption = (cat: string): string | null => {
		if (cat === BUILTIN_CATEGORY_STYLE) return config.style;
		if (colorKeys.includes(cat)) return config.options?.[cat]?.[0] ?? null;
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

	// Hide categories that have only one option (no meaningful choice) and locked props
	const visibleAttributeKeys = useMemo(() => {
		return sortedAttributeKeys.filter((cat) => {
			// Always hide locked props from the main category list; they appear in the debug section instead.
			if (lockedPropKeys.has(cat)) return false;
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
	}, [sortedAttributeKeys, colorKeys, componentOptions, lockedPropKeys, debugMode]);

	// Hide style selector when only one style is allowed
	const showStyleCategory = effectiveAllowedStyles.length > 1;
	const allCategories = [
		...(showStyleCategory ? [BUILTIN_CATEGORY_STYLE] : []),
		...visibleAttributeKeys,
	];

	const diceButtonBg = accentColor ?? theme.screen.text;
	const diceIconColor = myContrastColor(diceButtonBg, theme, isDark);

	return (
		<View style={styles.content}>
			{showApplyButton && onApply && (
				<>
					<SettingsList
						title="Apply"
						onPress={onApply}
						leftIcon={<MaterialCommunityIcons name="check-circle" size={20} />}
						iconBgColor={accentColor}
						groupPosition="single"
					/>
				</>
			)}

			<SettingsListGroupTitle title="Category" />
			{allCategories.map((cat, index) => {
				const groupPosition =
					allCategories.length === 1
						? 'single'
						: index === 0
							? 'top'
							: index === allCategories.length - 1
								? 'bottom'
								: 'middle';
				const colorKey = colorKeys.includes(cat) ? config.options?.[cat]?.[0] : null;
				const swatchColor = colorKey ? '#' + colorKey : undefined;
				const swatchBorderColor = swatchColor ? myContrastColor(swatchColor, theme, isDark) : undefined;

				const iconName = CATEGORY_ICON_MAP[cat] ?? 'help-circle-outline';

				return (
					<SettingsListLeftRight
						key={cat}
						label={cat}
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

			<SettingsListGroupTitle title="Actions" />
			<SettingsList
				title="Randomize"
				onPress={handleRandomize}
				leftIcon={<MaterialCommunityIcons name="dice-multiple" size={20} />}
				iconBgColor={accentColor}
				groupPosition="single"
			/>

			{debugMode && (
				<View style={styles.debugSection}>
					<SettingsListGroupTitle title="Debug" />
					<SettingsList
						title="Copy Config"
						onPress={handleCopyConfig}
						leftIcon={<MaterialCommunityIcons name="content-copy" size={20} />}
						iconBgColor={accentColor}
						groupPosition="top"
						showSeparator={true}
					/>
					<SettingsListNumberInput
						title="translateX"
						leftIcon={<MaterialCommunityIcons name="arrow-left-right" size={20} />}
						iconBgColor={accentColor}
						groupPosition="bottom"
						showSeparator={false}
						initialValue={
							config.options?.translateX !== undefined
								? parseInt(config.options.translateX[0], 10)
								: config.style === AvatarStyle.OPEN_PEEPS
									? -6
									: 0
						}
						value={
							config.options?.translateX !== undefined
								? config.options.translateX[0]
								: config.style === AvatarStyle.OPEN_PEEPS
									? '-6 (default)'
									: undefined
						}
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
						onSave={(value) => {
							handleChange({
								...config,
								options: { ...(config.options ?? {}), [AvatarPropKey.OpenPeeps.TRANSLATE_X]: [String(value)] },
							});
						}}
					/>
					{lockedProps && Object.keys(lockedProps).length > 0 && (
						<>
							<SettingsListGroupTitle title="Blocked Props" />
							{Object.entries(lockedProps).map(([key, value], index, arr) => {
								const groupPosition =
									arr.length === 1
										? 'single'
										: index === 0
											? 'top'
											: index === arr.length - 1
												? 'bottom'
												: 'middle';
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
					)}
					<DebugJsonInput
						config={config}
						onApply={handleChange}
						accentColor={accentColor}
						theme={theme}
					/>
				</View>
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
 * Map of avatar styles to their predefined presets.
 * Styles without presets will use random avatars for quick-start selection.
 */
const AVATAR_PRESETS_BY_STYLE: Partial<Record<AvatarStyle, AvatarPreset[]>> = {
	[AvatarStyle.OPEN_PEEPS]: OPEN_PEEPS_PRESETS,
};

/**
 * Converts a preset into a full AvatarConfig for a given style.
 */
function presetToConfig(preset: AvatarPreset, style: AvatarStyle, size: AvatarSize): AvatarConfig {
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
function generateRandomPresets(style: AvatarStyle, size: AvatarSize): AvatarConfig[] {
	const configs: AvatarConfig[] = [];
	const componentOptions = getStyleComponentOptions(style);
	const colorKeys = getStyleColorKeys(style);
	const probabilityKeys = getStyleProbabilityKeys(style);

	for (let i = 0; i < 12; i++) {
		const randomOptions: Record<string, string[]> = {};
		for (const [key, values] of Object.entries(componentOptions)) {
			const realValues = values.filter((v) => v !== NONE_OPTION);
			if (realValues.length === 0) continue;
			// For openPeeps, mask is always none (key absent = renderer sets probability=0)
			if (style === AvatarStyle.OPEN_PEEPS && key === 'mask' && probabilityKeys[key]) {
				continue;
			}
			// For optional components, include "none" as a possible random selection
			if (probabilityKeys[key]) {
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
		for (const key of colorKeys) {
			const presetColors = getPresetColorsForKey(key);
			const randomColor = presetColors[Math.floor(Math.random() * presetColors.length)];
			randomOptions[key] = [stripHashPrefix(randomColor)];
		}
		configs.push({ style, size, options: randomOptions });
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

type PresetSelectionModalContentProps = {
	allowedStyles: AvatarStyle[];
	size: AvatarSize;
	accentColor?: string;
	onSelectPreset: (config: AvatarConfig) => void;
	onCustomize: () => void;
	rounded?: boolean;
	backgroundColor?: string;
};

const PresetSelectionModalContent: React.FC<PresetSelectionModalContentProps> = ({
	allowedStyles,
	size,
	accentColor,
	onSelectPreset,
	onCustomize,
	rounded,
	backgroundColor,
}) => {
	const { theme } = useTheme();

	// Use the first allowed style for presets (if only one style, use that)
	const style = allowedStyles[0] ?? DEFAULT_AVATAR_STYLE;
	const presets = useMemo(() => getPresetsForStyle(style, size), [style, size]);

	return (
		<View style={styles.content}>
			<SettingsListGroupTitle title="Quick Start" />
			<View style={styles.presetGrid}>
				{presets.map((presetConfig, index) => (
					<TouchableOpacity
						key={index}
						style={[styles.presetItem, { borderColor: theme.screen.text }]}
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

			<SettingsListGroupTitle title="Actions" />
			<SettingsList
				title="Customize"
				onPress={onCustomize}
				leftIcon={<MaterialCommunityIcons name="tune-variant" size={20} />}
				iconBgColor={accentColor}
				groupPosition="single"
			/>
		</View>
	);
};

export type UseAvatarEditorModalOptions = {
	title?: string;
	accentColor?: string;
	debugMode?: boolean;
	/** Restrict which avatar styles are available. If only one style is provided, the style selector is hidden. */
	allowedStyles?: AvatarStyle[];
	/** If true, show a delete button (for optional avatar). */
	allowDelete?: boolean;
	/**
	 * Props that are always injected into the avatar config with a fixed value
	 * and are hidden from the editor UI. Use values from the `AvatarPropKey` namespace.
	 * @example `{ [AvatarPropKey.OpenPeeps.SCALE]: '100' }` locks the scale to 100.
	 */
	lockedProps?: Record<string, string>;
	/** Forwarded to all avatar previews inside the editor. When true (default), avatars are rendered as circles. */
	rounded?: boolean;
	/** Forwarded to all avatar previews inside the editor. Background colour shown behind each avatar. */
	backgroundColor?: string;
};

export type OpenAvatarEditorProps = {
	/** If provided, the editor opens directly in edit mode. If null/undefined, the QuickStart preset picker is shown first. */
	currentAvatar?: AvatarConfig | null;
	onDone: (config: AvatarConfig) => void;
	options?: UseAvatarEditorModalOptions;
};

type AvatarEditorUnifiedContentProps = {
	modeObservable: ModeObservable;
	configObservable: ConfigObservable;
	configRef: React.MutableRefObject<AvatarConfig>;
	onApply: () => void;
	allowedStyles: AvatarStyle[];
	size: AvatarSize;
	accentColor?: string;
	debugMode?: boolean;
	lockedProps?: Record<string, string>;
	rounded?: boolean;
	backgroundColor?: string;
};

const AvatarEditorUnifiedContent: React.FC<AvatarEditorUnifiedContentProps> = ({
	modeObservable,
	configObservable,
	configRef,
	onApply,
	allowedStyles,
	size,
	accentColor,
	debugMode,
	lockedProps,
	rounded,
	backgroundColor,
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
		},
		[configRef, configObservable, modeObservable],
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
				onSelectPreset={switchToEditor}
				onCustomize={() =>
					switchToEditor({
						style: defaultStyle,
						size,
						options: getDefaultOptionsForStyle(defaultStyle),
					})
				}
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
			showApplyButton={true}
			onApply={onApply}
			lockedProps={lockedProps}
			rounded={rounded}
			backgroundColor={backgroundColor}
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
						lockedProps={options?.lockedProps}
						rounded={options?.rounded}
						backgroundColor={options?.backgroundColor}
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
							lockedProps={options?.lockedProps}
							rounded={options?.rounded}
							backgroundColor={options?.backgroundColor}
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
						lockedProps={options?.lockedProps}
						rounded={options?.rounded}
						backgroundColor={options?.backgroundColor}
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
	 * onDone is called when the user presses Apply or closes the modal.
	 */
	const openAvatarEditor = useCallback(
		({ currentAvatar, onDone, options }: OpenAvatarEditorProps) => {
			const allowedStyles = options?.allowedStyles ?? Object.values(AvatarStyle);
			const defaultStyle = allowedStyles[0] ?? DEFAULT_AVATAR_STYLE;
			const size = AvatarSize.LARGE;

			const initialMode: Mode = currentAvatar != null ? 'editor' : 'quickstart';
			const initialConfig: AvatarConfig = currentAvatar ?? {
				style: defaultStyle,
				size,
				options: getDefaultOptionsForStyle(defaultStyle),
			};

			configRef.current = { ...initialConfig };
			observableRef.current = new ConfigObservable({ ...initialConfig });
			const modeObservable = new ModeObservable(initialMode);

			show({
				title: options?.title ?? 'Avatar Editor',
				onClose: () => {
					onDone(configRef.current);
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
							onDone(configRef.current);
							close();
						}}
						allowedStyles={allowedStyles}
						size={size}
						accentColor={options?.accentColor}
						debugMode={options?.debugMode}
						lockedProps={options?.lockedProps}
						rounded={options?.rounded}
						backgroundColor={options?.backgroundColor}
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
	previewAvatarWrapper: {
		marginRight: 10,
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
		borderWidth: 1,
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
