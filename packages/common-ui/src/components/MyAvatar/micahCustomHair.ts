/**
 * Custom hairstyles for the `micah` avatar style, layered on top of the DiceBear
 * `@dicebear/micah` package's built-in hair options (see `micahExtended.ts`).
 *
 * DiceBear's collection packages ship as prebuilt npm modules with no plugin
 * hook for adding new components, so a new hairstyle can't be registered
 * "inside" `@dicebear/micah` itself. Instead, each entry here is a self-contained
 * SVG fragment using the *same coordinate space* micah's own hair components
 * use: it gets rendered inside `<g transform="translate(49 11)">...</g>`, i.e.
 * the same group micah's built-in hair (fonze, pixie, turban, ...) renders into.
 *
 * To add a new hairstyle:
 * 1. Add a `CUSTOM_xxx` member to `MicahCustomHair` below. The `CUSTOM_` prefix
 *    is what lets these be told apart from DiceBear's own built-in hair keys at
 *    a glance - both in code and in the avatar editor's option picker, which
 *    shows the raw value as the label for every style (see `MyAvatarEditor`).
 * 2. Add the matching `[MicahCustomHair.CUSTOM_xxx]: (hairColor) => svgFragment`
 *    entry to `micahCustomHair`.
 * 3. Use `fill="${hairColor}" stroke="#000" stroke-width="4"` to match micah's
 *    flat line-art look (see the originals in `@dicebear/micah/lib/components/hair.js`
 *    for reference proportions).
 * 4. Render `<MicahHairGallery />` (packages/common-ui/src/components/MicahHairGallery)
 *    to see every hairstyle - built-in and custom - side by side and check the fit.
 */

/** Custom `micah` hairstyles, on top of `@dicebear/micah`'s built-in ones. */
export enum MicahCustomHair {
	CUSTOM_SHORT_CROP = 'CUSTOM_SHORT_CROP',
	CUSTOM_QUIFF_SWOOP = 'CUSTOM_QUIFF_SWOOP',
	CUSTOM_AFRO_PUFF = 'CUSTOM_AFRO_PUFF',
	CUSTOM_TOP_BUN = 'CUSTOM_TOP_BUN',
	CUSTOM_SPACE_BUNS = 'CUSTOM_SPACE_BUNS',
	CUSTOM_SIDE_PONYTAIL = 'CUSTOM_SIDE_PONYTAIL',
}

export type MicahHairRenderer = (hairColor: string) => string;

/** Rounded cap hugging the skull, apex above the head - used by voluminous styles. */
const DOME_CAP_PATH =
	'M26 84C26 22 67 -8 121 -8C175 -8 216 22 216 84C216 100 201 104 121 96C41 104 26 100 26 84Z';

/** Flatter cap sitting closer to the skull - used by styles where hair is pulled back. */
const FLAT_CAP_PATH =
	'M30 88C30 40 66 4 121 4C176 4 212 40 212 88C212 98 196 100 121 98C46 100 30 98 30 88Z';

export const micahCustomHair: Record<MicahCustomHair, MicahHairRenderer> = {
	[MicahCustomHair.CUSTOM_SHORT_CROP]: (hairColor) =>
		`<path d="${DOME_CAP_PATH}" fill="${hairColor}" stroke="#000" stroke-width="4"/>`,

	[MicahCustomHair.CUSTOM_QUIFF_SWOOP]: (hairColor) =>
		`<path d="${DOME_CAP_PATH}" fill="${hairColor}" stroke="#000" stroke-width="4"/>` +
		`<path d="M60 108C55 73 70 28 105 -7C120 -22 145 -17 150 3C153 18 130 28 118 48C108 66 108 88 118 103C108 110 78 113 60 108Z" fill="${hairColor}" stroke="#000" stroke-width="4"/>`,

	[MicahCustomHair.CUSTOM_AFRO_PUFF]: (hairColor) =>
		`<path d="M36 88A28 28 0 0 1 61 23A28 28 0 0 1 121 -12A28 28 0 0 1 181 23A28 28 0 0 1 206 88C206 88 165 113 121 108C77 113 36 88 36 88Z" fill="${hairColor}" stroke="#000" stroke-width="4"/>`,

	[MicahCustomHair.CUSTOM_TOP_BUN]: (hairColor) =>
		`<path d="${FLAT_CAP_PATH}" fill="${hairColor}" stroke="#000" stroke-width="4"/>` +
		`<circle cx="121" cy="18" r="26" fill="${hairColor}" stroke="#000" stroke-width="4"/>`,

	[MicahCustomHair.CUSTOM_SPACE_BUNS]: (hairColor) =>
		`<path d="${FLAT_CAP_PATH}" fill="${hairColor}" stroke="#000" stroke-width="4"/>` +
		`<circle cx="66" cy="14" r="22" fill="${hairColor}" stroke="#000" stroke-width="4"/>` +
		`<circle cx="176" cy="14" r="22" fill="${hairColor}" stroke="#000" stroke-width="4"/>`,

	[MicahCustomHair.CUSTOM_SIDE_PONYTAIL]: (hairColor) =>
		`<path d="${FLAT_CAP_PATH}" fill="${hairColor}" stroke="#000" stroke-width="4"/>` +
		`<path d="M195 55C215 50 230 65 235 95C240 130 225 165 205 185C198 192 188 190 190 178C200 155 205 125 198 95C193 75 185 62 195 55Z" fill="${hairColor}" stroke="#000" stroke-width="4"/>`,
};
