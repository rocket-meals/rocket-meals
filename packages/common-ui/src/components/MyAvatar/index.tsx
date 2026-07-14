import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { createAvatar, Style } from '@dicebear/core';
import * as collection from '@dicebear/collection';
import { micahExtended } from './micahExtended';

export enum AvatarStyle {
	ADVENTURER = 'adventurer',
	ADVENTURER_NEUTRAL = 'adventurerNeutral',
	AVATAAARS = 'avataaars',
	AVATAAARS_NEUTRAL = 'avataaarsNeutral',
	BIG_EARS = 'bigEars',
	BIG_EARS_NEUTRAL = 'bigEarsNeutral',
	BIG_SMILE = 'bigSmile',
	BOTTTS = 'bottts',
	BOTTTS_NEUTRAL = 'botttsNeutral',
	CROODLES = 'croodles',
	CROODLES_NEUTRAL = 'croodlesNeutral',
	DYLAN = 'dylan',
	FUN_EMOJI = 'funEmoji',
	GLASS = 'glass',
	ICONS = 'icons',
	IDENTICON = 'identicon',
	INITIALS = 'initials',
	LORELEI = 'lorelei',
	LORELEI_NEUTRAL = 'loreleiNeutral',
	MICAH = 'micah',
	MINIAVS = 'miniavs',
	NOTIONISTS = 'notionists',
	NOTIONISTS_NEUTRAL = 'notionistsNeutral',
	OPEN_PEEPS = 'openPeeps',
	PERSONAS = 'personas',
	PIXEL_ART = 'pixelArt',
	PIXEL_ART_NEUTRAL = 'pixelArtNeutral',
	RINGS = 'rings',
	SHAPES = 'shapes',
	THUMBS = 'thumbs',
	TOON_HEAD = 'toonHead',
}

export enum AvatarSize {
	SMALL = 48,
	MEDIUM = 96,
	LARGE = 128,
	XLARGE = 192,
}

export type AvatarConfig = {
	style: AvatarStyle;
	size: AvatarSize;
	/**
	 * Style-specific options. Array values for component/color options (e.g. `skinColor: ['edb98a']`).
	 * Boolean values for flag options (e.g. `flip: true`, `clip: false`).
	 * Number values for numeric options (e.g. `rotate: 90`).
	 */
	options?: Record<string, string[] | boolean | number>;
};

/** Avatar preview appearance shared with the avatar-editor picker modals (see MyAvatarEditor). */
export type AvatarAppearanceProps = {
	/** When true (default), uses the avatar size as the border radius to produce a circle. */
	rounded?: boolean;
	/** Background color rendered behind the avatar. */
	backgroundColor?: string;
};

export type MyAvatarProps = AvatarAppearanceProps & {
	/** When provided, all avatar parameters are taken from this config object. */
	config?: AvatarConfig;
	style?: AvatarStyle;
	size?: AvatarSize | number;
	/** Explicit border radius. Ignored when `rounded` is true. */
	borderRadius?: number;
	/** Additional DiceBear options (e.g. eyes, mouth, hair, nose, etc.) */
	options?: Record<string, string[] | boolean | number>;
};

export const STYLE_MAP: Record<AvatarStyle, Style<object>> = {
	[AvatarStyle.ADVENTURER]: collection.adventurer,
	[AvatarStyle.ADVENTURER_NEUTRAL]: collection.adventurerNeutral,
	[AvatarStyle.AVATAAARS]: collection.avataaars,
	[AvatarStyle.AVATAAARS_NEUTRAL]: collection.avataaarsNeutral,
	[AvatarStyle.BIG_EARS]: collection.bigEars,
	[AvatarStyle.BIG_EARS_NEUTRAL]: collection.bigEarsNeutral,
	[AvatarStyle.BIG_SMILE]: collection.bigSmile,
	[AvatarStyle.BOTTTS]: collection.bottts,
	[AvatarStyle.BOTTTS_NEUTRAL]: collection.botttsNeutral,
	[AvatarStyle.CROODLES]: collection.croodles,
	[AvatarStyle.CROODLES_NEUTRAL]: collection.croodlesNeutral,
	[AvatarStyle.DYLAN]: collection.dylan,
	[AvatarStyle.FUN_EMOJI]: collection.funEmoji,
	[AvatarStyle.GLASS]: collection.glass,
	[AvatarStyle.ICONS]: collection.icons,
	[AvatarStyle.IDENTICON]: collection.identicon,
	[AvatarStyle.INITIALS]: collection.initials,
	[AvatarStyle.LORELEI]: collection.lorelei,
	[AvatarStyle.LORELEI_NEUTRAL]: collection.loreleiNeutral,
	[AvatarStyle.MICAH]: micahExtended,
	[AvatarStyle.MINIAVS]: collection.miniavs,
	[AvatarStyle.NOTIONISTS]: collection.notionists,
	[AvatarStyle.NOTIONISTS_NEUTRAL]: collection.notionistsNeutral,
	[AvatarStyle.OPEN_PEEPS]: collection.openPeeps,
	[AvatarStyle.PERSONAS]: collection.personas,
	[AvatarStyle.PIXEL_ART]: collection.pixelArt,
	[AvatarStyle.PIXEL_ART_NEUTRAL]: collection.pixelArtNeutral,
	[AvatarStyle.RINGS]: collection.rings,
	[AvatarStyle.SHAPES]: collection.shapes,
	[AvatarStyle.THUMBS]: collection.thumbs,
	[AvatarStyle.TOON_HEAD]: collection.toonHead,
};

