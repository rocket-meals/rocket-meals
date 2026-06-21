/**
 * TestIds.ts – Stable testID constants for UI testing.
 *
 * These IDs are used as `testID` props on interactive components so that
 * automated tests (e.g. Maestro) can target elements by a stable identifier
 * instead of relying on localised text strings.
 */

export const TestIds = {
	OPEN_DRAWER_BUTTON: 'open-drawer-button',
} as const;
