export type Apartments = {
  available_from?: string | null;
  building?: string | Buildings | null;
  date_created?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  family_friendly?: boolean | null;
  handicapped_accessible?: boolean | null;
  id: string;
  singleflat?: boolean | null;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  washingmachines: any[] | Washingmachines[];
};

export type AppFeedbacks = {
  contact_email?: string | null;
  content?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  device_brand?: string | null;
  device_platform?: string | null;
  device_system_version?: string | null;
  display_fontscale?: number | null;
  display_height?: number | null;
  display_pixelratio?: number | null;
  display_scale?: number | null;
  display_width?: number | null;
  feedback_read_by_support?: boolean | null;
  id: string;
  positive?: boolean | null;
  priority?: number | null;
  profile?: string | Profiles | null;
  response?: string | null;
  response_read_by_user?: boolean | null;
  sort?: number | null;
  status: string;
  title?: string | null;
  user_created?: string | null;
  user_updated?: string | DirectusUsers | null;
};

export type AppSettings = {
  app_stores: string;
  app_stores_url_to_apple?: string | null;
  app_stores_url_to_google?: string | null;
  balance_enabled?: boolean | null;
  balance_settings: string;
  campus_enabled?: boolean | null;
  campus_parsing_enabled?: boolean | null;
  campus_parsing_last_date?: string | null;
  campus_parsing_status?: string | null;
  campus_settings: string;
  canteen_reports_enabled?: boolean | null;
  canteen_reports_settings: string;
  cashregisters_parsing_enabled?: boolean | null;
  cashregisters_parsing_last_date?: string | null;
  cashregisters_parsing_status?: string | null;
  cashregisters_settings: string;
  course_timetable_enabled?: boolean | null;
  course_timetable_settings: string;
  date_created?: string | null;
  date_privacy_policy_updated?: string | null;
  date_updated?: string | null;
  food_responsible_organization_link?: string | null;
  food_responsible_organization_name?: string | null;
  food_responsible_settings: string;
  foods_enabled?: boolean | null;
  foods_feedbacks_comments_type?: string | null;
  foods_feedbacks_custom_url?: string | null;
  foods_feedbacks_labels_type?: string | null;
  foods_parsing_enabled?: boolean | null;
  foods_parsing_hash?: string | null;
  foods_parsing_last_date?: string | null;
  foods_parsing_status?: string | null;
  foods_placeholder_image?: string | DirectusFiles | null;
  foods_placeholder_image_remote_url?: string | null;
  foods_placeholder_image_thumb_hash?: string | null;
  foods_ratings_amount_display?: boolean | null;
  foods_ratings_average_display?: boolean | null;
  foods_ratings_type?: string | null;
  foods_settings: string;
  housing_enabled?: boolean | null;
  housing_parsing_enabled?: boolean | null;
  housing_parsing_last_date?: string | null;
  housing_parsing_status?: string | null;
  housing_settings: string;
  housing_translations: any[] | AppSettingsHousingTranslations[];
  id: number;
  legal_requirements_settings: string;
  maintenance_end?: string | null;
  maintenance_settings: string;
  maintenance_start?: string | null;
  map_enabled?: boolean | null;
  map_settings: string;
  news_enabled?: boolean | null;
  news_parsing_enabled?: boolean | null;
  news_parsing_last_date?: string | null;
  news_parsing_status?: string | null;
  news_settings: string;
  notifications_android_enabled?: boolean | null;
  notifications_email_enabled?: boolean | null;
  notifications_foods_last_date?: string | null;
  notifications_foods_status?: string | null;
  notifications_ios_enabled?: boolean | null;
  notifications_settings: string;
  redirect_settings: string;
  redirect_whitelist?: unknown | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  utilization_forecast_calculation_enabled?: boolean | null;
  utilization_forecast_calculation_last_date?: string | null;
  utilization_forecast_calculation_status?: string | null;
  utilization_settings: string;
};

export type AppSettingsHousingTranslations = {
  app_settings_id?: number | AppSettings | null;
  be_source_for_translations?: boolean | null;
  content?: string | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  translation_settings: string;
};

