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

// Not the package index – see the note in BackendTranslator.ts.
import { CommonTranslationKeys } from 'repo-depkit-common/src/translations';

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
  form_pdf_reference: 'form_pdf_reference',
  form_pdf_received_at: 'form_pdf_received_at',
  form_pdf_place_and_date: 'form_pdf_place_and_date',
  form_pdf_last_edited_by: 'form_pdf_last_edited_by',
  form_pdf_last_edited_at: 'form_pdf_last_edited_at',

  // Protection of the dashboards shipped with Rocket Meals
  dashboard_system_edit_forbidden: 'dashboard_system_edit_forbidden',
  dashboard_system_panel_edit_forbidden: 'dashboard_system_panel_edit_forbidden',
  dashboard_system_delete_forbidden: 'dashboard_system_delete_forbidden',
  dashboard_system_marker_forbidden: 'dashboard_system_marker_forbidden',
  food_feedback_guest_rating_forbidden: 'food_feedback_guest_rating_forbidden',
  food_feedback_guest_comment_forbidden: 'food_feedback_guest_comment_forbidden',

  // Insights panels shipped by Rocket Meals ("[Erweitert]", see helpers/extended-panels)
  extended_panel_list_name: 'extended_panel_list_name',
  extended_panel_list_description: 'extended_panel_list_description',
  extended_panel_page_export_name: 'extended_panel_page_export_name',
  extended_panel_page_export_description: 'extended_panel_page_export_description',
  extended_panel_option_export_all_items: 'extended_panel_option_export_all_items',
  extended_panel_option_export_all_items_note: 'extended_panel_option_export_all_items_note',
  extended_panel_option_export_fields: 'extended_panel_option_export_fields',
  extended_panel_option_export_fields_note: 'extended_panel_option_export_fields_note',
  extended_panel_export: 'extended_panel_export',
  extended_panel_export_failed: 'extended_panel_export_failed',
  extended_panel_load_failed: 'extended_panel_load_failed',
  extended_panel_export_format_csv: 'extended_panel_export_format_csv',
  extended_panel_export_format_json: 'extended_panel_export_format_json',
  extended_panel_export_format_xml: 'extended_panel_export_format_xml',
  extended_panel_export_format_yaml: 'extended_panel_export_format_yaml',
  extended_panel_page_export_button: 'extended_panel_page_export_button',
  extended_panel_page_export_format_pdf: 'extended_panel_page_export_format_pdf',
  extended_panel_page_export_format_png: 'extended_panel_page_export_format_png',
  extended_panel_page_export_running: 'extended_panel_page_export_running',

  // Module "Rocket Meals" in the Directus app (src/rocket-meals-module)
  rocket_meals_module_food_feedbacks: 'rocket_meals_module_food_feedbacks',
  rocket_meals_module_food_feedbacks_description: 'rocket_meals_module_food_feedbacks_description',
  rocket_meals_module_mcp_instruction_description: 'rocket_meals_module_mcp_instruction_description',
  rocket_meals_module_status_new: 'rocket_meals_module_status_new',
  rocket_meals_module_status_waiting_for_support: 'rocket_meals_module_status_waiting_for_support',
  rocket_meals_module_status_waiting_for_user: 'rocket_meals_module_status_waiting_for_user',
  rocket_meals_module_status_resolved: 'rocket_meals_module_status_resolved',
  rocket_meals_module_filter_open: 'rocket_meals_module_filter_open',
  rocket_meals_module_filter_all: 'rocket_meals_module_filter_all',
  rocket_meals_module_to_chat: 'rocket_meals_module_to_chat',
  rocket_meals_module_change_status: 'rocket_meals_module_change_status',
  rocket_meals_module_status_change_failed: 'rocket_meals_module_status_change_failed',
  rocket_meals_module_send_hint: 'rocket_meals_module_send_hint',
  rocket_meals_module_reply: 'rocket_meals_module_reply',
  rocket_meals_module_message_placeholder: 'rocket_meals_module_message_placeholder',
  rocket_meals_module_send_failed: 'rocket_meals_module_send_failed',
  rocket_meals_module_load_failed: 'rocket_meals_module_load_failed',
  rocket_meals_module_chat_empty: 'rocket_meals_module_chat_empty',
  rocket_meals_module_chat_not_possible: 'rocket_meals_module_chat_not_possible',
  rocket_meals_module_user: 'rocket_meals_module_user',
  rocket_meals_module_support: 'rocket_meals_module_support',
  rocket_meals_module_rating: 'rocket_meals_module_rating',
  rocket_meals_module_canteen: 'rocket_meals_module_canteen',
  rocket_meals_module_refresh: 'rocket_meals_module_refresh',
  rocket_meals_module_back_to_list: 'rocket_meals_module_back_to_list',
  rocket_meals_module_open_feedback_item: 'rocket_meals_module_open_feedback_item',
  rocket_meals_module_food_feedback_chat_alias: 'rocket_meals_module_food_feedback_chat_alias',
  rocket_meals_module_unknown_food: 'rocket_meals_module_unknown_food',
  rocket_meals_module_mark_resolved: 'rocket_meals_module_mark_resolved',
  rocket_meals_module_mark_selected_resolved: 'rocket_meals_module_mark_selected_resolved',
  rocket_meals_module_mark_resolved_failed: 'rocket_meals_module_mark_resolved_failed',
  rocket_meals_module_selected_count: 'rocket_meals_module_selected_count',
  rocket_meals_module_select_all_on_page: 'rocket_meals_module_select_all_on_page',
  rocket_meals_module_search_food: 'rocket_meals_module_search_food',
  rocket_meals_module_all_canteens: 'rocket_meals_module_all_canteens',
  rocket_meals_module_rating_all: 'rocket_meals_module_rating_all',
  rocket_meals_module_rating_bad: 'rocket_meals_module_rating_bad',
  rocket_meals_module_rating_medium: 'rocket_meals_module_rating_medium',
  rocket_meals_module_rating_good: 'rocket_meals_module_rating_good',
  rocket_meals_module_rating_none: 'rocket_meals_module_rating_none',
  rocket_meals_module_sort_newest: 'rocket_meals_module_sort_newest',
  rocket_meals_module_sort_oldest: 'rocket_meals_module_sort_oldest',
  rocket_meals_module_sort_rating_worst: 'rocket_meals_module_sort_rating_worst',
  rocket_meals_module_sort_rating_best: 'rocket_meals_module_sort_rating_best',
  rocket_meals_module_items_per_page: 'rocket_meals_module_items_per_page',
} as const;

export type BackendTranslationKeys = (typeof BackendTranslationKeys)[keyof typeof BackendTranslationKeys];

/** Every key the backend may render – handy for the validation test. */
export const ALL_BACKEND_TRANSLATION_KEYS: readonly BackendTranslationKeys[] = Object.values(BackendTranslationKeys);
