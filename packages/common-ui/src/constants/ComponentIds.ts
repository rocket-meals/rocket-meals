/**
 * CommonUiComponentIds – stable identifiers for UI elements in the common-ui package
 * that can be targeted by Maestro E2E tests or other test frameworks.
 *
 * IMPORTANT: Always use `nativeID={CommonUiComponentIds.XXX}`, NOT `testID`.
 * - `nativeID` renders as `id="..."` in HTML → Maestro locates elements by `id`
 * - `testID` renders as `data-testid="..."` → Maestro cannot find this on web
 */
export enum CommonUiComponentIds {
	// Modal
	MODAL_CLOSE_BUTTON = 'modal-close-button',

	// Avatar editor
	AVATAR_EDITOR_PHOTO_IMPORT_BUTTON = 'avatar-editor-photo-import-button',
}
