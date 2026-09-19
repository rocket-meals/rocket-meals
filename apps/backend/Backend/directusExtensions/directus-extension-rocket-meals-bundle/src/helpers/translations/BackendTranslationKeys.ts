/**
 * BackendTranslationKeys.ts – the translation keys the Directus backend can render texts for.
 *
 * The backend sends texts to users too: push notifications, generated documents, messages that
 * end up in the app. Those texts follow exactly the same rules as the app texts – they live in
 * a catalogue, never as a literal at the call site.
 *
 * The shared vocabulary from `repo-depkit-common` (`Ja`, `Heute`, `Fehler`, weekdays, …) is
 * inherited by spreading {@link CommonTranslationKeys}; only texts that no app would ever show
 * are declared here. TypeScript `enum`s cannot inherit, hence the const object plus a
 * same-named type – the same pattern the apps use.
 *
 * Adding a backend text:
 * 1. Declare the key here (key name === key value, the test enforces it).
 * 2. Add the text for **all** {@link ALL_TRANSLATION_LANGUAGES} in `backendTranslations.ts`.
 * 3. Render it with a translator from `BackendTranslator.ts`, never with a string literal.
 */

import { CommonTranslationKeys } from 'repo-depkit-common';

export const BackendTranslationKeys = {
  ...CommonTranslationKeys,

  // Push notifications about an upcoming food offer
  notification_foodoffer_body: 'notification_foodoffer_body',
  notification_foodoffer_unknown_food: 'notification_foodoffer_unknown_food',

  // Texts of the generated form PDF (Abnahme-/Übergabeprotokoll and friends)
  form_pdf_attachments: 'form_pdf_attachments',
  form_pdf_generated_at: 'form_pdf_generated_at',
  form_pdf_checksum: 'form_pdf_checksum',
  form_pdf_page: 'form_pdf_page',

  // Protection of the dashboards shipped with Rocket Meals
  dashboard_system_edit_forbidden: 'dashboard_system_edit_forbidden',
  dashboard_system_panel_edit_forbidden: 'dashboard_system_panel_edit_forbidden',
  dashboard_system_delete_forbidden: 'dashboard_system_delete_forbidden',
  dashboard_system_marker_forbidden: 'dashboard_system_marker_forbidden',
} as const;

export type BackendTranslationKeys = (typeof BackendTranslationKeys)[keyof typeof BackendTranslationKeys];

/** Every key the backend may render – handy for the validation test. */
export const ALL_BACKEND_TRANSLATION_KEYS: readonly BackendTranslationKeys[] = Object.values(BackendTranslationKeys);
