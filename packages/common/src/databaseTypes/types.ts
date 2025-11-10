import { ChatConversationState } from '../ChatConversationState';

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
  status?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  washingmachines: any[] | Washingmachines[];
};

export type AppElements = {
  color?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  sort?: number | null;
  status: string;
  translations: any[] | AppElementsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type AppElementsTranslations = {
  app_elements_id?: string | AppElements | null;
  be_source_for_translations?: boolean | null;
  content?: string | null;
  content_settings: string;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  popup_button_text?: string | null;
  popup_content?: string | null;
  popup_settings: string;
  translation_settings: string;
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
  status?: string | null;
  title?: string | null;
  user_created?: string | null;
  user_updated?: string | DirectusUsers | null;
};

export type AppSettings = {
  animations_auto_start?: boolean | null;
  app_stores: string;
  app_stores_url_to_apple?: string | null;
  app_stores_url_to_google?: string | null;
  balance_area_color?: string | null;
  balance_enabled?: boolean | null;
  balance_settings: string;
  balance_translations: any[] | AppSettingsBalanceTranslations[];
  campus_area_color?: string | null;
  campus_before_element?: string | AppElements | null;
  campus_enabled?: boolean | null;
  campus_settings: string;
  company_image?: string | DirectusFiles | null;
  course_timetable_area_color?: string | null;
  course_timetable_enabled?: boolean | null;
  course_timetable_settings: string;
  date_created?: string | null;
  date_privacy_policy_updated?: string | null;
  date_updated?: string | null;
  food_responsible_organization_link?: string | null;
  food_responsible_organization_name?: string | null;
  food_responsible_settings: string;
  foodoffers_list_after_element?: string | AppElements | null;
  foodoffers_list_before_element?: string | AppElements | null;
  foods_area_color?: string | null;
  foods_enabled?: boolean | null;
  foods_feedbacks_comments_type?: string | null;
  foods_feedbacks_custom_url?: string | null;
  foods_feedbacks_labels_type?: string | null;
  foods_placeholder_image?: string | DirectusFiles | null;
  foods_placeholder_image_remote_url?: string | null;
  foods_placeholder_image_thumb_hash?: string | null;
  foods_image_ai_generation_enabled?: boolean | null;
  foods_ratings_amount_display?: boolean | null;
  foods_ratings_average_display?: boolean | null;
  foods_ratings_type?: string | null;
  foods_settings: string;
  housing_area_color?: string | null;
  housing_before_element?: string | AppElements | null;
  housing_enabled?: boolean | null;
  housing_settings: string;
  housing_translations: any[] | AppSettingsHousingTranslations[];
  id: number;
  legal_requirements_settings: string;
  login_screen_translations: any[] | AppSettingsLoginScreenTranslations[];
  maintenance_end?: string | null;
  maintenance_settings: string;
  maintenance_start?: string | null;
  map_enabled?: boolean | null;
  map_settings: string;
  news_area_color?: string | null;
  news_before_element?: string | AppElements | null;
  news_enabled?: boolean | null;
  news_settings: string;
  notifications_android_enabled?: boolean | null;
  notifications_email_enabled?: boolean | null;
  notifications_ios_enabled?: boolean | null;
  notifications_settings: string;
  placeholder_image?: string | DirectusFiles | null;
  redirect_settings: string;
  redirect_whitelist?: unknown | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  utilization_display_enabled?: boolean | null;
  utilization_settings: string;
};

export type AppSettingsBalanceTranslations = {
  app_settings_id?: number | AppSettings | null;
  be_source_for_translations?: boolean | null;
  content?: string | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  translation_settings: string;
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

export type AppSettingsLoginScreenTranslations = {
  app_settings_id?: number | AppSettings | null;
  be_source_for_translations?: boolean | null;
  detailed_description?: string | null;
  id: number;
  intro_description?: string | null;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
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
  status?: string | null;
  translations: any[] | BuildingsTranslations[];
  url?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type BuildingsAttributes = {
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  sort?: number | null;
  status: string;
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
  group?: string | BusinesshoursGroups | null;
  id: string;
  monday?: boolean | null;
  saturday?: boolean | null;
  sort?: number | null;
  status?: string | null;
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

export type BusinesshoursGroups = {
  alias?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  sort?: number | null;
  status: string;
  translations: any[] | BusinesshoursGroupsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type BusinesshoursGroupsTranslations = {
  be_source_for_translations?: boolean | null;
  businesshours_groups_id?: string | BusinesshoursGroups | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  name?: string | null;
  translation_settings: string;
};

export type CanteenFoodFeedbackReportSchedules = {
  alias?: string | null;
  canteens: any[] | CanteenFoodFeedbackReportSchedulesCanteens[];
  date_created?: string | null;
  date_next_report_is_due?: string | null;
  date_updated?: string | null;
  enabled?: boolean | null;
  id: string;
  period_days_amount?: number | null;
  period_days_offset?: number | null;
  recipients: any[] | CanteenFoodFeedbackReportSchedulesReportRecipients[];
  report_content_settings: string;
  report_debug_settings: string;
  report_filter_settings: string;
  report_information: string;
  report_recipient_settings: string;
  report_send_successfully?: boolean | null;
  report_status_log?: string | null;
  report_time_settings: string;
  report_time_settings_days: string;
  send_on_fridays?: boolean | null;
  send_on_mondays?: boolean | null;
  send_on_saturdays?: boolean | null;
  send_on_sundays?: boolean | null;
  send_on_thursdays?: boolean | null;
  send_on_tuesdays?: boolean | null;
  send_on_wednesdays?: boolean | null;
  send_once_now_for_reference_date?: string | null;
  send_report_at_hh_mm?: string | null;
  show_canteen_feedbacks_also_per_canteen?: boolean | null;
  show_canteen_feedbacks_for_all_time?: boolean | null;
  show_canteen_feedbacks_for_selected_period?: boolean | null;
  show_food_comments_for_all_time?: boolean | null;
  show_food_comments_for_selected_period?: boolean | null;
  show_food_feedback_labels_for_all_time?: boolean | null;
  show_food_feedback_labels_for_selected_period?: boolean | null;
  show_images?: boolean | null;
  sort?: number | null;
  status?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type CanteenFoodFeedbackReportSchedulesCanteens = {
  canteen_food_feedback_report_schedules_id?: string | CanteenFoodFeedbackReportSchedules | null;
  canteens_id?: string | Canteens | null;
  id: number;
};

export type CanteenFoodFeedbackReportSchedulesReportRecipients = {
  canteen_food_feedback_report_schedules_id?: string | CanteenFoodFeedbackReportSchedules | null;
  id: number;
  report_recipients_id?: string | ReportRecipients | null;
};

export type Canteens = {
  alias?: string | null;
  building?: string | Buildings | null;
  date_created?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  foodoffers_import_delete_all_without_dates?: boolean | null;
  foodoffers_import_without_date?: boolean | null;
  id: string;
  sort?: number | null;
  status?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  utilization_group?: string | UtilizationsGroups | null;
};

export type CanteensFeedbacksLabels = {
  alias?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  icon?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  sort?: number | null;
  status?: string | null;
  translations: any[] | CanteensFeedbacksLabelsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type CanteensFeedbacksLabelsEntries = {
  canteen?: string | Canteens | null;
  date?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  dislike?: boolean | null;
  id: string;
  label?: string | CanteensFeedbacksLabels | null;
  like?: boolean | null;
  profile?: string | Profiles | null;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type CanteensFeedbacksLabelsTranslations = {
  be_source_for_translations?: boolean | null;
  canteens_feedbacks_labels_id?: string | CanteensFeedbacksLabels | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  text?: string | null;
  translation_settings: string;
};

export type CanteensFoodserviceHours = {
  businesshours_id?: string | Businesshours | null;
  canteens_id?: string | Canteens | null;
  id: number;
};

export type CanteensFoodserviceHoursDuringSemesterBreak = {
  businesshours_id?: string | Businesshours | null;
  canteens_id?: string | Canteens | null;
  id: number;
};

export type Cashregisters = {
  alias?: string | null;
  canteen?: string | Canteens | null;
  date_created?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  id: string;
  sort?: number | null;
  status?: string | null;
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
  status?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  weekday_index_calculated?: number | null;
};

export type ChatMessages = {
  attachment?: string | DirectusFiles | null;
  chat?: string | Chats | null;
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  message?: string | null;
  profile?: string | Profiles | null;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type Chats = {
  alias?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  foods_feedback?: string | FoodsFeedbacks | null;
  id: string;
  conversation_state?: ChatConversationState | null;
  linked_entities: string;
  messages: any[] | ChatMessages[];
  participants: any[] | ChatsParticipants[];
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type ChatsParticipants = {
  chats_id?: string | Chats | null;
  id: number;
  profiles_id?: string | Profiles | null;
};

export type CollectibleEventParticipants = {
  collectible_event?: string | CollectibleEvents | null;
  date_created?: string | null;
  date_updated?: string | null;
  email?: string | null;
  id: string;
  phone_number?: string | null;
  points?: string | null;
  profile?: string | Profiles | null;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type CollectibleEvents = {
  alias?: string | null;
  collectible_image?: string | DirectusFiles | null;
  collectible_settings: string;
  date_created?: string | null;
  date_end?: string | null;
  date_start?: string | null;
  date_updated?: string | null;
  id: string;
  monitor_background_image?: string | DirectusFiles | null;
  monitor_display_number_of_collected_items?: boolean | null;
  monitor_display_number_of_participants?: boolean | null;
  monitor_settings: string;
  participants: any[] | CollectibleEventParticipants[];
  points_maximum?: string | null;
  points_minimum?: string | null;
  sort?: number | null;
  status: string;
  translations: any[] | CollectibleEventsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type CollectibleEventsTranslations = {
  be_source_for_translations?: boolean | null;
  collectible_events_id?: string | CollectibleEvents | null;
  description?: string | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  title?: string | null;
  translation_settings: string;
};

export type CollectionsDatesLastUpdate = {
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  sort?: number | null;
  status?: string | null;
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
  status?: string | null;
  system_group: string;
  system_version?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type DirectusAccess = {
  id: string;
  policy: string | DirectusPolicies;
  role?: string | DirectusRoles | null;
  sort?: number | null;
  user?: string | DirectusUsers | null;
};

export type DirectusActivity = {
  action: string;
  collection: string;
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

export type DirectusComments = {
  collection: string | DirectusCollections;
  comment: string;
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  item: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
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
  created_on: string;
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
  is_unreferenced?: boolean | null;
  location?: string | null;
  metadata?: unknown | null;
  modified_by?: string | DirectusUsers | null;
  modified_on: string;
  storage: string;
  tags?: unknown | null;
  title?: string | null;
  tus_data?: unknown | null;
  tus_id?: string | null;
  type?: string | null;
  uploaded_by?: string | DirectusUsers | null;
  uploaded_on?: string | null;
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
  policy: string | DirectusPolicies;
  presets?: unknown | null;
  validation?: unknown | null;
};

export type DirectusPolicies = {
  admin_access: boolean;
  app_access: boolean;
  description?: string | null;
  enforce_tfa: boolean;
  icon: string;
  id: string;
  ip_access?: unknown | null;
  name: string;
  permissions: any[] | DirectusPermissions[];
  roles: any[] | DirectusAccess[];
  users: any[] | DirectusAccess[];
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
  children: any[] | DirectusRoles[];
  description?: string | null;
  icon: string;
  id: string;
  name: string;
  parent?: string | DirectusRoles | null;
  policies: any[] | DirectusAccess[];
  users: any[] | DirectusUsers[];
  users_group: string;
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
  accepted_terms?: boolean | null;
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
  project_id?: string | null;
  project_logo?: string | DirectusFiles | null;
  project_name: string;
  project_url?: string | null;
  public_background?: string | DirectusFiles | null;
  public_favicon?: string | DirectusFiles | null;
  public_foreground?: string | DirectusFiles | null;
  public_note?: string | null;
  public_registration: boolean;
  public_registration_email_filter?: unknown | null;
  public_registration_role?: string | DirectusRoles | null;
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
  visual_editor_urls?: unknown | null;
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
  policies: any[] | DirectusAccess[];
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
  delta?: unknown | null;
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
  migrated_flow?: string | DirectusFlows | null;
  name: string;
  status: string;
  url: string;
  was_active_before_deprecation: boolean;
};

export type FilesShares = {
  date_created?: string | null;
  date_exires_at?: string | null;
  date_updated?: string | null;
  file?: string | DirectusFiles | null;
  id: string;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type Foodoffers = {
  alias?: string | null;
  attribute_values: any[] | FoodsAttributesValues[];
  canteen?: string | Canteens | null;
  category?: string | null;
  date?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  food?: string | Foods | null;
  foodoffer_category?: string | FoodoffersCategories | null;
  id: string;
  markings: any[] | FoodoffersMarkings[];
  price_employee?: number | null;
  price_guest?: number | null;
  price_student?: number | null;
  prices: string;
  redirect_url?: string | null;
  sort?: number | null;
  status?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FoodoffersCategories = {
  alias?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  id: string;
  sort?: number | null;
  status: string;
  translations: any[] | FoodoffersCategoriesTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FoodoffersCategoriesTranslations = {
  be_source_for_translations?: boolean | null;
  foodoffers_categories_id?: string | FoodoffersCategories | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  name?: string | null;
  translation_settings: string;
};

export type FoodoffersInfoItems = {
  canteen?: string | Canteens | null;
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  link?: string | null;
  name?: string | AppElements | null;
  placement?: string | null;
  show_only_when_no_foodoffers_found?: boolean | null;
  sort?: number | null;
  status: string;
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
  attribute_values: any[] | FoodsAttributesValues[];
  category?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  extra?: string | null;
  feedbacks: any[] | FoodsFeedbacks[];
  food_category?: string | FoodsCategories | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  image_generated?: boolean | null;
  markings: any[] | FoodsMarkings[];
  rating_amount?: number | null;
  rating_amount_legacy?: number | null;
  rating_average?: number | null;
  rating_average_legacy?: number | null;
  rating_legacy_settings: string;
  rating_settings: string;
  sort?: number | null;
  status?: string | null;
  translations: any[] | FoodsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FoodsAttributes = {
  alias?: string | null;
  background_color?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  full_width?: boolean | null;
  group?: string | FoodsAttributesGroups | null;
  icon_expo?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  prefix?: string | null;
  show_on_card?: boolean | null;
  show_on_label_list?: boolean | null;
  sort?: number | null;
  status: string;
  suffix?: string | null;
  translations: any[] | FoodsAttributesTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FoodsAttributesGroups = {
  alias?: string | null;
  background_color?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  food_attributes: any[] | FoodsAttributes[];
  icon?: string | null;
  icon_expo?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  sort?: number | null;
  status: string;
  translations: any[] | FoodsAttributesGroupsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FoodsAttributesGroupsTranslations = {
  be_source_for_translations?: boolean | null;
  foods_attributes_groups_id?: string | FoodsAttributesGroups | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  name?: string | null;
  translation_settings: string;
};

export type FoodsAttributesTranslations = {
  be_source_for_translations?: boolean | null;
  description?: string | null;
  foods_attributes_id?: string | FoodsAttributes | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  name?: string | null;
  translation_settings: string;
};

export type FoodsAttributesValues = {
  boolean_value?: boolean | null;
  color_value?: string | null;
  food_attribute?: string | FoodsAttributes | null;
  food_id?: string | Foods | null;
  foodoffer_id?: string | Foodoffers | null;
  icon_value?: string | null;
  id: string;
  number_value?: number | null;
  string_value?: string | null;
};

export type FoodsCategories = {
  alias?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  id: string;
  sort?: number | null;
  status: string;
  translations: any[] | FoodsCategoriesTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FoodsCategoriesTranslations = {
  be_source_for_translations?: boolean | null;
  foods_categories_id?: string | FoodsCategories | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  name?: string | null;
  translation_settings: string;
};

export type FoodsFeedbacks = {
  canteen?: string | Canteens | null;
  comment?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  food?: string | Foods | null;
  foodoffer?: string | Foodoffers | null;
  id: string;
  notify?: boolean | null;
  profile?: string | Profiles | null;
  rating?: number | null;
  sort?: number | null;
  status?: string | null;
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
  status?: string | null;
  translations: any[] | FoodsFeedbacksLabelsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FoodsFeedbacksLabelsEntries = {
  canteen?: string | Canteens | null;
  date_created?: string | null;
  date_updated?: string | null;
  dislike?: boolean | null;
  food?: string | Foods | null;
  foodoffer?: string | Foodoffers | null;
  id: string;
  label?: string | FoodsFeedbacksLabels | null;
  like?: boolean | null;
  profile?: string | Profiles | null;
  sort?: number | null;
  status?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
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

export type FormAnswers = {
  date_created?: string | null;
  date_updated?: string | null;
  form_field?: string | FormFields | null;
  form_submission?: string | FormSubmissions | null;
  id: string;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  value_boolean?: boolean | null;
  value_custom?: unknown | null;
  value_date?: string | null;
  value_files: any[] | FormAnswersFiles[];
  value_image?: string | DirectusFiles | null;
  value_number?: number | null;
  value_string?: string | null;
  values: string;
};

export type FormAnswersFiles = {
  directus_files_id?: string | DirectusFiles | null;
  form_answers_id?: string | FormAnswers | null;
  id: number;
};

export type FormCategories = {
  alias?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  forms: any[] | Forms[];
  icon_expo?: string | null;
  id: string;
  sort?: number | null;
  status: string;
  translations: any[] | FormCategoriesTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FormCategoriesTranslations = {
  be_source_for_translations?: boolean | null;
  form_categories_id?: string | FormCategories | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  name?: string | null;
  translation_settings: string;
};

export type FormExtracts = {
  alias?: string | null;
  all_fields?: boolean | null;
  date_created?: string | null;
  date_updated?: string | null;
  field_settings: string;
  fields: any[] | FormExtractsFormFields[];
  form?: string | Forms | null;
  id: string;
  internal_custom_id?: string | null;
  recipient_email_field?: string | FormFields | null;
  recipient_email_static?: string | null;
  recipient_user?: string | DirectusUsers | null;
  send_attachments_as_links?: boolean | null;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FormExtractsFormFields = {
  form_extracts_id?: string | FormExtracts | null;
  form_fields_id?: string | FormFields | null;
  id: number;
};

export type FormFields = {
  alias?: string | null;
  background_color?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  export_settings: string;
  external_export_field_name?: string | null;
  external_export_id?: string | null;
  external_import_id?: string | null;
  field_type?: string | null;
  form?: string | Forms | null;
  form_settings: string;
  icon?: string | null;
  icon_expo?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  import_settings: string;
  internal_custom_id?: string | null;
  is_disabled?: boolean | null;
  is_required?: boolean | null;
  is_visible_in_export?: boolean | null;
  is_visible_in_form?: boolean | null;
  sort?: number | null;
  status: string;
  translations: any[] | FormFieldsTranslations[];
  visibility_depends_on_referenced_field?: string | FormFields | null;
  visibility_depends_on_referenced_value_equals?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  value_prefix?: string | null;
  value_suffix?: string | null;
};

export type FormFieldsTranslations = {
  be_source_for_translations?: boolean | null;
  description?: string | null;
  form_fields_id?: string | FormFields | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  name?: string | null;
  translation_settings: string;
};

export type FormSubmissions = {
  alias?: string | null;
  date_created?: string | null;
  date_locked_until?: string | null;
  date_started?: string | null;
  date_submitted?: string | null;
  date_updated?: string | null;
  form?: string | Forms | null;
  form_answers: any[] | FormAnswers[];
  id: string;
  internal_custom_id?: string | null;
  mails: any[] | Mails[];
  sort?: number | null;
  state?: string | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_locked_by?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type Forms = {
  alias?: string | null;
  category?: string | FormCategories | null;
  date_created?: string | null;
  date_updated?: string | null;
  form_fields: any[] | FormFields[];
  form_submissions: any[] | FormSubmissions[];
  icon_expo?: string | null;
  id: string;
  internal_custom_id?: string | null;
  sort?: number | null;
  status: string;
  translations: any[] | FormsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type FormsTranslations = {
  be_source_for_translations?: boolean | null;
  description?: string | null;
  forms_id?: string | Forms | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  name?: string | null;
  translation_settings: string;
};

export type Languages = {
  code: string;
  direction?: string | null;
  name?: string | null;
  status?: string | null;
};

export type Mails = {
  attachments: any[] | MailsFiles[];
  date_created?: string | null;
  date_updated?: string | null;
  form_submission?: string | FormSubmissions | null;
  id: string;
  log?: string | null;
  mail_information: string;
  markdown_content?: string | null;
  recipient?: string | null;
  send_attachments_as_links?: boolean | null;
  send_status: string;
  sort?: number | null;
  status: string;
  subject?: string | null;
  template_data?: unknown | null;
  template_name?: string | null;
  template_settings: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type MailsFiles = {
  directus_files_id?: string | DirectusFiles | null;
  id: number;
  mails_id?: string | Mails | null;
};

export type Markings = {
  alias?: string | null;
  background_color?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  excluded_by_markings: any[] | MarkingsExclusions[];
  external_identifier?: string | null;
  group?: string | MarkingsGroups | null;
  hide_border?: boolean | null;
  icon?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  invert_background_color?: boolean | null;
  short_code?: string | null;
  show_on_card?: boolean | null;
  show_on_label_list?: boolean | null;
  sort?: number | null;
  status?: string | null;
  translations: any[] | MarkingsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type MarkingsExclusions = {
  id: number;
  restricted_by_markings_id?: string | Markings | null;
  restricted_markings_id?: string | Markings | null;
};

export type MarkingsGroups = {
  alias?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  id: string;
  markings: any[] | Markings[];
  sort?: number | null;
  status?: string | null;
  translations: any[] | MarkingsGroupsTranslations[];
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type MarkingsGroupsTranslations = {
  be_source_for_translations?: boolean | null;
  id: number;
  languages_code?: string | Languages | null;
  let_be_translated?: boolean | null;
  markings_groups_id?: string | MarkingsGroups | null;
  name?: string | null;
  translation_settings: string;
};

export type MarkingsTranslations = {
  be_source_for_translations?: boolean | null;
  description?: string | null;
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
  status?: string | null;
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
  date_start: string;
  date_updated?: string | null;
  id: string;
  image?: string | DirectusFiles | null;
  image_remote_url?: string | null;
  image_thumb_hash?: string | null;
  send_notification?: boolean | null;
  show_on_android?: boolean | null;
  show_on_ios?: boolean | null;
  show_on_web?: boolean | null;
  sort?: number | null;
  status?: string | null;
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
  course_timetable?: unknown | null;
  credit_balance?: number | null;
  credit_balance_date_updated?: string | null;
  credit_balance_last_transaction?: number | null;
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
  status?: string | null;
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
  dislike?: boolean | null;
  id: number;
  like?: boolean | null;
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
  image_url?: string | null;
  ios: string;
  ios_badge_count?: number | null;
  ios_message_subtitle?: string | null;
  ios_play_sound?: boolean | null;
  message: string;
  message_body?: string | null;
  message_data?: unknown | null;
  message_title?: string | null;
  message_ttl?: number | null;
  richContent?: string | null;
  sort?: number | null;
  status?: string | null;
  status_log?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type ReportRecipients = {
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  mail?: string | null;
  name?: string | null;
  sort?: number | null;
  status?: string | null;
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
  status?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  utilization_group?: string | UtilizationsGroups | null;
  value_forecast_current?: number | null;
  value_real?: number | null;
};

export type UtilizationsGroups = {
  alias?: string | null;
  all_time_high?: number | null;
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  sort?: number | null;
  status?: string | null;
  threshold_until_high?: number | null;
  threshold_until_low?: number | null;
  threshold_until_max?: number | null;
  threshold_until_medium?: number | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  utilization_entries: any[] | UtilizationsEntries[];
};

export type Washingmachines = {
  alias?: string | null;
  apartment?: string | Apartments | null;
  date_created?: string | null;
  date_finished?: string | null;
  date_started?: string | null;
  date_stated?: string | null;
  date_updated?: string | null;
  external_identifier?: string | null;
  id: string;
  sort?: number | null;
  status?: string | null;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
};

export type WashingmachinesJobs = {
  apartment?: string | Apartments | null;
  date_created?: string | null;
  date_end?: string | null;
  date_start?: string | null;
  date_updated?: string | null;
  duration_calculated?: string | null;
  duration_in_minutes_calculated?: number | null;
  duration_in_minutes_rounded_10min_calculated?: number | null;
  id: string;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  washingmachine?: string | Washingmachines | null;
};

export type Wikis = {
  alias?: string | null;
  children: any[] | Wikis[];
  color?: string | null;
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
  status?: string | null;
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

export type Workflows = {
  alias?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  enabled?: boolean | null;
  id: string;
  sort?: number | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  workflows_runs: any[] | WorkflowsRuns[];
};

export type WorkflowsRuns = {
  alias?: string | null;
  date_created?: string | null;
  date_finished?: string | null;
  date_started?: string | null;
  date_updated?: string | null;
  id: string;
  input?: string | null;
  log?: string | null;
  output?: string | null;
  result_hash?: string | null;
  runtime_in_seconds?: number | null;
  sort?: number | null;
  state?: string | null;
  status: string;
  user_created?: string | DirectusUsers | null;
  user_updated?: string | DirectusUsers | null;
  workflow: string | Workflows;
};

export type CustomDirectusTypes = {
  apartments: Apartments[];
  app_elements: AppElements[];
  app_elements_translations: AppElementsTranslations[];
  app_feedbacks: AppFeedbacks[];
  app_settings: AppSettings;
  app_settings_balance_translations: AppSettingsBalanceTranslations[];
  app_settings_housing_translations: AppSettingsHousingTranslations[];
  app_settings_login_screen_translations: AppSettingsLoginScreenTranslations[];
  auto_translation_settings: AutoTranslationSettings;
  buildings: Buildings[];
  buildings_attributes: BuildingsAttributes[];
  buildings_businesshours: BuildingsBusinesshours[];
  buildings_translations: BuildingsTranslations[];
  businesshours: Businesshours[];
  businesshours_groups: BusinesshoursGroups[];
  businesshours_groups_translations: BusinesshoursGroupsTranslations[];
  canteen_food_feedback_report_schedules: CanteenFoodFeedbackReportSchedules[];
  canteen_food_feedback_report_schedules_canteens: CanteenFoodFeedbackReportSchedulesCanteens[];
  canteen_food_feedback_report_schedules_report_recipients: CanteenFoodFeedbackReportSchedulesReportRecipients[];
  canteens: Canteens[];
  canteens_feedbacks_labels: CanteensFeedbacksLabels[];
  canteens_feedbacks_labels_entries: CanteensFeedbacksLabelsEntries[];
  canteens_feedbacks_labels_translations: CanteensFeedbacksLabelsTranslations[];
  canteens_foodservice_hours: CanteensFoodserviceHours[];
  canteens_foodservice_hours_during_semester_break: CanteensFoodserviceHoursDuringSemesterBreak[];
  cashregisters: Cashregisters[];
  cashregisters_transactions: CashregistersTransactions[];
  chat_messages: ChatMessages[];
  chats: Chats[];
  chats_participants: ChatsParticipants[];
  collectible_event_participants: CollectibleEventParticipants[];
  collectible_events: CollectibleEvents[];
  collectible_events_translations: CollectibleEventsTranslations[];
  collections_dates_last_update: CollectionsDatesLastUpdate[];
  devices: Devices[];
  directus_access: DirectusAccess[];
  directus_activity: DirectusActivity[];
  directus_collections: DirectusCollections[];
  directus_comments: DirectusComments[];
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
  directus_policies: DirectusPolicies[];
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
  files_shares: FilesShares[];
  foodoffers: Foodoffers[];
  foodoffers_categories: FoodoffersCategories[];
  foodoffers_categories_translations: FoodoffersCategoriesTranslations[];
  foodoffers_info_items: FoodoffersInfoItems[];
  foodoffers_markings: FoodoffersMarkings[];
  foods: Foods[];
  foods_attributes: FoodsAttributes[];
  foods_attributes_groups: FoodsAttributesGroups[];
  foods_attributes_groups_translations: FoodsAttributesGroupsTranslations[];
  foods_attributes_translations: FoodsAttributesTranslations[];
  foods_attributes_values: FoodsAttributesValues[];
  foods_categories: FoodsCategories[];
  foods_categories_translations: FoodsCategoriesTranslations[];
  foods_feedbacks: FoodsFeedbacks[];
  foods_feedbacks_foods_feedbacks_labels: FoodsFeedbacksFoodsFeedbacksLabels[];
  foods_feedbacks_labels: FoodsFeedbacksLabels[];
  foods_feedbacks_labels_entries: FoodsFeedbacksLabelsEntries[];
  foods_feedbacks_labels_translations: FoodsFeedbacksLabelsTranslations[];
  foods_markings: FoodsMarkings[];
  foods_translations: FoodsTranslations[];
  form_answers: FormAnswers[];
  form_answers_files: FormAnswersFiles[];
  form_categories: FormCategories[];
  form_categories_translations: FormCategoriesTranslations[];
  form_extracts: FormExtracts[];
  form_extracts_form_fields: FormExtractsFormFields[];
  form_fields: FormFields[];
  form_fields_translations: FormFieldsTranslations[];
  form_submissions: FormSubmissions[];
  forms: Forms[];
  forms_translations: FormsTranslations[];
  languages: Languages[];
  mails: Mails[];
  mails_files: MailsFiles[];
  markings: Markings[];
  markings_exclusions: MarkingsExclusions[];
  markings_groups: MarkingsGroups[];
  markings_groups_translations: MarkingsGroupsTranslations[];
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
  report_recipients: ReportRecipients[];
  utilizations_entries: UtilizationsEntries[];
  utilizations_groups: UtilizationsGroups[];
  washingmachines: Washingmachines[];
  washingmachines_jobs: WashingmachinesJobs[];
  wikis: Wikis[];
  wikis_directus_roles: WikisDirectusRoles[];
  wikis_translations: WikisTranslations[];
  workflows: Workflows[];
  workflows_runs: WorkflowsRuns[];
};
