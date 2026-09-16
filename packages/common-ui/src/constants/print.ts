/**
 * Marking elements that belong on the screen but not on paper.
 *
 * Chevrons, pencils and other affordances tell the reader "you can tap this". Printed, they are
 * noise at best and misleading at worst. Instead of every screen maintaining its own print
 * stylesheet, an element carries a marker and the printed document hides everything wearing it.
 *
 * Three halves that have to agree, which is why they live in one file:
 * - {@link PRINT_HIDDEN_DATA_KEY} is what goes on the element, through `dataSet`.
 * - {@link PRINT_HIDDEN_ATTRIBUTE} is what react-native-web turns that into in the DOM.
 * - {@link PRINT_HIDDEN_CSS} is the rule acting on it, for the document a print is generated from.
 *
 * On native the `dataSet` prop is ignored, so marking an element costs nothing there.
 */

/** Key inside `dataSet`; react-native-web renders it as {@link PRINT_HIDDEN_ATTRIBUTE}. */
export const PRINT_HIDDEN_DATA_KEY = 'printHidden';

/** The attribute {@link PRINT_HIDDEN_DATA_KEY} becomes in the DOM. */
export const PRINT_HIDDEN_ATTRIBUTE = 'data-print-hidden';

/** Spread onto a view as `dataSet` to keep it off the printed page. */
export const PRINT_HIDDEN_DATA_SET = { [PRINT_HIDDEN_DATA_KEY]: 'true' };

/** Belongs into every document a print is generated from. */
export const PRINT_HIDDEN_CSS = `[${PRINT_HIDDEN_ATTRIBUTE}="true"] { display: none !important; }`;
