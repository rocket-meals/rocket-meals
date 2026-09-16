/**
 * Guards the print-visibility marker (see `constants/print.ts`).
 *
 * Two things can quietly break it: the `dataSet` key and the CSS selector drifting apart, and a
 * new `SettingsList*` component shipping a chevron or pencil of its own that nobody wrapped. The
 * second one only shows up when somebody prints a screen months later, so it is scanned here.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PRINT_HIDDEN_ATTRIBUTE, PRINT_HIDDEN_CSS, PRINT_HIDDEN_DATA_KEY, PRINT_HIDDEN_DATA_SET } from '../constants/print';

const COMPONENTS_DIRECTORY = join(__dirname, '..', 'components');

/**
 * Icons that exist to say "you can tap this" - they carry no information a reader of the printed
 * page could use. A component rendering one of these has to wrap it in `PrintHidden`.
 */
const AFFORDANCE_ICON_MARKERS = ['name="pencil"', 'name="clock-edit-outline"', "'chevron-up' : 'chevron-down'", 'name="chevron-small-right"', 'name="chevron-right"', 'name="chevron-forward"'];

/** react-native-web lower-cases the `dataSet` key and hyphenates it: `printHidden` -> `data-print-hidden`. */
function toDataAttribute(dataSetKey: string): string {
	const hyphenated = dataSetKey.split(/(?=[A-Z])/).join('-');
	return `data-${hyphenated.toLowerCase()}`;
}

function listFilesRecursively(directory: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(directory)) {
		const fullPath = join(directory, entry);
		if (statSync(fullPath).isDirectory()) {
			files.push(...listFilesRecursively(fullPath));
		} else if (entry.endsWith('.tsx')) {
			files.push(fullPath);
		}
	}
	return files;
}

describe('print visibility marker', () => {
	it('keeps the dataSet key and the DOM attribute in sync', () => {
		expect(Object.keys(PRINT_HIDDEN_DATA_SET)).toEqual([PRINT_HIDDEN_DATA_KEY]);
		expect(PRINT_HIDDEN_ATTRIBUTE).toBe(toDataAttribute(PRINT_HIDDEN_DATA_KEY));
	});

	it('hides exactly the elements carrying the marker', () => {
		expect(PRINT_HIDDEN_CSS).toContain(`[${PRINT_HIDDEN_ATTRIBUTE}="true"]`);
		expect(PRINT_HIDDEN_CSS).toContain('display: none');
	});

	it('has every SettingsList component wrap the affordance icons it renders itself', () => {
		const unwrapped = listFilesRecursively(COMPONENTS_DIRECTORY)
			.filter((file) => file.includes('SettingsList'))
			.filter((file) => {
				const source = readFileSync(file, 'utf8');
				const rendersAffordanceIcon = AFFORDANCE_ICON_MARKERS.some((marker) => source.includes(marker));
				return rendersAffordanceIcon && !source.includes('PrintHidden');
			})
			.map((file) => file.slice(COMPONENTS_DIRECTORY.length + 1));

		expect(unwrapped).toEqual([]);
	});
});