export type AppTranslations = {
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  sort?: number | null;
  status: string;
  translations: any[] | AppTranslationsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type AppTranslationsTranslations = {
  app_translations_id?: string | AppTranslations | null;
  be_source_for_translations?: boolean | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  text?: string | null;
  translation_settings: string;
};

export type AutoTranslationSettings = {
  active?: boolean | null;
  auth_key?: string | null;
  extra?: string | null;
  id: number;
  informations?: string | null;
  limit?: number | null;
  percentage?: number | null;
  usage: string;
  used?: number | null;
  valid_auth_key?: boolean | null;
  visible_for_valid_auth_key: string;
};

export type Buildings = {
  alias?: string | null;
  apartments: any[] | Apartments[];
  businesshours: any[] | BuildingsBusinesshours[];
  coordinates?: unknown | null;
  date_created?: string | null;
  date_of_construction?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  sort?: number | null;
  status: string;
  translations: any[] | BuildingsTranslations[];
  url?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type BuildingsBusinesshours = {
  buildings_id?: string | Buildings | null;
  businesshours_id?: string | Businesshours | null;
  id: number;
};

export type BuildingsTranslations = {
  be_source_for_translations?: boolean | null;
  buildings_id?: string | Buildings | null;
  content?: string | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  translation_settings: string;
};

export type Businesshours = {
  date_created?: string | null;
  date_updated?: string | null;
  date_valid_from?: string | null;
  date_valid_till?: string | null;
  friday?: boolean | null;
  id: string;
  monday?: boolean | null;
  saturday?: boolean | null;
  sort?: number | null;
  status: string;
  sunday?: boolean | null;
  thursday?: boolean | null;
  time_end?: string | null;
  time_start?: string | null;
  tuesday?: boolean | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  valid_days: string;
  valid_range: string;
  wednesday?: boolean | null;
};

export type CanteenFoodFeedbackReportRecipients = {
  canteen?: string | Canteens | null;
  date_created?: string | null;
  date_next_report_is_due?: string | null;
  date_updated?: string | null;
  enabled?: boolean | null;
  id: string;
  last_saved_send_amount_days_before_offer_date?: number | null;
  last_saved_send_report_at_hh_mm?: string | null;
  recipient_settings: string;
  report_feedback_period_days?: number | null;
  report_information: string;
  report_status_log?: string | null;
  report_time_settings: string;
  send_amount_days_before_offer_date?: number | null;
  send_once_now_for_date?: string | null;
  send_report_at_hh_mm?: string | null;
  sort?: number | null;
  status: string;
  to_recipient_email?: string | null;
  to_recipient_user?: string | DirectusUsers | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type Canteens = {
  alias?: string | null;
  building?: string | Buildings | null;
  date_created?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  foodservice_hours: any[] | CanteensFoodserviceHours[];
  id: string;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  utilization_group?: string | UtilizationsGroups | null;
};

export type CanteensFoodserviceHours = {
  businesshours_id?: string | Businesshours | null;
  canteens_id?: string | Canteens | null;
  id: number;
};

export type Cashregisters = {
  alias?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  id: string;
  sort?: number | null;
  status: string;
  transactions: any[] | CashregistersTransactions[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type CashregistersTransactions = {
  cashregister?: string | Cashregisters | null;
  date?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  name?: string | null;
  quantity?: number | null;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type CollectionsDatesLastUpdate = {
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type Devices = {
  alias?: string | null;
  brand?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  display_fontscale?: number | null;
  display_group: string;
  display_height?: number | null;
  display_pixelratio?: number | null;
  display_scale?: number | null;
  display_width?: number | null;
  id: string;
  is_android?: boolean | null;
  is_ios?: boolean | null;
  is_landscape?: boolean | null;
  is_simulator?: boolean | null;
  is_tablet?: boolean | null;
  is_web?: boolean | null;
  platform?: string | null;
  profile?: string | Profiles | null;
  pushTokenObj?: unknown | null;
  sort?: number | null;
  status: string;
  system_group: string;
  system_version?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type DirectusActivity = {
  action: string;
  collection: string;
  comment?: string | null;
  id: number;
  ip?: string | null;
  item: string;
  origin?: string | null;
  revisions: any[] | DirectusRevisions[];
  timestamp: string;
  user?: string | DirectusUsers | null;
  user_agent?: string | null;
};

export type DirectusCollections = {
  accountability?: string | null;
  archive_app_filter: boolean;
  archive_field?: string | null;
  archive_value?: string | null;
  collapse: string;
  collection: string;
  color?: string | null;
  display_template?: string | null;
  group?: string | DirectusCollections | null;
  hidden: boolean;
  icon?: string | null;
  item_duplication_fields?: unknown | null;
  note?: string | null;
  preview_url?: string | null;
  singleton: boolean;
  sort?: number | null;
  sort_field?: string | null;
  translations?: unknown | null;
  unarchive_value?: string | null;
  versioning: boolean;
};

export type DirectusDashboards = {
  color?: string | null;
  date_created?: string | null;
  icon: string;
  id: string;
  name: string;
  note?: string | null;
  panels: any[] | DirectusPanels[];
  user_created?: string | DirectusUsers | null;
};

export type DirectusExtensions = {
  bundle?: string | null;
  enabled: boolean;
  folder: string;
  id: string;
  source: string;
};

export type DirectusFields = {
  collection: string | DirectusCollections;
  conditions?: unknown | null;
  display?: string | null;
  display_options?: unknown | null;
  field: string;
  group?: string | DirectusFields | null;
  hidden: boolean;
  id: number;
  interface?: string | null;
  note?: string | null;
  options?: unknown | null;
  readonly: boolean;
  required?: boolean | null;
  sort?: number | null;
  special?: unknown | null;
  translations?: unknown | null;
  validation?: unknown | null;
  validation_message?: string | null;
  width?: string | null;
};

export type DirectusFiles = {
  charset?: string | null;
  description?: string | null;
  duration?: number | null;
  embed?: string | null;
  filename_disk?: string | null;
  filename_download: string;
  filesize?: number | null;
  focal_point_x?: number | null;
  focal_point_y?: number | null;
  folder?: string | DirectusFolders | null;
  height?: number | null;
  id: string;
  location?: string | null;
  metadata?: unknown | null;
  modified_by?: string | DirectusUsers | null;
  modified_on: string;
  storage: string;
  tags?: unknown | null;
  title?: string | null;
  type?: string | null;
  uploaded_by?: string | DirectusUsers | null;
  uploaded_on: string;
  width?: number | null;
};

export type DirectusFlows = {
  accountability?: string | null;
  color?: string | null;
  date_created?: string | null;
  description?: string | null;
  icon?: string | null;
  id: string;
  name: string;
  operation?: string | DirectusOperations | null;
  operations: any[] | DirectusOperations[];
  options?: unknown | null;
  status: string;
  trigger?: string | null;
  user_created?: string | DirectusUsers | null;
};

export type DirectusFolders = {
  id: string;
  name: string;
  parent?: string | DirectusFolders | null;
};

export type DirectusMigrations = {
  name: string;
  timestamp?: string | null;
  version: string;
};

export type DirectusNotifications = {
  collection?: string | null;
  id: number;
  item?: string | null;
  message?: string | null;
  recipient: string | DirectusUsers;
  sender?: string | DirectusUsers | null;
  status?: string | null;
  subject: string;
  timestamp?: string | null;
};

export type DirectusOperations = {
  date_created?: string | null;
  flow: string | DirectusFlows;
  id: string;
  key: string;
  name?: string | null;
  options?: unknown | null;
  position_x: number;
  position_y: number;
  reject?: string | DirectusOperations | null;
  resolve?: string | DirectusOperations | null;
  type: string;
  user_created?: string | DirectusUsers | null;
};

export type DirectusPanels = {
  color?: string | null;
  dashboard: string | DirectusDashboards;
  date_created?: string | null;
  height: number;
  icon?: string | null;
  id: string;
  name?: string | null;
  note?: string | null;
  options?: unknown | null;
  position_x: number;
  position_y: number;
  show_header: boolean;
  type: string;
  user_created?: string | DirectusUsers | null;
  width: number;
};

export type DirectusPermissions = {
  action: string;
  collection: string;
  fields?: unknown | null;
  id: number;
  permissions?: unknown | null;
  presets?: unknown | null;
  role?: string | DirectusRoles | null;
  validation?: unknown | null;
};

export type DirectusPresets = {
  bookmark?: string | null;
  collection?: string | null;
  color?: string | null;
  filter?: unknown | null;
  icon?: string | null;
  id: number;
  layout?: string | null;
  layout_options?: unknown | null;
  layout_query?: unknown | null;
  refresh_interval?: number | null;
  role?: string | DirectusRoles | null;
  search?: string | null;
  user?: string | DirectusUsers | null;
};

export type DirectusRelations = {
  id: number;
  junction_field?: string | null;
  many_collection: string;
  many_field: string;
  one_allowed_collections?: unknown | null;
  one_collection?: string | null;
  one_collection_field?: string | null;
  one_deselect_action: string;
  one_field?: string | null;
  sort_field?: string | null;
};

export type DirectusRevisions = {
  activity: number | DirectusActivity;
  collection: string;
  data?: unknown | null;
  delta?: unknown | null;
  id: number;
  item: string;
  parent?: number | DirectusRevisions | null;
  version?: string | DirectusVersions | null;
};

export type DirectusRoles = {
  admin_access: boolean;
  app_access: boolean;
  description?: string | null;
  enforce_tfa: boolean;
  icon: string;
  id: string;
  ip_access?: unknown | null;
  name: string;
  users: any[] | DirectusUsers[];
};

export type DirectusSessions = {
  expires: string;
  ip?: string | null;
  next_token?: string | null;
  origin?: string | null;
  share?: string | DirectusShares | null;
  token: string;
  user?: string | DirectusUsers | null;
  user_agent?: string | null;
};

export type DirectusSettings = {
  auth_login_attempts?: number | null;
  auth_password_policy?: string | null;
  basemaps?: unknown | null;
  custom_aspect_ratios?: unknown | null;
  custom_css?: string | null;
  default_appearance: string;
  default_language: string;
  default_theme_dark?: string | null;
  default_theme_light?: string | null;
  id: number;
  mapbox_key?: string | null;
  module_bar?: unknown | null;
  project_color: string;
  project_descriptor?: string | null;
  project_logo?: string | DirectusFiles | null;
  project_name: string;
  project_url?: string | null;
  public_background?: string | DirectusFiles | null;
  public_favicon?: string | DirectusFiles | null;
  public_foreground?: string | DirectusFiles | null;
  public_note?: string | null;
  public_registration: boolean;
  public_registration_email_filter?: unknown | null;
  public_registration_role?: string | null;
  public_registration_verify_email: boolean;
  report_bug_url?: string | null;
  report_error_url?: string | null;
  report_feature_url?: string | null;
  storage_asset_presets?: unknown | null;
  storage_asset_transform?: string | null;
  storage_default_folder?: string | DirectusFolders | null;
  theme_dark_overrides?: unknown | null;
  theme_light_overrides?: unknown | null;
  theming_group: string;
};

export type DirectusShares = {
  collection: string | DirectusCollections;
  date_created?: string | null;
  date_end?: string | null;
  date_start?: string | null;
  id: string;
  item: string;
  max_uses?: number | null;
  name?: string | null;
  password?: string | null;
  role?: string | DirectusRoles | null;
  times_used?: number | null;
  user_created?: string | DirectusUsers | null;
};

export type DirectusSyncIdMap = {
  created_at?: string | null;
  id: number;
  local_id: string;
  sync_id: string;
  table: string;
};

export type DirectusTranslations = {
  id: string;
  key: string;
  language: string;
  value: string;
};

export type DirectusUsers = {
  appearance?: string | null;
  auth_data?: unknown | null;
  avatar?: string | DirectusFiles | null;
  description?: string | null;
  email?: string | null;
  email_notifications?: boolean | null;
  external_identifier?: string | null;
  first_name?: string | null;
  id: string;
  language?: string | null;
  last_access?: string | null;
  last_name?: string | null;
  last_page?: string | null;
  location?: string | null;
  password?: string | null;
  profile?: string | Profiles | null;
  provider: string;
  role?: string | DirectusRoles | null;
  status: string;
  tags?: unknown | null;
  tfa_secret?: string | null;
  theme_dark?: string | null;
  theme_dark_overrides?: unknown | null;
  theme_light?: string | null;
  theme_light_overrides?: unknown | null;
  title?: string | null;
  token?: string | null;
};

export type DirectusVersions = {
  collection: string | DirectusCollections;
  date_created?: string | null;
  date_updated?: string | null;
  hash?: string | null;
  id: string;
  item: string;
  key: string;
  name?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type DirectusWebhooks = {
  actions: unknown;
  collections: unknown;
  data: boolean;
  headers?: unknown | null;
  id: number;
  method: string;
  migrated_flow?: string | null;
  name: string;
  status: string;
  url: string;
  was_active_before_deprecation: boolean;
};

export type Foodoffers = {
  alias?: string | null;
  calories_kcal?: number | null;
  canteen?: string | Canteens | null;
  carbohydrate_g?: number | null;
  date?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  food?: string | Foods | null;
  id: string;
  markings: any[] | FoodoffersMarkings[];
  price_employee?: number | null;
  price_guest?: number | null;
  price_student?: number | null;
  protein_g?: number | null;
  saturated_fat_g?: number | null;
  sodium_g?: number | null;
  sort?: number | null;
  status: string;
  sugar_g?: number | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FoodoffersMarkings = {
  foodoffers_id?: string | Foodoffers | null;
  id: number;
  markings_id?: string | Markings | null;
};

export type Foods = {
  alias?: string | null;
  calories_kcal?: number | null;
  carbohydrate_g?: number | null;
  category?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  extra?: string | null;
  fat_g?: number | null;
  feedbacks: any[] | FoodsFeedbacks[];
  fiber_g?: number | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  markings: any[] | FoodsMarkings[];
  protein_g?: number | null;
  rating_amount?: number | null;
  rating_average?: number | null;
  saturated_fat_g?: number | null;
  sodium_g?: number | null;
  sort?: number | null;
  status: string;
  sugar_g?: number | null;
  translations: any[] | FoodsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FoodsFeedbacks = {
  canteen?: string | Canteens | null;
  comment?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  food?: string | Foods | null;
  foodoffer?: string | Foodoffers | null;
  id: string;
  labels: any[] | FoodsFeedbacksFoodsFeedbacksLabels[];
  notify?: boolean | null;
  profile?: string | Profiles | null;
  rating?: number | null;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FoodsFeedbacksFoodsFeedbacksLabels = {
  dislike?: boolean | null;
  foods_feedbacks_id?: string | FoodsFeedbacks | null;
  foods_feedbacks_labels_id?: string | FoodsFeedbacksLabels | null;
  id: number;
};

export type FoodsFeedbacksLabels = {
  alias?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  icon?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  sort?: number | null;
  status: string;
  translations: any[] | FoodsFeedbacksLabelsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  visible?: boolean | null;
};

export type FoodsFeedbacksLabelsTranslations = {
  be_source_for_translations?: boolean | null;
  foods_feedbacks_labels_id?: string | FoodsFeedbacksLabels | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  text?: string | null;
  translation_settings: string;
};

export type FoodsMarkings = {
  foods_id?: string | Foods | null;
  id: number;
  markings_id?: string | Markings | null;
};

export type FoodsTranslations = {
  be_source_for_translations?: boolean | null;
  foods_id?: string | Foods | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  name?: string | null;
  translation_settings: string;
};

export type FoodsoffersMarkings = {
  id: number;
  markings_id?: string | Markings | null;
};

export type Languages = {
  code: string;
  direction?: string | null;
  name?: string | null;
};

export type Markings = {
  alias?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  icon?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  sort?: number | null;
  status: string;
  translations: any[] | MarkingsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type MarkingsTranslations = {
  be_source_for_translations?: boolean | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  markings_id?: string | Markings | null;
  name?: string | null;
  translation_settings: string;
};

export type News = {
  alias?: string | null;
  categories?: unknown | null;
  date?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  sort?: number | null;
  status: string;
  translations: any[] | NewsTranslations[];
  url?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type NewsTranslations = {
  be_source_for_translations?: boolean | null;
  content?: string | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  news_id?: string | News | null;
  title?: string | null;
  translation_settings: string;
};

export type PopupEvents = {
  alias?: string | null;
  canteens: any[] | PopupEventsCanteens[];
  date_created?: string | null;
  date_end?: string | null;
  date_start?: string | null;
  date_updated?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  send_notification?: boolean | null;
  sort?: number | null;
  status: string;
  translations: any[] | PopupEventsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type PopupEventsCanteens = {
  canteens_id?: string | Canteens | null;
  id: number;
  popup_events_id?: string | PopupEvents | null;
};

export type PopupEventsTranslations = {
  be_source_for_translations?: boolean | null;
  content?: string | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  popup_events_id?: string | PopupEvents | null;
  title?: string | null;
  translation_settings: string;
};

export type Profiles = {
  avatar?: unknown | null;
  buildings_favorites: any[] | ProfilesBuildingsFavorites[];
  buildings_last_opened: any[] | ProfilesBuildingsLastOpened[];
  canteen?: string | Canteens | null;
  course_timetable?: string | null;
  credit_balance?: number | null;
  date_created?: string | null;
  date_privacy_policy_accepted?: string | null;
  date_updated?: string | null;
  devices: any[] | Devices[];
  foods_feedbacks: any[] | FoodsFeedbacks[];
  id: string;
  language?: string | Languages | null;
  markings: any[] | ProfilesMarkings[];
  nickname?: string | null;
  notifiy_on_free_apartments?: boolean | null;
  price_group?: string | null;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type ProfilesBuildingsFavorites = {
  buildings_id?: string | Buildings | null;
  id: number;
  profiles_id?: string | Profiles | null;
};

export type ProfilesBuildingsLastOpened = {
  buildings_id?: string | Buildings | null;
  id: number;
  profiles_id?: string | Profiles | null;
};

export type ProfilesMarkings = {
  id: number;
  markings_id?: string | Markings | null;
  profiles_id?: string | Profiles | null;
};

export type PushNotifications = {
  android: string;
  android_channel_id?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  expo_access_token?: string | null;
  expo_push_tokens?: unknown | null;
  id: string;
  ios: string;
  ios_badge_count?: number | null;
  ios_message_subtitle?: string | null;
  ios_play_sound?: boolean | null;
  message: string;
  message_body?: string | null;
  message_data?: unknown | null;
  message_title?: string | null;
  message_ttl?: number | null;
  sort?: number | null;
  status: string;
  status_log?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type UtilizationsEntries = {
  date_created?: string | null;
  date_end?: string | null;
  date_start?: string | null;
  date_updated?: string | null;
  id: string;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  utilization_group?: string | UtilizationsGroups | null;
  value_forecast_current?: number | null;
  value_real?: number | null;
};

export type UtilizationsGroups = {
  alias?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  utilization_entries: any[] | UtilizationsEntries[];
};

export type Washingmachines = {
  alias?: string | null;
  apartment?: string | Apartments | null;
  date_created?: string | null;
  date_finished?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  id: string;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type Wikis = {
  alias?: string | null;
  children: any[] | Wikis[];
  custom_id?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  icon?: string | null;
  id: string;
  parent?: string | Wikis | null;
  position?: number | null;
  public?: boolean | null;
  roles_required: any[] | WikisDirectusRoles[];
  show_in_drawer?: boolean | null;
  show_in_drawer_as_bottom_item?: boolean | null;
  sort?: number | null;
  status: string;
  translations: any[] | WikisTranslations[];
  url?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  visibility_settings: string;
};

export type WikisDirectusRoles = {
  directus_roles_id?: string | DirectusRoles | null;
  id: number;
  wikis_id?: string | Wikis | null;
};

export type WikisTranslations = {
  be_source_for_translations?: boolean | null;
  content?: string | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  title?: string | null;
  translation_settings: string;
  wikis_id?: string | Wikis | null;
};

export type CustomDirectusTypes = {
  apartments: Apartments[];
  app_feedbacks: AppFeedbacks[];
  app_settings: AppSettings;
  app_settings_housing_translations: AppSettingsHousingTranslations[];
  app_translations: AppTranslations[];
  app_translations_translations: AppTranslationsTranslations[];
  auto_translation_settings: AutoTranslationSettings;
  buildings: Buildings[];
  buildings_businesshours: BuildingsBusinesshours[];
  buildings_translations: BuildingsTranslations[];
  businesshours: Businesshours[];
  canteen_food_feedback_report_recipients: CanteenFoodFeedbackReportRecipients[];
  canteens: Canteens[];
  canteens_foodservice_hours: CanteensFoodserviceHours[];
  cashregisters: Cashregisters[];
  cashregisters_transactions: CashregistersTransactions[];
  collections_dates_last_update: CollectionsDatesLastUpdate[];
  devices: Devices[];
  directus_activity: DirectusActivity[];
  directus_collections: DirectusCollections[];
  directus_dashboards: DirectusDashboards[];
  directus_extensions: DirectusExtensions[];
  directus_fields: DirectusFields[];
  directus_files: DirectusFiles[];
  directus_flows: DirectusFlows[];
  directus_folders: DirectusFolders[];
  directus_migrations: DirectusMigrations[];
  directus_notifications: DirectusNotifications[];
  directus_operations: DirectusOperations[];
  directus_panels: DirectusPanels[];
  directus_permissions: DirectusPermissions[];
  directus_presets: DirectusPresets[];
  directus_relations: DirectusRelations[];
  directus_revisions: DirectusRevisions[];
  directus_roles: DirectusRoles[];
  directus_sessions: DirectusSessions[];
  directus_settings: DirectusSettings;
  directus_shares: DirectusShares[];
  directus_sync_id_map: DirectusSyncIdMap[];
  directus_translations: DirectusTranslations[];
  directus_users: DirectusUsers[];
  directus_versions: DirectusVersions[];
  directus_webhooks: DirectusWebhooks[];
  foodoffers: Foodoffers[];
  foodoffers_markings: FoodoffersMarkings[];
  foods: Foods[];
  foods_feedbacks: FoodsFeedbacks[];
  foods_feedbacks_foods_feedbacks_labels: FoodsFeedbacksFoodsFeedbacksLabels[];
  foods_feedbacks_labels: FoodsFeedbacksLabels[];
  foods_feedbacks_labels_translations: FoodsFeedbacksLabelsTranslations[];
  foods_markings: FoodsMarkings[];
  foods_translations: FoodsTranslations[];
  foodsoffers_markings: FoodsoffersMarkings[];
  languages: Languages[];
  markings: Markings[];
  markings_translations: MarkingsTranslations[];
  news: News[];
  news_translations: NewsTranslations[];
  popup_events: PopupEvents[];
  popup_events_canteens: PopupEventsCanteens[];
  popup_events_translations: PopupEventsTranslations[];
  profiles: Profiles[];
  profiles_buildings_favorites: ProfilesBuildingsFavorites[];
  profiles_buildings_last_opened: ProfilesBuildingsLastOpened[];
  profiles_markings: ProfilesMarkings[];
  push_notifications: PushNotifications[];
  utilizations_entries: UtilizationsEntries[];
  utilizations_groups: UtilizationsGroups[];
  washingmachines: Washingmachines[];
  wikis: Wikis[];
  wikis_directus_roles: WikisDirectusRoles[];
  wikis_translations: WikisTranslations[];
};
