import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { createAvatar, Style } from '@dicebear/core';
import * as collection from '@dicebear/collection';

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

export type MyAvatarProps = {
	seed?: string;
	style?: AvatarStyle;
	size?: AvatarSize | number;
	borderRadius?: number;
	/** Additional DiceBear options (e.g. eyes, mouth, hair, nose, etc.) */
	options?: Record<string, string[]>;
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
	[AvatarStyle.MICAH]: collection.micah,
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

const MyAvatar: React.FC<MyAvatarProps> = ({
	seed = 'John Doe',
	style = AvatarStyle.LORELEI,
	size = AvatarSize.LARGE,
	borderRadius = 0,
	options,
}) => {
	const svgXml = useMemo(() => {
		const avatarStyle = STYLE_MAP[style];
		return createAvatar(avatarStyle, {
			seed,
			size,
			...options,
		}).toString();
	}, [seed, style, size, options]);

	return (
		<View style={[styles.container, { width: size, height: size, borderRadius }]}>
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
