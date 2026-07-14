import type { Style, StyleCreateProps, StyleCreateResult } from '@dicebear/core';
import * as collection from '@dicebear/collection';
import { MicahCustomHair, micahCustomHair } from './micahCustomHair';

export { MicahCustomHair } from './micahCustomHair';

type MicahStyle = Style<object> & { schema: { properties: Record<string, any> } };

const baseMicah = collection.micah as unknown as MicahStyle;

const HAIR_GROUP_OPEN = '<g transform="translate(49 11)">';
const EMPTY_HAIR_GROUP = `${HAIR_GROUP_OPEN}</g>`;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Every custom hair option key added on top of `@dicebear/micah`'s built-in hairstyles. */
export const MICAH_CUSTOM_HAIR_KEYS: MicahCustomHair[] = Object.values(MicahCustomHair);

function sanitizeHairColor(value: unknown): string {
	if (typeof value === 'string' && (value === 'transparent' || HEX_COLOR_PATTERN.test(value))) {
		return value;
	}
	return '#000000';
}

function firstValue(value: unknown): unknown {
	return Array.isArray(value) ? value[0] : value;
}

/**
 * `micah` avatar style extended with additional hairstyles that don't exist in
 * `@dicebear/micah` itself (see `micahCustomHair.ts`).
 *
 * `@dicebear/micah` is a plain npm package with no extension point for adding
 * components, so this wraps it instead of forking it:
 * - `schema` is the original schema with the custom hair keys appended to the
 *   `hair` enum, so every schema-driven UI (`MyAvatarEditor`'s option pickers,
 *   `MicahHairGallery`) picks the new options up automatically.
 * - `create` renders the avatar exactly as `@dicebear/micah` normally would,
 *   then - only when the requested `hair` value is one of ours - splices the
 *   custom SVG into micah's own (empty, since it doesn't recognise the key)
 *   hair group. This keeps every other component (base, eyes, colors, ...)
 *   byte-for-byte identical to the original style.
 */
export const micahExtended: Style<object> = {
	...baseMicah,
	schema: {
		...baseMicah.schema,
		properties: {
			...baseMicah.schema.properties,
			hair: {
				...baseMicah.schema.properties.hair,
				items: {
					...baseMicah.schema.properties.hair.items,
					enum: [...baseMicah.schema.properties.hair.items.enum, ...MICAH_CUSTOM_HAIR_KEYS],
				},
				default: [...baseMicah.schema.properties.hair.default, ...MICAH_CUSTOM_HAIR_KEYS],
			},
		},
	},
	create: (props: StyleCreateProps<object>): StyleCreateResult => {
		const result = baseMicah.create(props);

		const options = props.options as Record<string, unknown>;
		const hairOption = options.hair;
		const requestedHair = Array.isArray(hairOption)
			? hairOption.find((key): key is MicahCustomHair => typeof key === 'string' && key in micahCustomHair)
			: undefined;

		// `hairProbability` is 0/100 in practice (MyAvatar derives it from whether `hair`
		// is set at all), so reading it directly here is safe and avoids consuming an
		// extra `prng` draw, which would desync the background color/type picked
		// afterwards by `createAvatar` for the same seed.
		const hairProbability = Number(firstValue(options.hairProbability) ?? 100);
		if (!requestedHair || hairProbability === 0) return result;

		const extra = result.extra?.() ?? {};
		const hairColor = sanitizeHairColor(extra.hairColor);
		const hairSvg = micahCustomHair[requestedHair](hairColor);

		return {
			...result,
			body: result.body.replace(EMPTY_HAIR_GROUP, `${HAIR_GROUP_OPEN}${hairSvg}</g>`),
			extra: () => ({ ...extra, hair: requestedHair }),
		};
	},
};
