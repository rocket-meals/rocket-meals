import type { SettingsListProps } from 'repo-depkit-common-ui';

/**
 * Rounds the corners of a list built from a dynamic array: first row on top, last on the bottom,
 * a lone row on all four sides. Screens with a hard-coded list can keep writing the position out.
 */
export function resolveSettingsGroupPosition(index: number, amount: number): SettingsListProps['groupPosition'] {
	if (amount === 1) {
		return 'single';
	}
	if (index === 0) {
		return 'top';
	}
	if (index === amount - 1) {
		return 'bottom';
	}
	return 'middle';
}
