import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Style } from '@dicebear/core';
import MyAvatar, { AvatarSize, AvatarStyle, STYLE_MAP } from '../MyAvatar';
import { MICAH_CUSTOM_HAIR_KEYS } from '../MyAvatar/micahExtended';
import { useTheme } from '../../context/ThemeContext';

export type MicahHairGalleryProps = {
	/** Fixed hair color (hex, without '#') applied to every preview. Defaults to the style's own schema default. */
	hairColor?: string;
	/** Fixed skin color (hex, without '#') applied to every preview. Defaults to the style's own schema default. */
	baseColor?: string;
	/** Size of each avatar preview. Defaults to `AvatarSize.MEDIUM`. */
	previewSize?: AvatarSize | number;
};

const CUSTOM_HAIR_KEY_SET = new Set<string>(MICAH_CUSTOM_HAIR_KEYS);

/**
 * Dev/design tool: renders every hair option available for the `micah` avatar
 * style - both `@dicebear/micah`'s built-in hairstyles and the custom ones
 * added in `MyAvatar/micahExtended.ts` - as a grid of live previews, each
 * labelled with its option key ("custom" ones are flagged).
 *
 * Reads the option list straight from `STYLE_MAP[AvatarStyle.MICAH].schema`,
 * so it always reflects exactly what's selectable in the avatar editor - use
 * it to see what already exists before adding a new hairstyle, and to sanity
 * check a new SVG (fit, color, clipping) once it's wired into
 * `micahCustomHair.ts` without having to open the full avatar editor.
 */
const MicahHairGallery: React.FC<MicahHairGalleryProps> = ({ hairColor, baseColor, previewSize = AvatarSize.MEDIUM }) => {
	const { theme } = useTheme();
	const micahStyle = STYLE_MAP[AvatarStyle.MICAH] as Style<object> & { schema: { properties: Record<string, any> } };
	const hairKeys: string[] = micahStyle.schema.properties.hair.items.enum;

	const fixedOptions: Record<string, string[]> = {};
	if (hairColor) fixedOptions.hairColor = [hairColor];
	if (baseColor) fixedOptions.baseColor = [baseColor];

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.screen.background }]}
			contentContainerStyle={styles.grid}
		>
			{hairKeys.map((key) => {
				const isCustom = CUSTOM_HAIR_KEY_SET.has(key);
				return (
					<View key={key} style={styles.cell}>
						<MyAvatar
							style={AvatarStyle.MICAH}
							size={previewSize}
							rounded
							backgroundColor="#ffffff"
							options={{ ...fixedOptions, hair: [key] }}
						/>
						<Text style={[styles.label, { color: theme.screen.text }]} numberOfLines={1}>
							{key}
						</Text>
						{isCustom && (
							<Text style={[styles.badge, { color: theme.screen.placeholder ?? theme.screen.text }]}>custom</Text>
						)}
					</View>
				);
			})}
		</ScrollView>
	);
};

export default MicahHairGallery;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		padding: 12,
		gap: 12,
	},
	cell: {
		alignItems: 'center',
		width: 96,
	},
	label: {
		marginTop: 4,
		fontSize: 12,
		textAlign: 'center',
	},
	badge: {
		fontSize: 10,
		fontStyle: 'italic',
	},
});
