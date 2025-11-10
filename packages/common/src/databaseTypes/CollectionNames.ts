/**
 * Helper for Account things
 */
export function getAllCollectionNames() {
  return Object.values(CollectionNames);
}

export enum CollectionNames {
  AUTO_TRANSLATION_SETTINGS = 'auto_translation_settings',
  APP_SETTINGS = 'app_settings',
  APP_FEEDBACKS = 'app_feedbacks',
  CASHREGISTERS = 'cashregisters',
  CASHREGISTERS_TRANSACTIONS = 'cashregisters_transactions',
  COLLECTIONS_DATES_LAST_UPDATE = 'collections_dates_last_update',
  BUILDINGS = 'buildings',
  FOODS = 'foods',
  FOODS_FEEDBACKS = 'foods_feedbacks',
  FOODS_CATEGORIES = 'foods_categories',
  FOODS_ATTRIBUTES = 'foods_attributes',
  MAILS = 'mails',
  MAILS_FILES = 'mails_files',
  DIRECTUS_FILES = 'directus_files',
  FILES_SHARES = 'files_shares',
  FORMS = 'forms',
  FORM_EXTRACTS = 'form_extracts',
  FORM_EXTRACTS_FORM_FIELDS = 'form_extracts_form_fields',
  FORM_FIELDS = 'form_fields',
  FORM_SUBMISSIONS = 'form_submissions',
  FORM_ANSWERS = 'form_answers',
  CANTEENS_FEEDBACK_LABELS = 'canteens_feedbacks_labels',
  CANTEENS_FEEDBACKS_LABELS_ENTRIES = 'canteens_feedbacks_labels_entries',
  FOODS_FEEDBACKS_LABELS_ENTRIES = 'foods_feedbacks_labels_entries',
  FOODS_MARKINGS = 'foods_markings',
  MARKINGS = 'markings',
  MARKINGS_EXCLUSIONS = 'markings_exclusions',
  FOODOFFER_MARKINGS = 'foodoffers_markings',
  FOODS_FEEDBACK_LABELS = 'foods_feedbacks_labels',
  APARTMENTS = 'apartments',
  WASHINGMACHINES = 'washingmachines',
  WASHINGMACHINES_JOBS = 'washingmachines_jobs',
  NEWS = 'news',
  CHATS = 'chats',
  CHAT_MESSAGES = 'chat_messages',
  LANGUAGES = 'languages',
  PROFILES = 'profiles',
  UTILIZATION_GROUPS = 'utilizations_groups',
  UTILIZATION_ENTRIES = 'utilizations_entries',
  BUSINESSHOURS = 'businesshours',
  CANTEEN_FOOD_FEEDBACK_REPORT_SCHEDULES = 'canteen_food_feedback_report_schedules',
  CANTEEN_FOOD_FEEDBACK_REPORT_SCHEDULES_REPORT_RECIPIENTS = 'canteen_food_feedback_report_schedules_report_recipients',
  CANTEEN_FOOD_FEEDBACK_REPORT_SCHEDULES_CANTEENS = 'canteen_food_feedback_report_schedules_canteens',
  REPORT_RECIPIENTS = 'report_recipients',
  USERS = 'directus_users',
  ROLES = 'directus_roles',
  PERMISSIONS = 'directus_permissions',
  POLICIES = 'directus_policies',
  CANTEENS = 'canteens',
  PUSH_NOTIFICATIONS = 'push_notifications',
  DEVICES = 'devices',
  FOODOFFERS = 'foodoffers',
  FOODOFFER_CATEGORIES = 'foodoffers_categories',
  WORKFLOWS = 'workflows',
  WORKFLOWS_RUNS = 'workflows_runs',
}

export const CollectionFieldNames = {
  [CollectionNames.FOODS]: {
    IMAGE: 'image',
  }
}