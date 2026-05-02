import React, { useMemo } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { createAvatar } from '@dicebear/core';
import type { Style } from '@dicebear/core';
import * as collection from '@dicebear/collection';

/**
 * Available avatar style types from the @dicebear/collection.
 */
export enum MyAvatarStyle {
	ADVENTURER = 'adventurer',
	ADVENTURER_NEUTRAL = 'adventurer-neutral',
	AVATAAARS = 'avataaars',
	AVATAAARS_NEUTRAL = 'avataaars-neutral',
	BIG_EARS = 'big-ears',
	BIG_EARS_NEUTRAL = 'big-ears-neutral',
	BIG_SMILE = 'big-smile',
	BOTTTS = 'bottts',
	BOTTTS_NEUTRAL = 'bottts-neutral',
	CROODLES = 'croodles',
	CROODLES_NEUTRAL = 'croodles-neutral',
	FUN_EMOJI = 'fun-emoji',
	ICONS = 'icons',
	IDENTICON = 'identicon',
	INITIALS = 'initials',
	LORELEI = 'lorelei',
	LORELEI_NEUTRAL = 'lorelei-neutral',
	MICAH = 'micah',
	MINIAVS = 'miniavs',
	NOTIONISTS = 'notionists',
	NOTIONISTS_NEUTRAL = 'notionists-neutral',
	OPEN_PEEPS = 'open-peeps',
	PERSONAS = 'personas',
	PIXEL_ART = 'pixel-art',
	PIXEL_ART_NEUTRAL = 'pixel-art-neutral',
	RINGS = 'rings',
	SHAPES = 'shapes',
	THUMBS = 'thumbs',
}

/**
 * Shape of the avatar container.
 */
export enum MyAvatarShape {
	CIRCLE = 'circle',
	SQUARE = 'square',
	ROUNDED = 'rounded',
}

export interface MyAvatarProps {
	/** Seed string used to generate the avatar deterministically. */
	seed?: string;
	/** Avatar style from the DiceBear collection. */
	style?: MyAvatarStyle;
	/** Size of the avatar in pixels. */
	size?: number;
	/** Shape of the avatar container. */
	shape?: MyAvatarShape;
	/** Optional background color override. */
	backgroundColor?: string;
}

/**
 * Maps the MyAvatarStyle enum to the corresponding @dicebear/collection style object.
 */
const STYLE_MAP: Record<MyAvatarStyle, Style<{}>> = {
	[MyAvatarStyle.ADVENTURER]: collection.adventurer,
	[MyAvatarStyle.ADVENTURER_NEUTRAL]: collection.adventurerNeutral,
	[MyAvatarStyle.AVATAAARS]: collection.avataaars,
	[MyAvatarStyle.AVATAAARS_NEUTRAL]: collection.avataaarsNeutral,
	[MyAvatarStyle.BIG_EARS]: collection.bigEars,
	[MyAvatarStyle.BIG_EARS_NEUTRAL]: collection.bigEarsNeutral,
	[MyAvatarStyle.BIG_SMILE]: collection.bigSmile,
	[MyAvatarStyle.BOTTTS]: collection.bottts,
	[MyAvatarStyle.BOTTTS_NEUTRAL]: collection.botttsNeutral,
	[MyAvatarStyle.CROODLES]: collection.croodles,
	[MyAvatarStyle.CROODLES_NEUTRAL]: collection.croodlesNeutral,
	[MyAvatarStyle.FUN_EMOJI]: collection.funEmoji,
	[MyAvatarStyle.ICONS]: collection.icons,
	[MyAvatarStyle.IDENTICON]: collection.identicon,
	[MyAvatarStyle.INITIALS]: collection.initials,
	[MyAvatarStyle.LORELEI]: collection.lorelei,
	[MyAvatarStyle.LORELEI_NEUTRAL]: collection.loreleiNeutral,
	[MyAvatarStyle.MICAH]: collection.micah,
	[MyAvatarStyle.MINIAVS]: collection.miniavs,
	[MyAvatarStyle.NOTIONISTS]: collection.notionists,
	[MyAvatarStyle.NOTIONISTS_NEUTRAL]: collection.notionistsNeutral,
	[MyAvatarStyle.OPEN_PEEPS]: collection.openPeeps,
	[MyAvatarStyle.PERSONAS]: collection.personas,
	[MyAvatarStyle.PIXEL_ART]: collection.pixelArt,
	[MyAvatarStyle.PIXEL_ART_NEUTRAL]: collection.pixelArtNeutral,
	[MyAvatarStyle.RINGS]: collection.rings,
	[MyAvatarStyle.SHAPES]: collection.shapes,
	[MyAvatarStyle.THUMBS]: collection.thumbs,
};

/**
 * Returns the SVG string for the given avatar configuration.
 */
export function getAvatarSvgString(seed: string, avatarStyle: MyAvatarStyle, size: number): string {
	const styleObj = STYLE_MAP[avatarStyle];
	const avatar = createAvatar(styleObj, {
		seed,
		size,
	});
	return avatar.toString();
}

/**
 * Returns a data URI for the given avatar configuration.
 */
export function getAvatarDataUri(seed: string, avatarStyle: MyAvatarStyle, size: number): string {
	const styleObj = STYLE_MAP[avatarStyle];
	const avatar = createAvatar(styleObj, {
		seed,
		size,
	});
	return avatar.toDataUri();
}

/**
 * Avatar component that renders a DiceBear avatar as an Image using a data URI.
 * Uses enums for style and shape configuration.
 */
const MyAvatar: React.FC<MyAvatarProps> = ({
	seed = 'John Doe',
	style: avatarStyle = MyAvatarStyle.LORELEI,
	size = 128,
	shape = MyAvatarShape.CIRCLE,
	backgroundColor,
}) => {
	const dataUri = useMemo(() => {
		return getAvatarDataUri(seed, avatarStyle, size);
	}, [seed, avatarStyle, size]);

	const borderRadius = shape === MyAvatarShape.CIRCLE ? size / 2 : shape === MyAvatarShape.ROUNDED ? size * 0.15 : 0;

	return (
		<View
			style={[
				localStyles.container,
				{
					width: size,
					height: size,
					borderRadius,
					overflow: 'hidden',
					...(backgroundColor ? { backgroundColor } : {}),
				},
			]}
		>
			<Image source={{ uri: dataUri }} style={{ width: size, height: size }} resizeMode="contain" />
		</View>
	);
};

const localStyles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
	},
});

export default MyAvatar;