/**
 * Returns a map of component keys to their corresponding probability property keys
 * for a given DiceBear avatar style. For example, { glasses: 'glassesProbability' }.
 */
export function getStyleProbabilityKeys(style: AvatarStyle): Record<string, string> {
	const dicebearStyle = STYLE_MAP[style] as Style<object> & { schema?: { properties?: Record<string, any> } };
	const properties = dicebearStyle?.schema?.properties;
	if (!properties) return {};

	const result: Record<string, string> = {};
	for (const key of Object.keys(properties)) {
		if (key.endsWith('Probability')) {
			const componentKey = key.replace('Probability', '');
			if (properties[componentKey]) {
				result[componentKey] = key;
			}
		}
	}
	return result;
}

// Every DiceBear-generated avatar (all styles) wraps its artwork in a <mask> that's a no-op:
// `<mask id="viewboxMask"><rect x="0" y="0" width="W" height="H" rx="0" ry="0" fill="#fff" /></mask>`
// where W/H exactly match the SVG's own viewBox. That rect covers the full viewport, so it clips
// nothing beyond what the SVG's own viewBox/viewport already clips - it's a redundant safety net.
// react-native-svg's Android renderer has long-standing bugs with <mask> (content inside a masked
// <g> frequently renders partially or not at all - see e.g. software-mansion/react-native-svg
// issues #2202, #1097, #1953), which is what caused avatars to render with pieces (typically the
// top portion, e.g. hair) missing/cut off on Android while rendering fine on web/iOS. Stripping
// this specific no-op mask removes that Android rendering bug without any visual change on
// platforms where <mask> works, since the SVG viewport clips the same area anyway. Only matches
// the exact no-op pattern above, so any *other*, visually meaningful <mask> a style might use for
// real shading/shaping (e.g. bottts, notionists, personas) is left untouched.
function stripRedundantViewboxMask(svg: string): string {
	return svg.replace(
		/<mask id="([^"]+)"><rect width="[\d.]+" height="[\d.]+" rx="0" ry="0" x="0" y="0" fill="#fff" \/><\/mask><g mask="url\(#\1\)">/,
		'<g>'
	);
}

const MyAvatar: React.FC<MyAvatarProps> = ({
	config,
	style: styleProp = AvatarStyle.LORELEI,
	size: sizeProp = AvatarSize.LARGE,
	borderRadius = 0,
	rounded = true,
	backgroundColor = '#ffffff',
	options: optionsProp,
}) => {
	const style = config?.style ?? styleProp;
	const size = config?.size ?? sizeProp;
	const options = config?.options ?? optionsProp;

	const resolvedBorderRadius = rounded ? size : borderRadius;

	const svgXml = useMemo(() => {
		const avatarStyle = STYLE_MAP[style];
		const renderOptions: Record<string, unknown> = { ...options };
		// For OpenPeeps, apply a visual default translateX of -6 when not explicitly set,
		// to compensate for the off-centre positioning of the avatar inside the background.
		if (style === AvatarStyle.OPEN_PEEPS && renderOptions['translateX'] === undefined) {
			renderOptions['translateX'] = ['-6'];
		}
		// Normalize flip to a proper boolean.
		// Supports both the current boolean format and legacy ["true"]/["false"] string-array format.
		const rawFlip = renderOptions['flip'];
		const flipValue: boolean =
			typeof rawFlip === 'boolean' ? rawFlip :
			Array.isArray(rawFlip) ? rawFlip[0] === 'true' :
			false;
		renderOptions['flip'] = flipValue;
		// When flip is true, mirror translateX so the avatar faces the correct direction.
		if (flipValue) {
			const rawTX = renderOptions['translateX'];
			let txNum = 0;
			if (Array.isArray(rawTX) && rawTX.length > 0) {
				txNum = Number.parseInt(rawTX[0], 10) || 0;
			} else if (typeof rawTX === 'number') {
				txNum = rawTX;
			}
			renderOptions['translateX'] = [String(-txNum)];
		}
		// Derive probability at render time from component key presence.
		// A component key present in options → probability 100 (visible).
		// A component key absent from options → probability 0 (hidden).
		// This keeps probability out of stored configs entirely.
		const probabilityKeys = getStyleProbabilityKeys(style);
		for (const [compKey, probKey] of Object.entries(probabilityKeys)) {
			const compValue = renderOptions[compKey];
			if (compValue && Array.isArray(compValue) && compValue.length > 0) {
				renderOptions[probKey] = ['100'];
			} else {
				renderOptions[probKey] = ['0'];
			}
		}
		const rawSvg = createAvatar(avatarStyle, {
			size,
			// A handful of styles (bottts, notionists, personas, ...) embed extra gradient/mask
			// defs whose ids are otherwise identical across every avatar of that style+options.
			// Randomizing them avoids collisions when multiple MyAvatar instances are mounted at
			// once (chat/friends lists, settings + editor previews, onboarding carousel, ...).
			randomizeIds: true,
			...renderOptions,
		}).toString();

		return stripRedundantViewboxMask(rawSvg);
	}, [style, size, options]);

	return (
		<View style={[styles.container, { width: size, height: size, borderRadius: resolvedBorderRadius, backgroundColor }]}>
			<SvgXml xml={svgXml} width={size} height={size} />
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		overflow: 'hidden',
		alignItems: 'center',
		justifyContent: 'center',
	},
});

export default MyAvatar;
