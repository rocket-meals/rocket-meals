import {useProfileLanguageCode} from "@/states/SynchedProfile";


export function useTranslationSupportAndFeedback(): string {
	const translation_feedback = useTranslation(TranslationKeys.feedback);
	const translation_support = useTranslation(TranslationKeys.support);
	return `${translation_feedback} & ${translation_support}`;
}

const getBestLanguageKeyFromProfileLanguage = (profileLanguage: string): LanguageKeys => {
	// iterate over all language keys
	let languageKeys = Object.keys(LanguageKeys) as (keyof typeof LanguageKeys)[];
	// check for exact match
	for (let i = 0; i < languageKeys.length; i++) {
		let languageKey = languageKeys[i];
		let languageEnumValue = LanguageKeys[languageKey];
		if (profileLanguage === languageEnumValue) {
			return languageEnumValue;
		}
	}
	return LanguageKeys.en_US;
}

export const getTranslation = (key: TranslationKeys, language: LanguageKeys): string => {
	return Translations[key][language];
}


export const useTranslation = (key: TranslationKeys): string => {
	const [language, setLanguage] = useProfileLanguageCode();
	let languageKey = getBestLanguageKeyFromProfileLanguage(language);
	return getTranslation(key, languageKey);
}

export function useTranslations(keys: TranslationKeys[]): string[] {
	const [language, setLanguage] = useProfileLanguageCode();
	let languageKey = getBestLanguageKeyFromProfileLanguage(language);
	const translations: string[] = [];
	for (let i = 0; i < keys.length; i++) {
		translations.push(getTranslation(keys[i], languageKey));
	}
	return translations;
}

export enum LanguageKeys {
	de_DE = 'de-DE',
	en_US = 'en-US',
	ar_SA = 'ar-SA',
	es_ES = 'es-ES',
	fr_FR = 'fr-FR',
	ru_RU = 'ru-RU',
	tr_TR = 'tr-TR',
	zh_CN = 'zh-CN',
}

export type LanguageInformation = {
	name: string;
	direction: 'ltr' | 'rtl';
};

export const LanguageKeyToLanguageInformation: Record<LanguageKeys, LanguageInformation> = {
	[LanguageKeys.de_DE]: {
		name: 'Deutsch',
		direction: 'ltr',
	},
	[LanguageKeys.en_US]: {
		name: 'English',
		direction: 'ltr',
	},
	[LanguageKeys.ar_SA]: {
		name: 'العربية',
		direction: 'rtl',
	},
	[LanguageKeys.es_ES]: {
		name: 'Español',
		direction: 'ltr',
	},
	[LanguageKeys.fr_FR]: {
		name: 'Français',
		direction: 'ltr',
	},
	[LanguageKeys.ru_RU]: {
		name: 'русский',
		direction: 'ltr',
	},
	[LanguageKeys.tr_TR]: {
		name: 'Türkçe',
		direction: 'ltr',
	},
	[LanguageKeys.zh_CN]: {
		name: '中文',
		direction: 'ltr',
	}
} as const;


export const useTranslationOfLanguageKey = (key: LanguageKeys) => {
	const information = LanguageKeyToLanguageInformation[key];
	return information.name;
}

// Define a type which maps an identifier to a dictionary of translations for each language
type TranslationEntry = {
	[key in LanguageKeys]: string;
};


export enum TranslationKeys {
	CHECK_FOR_APP_UPDATES = 'CHECK_FOR_APP_UPDATES',
	DOWNLOAD_NEW_APP_UPDATE = 'DOWNLOAD_NEW_APP_UPDATE',
	SYNC_SERVER_SETTINGS = 'SYNC_SERVER_SETTINGS',
	SYNC_DATABASE = 'SYNC_DATABASE',
	SYNC_USER_SETTINGS = 'SYNC_USER_SETTINGS',
	CHECK_USER_AUTHENTICATION = 'CHECK_USER_AUTHENTICATION',
	CHECK_SERVER_STATUS = 'CHECK_SERVER_STATUS',
	SERVER_IS_OFFLINE = 'SERVER_IS_OFFLINE',
	CONTINUE_WITH_CACHE = 'CONTINUE_WITH_CACHE',
	developer = "developer",
	developer_homepage = "developer_homepage",
	software_homepage = "software_homepage",
	software_name = "software_name",
	profile = "profile",
	nickname = "nickname",
	account = "account",
	without_account = "without_account",
	reset = "reset",
	confirm = "confirm",
	are_you_sure_to_delete_your_account = "are_you_sure_to_delete_your_account",
	dataAccess = "dataAccess", // Datenauskunft in english is data access
	your_comment = "your_comment",
	comments = "comments",
	save_comment = "save_comment",
	average_rating = "average_rating",
	amount_ratings = "amount_ratings",
	accountbalance = "accountbalance",
	search = "search",
	sort = "sort",
	sort_option_none = "sort_option_none",
	sort_option_alphabetical = "sort_option_alphabetical",
	sort_option_favorite = "sort_option_favorite",
	sort_option_public_rating = "sort_option_public_rating",
	sort_option_intelligent = "sort_option_intelligent",
	sort_option_distance = "sort_option_distance",
	free_rooms = "free_rooms",
	foodweekplan = "foodweekplan",
	foodBigScreen = "foodBigScreen",
	data_access_introduction = "data_access_introduction",
	your_data_which_we_know_if_you_have_a_profile = "your_data_which_we_know_if_you_have_a_profile",
	translation_all_on_device_saved_data = "translation_all_on_device_saved_data",
	success = "success",
	maintenance = "maintenance",
	maintenance_message = "maintenance_message",
	maintenance_estimated_end = "maintenance_estimated_end",
	use_cached_version = "use_cached_version",
	foods = "foods",
	apartments = "apartments",
	nfcReadCard = "nfcReadCard",
	nfcNotSupported = "nfcNotSupported",
	nfcNotEnabled = "nfcNotEnabled",
	nfcInstructionRead = "nfcInstructionRead",
	new = "new",
	attention = "attention",
	without_account_limitations = "without_account_limitations",
	not_useable = "not_useable",
	no_foodoffers_found_for_selection = "no_foodoffers_found_for_selection",
	error = "error",
	description = "description",
	information = "information",
	no_data_currently_calculating = "no_data_currently_calculating",
	food_feedbacks = "food_feedbacks",
	to_the_forum = "to_the_forum",
	reset_rating = "reset_rating",
	set_rating_to = "set_rating_to",
	set_rate_as_favorite = "set_rate_as_favorite",
	set_rate_as_not_favorite = "set_rate_as_not_favorite",
	set_rating = "set_rating",
	feedback_labels = "feedback_labels",
	open_navitation_to_location = "open_navitation_to_location",
	distance_based_canteen_selection_or_if_asked_on_real_location = "distance_based_canteen_selection_or_if_asked_on_real_location",
	coordinates = "coordinates",
	copy_url = "copy_url",
	copy = "copy",
	copied = "copied",
	year_of_construction = "year_of_construction",
	unknown = "unknown",
	animation = "animation",
	allergene = "allergene",
	eatinghabits_introduction = "eatinghabits_introduction",
	notification = "notification",
	notification_index_introduction = "notification_index_introduction",
	notification_please_enable_notifications_in_order_to_use_this_feature = "notification_please_enable_notifications_in_order_to_use_this_feature",
	notification_please_notify_me_on_my_smartphones_if_they_allow_to_be_notified = "notification_please_notify_me_on_my_smartphones_if_they_allow_to_be_notified",
	this_feature_is_not_available_currently_reason = "this_feature_is_not_available_currently_reason",
	device_android_system = "device_android_system",
	device_ios_system = "device_ios_system",
	device_web_system = "device_web_system",
	support = "support",
	price_group = "price_group",
	price_group_student = "price_group_student",
	price_group_employee = "price_group_employee",
	price_group_guest = "price_group_guest",
	role_employee = "role_employee",
	support_team = "support_team",
	response = "response",
	your_request = "your_request",
	no_permission_for = "no_permission_for",
	please_create_an_account = "please_create_an_account",
	create_account = "create_account",
	washing_machine = "washing_machine",
	washing_machines = "washing_machines",
	washingmachine_state_finished = "washingmachine_state_finished",
	washingmachine_estimate_finished_at = "washingmachine_estimate_finished_at",
	washingmachine_state_unknown = "washingmachine_state_unknown",
	current = "current",
	active = "active",
	inactive = "inactive",
	state_current = "state_current",
	state_next = "state_next",
	import = "import",
	event = "event",
	create = "create",
	delete = "delete",
	location = "location",
	title = "title",
	weekday = "weekday",
	week = "week",
	startTime = "startTime",
	endTime = "endTime",
	color = "color",
	cancel = "cancel",
	for_example = "for_example",
	courseTimetableDescriptionEmpty = "courseTimetableDescriptionEmpty",
	nothing_found = "nothing_found",
	seemsEmpty = "seemsEmpty",
	noFeedbacksFound = "noFeedbacksFound",
	somethingWentWrong = "somethingWentWrong",
	date = "date",
	year = "year",
	month = "month",
	selected = "selected",
	proceed = "proceed",
	previous = "previous",
	businesshours = "businesshours",
	foodservicehours = "foodservicehours",
	until = "until",
	day = "day",
	today = "today",
	tomorrow = "tomorrow",
	yesterday = "yesterday",
	nutrition = "nutrition",
	food_information_disclaimer = "food_information_disclaimer",
	nutrition_calories = "nutrition_calories",
	nutrition_protein = "nutrition_protein",
	nutrition_fat = "nutrition_fat",
	nutrition_carbohydrate = "nutrition_carbohydrate",
	nutrition_fiber = "nutrition_fiber",
	nutrition_sugar = "nutrition_sugar",
	nutrition_sodium = "nutrition_sodium",
	nutrition_saturated_fat = "nutrition_saturated_fat",
	about_us = "about_us",
	license = "license",
	accessibility = "accessibility",
	cookie_policy = "cookie_policy",
	privacy_policy = "privacy_policy",
	okay = "okay",
	currently_logged_in_as = "currently_logged_in_as",
	if_you_want_to_login_with_this_account_please_press = "if_you_want_to_login_with_this_account_please_press",
	logout = "logout",
	register = "register",
	sign_in = "sign_in",
	continue = "continue",
	navigate_to = "navigate_to",
	open_drawer = "open_drawer",
	navigate_back = "navigate_back",
	canteen = "canteen",
	map = "map",
	news = "news",
	read_more = "read_more",
	course_timetable = "course_timetable",
	eating_habits = "eating_habits",
	markings = "markings",
	forecast = "forecast",
	utilization = "utilization",
	opens_at = "opens_at",
	closed_after = "closed_after",
	food_details = "food_details",
	i_like_that = "i_like_that",
	i_dislike_that = "i_dislike_that",
	like_status = "like_status",
	show_login_for_management_with_email_and_password = "show_login_for_management_with_email_and_password",
	email = "email",
	password = "password",
	show = "show",
	hide = "hide",
	continue_without_account = "continue_without_account",
	sign_in_with = "sign_in_with",
	home = "home",
	canteens = "canteens",
	campus = "campus",
	buildings = "buildings",
	housing = "housing",
	settings = "settings",
	switch = "switch",
	edit = "edit",
	save = "save",
	to_update = "to_update",
	send = "send",
	button_disabled = "button_disabled",
	select = "select",
	upload = "upload",
	is_loading = "is_loading",
	camera = "camera",
	gallery = "gallery",
	image = "image",
	language = "language",
	language_system = "language_system",
	drawer_config_position = "drawer_config_position",
	drawer_config_position_left = "drawer_config_position_left",
	drawer_config_position_right = "drawer_config_position_right",
	drawer_config_position_system = "drawer_config_position_system",
	first_day_of_week = "first_day_of_week",
	first_day_of_week_system = "first_day_of_week_system",
	color_scheme = "color_scheme",
	color_scheme_light = "color_scheme_light",
	color_scheme_dark = "color_scheme_dark",
	color_scheme_system = "color_scheme_system",
	by_continuing_you_agree_to_terms_and_conditions_and_privacy_policy = "by_continuing_you_agree_to_terms_and_conditions_and_privacy_policy",
	cookies = "cookies",
	feedback = "feedback",
	feedback_support_faq = "feedback_support_faq",
	optional = "optional",
	date_created = "date_created",
	date_updated = "date_updated"
}


// Define the Translations object dict string to TranslationEntry but not Record
const Translations: Record<TranslationKeys, TranslationEntry> = {
	CHECK_FOR_APP_UPDATES: {
		[LanguageKeys.de_DE]: 'Nach App-Updates suchen',
		[LanguageKeys.en_US]: 'Check for App Updates',
		[LanguageKeys.ar_SA]: 'تحقق من تحديثات التطبيق',
		[LanguageKeys.es_ES]: 'Buscar actualizaciones de la aplicación',
		[LanguageKeys.fr_FR]: "Vérifier les mises à jour de l'application",
		[LanguageKeys.ru_RU]: 'Проверить обновления приложения',
		[LanguageKeys.tr_TR]: 'Uygulama güncellemelerini kontrol et',
		[LanguageKeys.zh_CN]: '检查应用更新'
	},
	DOWNLOAD_NEW_APP_UPDATE: {
		[LanguageKeys.de_DE]: 'Neues App-Update herunterladen',
		[LanguageKeys.en_US]: 'Download New App Update',
		[LanguageKeys.ar_SA]: 'تحميل تحديث التطبيق الجديد',
		[LanguageKeys.es_ES]: 'Descargar nueva actualización de la aplicación',
		[LanguageKeys.fr_FR]: "Télécharger la nouvelle mise à jour de l'application",
		[LanguageKeys.ru_RU]: 'Скачать новое обновление приложения',
		[LanguageKeys.tr_TR]: 'Yeni uygulama güncellemesini indir',
		[LanguageKeys.zh_CN]: '下载新的应用更新'
	},
	SYNC_SERVER_SETTINGS: {
		[LanguageKeys.de_DE]: 'Servereinstellungen synchronisieren',
		[LanguageKeys.en_US]: 'Sync Server Settings',
		[LanguageKeys.ar_SA]: 'مزامنة إعدادات الخادم',
		[LanguageKeys.es_ES]: 'Sincronizar configuración del servidor',
		[LanguageKeys.fr_FR]: 'Synchroniser les paramètres du serveur',
		[LanguageKeys.ru_RU]: 'Синхронизировать настройки сервера',
		[LanguageKeys.tr_TR]: 'Sunucu ayarlarını senkronize et',
		[LanguageKeys.zh_CN]: '同步服务器设置'
	},
	SYNC_DATABASE: {
		[LanguageKeys.de_DE]: 'Datenbank synchronisieren',
		[LanguageKeys.en_US]: 'Sync Database',
		[LanguageKeys.ar_SA]: 'مزامنة قاعدة البيانات',
		[LanguageKeys.es_ES]: 'Sincronizar base de datos',
		[LanguageKeys.fr_FR]: 'Synchroniser la base de données',
		[LanguageKeys.ru_RU]: 'Синхронизировать базу данных',
		[LanguageKeys.tr_TR]: 'Veritabanını senkronize et',
		[LanguageKeys.zh_CN]: '同步数据库'
	},
	SYNC_USER_SETTINGS: {
		[LanguageKeys.de_DE]: 'Benutzereinstellungen synchronisieren',
		[LanguageKeys.en_US]: 'Sync User Settings',
		[LanguageKeys.ar_SA]: 'مزامنة إعدادات المستخدم',
		[LanguageKeys.es_ES]: 'Sincronizar configuración de usuario',
		[LanguageKeys.fr_FR]: "Synchroniser les paramètres de l'utilisateur",
		[LanguageKeys.ru_RU]: 'Синхронизировать настройки пользователя',
		[LanguageKeys.tr_TR]: 'Kullanıcı ayarlarını senkronize et',
		[LanguageKeys.zh_CN]: '同步用户设置'
	},
	CHECK_USER_AUTHENTICATION: {
		[LanguageKeys.de_DE]: 'Benutzerauthentifizierung prüfen',
		[LanguageKeys.en_US]: 'Check User Authentication',
		[LanguageKeys.ar_SA]: 'تحقق من مصادقة المستخدم',
		[LanguageKeys.es_ES]: 'Verificar autenticación de usuario',
		[LanguageKeys.fr_FR]: "Vérifier l'authentification de l'utilisateur",
		[LanguageKeys.ru_RU]: 'Проверить аутентификацию пользователя',
		[LanguageKeys.tr_TR]: 'Kullanıcı kimlik doğrulamasını kontrol et',
		[LanguageKeys.zh_CN]: '检查用户认证'
	},
	CHECK_SERVER_STATUS: {
		[LanguageKeys.de_DE]: 'Serverstatus prüfen',
		[LanguageKeys.en_US]: 'Check Server Status',
		[LanguageKeys.ar_SA]: 'تحقق من حالة الخادم',
		[LanguageKeys.es_ES]: 'Verificar estado del servidor',
		[LanguageKeys.fr_FR]: 'Vérifier le statut du serveur',
		[LanguageKeys.ru_RU]: 'Проверить статус сервера',
		[LanguageKeys.tr_TR]: 'Sunucu durumunu kontrol et',
		[LanguageKeys.zh_CN]: '检查服务器状态'
	},
	SERVER_IS_OFFLINE: {
		[LanguageKeys.de_DE]: 'Server ist offline',
		[LanguageKeys.en_US]: 'Server is offline',
		[LanguageKeys.ar_SA]: 'الخادم غير متصل',
		[LanguageKeys.es_ES]: 'El servidor está desconectado',
		[LanguageKeys.fr_FR]: 'Le serveur est hors ligne',
		[LanguageKeys.ru_RU]: 'Сервер оффлайн',
		[LanguageKeys.tr_TR]: 'Sunucu çevrimdışı',
		[LanguageKeys.zh_CN]: '服务器离线'
	},
	CONTINUE_WITH_CACHE: {
		[LanguageKeys.de_DE]: 'Mit Cache fortfahren',
		[LanguageKeys.en_US]: 'Continue with Cache',
		[LanguageKeys.ar_SA]: 'الاستمرار مع ذاكرة التخزين المؤقت',
		[LanguageKeys.es_ES]: 'Continuar con caché',
		[LanguageKeys.fr_FR]: 'Continuer avec le cache',
		[LanguageKeys.ru_RU]: 'Продолжить с кэшем',
		[LanguageKeys.tr_TR]: 'Önbellekle devam et',
		[LanguageKeys.zh_CN]: '继续使用缓存'
	},
	developer: {
		[LanguageKeys.de_DE]: 'Entwickler',
		[LanguageKeys.en_US]: 'Developer',
		[LanguageKeys.ar_SA]: 'مطور',
		[LanguageKeys.es_ES]: 'Desarrollador',
		[LanguageKeys.fr_FR]: 'Développeur',
		[LanguageKeys.ru_RU]: 'Разработчик',
		[LanguageKeys.tr_TR]: 'Geliştirici',
		[LanguageKeys.zh_CN]: '开发者'
	},
	developer_homepage: {
		[LanguageKeys.de_DE]: 'Entwickler-Homepage',
		[LanguageKeys.en_US]: 'Developer Homepage',
		[LanguageKeys.ar_SA]: 'الصفحة الرئيسية للمطور',
		[LanguageKeys.es_ES]: 'Página de inicio del desarrollador',
		[LanguageKeys.fr_FR]: "Page d'accueil du développeur",
		[LanguageKeys.ru_RU]: 'Домашняя страница разработчика',
		[LanguageKeys.tr_TR]: 'Geliştirici Ana Sayfası',
		[LanguageKeys.zh_CN]: '开发者主页'
	},
	software_homepage: {
		[LanguageKeys.de_DE]: 'Software-Homepage',
		[LanguageKeys.en_US]: 'Software Homepage',
		[LanguageKeys.ar_SA]: 'الصفحة الرئيسية للبرنامج',
		[LanguageKeys.es_ES]: 'Página de inicio del software',
		[LanguageKeys.fr_FR]: "Page d'accueil du logiciel",
		[LanguageKeys.ru_RU]: 'Домашняя страница программного обеспечения',
		[LanguageKeys.tr_TR]: 'Yazılım Ana Sayfası',
		[LanguageKeys.zh_CN]: '软件主页'
	},
	software_name: {
		[LanguageKeys.de_DE]: 'Software-Name',
		[LanguageKeys.en_US]: 'Software Name',
		[LanguageKeys.ar_SA]: 'اسم البرنامج',
		[LanguageKeys.es_ES]: 'Nombre del software',
		[LanguageKeys.fr_FR]: 'Nom du logiciel',
		[LanguageKeys.ru_RU]: 'Название программы',
		[LanguageKeys.tr_TR]: 'Yazılım Adı',
		[LanguageKeys.zh_CN]: '软件名称'
	},
	profile: {
		[LanguageKeys.de_DE]: 'Profil',
		[LanguageKeys.en_US]: 'Profile',
		[LanguageKeys.ar_SA]: 'الملف الشخصي',
		[LanguageKeys.es_ES]: 'Perfil',
		[LanguageKeys.fr_FR]: 'Profil',
		[LanguageKeys.ru_RU]: 'Профиль',
		[LanguageKeys.tr_TR]: 'Profil',
		[LanguageKeys.zh_CN]: '个人资料'
	},
	nickname: {
		[LanguageKeys.de_DE]: 'Spitzname',
		[LanguageKeys.en_US]: 'Nickname',
		[LanguageKeys.ar_SA]: 'اللقب',
		[LanguageKeys.es_ES]: 'Apodo',
		[LanguageKeys.fr_FR]: 'Surnom',
		[LanguageKeys.ru_RU]: 'Прозвище',
		[LanguageKeys.tr_TR]: 'Takma ad',
		[LanguageKeys.zh_CN]: '昵称'
	},
	search: {
		[LanguageKeys.de_DE]: 'Suche',
		[LanguageKeys.en_US]: 'Search',
		[LanguageKeys.ar_SA]: 'بحث',
		[LanguageKeys.es_ES]: 'Buscar',
		[LanguageKeys.fr_FR]: 'Rechercher',
		[LanguageKeys.ru_RU]: 'Поиск',
		[LanguageKeys.tr_TR]: 'Arama',
		[LanguageKeys.zh_CN]: '搜索'
	},
	account: {
		[LanguageKeys.de_DE]: 'Account',
		[LanguageKeys.en_US]: 'Account',
		[LanguageKeys.ar_SA]: 'حساب',
		[LanguageKeys.es_ES]: 'Cuenta',
		[LanguageKeys.fr_FR]: 'Compte',
		[LanguageKeys.ru_RU]: 'Аккаунт',
		[LanguageKeys.tr_TR]: 'Hesap',
		[LanguageKeys.zh_CN]: '账户'
	},
	without_account: {
		[LanguageKeys.de_DE]: 'Ohne Account',
		[LanguageKeys.en_US]: 'Without Account',
		[LanguageKeys.ar_SA]: 'بدون حساب',
		[LanguageKeys.es_ES]: 'Sin cuenta',
		[LanguageKeys.fr_FR]: 'Sans compte',
		[LanguageKeys.ru_RU]: 'Без аккаунта',
		[LanguageKeys.tr_TR]: 'Hesapsız',
		[LanguageKeys.zh_CN]: '没有账户'
	},
	reset: {
		[LanguageKeys.de_DE]: 'Zurücksetzen',
		[LanguageKeys.en_US]: 'Reset',
		[LanguageKeys.ar_SA]: 'إعادة تعيين',
		[LanguageKeys.es_ES]: 'Restablecer',
		[LanguageKeys.fr_FR]: 'Réinitialiser',
		[LanguageKeys.ru_RU]: 'Сбросить',
		[LanguageKeys.tr_TR]: 'Sıfırla',
		[LanguageKeys.zh_CN]: '重置'
	},
	confirm: {
		[LanguageKeys.de_DE]: 'Bestätigen',
		[LanguageKeys.en_US]: 'Confirm',
		[LanguageKeys.ar_SA]: 'تأكيد',
		[LanguageKeys.es_ES]: 'Confirmar',
		[LanguageKeys.fr_FR]: 'Confirmer',
		[LanguageKeys.ru_RU]: 'Подтвердить',
		[LanguageKeys.tr_TR]: 'Onayla',
		[LanguageKeys.zh_CN]: '确认'
	},
	are_you_sure_to_delete_your_account: {
		[LanguageKeys.de_DE]: 'Sind Sie sicher, dass Sie Ihren Account löschen möchten?',
		[LanguageKeys.en_US]: 'Are you sure to delete your account?',
		[LanguageKeys.ar_SA]: 'هل أنت متأكد من حذف حسابك؟',
		[LanguageKeys.es_ES]: '¿Está seguro de eliminar su cuenta?',
		[LanguageKeys.fr_FR]: 'Êtes-vous sûr de vouloir supprimer votre compte ?',
		[LanguageKeys.ru_RU]: 'Вы уверены, что хотите удалить свой аккаунт?',
		[LanguageKeys.tr_TR]: 'Hesabınızı silmek istediğinizden emin misiniz?',
		[LanguageKeys.zh_CN]: '您确定要删除您的帐户吗？'
	},
	dataAccess: {
		[LanguageKeys.de_DE]: 'Datenauskunft',
		[LanguageKeys.en_US]: 'Data Access',
		[LanguageKeys.ar_SA]: 'الوصول إلى البيانات',
		[LanguageKeys.es_ES]: 'Acceso a los datos',
		[LanguageKeys.fr_FR]: 'Accès aux données',
		[LanguageKeys.ru_RU]: 'Доступ к данным',
		[LanguageKeys.tr_TR]: 'Veri Erişimi',
		[LanguageKeys.zh_CN]: '数据访问'
	},
	your_comment: {
		[LanguageKeys.de_DE]: 'Dein Kommentar',
		[LanguageKeys.en_US]: 'Your Comment',
		[LanguageKeys.ar_SA]: 'تعليقك',
		[LanguageKeys.es_ES]: 'Tu comentario',
		[LanguageKeys.fr_FR]: 'Ton commentaire',
		[LanguageKeys.ru_RU]: 'Ваш комментарий',
		[LanguageKeys.tr_TR]: 'Yorumunuz',
		[LanguageKeys.zh_CN]: '你的评论'
	},
	comments: {
		[LanguageKeys.de_DE]: 'Kommentare',
		[LanguageKeys.en_US]: 'Comments',
		[LanguageKeys.ar_SA]: 'تعليقات',
		[LanguageKeys.es_ES]: 'Comentarios',
		[LanguageKeys.fr_FR]: 'Commentaires',
		[LanguageKeys.ru_RU]: 'Комментарии',
		[LanguageKeys.tr_TR]: 'Yorumlar',
		[LanguageKeys.zh_CN]: '评论'
	},
	save_comment: {
		[LanguageKeys.de_DE]: 'Kommentar speichern',
		[LanguageKeys.en_US]: 'Save Comment',
		[LanguageKeys.ar_SA]: 'احفظ التعليق',
		[LanguageKeys.es_ES]: 'Guardar comentario',
		[LanguageKeys.fr_FR]: 'Enregistrer le commentaire',
		[LanguageKeys.ru_RU]: 'Сохранить комментарий',
		[LanguageKeys.tr_TR]: 'Yorumu kaydet',
		[LanguageKeys.zh_CN]: '保存评论'
	},
	average_rating: {
		[LanguageKeys.de_DE]: 'Durchschnittsbewertung',
		[LanguageKeys.en_US]: 'Average Rating',
		[LanguageKeys.ar_SA]: 'التقييم المتوسط',
		[LanguageKeys.es_ES]: 'Calificación promedio',
		[LanguageKeys.fr_FR]: 'Note moyenne',
		[LanguageKeys.ru_RU]: 'Средняя оценка',
		[LanguageKeys.tr_TR]: 'Ortalama puan',
		[LanguageKeys.zh_CN]: '平均评分'
	},
	amount_ratings: {
		[LanguageKeys.de_DE]: 'Anzahl Bewertungen',
		[LanguageKeys.en_US]: 'Number of Ratings',
		[LanguageKeys.ar_SA]: 'عدد التقييمات',
		[LanguageKeys.es_ES]: 'Número de calificaciones',
		[LanguageKeys.fr_FR]: 'Nombre de notes',
		[LanguageKeys.ru_RU]: 'Количество оценок',
		[LanguageKeys.tr_TR]: 'Değerlendirme sayısı',
		[LanguageKeys.zh_CN]: '评分数量'
	},
	accountbalance: {
		[LanguageKeys.de_DE]: 'Guthaben',
		[LanguageKeys.en_US]: 'Account Balance',
		[LanguageKeys.ar_SA]: 'رصيد الحساب',
		[LanguageKeys.es_ES]: 'Saldo de la cuenta',
		[LanguageKeys.fr_FR]: 'Solde du compte',
		[LanguageKeys.ru_RU]: 'Баланс счета',
		[LanguageKeys.tr_TR]: 'Hesap bakiyesi',
		[LanguageKeys.zh_CN]: '账户余额'
	},
	sort: {
		[LanguageKeys.de_DE]: 'Sortieren',
		[LanguageKeys.en_US]: 'Sort',
		[LanguageKeys.ar_SA]: 'فرز',
		[LanguageKeys.es_ES]: 'Ordenar',
		[LanguageKeys.fr_FR]: 'Trier',
		[LanguageKeys.ru_RU]: 'Сортировать',
		[LanguageKeys.tr_TR]: 'Sırala',
		[LanguageKeys.zh_CN]: '排序'
	},
	sort_option_none: {
		[LanguageKeys.de_DE]: 'Keine',
		[LanguageKeys.en_US]: 'None',
		[LanguageKeys.ar_SA]: 'لا أحد',
		[LanguageKeys.es_ES]: 'Ninguno',
		[LanguageKeys.fr_FR]: 'Aucun',
		[LanguageKeys.ru_RU]: 'Нет',
		[LanguageKeys.tr_TR]: 'Hiçbiri',
		[LanguageKeys.zh_CN]: '没有'
	},
	sort_option_alphabetical: {
		[LanguageKeys.de_DE]: 'Alphabetisch',
		[LanguageKeys.en_US]: 'Alphabetical',
		[LanguageKeys.ar_SA]: 'أبجدي',
		[LanguageKeys.es_ES]: 'Alfabético',
		[LanguageKeys.fr_FR]: 'Alphabétique',
		[LanguageKeys.ru_RU]: 'Алфавитный',
		[LanguageKeys.tr_TR]: 'Alfabetik',
		[LanguageKeys.zh_CN]: '按字母顺序'
	},
	sort_option_favorite: {
		[LanguageKeys.de_DE]: 'Favorit',
		[LanguageKeys.en_US]: 'Favorite',
		[LanguageKeys.ar_SA]: 'المفضل',
		[LanguageKeys.es_ES]: 'Favorito',
		[LanguageKeys.fr_FR]: 'Favori',
		[LanguageKeys.ru_RU]: 'Любимый',
		[LanguageKeys.tr_TR]: 'Favori',
		[LanguageKeys.zh_CN]: '最喜欢的'
	},
	sort_option_public_rating: {
		[LanguageKeys.de_DE]: 'Öffentliche Bewertung',
		[LanguageKeys.en_US]: 'Public Rating',
		[LanguageKeys.ar_SA]: 'التقييم العام',
		[LanguageKeys.es_ES]: 'Calificación pública',
		[LanguageKeys.fr_FR]: 'Note publique',
		[LanguageKeys.ru_RU]: 'Общественный рейтинг',
		[LanguageKeys.tr_TR]: 'Kamuoyu değerlendirmesi',
		[LanguageKeys.zh_CN]: '公众评分'
	},
	sort_option_intelligent: {
		[LanguageKeys.de_DE]: 'Intelligent',
		[LanguageKeys.en_US]: 'Intelligent',
		[LanguageKeys.ar_SA]: 'ذكي',
		[LanguageKeys.es_ES]: 'Inteligente',
		[LanguageKeys.fr_FR]: 'Intelligent',
		[LanguageKeys.ru_RU]: 'Интеллектуальный',
		[LanguageKeys.tr_TR]: 'Zeki',
		[LanguageKeys.zh_CN]: '智能的'
	},
	sort_option_distance: {
		[LanguageKeys.de_DE]: 'Distanz',
		[LanguageKeys.en_US]: 'Distance',
		[LanguageKeys.ar_SA]: 'مسافة',
		[LanguageKeys.es_ES]: 'Distancia',
		[LanguageKeys.fr_FR]: 'Distance',
		[LanguageKeys.ru_RU]: 'Расстояние',
		[LanguageKeys.tr_TR]: 'Mesafe',
		[LanguageKeys.zh_CN]: '距离'
	},
	free_rooms: {
		[LanguageKeys.de_DE]: 'Freie Zimmer',
		[LanguageKeys.en_US]: 'Free Rooms',
		[LanguageKeys.ar_SA]: 'غرف مجانية',
		[LanguageKeys.es_ES]: 'Habitaciones libres',
		[LanguageKeys.fr_FR]: 'Chambres libres',
		[LanguageKeys.ru_RU]: 'Свободные комнаты',
		[LanguageKeys.tr_TR]: 'Boş Odalar',
		[LanguageKeys.zh_CN]: '空房间'
	},
	foodweekplan: {
		[LanguageKeys.de_DE]: 'Speise Wochenplan',
		[LanguageKeys.en_US]: 'Food Week Plan',
		[LanguageKeys.ar_SA]: 'خطة أسبوع الطعام',
		[LanguageKeys.es_ES]: 'Plan semanal de alimentos',
		[LanguageKeys.fr_FR]: 'Plan de la semaine alimentaire',
		[LanguageKeys.ru_RU]: 'План питания на неделю',
		[LanguageKeys.tr_TR]: 'Yemek Haftası Planı',
		[LanguageKeys.zh_CN]: '食品周计划'
	},
	foodBigScreen: {
		[LanguageKeys.de_DE]: 'Speise Großbildschirm',
		[LanguageKeys.en_US]: 'Food Big Screen',
		[LanguageKeys.ar_SA]: 'شاشة كبيرة للطعام',
		[LanguageKeys.es_ES]: 'Pantalla grande de alimentos',
		[LanguageKeys.fr_FR]: 'Grand écran alimentaire',
		[LanguageKeys.ru_RU]: 'Большой экран питания',
		[LanguageKeys.tr_TR]: 'Yemek Büyük',
		[LanguageKeys.zh_CN]: '食品大屏幕'
	},
	data_access_introduction: {
		[LanguageKeys.de_DE]: `## 🌟 Deine Daten - Dein Recht

Wir glauben an Transparenz und das Recht unserer Nutzer, ihre Daten vollständig einzusehen. Deshalb ermöglichen wir dir den Zugang zu deinen Informationen, meist im maschinenlesbaren JSON-Format. 

### 🛠 Hilfe Benötigt?
Keine Sorge, falls du mit JSON nicht vertraut bist! Unser Team steht bereit, um jede Frage zu klären und dir bei der Dateninterpretation zur Seite zu stehen.

Fühl dich frei, uns jederzeit zu kontaktieren. Deine Daten, deine Kontrolle.`,
		[LanguageKeys.en_US]: `## 🌟 Your Data - Your Right

We believe in transparency and the right of our users to fully access their data. That's why we allow you to access your information, usually in machine-readable JSON format.

### 🛠 Need Help?
Don't worry if you're not familiar with JSON! Our team is ready to answer any questions and assist you in interpreting your data.

Feel free to contact us at any time. Your data, your control.`,
		[LanguageKeys.ar_SA]: `## 🌟 بياناتك - حقك

نحن نؤمن بالشفافية وحق مستخدمينا في الوصول الكامل إلى بياناتهم. لهذا السبب نسمح لك بالوصول إلى معلوماتك، عادةً بتنسيق JSON القابل للقراءة بواسطة الآلة.

### 🛠 هل تحتاج إلى مساعدة؟
لا تقلق إذا لم تكن على دراية بـ JSON! فريقنا جاهز للإجابة على أي أسئلة ومساعدتك في تفسير بياناتك.

لا تتردد في الاتصال بنا في أي وقت. بياناتك، تحكمك.`,
		[LanguageKeys.es_ES]: `## 🌟 Tus datos - Tu derecho

Creemos en la transparencia y el derecho de nuestros usuarios a acceder completamente a sus datos. Por eso te permitimos acceder a tu información, generalmente en formato JSON legible por máquina.

### 🛠 ¿Necesitas ayuda?
¡No te preocupes si no estás familiarizado con JSON! Nuestro equipo está listo para responder cualquier pregunta y asistirte en la interpretación de tus datos.

No dudes en contactarnos en cualquier momento. Tus datos, tu control.`,
		[LanguageKeys.fr_FR]: `## 🌟 Vos données - Votre droit

Nous croyons en la transparence et au droit de nos utilisateurs d'accéder pleinement à leurs données. C'est pourquoi nous vous permettons d'accéder à vos informations, généralement au format JSON lisible par machine.

### 🛠 Besoin d'aide ?
Ne vous inquiétez pas si vous n'êtes pas familier avec JSON ! Notre équipe est prête à répondre à toutes vos questions et à vous aider à interpréter vos données.

N'hésitez pas à nous contacter à tout moment. Vos données, votre contrôle.`,
		[LanguageKeys.ru_RU]: `## 🌟 Ваши данные - Ваше право

Мы верим в прозрачность и право наших пользователей на полный доступ к своим данным. Именно поэтому мы предоставляем вам доступ к вашей информации, как правило, в машиночитаемом формате JSON.

### 🛠 Нужна помощь?
Не беспокойтесь, если вы не знакомы с JSON! Наша команда готова ответить на любые вопросы и помочь вам в интерпретации ваших данных.

Не стесняйтесь обращаться к нам в любое время. Ваши данные, ваш контроль.`,
		[LanguageKeys.tr_TR]: `## 🌟 Verileriniz - Hakkınız

Şeffaflığa ve kullanıcılarımızın verilerine tam erişim hakkına inanıyoruz. Bu nedenle bilgilerinize genellikle makine tarafından okunabilir JSON formatında erişmenize izin veriyoruz.

### 🛠 Yardıma mı ihtiyacınız var?
JSON konusunda bilgili değilseniz endişelenmeyin! Ekibimiz, sorularınızı yanıtlamak ve verilerinizi yorumlamanızda size yardımcı olmak için hazır.

Bize her zaman ulaşabilirsiniz. Verileriniz, kontrolünüz.`,
		[LanguageKeys.zh_CN]: `## 🌟 你的数据 - 你的权利

我们相信透明度和用户完全访问其数据的权利。因此，我们允许您访问您的信息，通常为机器可读的 JSON 格式。

### 🛠 需要帮助？
如果您不熟悉 JSON，请不要担心！我们的团队随时准备回答您的任何问题并协助您解释您的数据。

随时联系我们。您的数据，您的控制权。`
	},
	your_data_which_we_know_if_you_have_a_profile: {
		[LanguageKeys.de_DE]: 'Deine Daten, die uns bekannt sind, wenn du ein Profil hast.',
		[LanguageKeys.en_US]: 'Your data, which we know if you have a profile.',
		[LanguageKeys.ar_SA]: 'بياناتك التي نعرفها إذا كان لديك ملف تعريف.',
		[LanguageKeys.es_ES]: 'Tus datos, que conocemos si tienes un perfil.',
		[LanguageKeys.fr_FR]: 'Vos données, que nous connaissons si vous avez un profil.',
		[LanguageKeys.ru_RU]: 'Ваши данные, которые мы знаем, если у вас есть профиль.',
		[LanguageKeys.tr_TR]: 'Bir profiliniz varsa bildiğimiz verileriniz.',
		[LanguageKeys.zh_CN]: '您的数据，如果您有个人资料，我们知道。'
	},
	translation_all_on_device_saved_data: {
		[LanguageKeys.de_DE]: 'Alle auf dem Gerät gespeicherten Daten.',
		[LanguageKeys.en_US]: 'All data saved on the device.',
		[LanguageKeys.ar_SA]: 'جميع البيانات المحفوظة على الجهاز.',
		[LanguageKeys.es_ES]: 'Todos los datos guardados en el dispositivo.',
		[LanguageKeys.fr_FR]: 'Toutes les données enregistrées sur l\'appareil.',
		[LanguageKeys.ru_RU]: 'Все данные, сохраненные на устройстве.',
		[LanguageKeys.tr_TR]: 'Cihazda kaydedilen tüm veriler.',
		[LanguageKeys.zh_CN]: '设备上保存的所有数据。'
	},
	success: {
		[LanguageKeys.de_DE]: 'Erfolg',
		[LanguageKeys.en_US]: 'Success',
		[LanguageKeys.ar_SA]: 'نجاح',
		[LanguageKeys.es_ES]: 'Éxito',
		[LanguageKeys.fr_FR]: 'Succès',
		[LanguageKeys.ru_RU]: 'Успех',
		[LanguageKeys.tr_TR]: 'Başarı',
		[LanguageKeys.zh_CN]: '成功'
	},
	maintenance: {
		[LanguageKeys.de_DE]: 'Wartung',
		[LanguageKeys.en_US]: 'Maintenance',
		[LanguageKeys.ar_SA]: 'صيانة',
		[LanguageKeys.es_ES]: 'Mantenimiento',
		[LanguageKeys.fr_FR]: 'Maintenance',
		[LanguageKeys.ru_RU]: 'Техническое обслуживание',
		[LanguageKeys.tr_TR]: 'Bakım',
		[LanguageKeys.zh_CN]: '维护'
	},
	maintenance_message: {
		[LanguageKeys.de_DE]: 'Du kannst eine gespeicherte Version der App verwenden, aber einige Funktionen sind möglicherweise nicht verfügbar.',
		[LanguageKeys.en_US]: 'You can use a cached version of the app, but some features may not be available.',
		[LanguageKeys.ar_SA]: 'يمكنك استخدام نسخة مخبأة من التطبيق ، ولكن قد لا تتوفر بعض الميزات.',
		[LanguageKeys.es_ES]: 'Puedes usar una versión almacenada en caché de la aplicación, pero algunas funciones pueden no estar disponibles.',
		[LanguageKeys.fr_FR]: 'Vous pouvez utiliser une version mise en cache de l\'application, mais certaines fonctionnalités peuvent ne pas être disponibles.',
		[LanguageKeys.ru_RU]: 'Вы можете использовать кэшированную версию приложения, но некоторые функции могут быть недоступны.',
		[LanguageKeys.tr_TR]: 'Uygulamanın önbelleğe alınmış bir sürümünü kullanabilirsiniz, ancak bazı özellikler mevcut olmayabilir.',
		[LanguageKeys.zh_CN]: '您可以使用缓存版本的应用程序，但某些功能可能无法使用。'
	},
	maintenance_estimated_end: {
		[LanguageKeys.de_DE]: 'Voraussichtliches Ende der Wartung',
		[LanguageKeys.en_US]: 'Estimated End of Maintenance',
		[LanguageKeys.ar_SA]: 'تقدير نهاية الصيانة',
		[LanguageKeys.es_ES]: 'Fin estimado del mantenimiento',
		[LanguageKeys.fr_FR]: 'Fin estimée de la maintenance',
		[LanguageKeys.ru_RU]: 'Ориентировочный конец техобслуживания',
		[LanguageKeys.tr_TR]: 'Bakımın Tahmini Sonu',
		[LanguageKeys.zh_CN]: '预计维护结束时间'
	},
	use_cached_version: {
		[LanguageKeys.de_DE]: 'Gespeicherte Version verwenden',
		[LanguageKeys.en_US]: 'Use Cached Version',
		[LanguageKeys.ar_SA]: 'استخدام النسخة المخبأة',
		[LanguageKeys.es_ES]: 'Usar versión en caché',
		[LanguageKeys.fr_FR]: 'Utiliser la version en cache',
		[LanguageKeys.ru_RU]: 'Использовать кэшированную версию',
		[LanguageKeys.tr_TR]: 'Önbelleğe Alınmış Sürümü Kullan',
		[LanguageKeys.zh_CN]: '使用缓存版本'
	},
	foods: {
		[LanguageKeys.de_DE]: 'Speisen',
		[LanguageKeys.en_US]: 'Foods',
		[LanguageKeys.ar_SA]: 'الأطعمة',
		[LanguageKeys.es_ES]: 'Comidas',
		[LanguageKeys.fr_FR]: 'Aliments',
		[LanguageKeys.ru_RU]: 'Еда',
		[LanguageKeys.tr_TR]: 'Gıdalar',
		[LanguageKeys.zh_CN]: '食品'
	},

	apartments: {
		[LanguageKeys.de_DE]: 'Wohnungen',
		[LanguageKeys.en_US]: 'Apartments',
		[LanguageKeys.ar_SA]: 'شقق',
		[LanguageKeys.es_ES]: 'Apartamentos',
		[LanguageKeys.fr_FR]: 'Appartements',
		[LanguageKeys.ru_RU]: 'Квартиры',
		[LanguageKeys.tr_TR]: 'Daireler',
		[LanguageKeys.zh_CN]: '公寓'
	},
	nfcReadCard: {
		[LanguageKeys.de_DE]: 'NFC Karte lesen',
		[LanguageKeys.en_US]: 'Read NFC Card',
		[LanguageKeys.ar_SA]: 'قراءة بطاقة NFC',
		[LanguageKeys.es_ES]: 'Leer tarjeta NFC',
		[LanguageKeys.fr_FR]: 'Lire la carte NFC',
		[LanguageKeys.ru_RU]: 'Считать карту NFC',
		[LanguageKeys.tr_TR]: 'NFC Kartı Oku',
		[LanguageKeys.zh_CN]: '读取 NFC 卡'
	},
	nfcNotSupported: {
		[LanguageKeys.de_DE]: 'NFC wird nicht unterstützt',
		[LanguageKeys.en_US]: 'NFC not supported',
		[LanguageKeys.ar_SA]: 'NFC غير مدعوم',
		[LanguageKeys.es_ES]: 'NFC no soportado',
		[LanguageKeys.fr_FR]: 'NFC non pris en charge',
		[LanguageKeys.ru_RU]: 'NFC не поддерживается',
		[LanguageKeys.tr_TR]: 'NFC desteklenmiyor',
		[LanguageKeys.zh_CN]: '不支持 NFC'
	},
	nfcNotEnabled: {
		[LanguageKeys.de_DE]: 'NFC ist nicht aktiviert',
		[LanguageKeys.en_US]: 'NFC not enabled',
		[LanguageKeys.ar_SA]: 'NFC غير مفعل',
		[LanguageKeys.es_ES]: 'NFC no está habilitado',
		[LanguageKeys.fr_FR]: 'NFC non activé',
		[LanguageKeys.ru_RU]: 'NFC не включен',
		[LanguageKeys.tr_TR]: 'NFC etkin değil',
		[LanguageKeys.zh_CN]: 'NFC 未启用'
	},
	nfcInstructionRead: {
		[LanguageKeys.de_DE]: 'Halte dein Gerät an die Karte, um sie zu lesen.',
		[LanguageKeys.en_US]: 'Hold your device to the card to read it.',
		[LanguageKeys.ar_SA]: 'أمسك جهازك بالقرب من البطاقة لقراءتها.',
		[LanguageKeys.es_ES]: 'Sostenga su dispositivo cerca de la tarjeta para leerla.',
		[LanguageKeys.fr_FR]: 'Tenez votre appareil près de la carte pour la lire.',
		[LanguageKeys.ru_RU]: 'Поднесите устройство к карте, чтобы считать её.',
		[LanguageKeys.tr_TR]: 'Kartı okumak için cihazınızı karta tutun.',
		[LanguageKeys.zh_CN]: '将设备靠近卡片以读取。'
	},
	new: {
		[LanguageKeys.de_DE]: 'Neu',
		[LanguageKeys.en_US]: 'New',
		[LanguageKeys.ar_SA]: 'جديد',
		[LanguageKeys.es_ES]: 'Nuevo',
		[LanguageKeys.fr_FR]: 'Nouveau',
		[LanguageKeys.ru_RU]: 'Новый',
		[LanguageKeys.tr_TR]: 'Yeni',
		[LanguageKeys.zh_CN]: '新的'
	},
	attention: {
		[LanguageKeys.de_DE]: 'Achtung!',
		[LanguageKeys.en_US]: 'Attention!',
		[LanguageKeys.ar_SA]: 'انتباه!',
		[LanguageKeys.es_ES]: '¡Atención!',
		[LanguageKeys.fr_FR]: 'Attention!',
		[LanguageKeys.ru_RU]: 'Внимание!',
		[LanguageKeys.tr_TR]: 'Dikkat!',
		[LanguageKeys.zh_CN]: '注意！'
	},
	without_account_limitations: {
		[LanguageKeys.de_DE]: 'Wir respektieren deine Privatsphäre und bieten dir die Möglichkeit, die App weitesgehend anonym zu nutzen. Einige Funktionen wie Pushnachrichten, Synchronisation und andere Funktionen sind jedoch nicht verfügbar, da hierfür ein Account benötigt wird.',
		[LanguageKeys.en_US]: 'We respect your privacy and offer you the option to use the app as anonymously as possible. However, some features such as push notifications, synchronization, and other functions are not available because an account is required for these.',
		[LanguageKeys.ar_SA]: 'نحن نحترم خصوصيتك ونوفر لك خيار استخدام التطبيق بأكبر قدر ممكن من الخصوصية. ومع ذلك، فإن بعض الميزات مثل الإشعارات الفورية والمزامنة والوظائف الأخرى غير متاحة لأن هذه الميزات تتطلب حسابًا.',
		[LanguageKeys.es_ES]: 'Respetamos tu privacidad y te ofrecemos la opción de usar la aplicación de la manera más anónima posible. Sin embargo, algunas funciones como las notificaciones push, la sincronización y otras funciones no están disponibles porque se requiere una cuenta para estas.',
		[LanguageKeys.fr_FR]: 'Nous respectons votre vie privée et vous offrons la possibilité d\'utiliser l\'application aussi anonymement que possible. Cependant, certaines fonctionnalités telles que les notifications push, la synchronisation et d\'autres fonctions ne sont pas disponibles car un compte est nécessaire pour ces fonctionnalités.',
		[LanguageKeys.ru_RU]: 'Мы уважаем вашу конфиденциальность и предлагаем вам возможность использовать приложение как можно более анонимно. Однако некоторые функции, такие как push-уведомления, синхронизация и другие функции, недоступны, поскольку для них требуется учетная запись.',
		[LanguageKeys.tr_TR]: 'Gizliliğinize saygı duyuyor ve uygulamayı mümkün olduğunca anonim olarak kullanma seçeneği sunuyoruz. Ancak, push bildirimleri, senkronizasyon ve diğer işlevler gibi bazı özellikler, bu işlevler için bir hesap gerektiğinden kullanılamaz.',
		[LanguageKeys.zh_CN]: '我们尊重您的隐私，并提供尽可能匿名使用应用程序的选项。但是，由于这些功能需要帐户，因此某些功能（如推送通知、同步和其他功能）不可用。'
	},
	not_useable: {
		[LanguageKeys.de_DE]: 'Nicht nutzbar',
		[LanguageKeys.en_US]: 'Not usable',
		[LanguageKeys.ar_SA]: 'غير قابل للاستخدام',
		[LanguageKeys.es_ES]: 'No utilizable',
		[LanguageKeys.fr_FR]: 'Non utilisable',
		[LanguageKeys.ru_RU]: 'Не пригоден для использования',
		[LanguageKeys.tr_TR]: 'Kullanılamaz',
		[LanguageKeys.zh_CN]: '不可用'
	},
	no_foodoffers_found_for_selection: {
		[LanguageKeys.de_DE]: 'Keine Angebote gefunden.',
		[LanguageKeys.en_US]: 'No offers found.',
		[LanguageKeys.ar_SA]: 'لم يتم العثور على عروض.',
		[LanguageKeys.es_ES]: 'No se encontraron ofertas.',
		[LanguageKeys.fr_FR]: 'Aucune offre trouvée.',
		[LanguageKeys.ru_RU]: 'Предложений не найдено.',
		[LanguageKeys.tr_TR]: 'Teklif bulunamadı.',
		[LanguageKeys.zh_CN]: '未找到优惠。'
	},
	error: {
		[LanguageKeys.de_DE]: 'Fehler',
		[LanguageKeys.en_US]: 'Error',
		[LanguageKeys.ar_SA]: 'خطأ',
		[LanguageKeys.es_ES]: 'Error',
		[LanguageKeys.fr_FR]: 'Erreur',
		[LanguageKeys.ru_RU]: 'Ошибка',
		[LanguageKeys.tr_TR]: 'Hata',
		[LanguageKeys.zh_CN]: '错误'
	},
	description: {
		[LanguageKeys.de_DE]: 'Beschreibung',
		[LanguageKeys.en_US]: 'Description',
		[LanguageKeys.ar_SA]: 'وصف',
		[LanguageKeys.es_ES]: 'Descripción',
		[LanguageKeys.fr_FR]: 'Description',
		[LanguageKeys.ru_RU]: 'Описание',
		[LanguageKeys.tr_TR]: 'Açıklama',
		[LanguageKeys.zh_CN]: '描述'
	},
	information: {
		[LanguageKeys.de_DE]: 'Informationen',
		[LanguageKeys.en_US]: 'Information',
		[LanguageKeys.ar_SA]: 'معلومة',
		[LanguageKeys.es_ES]: 'Información',
		[LanguageKeys.fr_FR]: 'Information',
		[LanguageKeys.ru_RU]: 'Информация',
		[LanguageKeys.tr_TR]: 'Bilgi',
		[LanguageKeys.zh_CN]: '信息'
	},
	no_data_currently_calculating: {
		[LanguageKeys.de_DE]: 'Keine Daten, werden gerade berechnet',
		[LanguageKeys.en_US]: 'No data, currently calculating',
		[LanguageKeys.ar_SA]: 'لا توجد بيانات ، يتم حسابها حاليًا',
		[LanguageKeys.es_ES]: 'Sin datos, calculando actualmente',
		[LanguageKeys.fr_FR]: 'Pas de données, calcul en cours',
		[LanguageKeys.ru_RU]: 'Нет данных, в настоящее время рассчитывается',
		[LanguageKeys.tr_TR]: 'Veri yok, şu anda hesaplanıyor',
		[LanguageKeys.zh_CN]: '无数据，正在计算'
	},
	food_feedbacks: {
		[LanguageKeys.de_DE]: 'Essensbewertungen',
		[LanguageKeys.en_US]: 'Food Feedbacks',
		[LanguageKeys.ar_SA]: 'تعليقات الطعام',
		[LanguageKeys.es_ES]: 'Comentarios sobre la comida',
		[LanguageKeys.fr_FR]: 'Commentaires sur les aliments',
		[LanguageKeys.ru_RU]: 'Отзывы о еде',
		[LanguageKeys.tr_TR]: 'Yemek Geri Bildirimleri',
		[LanguageKeys.zh_CN]: '食品反馈'
	},
	to_the_forum: {
		[LanguageKeys.de_DE]: 'Zum Forum',
		[LanguageKeys.en_US]: 'To the Forum',
		[LanguageKeys.ar_SA]: 'إلى المنتدى',
		[LanguageKeys.es_ES]: 'Al foro',
		[LanguageKeys.fr_FR]: 'Au forum',
		[LanguageKeys.ru_RU]: 'На форум',
		[LanguageKeys.tr_TR]: 'Foruma',
		[LanguageKeys.zh_CN]: '去论坛'
	},
	reset_rating: {
		[LanguageKeys.de_DE]: 'Bewertung zurücksetzen',
		[LanguageKeys.en_US]: 'Reset Rating',
		[LanguageKeys.ar_SA]: 'إعادة تعيين التقييم',
		[LanguageKeys.es_ES]: 'Restablecer calificación',
		[LanguageKeys.fr_FR]: 'Réinitialiser la note',
		[LanguageKeys.ru_RU]: 'Сбросить рейтинг',
		[LanguageKeys.tr_TR]: 'Değerlendirmeyi sıfırla',
		[LanguageKeys.zh_CN]: '重置评分'
	},
	set_rating_to: {
		[LanguageKeys.de_DE]: 'Bewertung auf',
		[LanguageKeys.en_US]: 'Set Rating to',
		[LanguageKeys.ar_SA]: 'تعيين التقييم إلى',
		[LanguageKeys.es_ES]: 'Establecer calificación en',
		[LanguageKeys.fr_FR]: 'Définir la note sur',
		[LanguageKeys.ru_RU]: 'Установить рейтинг на',
		[LanguageKeys.tr_TR]: 'Değerlendirmeyi şu şekilde ayarla',
		[LanguageKeys.zh_CN]: '将评分设置为'
	},
	set_rate_as_favorite: {
		[LanguageKeys.de_DE]: 'Bewertung als Favorit',
		[LanguageKeys.en_US]: 'Set Rating as Favorite',
		[LanguageKeys.ar_SA]: 'تعيين التقييم كمفضل',
		[LanguageKeys.es_ES]: 'Establecer calificación como favorita',
		[LanguageKeys.fr_FR]: 'Définir la note comme favori',
		[LanguageKeys.ru_RU]: 'Установить рейтинг как любимый',
		[LanguageKeys.tr_TR]: 'Değerlendirmeyi Favori Olarak Ayarla',
		[LanguageKeys.zh_CN]: '将评分设为收藏'
	},
	set_rate_as_not_favorite: {
		[LanguageKeys.de_DE]: 'Bewertung nicht als Favorit',
		[LanguageKeys.en_US]: 'Set Rating as Not Favorite',
		[LanguageKeys.ar_SA]: 'تعيين التقييم كغير مفضل',
		[LanguageKeys.es_ES]: 'Establecer calificación como no favorita',
		[LanguageKeys.fr_FR]: 'Définir la note comme non favori',
		[LanguageKeys.ru_RU]: 'Установить рейтинг как нелюбимый',
		[LanguageKeys.tr_TR]: 'Değerlendirmeyi Favori Olmayan Olarak Ayarla',
		[LanguageKeys.zh_CN]: '将评分设为非收藏'
	},
	set_rating: {
		[LanguageKeys.de_DE]: 'Bewertung setzen',
		[LanguageKeys.en_US]: 'Set Rating',
		[LanguageKeys.ar_SA]: 'تعيين التقييم',
		[LanguageKeys.es_ES]: 'Establecer calificación',
		[LanguageKeys.fr_FR]: 'Définir la note',
		[LanguageKeys.ru_RU]: 'Установить рейтинг',
		[LanguageKeys.tr_TR]: 'Değerlendirme Ayarla',
		[LanguageKeys.zh_CN]: '设置评分'
	},
	feedback_labels: {
		[LanguageKeys.de_DE]: 'Rückmeldungen',
		[LanguageKeys.en_US]: 'Feedback Labels',
		[LanguageKeys.ar_SA]: 'تسميات التغذية الراجعة',
		[LanguageKeys.es_ES]: 'Etiquetas de comentarios',
		[LanguageKeys.fr_FR]: 'Étiquettes de retour',
		[LanguageKeys.ru_RU]: 'Метки отзывов',
		[LanguageKeys.tr_TR]: 'Geri Bildirim Etiketleri',
		[LanguageKeys.zh_CN]: '反馈标签'
	},
	open_navitation_to_location: {
		[LanguageKeys.de_DE]: 'Navigation zum Standort öffnen',
		[LanguageKeys.en_US]: 'Open Navigation to Location',
		[LanguageKeys.ar_SA]: 'افتح التنقل إلى الموقع',
		[LanguageKeys.es_ES]: 'Abrir navegación a la ubicación',
		[LanguageKeys.fr_FR]: 'Ouvrir la navigation vers le lieu',
		[LanguageKeys.ru_RU]: 'Открыть навигацию к месту',
		[LanguageKeys.tr_TR]: 'Konuma Navigasyonu Aç',
		[LanguageKeys.zh_CN]: '打开导航到位置'
	},
	distance_based_canteen_selection_or_if_asked_on_real_location: {
		[LanguageKeys.de_DE]: 'Die Distanz wird basierend auf der Entfernung zu deiner ausgewählten Mensa berechnet oder, wenn du explizit gefragt hast, zu dem Standort deines Geräts.',
		[LanguageKeys.en_US]: 'The distance is calculated based on the distance to your selected canteen or, if you explicitly asked, to your device\'s location.',
		[LanguageKeys.ar_SA]: 'يتم حساب المسافة بناءً على المسافة إلى المقصف الذي اخترته أو، إذا طلبت ذلك صراحةً، إلى موقع جهازك.',
		[LanguageKeys.es_ES]: 'La distancia se calcula en función de la distancia a tu comedor seleccionado o, si lo pediste explícitamente, a la ubicación de tu dispositivo.',
		[LanguageKeys.fr_FR]: 'La distance est calculée en fonction de la distance à votre cantine sélectionnée ou, si vous avez explicitement demandé, à l\'emplacement de votre appareil.',
		[LanguageKeys.ru_RU]: 'Расстояние рассчитывается на основе расстояния до выбранной вами столовой или, если вы специально запросили, до местоположения вашего устройства.',
		[LanguageKeys.tr_TR]: 'Mesafe, seçtiğiniz kantine veya açıkça sorduysanız cihazınızın konumuna olan mesafeye göre hesaplanır.',
		[LanguageKeys.zh_CN]: '距离是根据您选择的食堂的距离或，如果您明确要求，根据您设备的位置计算的。'
	},
	coordinates: {
		[LanguageKeys.de_DE]: 'Koordinaten',
		[LanguageKeys.en_US]: 'Coordinates',
		[LanguageKeys.ar_SA]: 'إحداثيات',
		[LanguageKeys.es_ES]: 'Coordenadas',
		[LanguageKeys.fr_FR]: 'Coordonnées',
		[LanguageKeys.ru_RU]: 'Координаты',
		[LanguageKeys.tr_TR]: 'Koordinatlar',
		[LanguageKeys.zh_CN]: '坐标'
	},
	copy_url: {
		[LanguageKeys.de_DE]: 'URL kopieren',
		[LanguageKeys.en_US]: 'Copy URL',
		[LanguageKeys.ar_SA]: 'نسخ URL',
		[LanguageKeys.es_ES]: 'Copiar URL',
		[LanguageKeys.fr_FR]: 'Copier l\'URL',
		[LanguageKeys.ru_RU]: 'Копировать URL',
		[LanguageKeys.tr_TR]: 'URL\'yi Kopyala',
		[LanguageKeys.zh_CN]: '复制 URL'
	},
	copy: {
		[LanguageKeys.de_DE]: 'Kopieren',
		[LanguageKeys.en_US]: 'Copy',
		[LanguageKeys.ar_SA]: 'نسخ',
		[LanguageKeys.es_ES]: 'Copiar',
		[LanguageKeys.fr_FR]: 'Copier',
		[LanguageKeys.ru_RU]: 'Копировать',
		[LanguageKeys.tr_TR]: 'Kopyala',
		[LanguageKeys.zh_CN]: '复制'
	},
	copied: {
		[LanguageKeys.de_DE]: 'Kopiert',
		[LanguageKeys.en_US]: 'Copied',
		[LanguageKeys.ar_SA]: 'تم النسخ',
		[LanguageKeys.es_ES]: 'Copiado',
		[LanguageKeys.fr_FR]: 'Copié',
		[LanguageKeys.ru_RU]: 'Скопировано',
		[LanguageKeys.tr_TR]: 'Kopyalandı',
		[LanguageKeys.zh_CN]: '已复制'
	},
	year_of_construction: {
		[LanguageKeys.de_DE]: 'Baujahr',
		[LanguageKeys.en_US]: 'Year of Construction',
		[LanguageKeys.ar_SA]: 'سنة البناء',
		[LanguageKeys.es_ES]: 'Año de construcción',
		[LanguageKeys.fr_FR]: 'Année de construction',
		[LanguageKeys.ru_RU]: 'Год строительства',
		[LanguageKeys.tr_TR]: 'İnşaat Yılı',
		[LanguageKeys.zh_CN]: '建造年份'
	},
	unknown: {
		[LanguageKeys.de_DE]: 'Unbekannt',
		[LanguageKeys.en_US]: 'Unknown',
		[LanguageKeys.ar_SA]: 'مجهول',
		[LanguageKeys.es_ES]: 'Desconocido',
		[LanguageKeys.fr_FR]: 'Inconnu',
		[LanguageKeys.ru_RU]: 'Неизвестный',
		[LanguageKeys.tr_TR]: 'Bilinmeyen',
		[LanguageKeys.zh_CN]: '未知'
	},
	animation: {
		[LanguageKeys.de_DE]: 'Animation',
		[LanguageKeys.en_US]: 'Animation',
		[LanguageKeys.ar_SA]: 'الرسوم المتحركة',
		[LanguageKeys.es_ES]: 'Animación',
		[LanguageKeys.fr_FR]: 'Animation',
		[LanguageKeys.ru_RU]: 'Анимация',
		[LanguageKeys.tr_TR]: 'Animasyon',
		[LanguageKeys.zh_CN]: '动画'
	},
	allergene: {
		[LanguageKeys.de_DE]: 'Allergene',
		[LanguageKeys.en_US]: 'Allergens',
		[LanguageKeys.ar_SA]: 'مسببات الحساسية',
		[LanguageKeys.es_ES]: 'Alérgenos',
		[LanguageKeys.fr_FR]: 'Allergènes',
		[LanguageKeys.ru_RU]: 'Аллергены',
		[LanguageKeys.tr_TR]: 'Alerjenler',
		[LanguageKeys.zh_CN]: '过敏原'
	},
	eatinghabits_introduction: {
		[LanguageKeys.de_DE]: `Teile uns mit welche Essgewohnheiten du bevorzugst oder meiden möchtest. Wir sortieren und markieren dann die Mahlzeitenangebote für dich. Wir können diese Informationen nutzen, um unser Angebot zu verbessern. Deine Daten werden nicht an Dritte weitergegeben.`,
		[LanguageKeys.en_US]: `Tell us which eating habits you prefer or want to avoid. We will then sort and mark the meal offers for you. We can use this information to improve our offer. Your data will not be passed on to third parties.`,
		[LanguageKeys.ar_SA]: `أخبرنا بعادات الأكل التي تفضلها أو تريد تجنبها. سنقوم بعد ذلك بفرز وتحديد عروض الوجبات لك. يمكننا استخدام هذه المعلومات لتحسين عرضنا. لن يتم نقل بياناتك إلى أطراف ثالثة.`,
		[LanguageKeys.es_ES]: `Dinos qué hábitos alimentarios prefieres o quieres evitar. Luego ordenaremos y marcaremos las ofertas de comidas para ti. Podemos utilizar esta información para mejorar nuestra oferta. Tus datos no se pasarán a terceros.`,
		[LanguageKeys.fr_FR]: `Dites-nous quelles habitudes alimentaires vous préférez ou souhaitez éviter. Nous trierons et marquerons ensuite les offres de repas pour vous. Nous pouvons utiliser ces informations pour améliorer notre offre. Vos données ne seront pas transmises à des tiers.`,
		[LanguageKeys.ru_RU]: `Сообщите нам, какие пищевые привычки вы предпочитаете или хотите избегать. Мы отсортируем и отметим предложения блюд для вас. Мы можем использовать эту информацию для улучшения нашего предложения. Ваши данные не будут переданы третьим лицам.`,
		[LanguageKeys.tr_TR]: `Hangi yeme alışkanlıklarını tercih ettiğinizi veya kaçınmak istediğinizi bize bildirin. Daha sonra yemek tekliflerini sizin için sıralayacak ve işaretleyeceğiz. Bu bilgileri teklifimizi geliştirmek için kullanabiliriz. Verileriniz üçüncü taraflara aktarılmayacaktır.`,
		[LanguageKeys.zh_CN]: `告诉我们您喜欢或想要避免的饮食习惯。然后我们将为您排序和标记餐饮优惠。我们可以使用这些信息来改进我们的产品。您的数据不会传递给第三方。`
	},
	notification: {
		[LanguageKeys.de_DE]: 'Benachrichtigung',
		[LanguageKeys.en_US]: 'Notification',
		[LanguageKeys.ar_SA]: 'إشعار',
		[LanguageKeys.es_ES]: 'Notificación',
		[LanguageKeys.fr_FR]: 'Notification',
		[LanguageKeys.ru_RU]: 'Уведомление',
		[LanguageKeys.tr_TR]: 'Bildirim',
		[LanguageKeys.zh_CN]: '通知'
	},
	notification_index_introduction: {
		[LanguageKeys.de_DE]: `Hier kannst du einstellen, welche Benachrichtigungen du erhalten möchtest. Wir informieren dich über wichtige Ereignisse und Änderungen.`,
		[LanguageKeys.en_US]: `Here you can set which notifications you want to receive. We will inform you about important events and changes.`,
		[LanguageKeys.ar_SA]: `هنا يمكنك تعيين الإخطارات التي تريد تلقيها. سنقوم بإعلامك عن الأحداث الهامة والتغييرات.`,
		[LanguageKeys.es_ES]: `Aquí puedes configurar qué notificaciones deseas recibir. Te informaremos sobre eventos importantes y cambios.`,
		[LanguageKeys.fr_FR]: `Ici, vous pouvez définir les notifications que vous souhaitez recevoir. Nous vous informerons des événements importants et des changements.`,
		[LanguageKeys.ru_RU]: `Здесь вы можете настроить, какие уведомления вы хотите получать. Мы будем информировать вас о важных событиях и изменениях.`,
		[LanguageKeys.tr_TR]: `Burada hangi bildirimleri almak istediğinizi ayarlayabilirsiniz. Sizi önemli etkinlikler ve değişiklikler hakkında bilgilendireceğiz.`,
		[LanguageKeys.zh_CN]: `在这里，您可以设置要接收哪些通知。我们会通知您有关重要事件和更改的信息。`
	},
	notification_please_enable_notifications_in_order_to_use_this_feature: {
		[LanguageKeys.de_DE]: 'Bitte aktiviere Benachrichtigungen, um diese Funktion zu nutzen.',
		[LanguageKeys.en_US]: 'Please enable notifications to use this feature.',
		[LanguageKeys.ar_SA]: 'يرجى تمكين الإشعارات لاستخدام هذه الميزة.',
		[LanguageKeys.es_ES]: 'Por favor, habilita las notificaciones para usar esta función.',
		[LanguageKeys.fr_FR]: 'Veuillez activer les notifications pour utiliser cette fonctionnalité.',
		[LanguageKeys.ru_RU]: 'Пожалуйста, включите уведомления, чтобы использовать эту функцию.',
		[LanguageKeys.tr_TR]: 'Bu özelliği kullanmak için lütfen bildirimleri etkinleştirin.',
		[LanguageKeys.zh_CN]: '请启用通知以使用此功能。'
	},
	notification_please_notify_me_on_my_smartphones_if_they_allow_to_be_notified: {
		[LanguageKeys.de_DE]: 'Bitte benachrichtige mich auf meinen Smartphones, wenn sie benachrichtigt werden dürfen.',
		[LanguageKeys.en_US]: 'Please notify me on my smartphones if they allow to be notified.',
		[LanguageKeys.ar_SA]: 'يرجى إعلامي على هواتفي الذكية إذا سمح لهم بتلقي الإشعارات.',
		[LanguageKeys.es_ES]: 'Por favor, notifícame en mis teléfonos inteligentes si se les permite recibir notificaciones.',
		[LanguageKeys.fr_FR]: 'Veuillez me notifier sur mes smartphones s\'ils permettent d\'être notifiés.',
		[LanguageKeys.ru_RU]: 'Пожалуйста, уведомляйте меня на моих смартфонах, если они позволяют получать уведомления.',
		[LanguageKeys.tr_TR]: 'Bildirim almalarına izin veriliyorsa lütfen akıllı telefonlarımda bana bildirin.',
		[LanguageKeys.zh_CN]: '如果允许接收通知，请在我的智能手机上通知我。'
	},
	this_feature_is_not_available_currently_reason: {
		[LanguageKeys.de_DE]: 'Diese Funktion ist derzeit nicht verfügbar. Grund:',
		[LanguageKeys.en_US]: 'This feature is currently not available. Reason:',
		[LanguageKeys.ar_SA]: 'هذه الميزة غير متوفرة حاليا. السبب:',
		[LanguageKeys.es_ES]: 'Esta función no está disponible actualmente. Razón:',
		[LanguageKeys.fr_FR]: 'Cette fonctionnalité n\'est actuellement pas disponible. Raison :',
		[LanguageKeys.ru_RU]: 'Эта функция в настоящее время недоступна. Причина:',
		[LanguageKeys.tr_TR]: 'Bu özellik şu anda mevcut değil. Sebep:',
		[LanguageKeys.zh_CN]: '此功能目前不可用。原因：'
	},
	device_android_system: {
		[LanguageKeys.de_DE]: 'Android System',
		[LanguageKeys.en_US]: 'Android System',
		[LanguageKeys.ar_SA]: 'نظام أندرويد',
		[LanguageKeys.es_ES]: 'Sistema Android',
		[LanguageKeys.fr_FR]: 'Système Android',
		[LanguageKeys.ru_RU]: 'Система Android',
		[LanguageKeys.tr_TR]: 'Android Sistemi',
		[LanguageKeys.zh_CN]: '安卓系统'
	},
	device_ios_system: {
		[LanguageKeys.de_DE]: 'iOS System',
		[LanguageKeys.en_US]: 'iOS System',
		[LanguageKeys.ar_SA]: 'نظام iOS',
		[LanguageKeys.es_ES]: 'Sistema iOS',
		[LanguageKeys.fr_FR]: 'Système iOS',
		[LanguageKeys.ru_RU]: 'Система iOS',
		[LanguageKeys.tr_TR]: 'iOS Sistemi',
		[LanguageKeys.zh_CN]: 'iOS 系统'
	},
	device_web_system: {
		[LanguageKeys.de_DE]: 'Web System',
		[LanguageKeys.en_US]: 'Web System',
		[LanguageKeys.ar_SA]: 'نظام الويب',
		[LanguageKeys.es_ES]: 'Sistema web',
		[LanguageKeys.fr_FR]: 'Système Web',
		[LanguageKeys.ru_RU]: 'Веб-система',
		[LanguageKeys.tr_TR]: 'Web Sistemi',
		[LanguageKeys.zh_CN]: '网络系统'
	},
	support: {
		[LanguageKeys.de_DE]: 'Support',
		[LanguageKeys.en_US]: 'Support',
		[LanguageKeys.ar_SA]: 'الدعم',
		[LanguageKeys.es_ES]: 'Soporte',
		[LanguageKeys.fr_FR]: 'Support',
		[LanguageKeys.ru_RU]: 'Поддержка',
		[LanguageKeys.tr_TR]: 'Destek',
		[LanguageKeys.zh_CN]: '支持'
	},
	price_group: {
		[LanguageKeys.de_DE]: 'Preisgruppe',
		[LanguageKeys.en_US]: 'Price Group',
		[LanguageKeys.ar_SA]: 'مجموعة الأسعار',
		[LanguageKeys.es_ES]: 'Grupo de precios',
		[LanguageKeys.fr_FR]: 'Groupe de prix',
		[LanguageKeys.ru_RU]: 'Ценовая группа',
		[LanguageKeys.tr_TR]: 'Fiyat Grubu',
		[LanguageKeys.zh_CN]: '价格组'
	},
	price_group_student: {
		[LanguageKeys.de_DE]: 'Studierende',
		[LanguageKeys.en_US]: 'Students',
		[LanguageKeys.ar_SA]: 'الطلاب',
		[LanguageKeys.es_ES]: 'Estudiantes',
		[LanguageKeys.fr_FR]: 'Étudiants',
		[LanguageKeys.ru_RU]: 'Студенты',
		[LanguageKeys.tr_TR]: 'Öğrenciler',
		[LanguageKeys.zh_CN]: '学生'
	},
	price_group_employee: {
		[LanguageKeys.de_DE]: 'Mitarbeitende',
		[LanguageKeys.en_US]: 'Employees',
		[LanguageKeys.ar_SA]: 'الموظفين',
		[LanguageKeys.es_ES]: 'Empleados',
		[LanguageKeys.fr_FR]: 'Employés',
		[LanguageKeys.ru_RU]: 'Сотрудники',
		[LanguageKeys.tr_TR]: 'Çalışanlar',
		[LanguageKeys.zh_CN]: '员工'
	},
	price_group_guest: {
		[LanguageKeys.de_DE]: 'Gäste',
		[LanguageKeys.en_US]: 'Guests',
		[LanguageKeys.ar_SA]: 'ضيوف',
		[LanguageKeys.es_ES]: 'Huéspedes',
		[LanguageKeys.fr_FR]: 'Invités',
		[LanguageKeys.ru_RU]: 'Гости',
		[LanguageKeys.tr_TR]: 'Misafirler',
		[LanguageKeys.zh_CN]: '来宾'
	},
	role_employee: {
		[LanguageKeys.de_DE]: 'Mitarbeitende',
		[LanguageKeys.en_US]: 'Employees',
		[LanguageKeys.ar_SA]: 'الموظفين',
		[LanguageKeys.es_ES]: 'Empleados',
		[LanguageKeys.fr_FR]: 'Employés',
		[LanguageKeys.ru_RU]: 'Сотрудники',
		[LanguageKeys.tr_TR]: 'Çalışanlar',
		[LanguageKeys.zh_CN]: '员工'
	},
	support_team: {
		[LanguageKeys.de_DE]: 'Support Team',
		[LanguageKeys.en_US]: 'Support Team',
		[LanguageKeys.ar_SA]: 'فريق الدعم',
		[LanguageKeys.es_ES]: 'Equipo de soporte',
		[LanguageKeys.fr_FR]: 'Équipe de support',
		[LanguageKeys.ru_RU]: 'Команда поддержки',
		[LanguageKeys.tr_TR]: 'Destek Ekibi',
		[LanguageKeys.zh_CN]: '支持团队'
	},
	response: {
		[LanguageKeys.de_DE]: 'Antwort',
		[LanguageKeys.en_US]: 'Response',
		[LanguageKeys.ar_SA]: 'استجابة',
		[LanguageKeys.es_ES]: 'Respuesta',
		[LanguageKeys.fr_FR]: 'Réponse',
		[LanguageKeys.ru_RU]: 'Ответ',
		[LanguageKeys.tr_TR]: 'Yanıt',
		[LanguageKeys.zh_CN]: '响应'
	},
	your_request: {
		[LanguageKeys.de_DE]: 'Deine Anfrage',
		[LanguageKeys.en_US]: 'Your Request',
		[LanguageKeys.ar_SA]: 'طلبك',
		[LanguageKeys.es_ES]: 'Tu solicitud',
		[LanguageKeys.fr_FR]: 'Votre demande',
		[LanguageKeys.ru_RU]: 'Ваш запрос',
		[LanguageKeys.tr_TR]: 'Talebiniz',
		[LanguageKeys.zh_CN]: '你的请求'
	},
	no_permission_for: {
		[LanguageKeys.de_DE]: 'Keine Berechtigung für',
		[LanguageKeys.en_US]: 'No Permission for',
		[LanguageKeys.ar_SA]: 'لا توجد إذن لـ',
		[LanguageKeys.es_ES]: 'Sin permiso para',
		[LanguageKeys.fr_FR]: 'Pas de permission pour',
		[LanguageKeys.ru_RU]: 'Нет разрешения на',
		[LanguageKeys.tr_TR]: 'İzin yok',
		[LanguageKeys.zh_CN]: '没有权限'
	},
	please_create_an_account: {
		[LanguageKeys.de_DE]: 'Bitte erstelle einen Account',
		[LanguageKeys.en_US]: 'Please create an account',
		[LanguageKeys.ar_SA]: 'يرجى إنشاء حساب',
		[LanguageKeys.es_ES]: 'Por favor, crea una cuenta',
		[LanguageKeys.fr_FR]: 'Veuillez créer un compte',
		[LanguageKeys.ru_RU]: 'Пожалуйста, создайте аккаунт',
		[LanguageKeys.tr_TR]: 'Lütfen bir hesap oluşturun',
		[LanguageKeys.zh_CN]: '请创建一个帐户'
	},
	create_account: {
		[LanguageKeys.de_DE]: 'Account erstellen',
		[LanguageKeys.en_US]: 'Create Account',
		[LanguageKeys.ar_SA]: 'إنشاء حساب',
		[LanguageKeys.es_ES]: 'Crear cuenta',
		[LanguageKeys.fr_FR]: 'Créer un compte',
		[LanguageKeys.ru_RU]: 'Создать аккаунт',
		[LanguageKeys.tr_TR]: 'Hesap oluştur',
		[LanguageKeys.zh_CN]: '创建账户'
	},
	washing_machine: {
		[LanguageKeys.de_DE]: 'Waschmaschine',
		[LanguageKeys.en_US]: 'Washing Machine',
		[LanguageKeys.ar_SA]: 'غسالة',
		[LanguageKeys.es_ES]: 'Lavadora',
		[LanguageKeys.fr_FR]: 'Machine à laver',
		[LanguageKeys.ru_RU]: 'Стиральная машина',
		[LanguageKeys.tr_TR]: 'Çamaşır Makinesi',
		[LanguageKeys.zh_CN]: '洗衣机'
	},
	washing_machines: {
		[LanguageKeys.de_DE]: 'Waschmaschinen',
		[LanguageKeys.en_US]: 'Washing Machines',
		[LanguageKeys.ar_SA]: 'غسالات',
		[LanguageKeys.es_ES]: 'Lavadoras',
		[LanguageKeys.fr_FR]: 'Machines à laver',
		[LanguageKeys.ru_RU]: 'Стиральные машины',
		[LanguageKeys.tr_TR]: 'Çamaşır Makineleri',
		[LanguageKeys.zh_CN]: '洗衣机'
	},
	washingmachine_state_finished: {
		[LanguageKeys.de_DE]: 'Waschen beendet',
		[LanguageKeys.en_US]: 'Washing finished',
		[LanguageKeys.ar_SA]: 'تم الانتهاء من الغسيل',
		[LanguageKeys.es_ES]: 'Lavado terminado',
		[LanguageKeys.fr_FR]: 'Lavage terminé',
		[LanguageKeys.ru_RU]: 'Стирка закончена',
		[LanguageKeys.tr_TR]: 'Yıkama tamamlandı',
		[LanguageKeys.zh_CN]: '洗涤完成'
	},
	washingmachine_estimate_finished_at: {
		[LanguageKeys.de_DE]: 'Voraussichtlich fertig um',
		[LanguageKeys.en_US]: 'Estimated to be finished at',
		[LanguageKeys.ar_SA]: 'من المتوقع أن ينتهي عند',
		[LanguageKeys.es_ES]: 'Estimado para finalizar a las',
		[LanguageKeys.fr_FR]: 'Estimé pour être terminé à',
		[LanguageKeys.ru_RU]: 'Ожидается, что будет завершено к',
		[LanguageKeys.tr_TR]: 'Tahmini bitiş saati',
		[LanguageKeys.zh_CN]: '预计完成时间'
	},
	washingmachine_state_unknown: {
		[LanguageKeys.de_DE]: 'Waschmaschine unbekannt',
		[LanguageKeys.en_US]: 'Washing Machine Unknown',
		[LanguageKeys.ar_SA]: 'غسالة غير معروفة',
		[LanguageKeys.es_ES]: 'Lavadora desconocida',
		[LanguageKeys.fr_FR]: 'Machine à laver inconnue',
		[LanguageKeys.ru_RU]: 'Стиральная машина неизвестна',
		[LanguageKeys.tr_TR]: 'Çamaşır makinesi bilinmiyor',
		[LanguageKeys.zh_CN]: '洗衣机未知'
	},
	current: {
		[LanguageKeys.de_DE]: 'Aktuell',
		[LanguageKeys.en_US]: 'Current',
		[LanguageKeys.ar_SA]: 'حالي',
		[LanguageKeys.es_ES]: 'Actual',
		[LanguageKeys.fr_FR]: 'Actuel',
		[LanguageKeys.ru_RU]: 'Текущий',
		[LanguageKeys.tr_TR]: 'Güncel',
		[LanguageKeys.zh_CN]: '当前'
	},
	active: {
		[LanguageKeys.de_DE]: 'Aktiv',
		[LanguageKeys.en_US]: 'Active',
		[LanguageKeys.ar_SA]: 'نشيط',
		[LanguageKeys.es_ES]: 'Activo',
		[LanguageKeys.fr_FR]: 'Actif',
		[LanguageKeys.ru_RU]: 'Активный',
		[LanguageKeys.tr_TR]: 'Aktif',
		[LanguageKeys.zh_CN]: '活跃'
	},
	inactive: {
		[LanguageKeys.de_DE]: 'Inaktiv',
		[LanguageKeys.en_US]: 'Inactive',
		[LanguageKeys.ar_SA]: 'غير نشط',
		[LanguageKeys.es_ES]: 'Inactivo',
		[LanguageKeys.fr_FR]: 'Inactif',
		[LanguageKeys.ru_RU]: 'Неактивный',
		[LanguageKeys.tr_TR]: 'Pasif',
		[LanguageKeys.zh_CN]: '不活跃'
	},
	state_current: {
		[LanguageKeys.de_DE]: 'Status aktuell',
		[LanguageKeys.en_US]: 'Current Status',
		[LanguageKeys.ar_SA]: 'الحالة الحالية',
		[LanguageKeys.es_ES]: 'Estado actual',
		[LanguageKeys.fr_FR]: 'Statut actuel',
		[LanguageKeys.ru_RU]: 'Текущий статус',
		[LanguageKeys.tr_TR]: 'Mevcut Durum',
		[LanguageKeys.zh_CN]: '当前状态'
	},
	state_next: {
		[LanguageKeys.de_DE]: 'Status danach',
		[LanguageKeys.en_US]: 'Next Status',
		[LanguageKeys.ar_SA]: 'الحالة التالية',
		[LanguageKeys.es_ES]: 'Próximo estado',
		[LanguageKeys.fr_FR]: 'Prochain statut',
		[LanguageKeys.ru_RU]: 'Следующий статус',
		[LanguageKeys.tr_TR]: 'Sonraki Durum',
		[LanguageKeys.zh_CN]: '下一个状态'
	},
	import: {
		[LanguageKeys.de_DE]: 'Importieren',
		[LanguageKeys.en_US]: 'Import',
		[LanguageKeys.ar_SA]: 'استيراد',
		[LanguageKeys.es_ES]: 'Importar',
		[LanguageKeys.fr_FR]: 'Importer',
		[LanguageKeys.ru_RU]: 'Импортировать',
		[LanguageKeys.tr_TR]: 'İçe aktar',
		[LanguageKeys.zh_CN]: '进口'
	},
	event: {
		[LanguageKeys.de_DE]: 'Veranstaltung',
		[LanguageKeys.en_US]: 'Event',
		[LanguageKeys.ar_SA]: 'حدث',
		[LanguageKeys.es_ES]: 'Evento',
		[LanguageKeys.fr_FR]: 'Événement',
		[LanguageKeys.ru_RU]: 'Событие',
		[LanguageKeys.tr_TR]: 'Etkinlik',
		[LanguageKeys.zh_CN]: '事件'
	},
	create: {
		[LanguageKeys.de_DE]: 'Erstellen',
		[LanguageKeys.en_US]: 'Create',
		[LanguageKeys.ar_SA]: 'خلق',
		[LanguageKeys.es_ES]: 'Crear',
		[LanguageKeys.fr_FR]: 'Créer',
		[LanguageKeys.ru_RU]: 'Создать',
		[LanguageKeys.tr_TR]: 'Oluştur',
		[LanguageKeys.zh_CN]: '创建'
	},
	delete: {
		[LanguageKeys.de_DE]: 'Löschen',
		[LanguageKeys.en_US]: 'Delete',
		[LanguageKeys.ar_SA]: 'حذف',
		[LanguageKeys.es_ES]: 'Eliminar',
		[LanguageKeys.fr_FR]: 'Supprimer',
		[LanguageKeys.ru_RU]: 'Удалить',
		[LanguageKeys.tr_TR]: 'Sil',
		[LanguageKeys.zh_CN]: '删除'
	},
	location: {
		[LanguageKeys.de_DE]: 'Ort',
		[LanguageKeys.en_US]: 'Location',
		[LanguageKeys.ar_SA]: 'موقع',
		[LanguageKeys.es_ES]: 'Ubicación',
		[LanguageKeys.fr_FR]: 'Lieu',
		[LanguageKeys.ru_RU]: 'Местоположение',
		[LanguageKeys.tr_TR]: 'Konum',
		[LanguageKeys.zh_CN]: '位置'
	},
	title: {
		[LanguageKeys.de_DE]: 'Titel',
		[LanguageKeys.en_US]: 'Title',
		[LanguageKeys.ar_SA]: 'عنوان',
		[LanguageKeys.es_ES]: 'Título',
		[LanguageKeys.fr_FR]: 'Titre',
		[LanguageKeys.ru_RU]: 'Название',
		[LanguageKeys.tr_TR]: 'Başlık',
		[LanguageKeys.zh_CN]: '标题'
	},
	weekday: {
		[LanguageKeys.de_DE]: 'Wochentag',
		[LanguageKeys.en_US]: 'Weekday',
		[LanguageKeys.ar_SA]: 'يوم من أيام الأسبوع',
		[LanguageKeys.es_ES]: 'Día de la semana',
		[LanguageKeys.fr_FR]: 'Jour de la semaine',
		[LanguageKeys.ru_RU]: 'День недели',
		[LanguageKeys.tr_TR]: 'Hafta içi',
		[LanguageKeys.zh_CN]: '工作日'
	},
	week: {
		[LanguageKeys.de_DE]: 'Woche',
		[LanguageKeys.en_US]: 'Week',
		[LanguageKeys.ar_SA]: 'أسبوع',
		[LanguageKeys.es_ES]: 'Semana',
		[LanguageKeys.fr_FR]: 'Semaine',
		[LanguageKeys.ru_RU]: 'Неделя',
		[LanguageKeys.tr_TR]: 'Hafta',
		[LanguageKeys.zh_CN]: '周'
	},
	startTime: {
		[LanguageKeys.de_DE]: 'Startzeit',
		[LanguageKeys.en_US]: 'Start Time',
		[LanguageKeys.ar_SA]: 'وقت البدء',
		[LanguageKeys.es_ES]: 'Hora de inicio',
		[LanguageKeys.fr_FR]: 'Heure de début',
		[LanguageKeys.ru_RU]: 'Время начала',
		[LanguageKeys.tr_TR]: 'Başlangıç Zamanı',
		[LanguageKeys.zh_CN]: '开始时间'
	},
	endTime: {
		[LanguageKeys.de_DE]: 'Endzeit',
		[LanguageKeys.en_US]: 'End Time',
		[LanguageKeys.ar_SA]: 'وقت النهاية',
		[LanguageKeys.es_ES]: 'Hora de finalización',
		[LanguageKeys.fr_FR]: 'Heure de fin',
		[LanguageKeys.ru_RU]: 'Время окончания',
		[LanguageKeys.tr_TR]: 'Bitiş Zamanı',
		[LanguageKeys.zh_CN]: '结束时间'
	},
	color: {
		[LanguageKeys.de_DE]: 'Farbe',
		[LanguageKeys.en_US]: 'Color',
		[LanguageKeys.ar_SA]: 'اللون',
		[LanguageKeys.es_ES]: 'Color',
		[LanguageKeys.fr_FR]: 'Couleur',
		[LanguageKeys.ru_RU]: 'Цвет',
		[LanguageKeys.tr_TR]: 'Renk',
		[LanguageKeys.zh_CN]: '颜色'
	},
	cancel: {
		[LanguageKeys.de_DE]: 'Abbrechen',
		[LanguageKeys.en_US]: 'Cancel',
		[LanguageKeys.ar_SA]: 'إلغاء',
		[LanguageKeys.es_ES]: 'Cancelar',
		[LanguageKeys.fr_FR]: 'Annuler',
		[LanguageKeys.ru_RU]: 'Отмена',
		[LanguageKeys.tr_TR]: 'İptal',
		[LanguageKeys.zh_CN]: '取消'
	},
	for_example: {
		[LanguageKeys.de_DE]: 'zum Beispiel',
		[LanguageKeys.en_US]: 'for example',
		[LanguageKeys.ar_SA]: 'على سبيل المثال',
		[LanguageKeys.es_ES]: 'por ejemplo',
		[LanguageKeys.fr_FR]: 'par exemple',
		[LanguageKeys.ru_RU]: 'например',
		[LanguageKeys.tr_TR]: 'örneğin',
		[LanguageKeys.zh_CN]: '例如'
	},
	courseTimetableDescriptionEmpty: {
		[LanguageKeys.de_DE]: 'Du hast noch keinen **Stundenplan**?\n\nMit unserer Stundenplanfunktion kannst du dein Studium und deine Mahlzeiten wie ein Profi planen. Wenn du ein Profil hast, synchronisieren wir deinen Stundenplan automatisch.\n\n*Hinweis: Wir analysieren ggf. Profile mit Stundenplänen, um überfüllte Essensschlangen zu vermeiden - wir geben diese Daten nicht an Dritte weiter.*\n[Mehr darüber](https://nilsbaumgartner.de/homepage/2023/01/15/speiseprognose/)',
		[LanguageKeys.en_US]: 'You don\'t have a **timetable** yet?\n\nWith our timetable function you can plan your studies and meals like a pro. If you have a profile, we will automatically synchronize your timetable.\n\n*Note: We may analyze profiles with timetables to avoid overcrowded meal queues - we do not pass this data on to third parties.*\n[Learn more](https://nilsbaumgartner.de/homepage/2023/01/15/speiseprognose/)',
		[LanguageKeys.ar_SA]: 'ليس لديك **جدول زمني** حتى الآن؟\n\nمع وظيفة الجدول الزمني الخاصة بنا ، يمكنك التخطيط لدراستك ووجباتك مثل المحترفين. إذا كان لديك ملف تعريف ، فسنقوم بمزامنة جدولك الزمني تلقائيًا.\n\n*ملاحظة: قد نقوم بتحليل الملفات الشخصية التي تحتوي على جداول زمنية لتجنب ازدحام طوابير الطعام - نحن لا ننقل هذه البيانات إلى أطراف ثالثة.*\n[تعرف على المزيد](https://nilsbaumgartner.de/homepage/2023/01/15/speiseprognose/)',
		[LanguageKeys.es_ES]: '¿Aún no tienes un **horario**?\n\nCon nuestra función de horario puedes planificar tus estudios y comidas como un profesional. Si tienes un perfil, sincronizaremos tu horario automáticamente.\n\n*Nota: Podemos analizar perfiles con horarios para evitar colas de comida abarrotadas; no pasamos estos datos a terceros.*\n[Aprende más](https://nilsbaumgartner.de/homepage/2023/01/15/speiseprognose/)',
		[LanguageKeys.fr_FR]: 'Vous n\'avez pas encore d\'**emploi du temps**?\n\nAvec notre fonction d\'emploi du temps, vous pouvez planifier vos études et vos repas comme un pro. Si vous avez un profil, nous synchroniserons automatiquement votre emploi du temps.\n\n*Remarque : Nous pouvons analyser les profils avec des emplois du temps pour éviter les files d\'attente pour les repas - nous ne transmettons pas ces données à des tiers.*\n[En savoir plus](https://nilsbaumgartner.de/homepage/2023/01/15/speiseprognose/)',
		[LanguageKeys.ru_RU]: 'У вас еще нет **расписания**?\n\nС помощью нашей функции расписания вы можете планировать свои занятия и питание как профессионал. Если у вас есть профиль, мы автоматически синхронизируем ваше расписание.\n\n*Примечание: мы можем анализировать профили с расписаниями, чтобы избежать переполненных очередей за едой - мы не передаем эти данные третьим лицам.*\n[Узнать больше](https://nilsbaumgartner.de/homepage/2023/01/15/speiseprognose/)',
		[LanguageKeys.tr_TR]: '**Ders programınız** yok mu?\n\nDers programı işlevimizle çalışmalarınızı ve yemeklerinizi profesyonel gibi planlayabilirsiniz. Bir profiliniz varsa, ders programınızı otomatik olarak senkronize ederiz.\n\n*Not: Yemek sıralarının aşırı kalabalık olmasını önlemek için ders programlarına sahip profilleri analiz edebiliriz - bu verileri üçüncü taraflarla paylaşmayız.*\n[Daha fazla bilgi](https://nilsbaumgartner.de/homepage/2023/01/15/speiseprognose/)',
		[LanguageKeys.zh_CN]: '你还没有**时间表**吗？\n\n通过我们的时间表功能，您可以像专业人士一样规划学习和用餐。如果您有个人资料，我们将自动同步您的时间表。\n\n*注意：我们可能会分析有时间表的个人资料，以避免过度拥挤的用餐队列 - 我们不会将这些数据传递给第三方。*\n[了解更多](https://nilsbaumgartner.de/homepage/2023/01/15/speiseprognose/)'
	},
	nothing_found: {
		[LanguageKeys.de_DE]: 'Nichts gefunden',
		[LanguageKeys.en_US]: 'Nothing found',
		[LanguageKeys.ar_SA]: 'لم يتم العثور على شيء',
		[LanguageKeys.es_ES]: 'Nada encontrado',
		[LanguageKeys.fr_FR]: 'Rien trouvé',
		[LanguageKeys.ru_RU]: 'Ничего не найдено',
		[LanguageKeys.tr_TR]: 'Bir şey bulunamadı',
		[LanguageKeys.zh_CN]: '未找到任何内容'
	},
	seemsEmpty: {
		[LanguageKeys.de_DE]: 'Es scheint leer zu sein',
		[LanguageKeys.en_US]: 'It seems empty',
		[LanguageKeys.ar_SA]: 'يبدو فارغًا',
		[LanguageKeys.es_ES]: 'Parece vacío',
		[LanguageKeys.fr_FR]: 'Ça semble vide',
		[LanguageKeys.ru_RU]: 'Кажется, пусто',
		[LanguageKeys.tr_TR]: 'Boş görünüyor',
		[LanguageKeys.zh_CN]: '看起来是空的'
	},
	noFeedbacksFound: {
		[LanguageKeys.de_DE]: 'Kein Feedback gefunden',
		[LanguageKeys.en_US]: 'No feedback found',
		[LanguageKeys.ar_SA]: 'لم يتم العثور على تعليقات',
		[LanguageKeys.es_ES]: 'No se encontraron comentarios',
		[LanguageKeys.fr_FR]: 'Aucun retour trouvé',
		[LanguageKeys.ru_RU]: 'Обратной связи не найдено',
		[LanguageKeys.tr_TR]: 'Geri bildirim bulunamadı',
		[LanguageKeys.zh_CN]: '未找到反馈'
	},
	somethingWentWrong: {
		[LanguageKeys.de_DE]: 'Etwas ist schief gelaufen',
		[LanguageKeys.en_US]: 'Something went wrong',
		[LanguageKeys.ar_SA]: 'حدث خطأ ما',
		[LanguageKeys.es_ES]: 'Algo salió mal',
		[LanguageKeys.fr_FR]: 'Quelque chose a mal tourné',
		[LanguageKeys.ru_RU]: 'Что-то пошло не так',
		[LanguageKeys.tr_TR]: 'Bir şeyler yanlış gitti',
		[LanguageKeys.zh_CN]: '出了点问题'
	},
	date: {
		[LanguageKeys.de_DE]: 'Datum',
		[LanguageKeys.en_US]: 'Date',
		[LanguageKeys.ar_SA]: 'تاريخ',
		[LanguageKeys.es_ES]: 'Fecha',
		[LanguageKeys.fr_FR]: 'Date',
		[LanguageKeys.ru_RU]: 'Дата',
		[LanguageKeys.tr_TR]: 'Tarih',
		[LanguageKeys.zh_CN]: '日期'
	},
	year: {
		[LanguageKeys.de_DE]: 'Jahr',
		[LanguageKeys.en_US]: 'Year',
		[LanguageKeys.ar_SA]: 'سنة',
		[LanguageKeys.es_ES]: 'Año',
		[LanguageKeys.fr_FR]: 'An',
		[LanguageKeys.ru_RU]: 'Год',
		[LanguageKeys.tr_TR]: 'Yıl',
		[LanguageKeys.zh_CN]: '年'
	},
	month: {
		[LanguageKeys.de_DE]: 'Monat',
		[LanguageKeys.en_US]: 'Month',
		[LanguageKeys.ar_SA]: 'شهر',
		[LanguageKeys.es_ES]: 'Mes',
		[LanguageKeys.fr_FR]: 'Mois',
		[LanguageKeys.ru_RU]: 'Месяц',
		[LanguageKeys.tr_TR]: 'Ay',
		[LanguageKeys.zh_CN]: '月'
	},
	selected: {
		[LanguageKeys.de_DE]: 'Ausgewählt',
		[LanguageKeys.en_US]: 'Selected',
		[LanguageKeys.ar_SA]: 'المحدد',
		[LanguageKeys.es_ES]: 'Seleccionado',
		[LanguageKeys.fr_FR]: 'Sélectionné',
		[LanguageKeys.ru_RU]: 'Выбранный',
		[LanguageKeys.tr_TR]: 'Seçilmiş',
		[LanguageKeys.zh_CN]: '已选'
	},
	proceed: {
		[LanguageKeys.de_DE]: 'Weiter',
		[LanguageKeys.en_US]: 'Proceed',
		[LanguageKeys.ar_SA]: 'تقدم',
		[LanguageKeys.es_ES]: 'Proceder',
		[LanguageKeys.fr_FR]: 'Procéder',
		[LanguageKeys.ru_RU]: 'Продолжить',
		[LanguageKeys.tr_TR]: 'Devam et',
		[LanguageKeys.zh_CN]: '继续'
	},
	previous: {
		[LanguageKeys.de_DE]: 'Zurück',
		[LanguageKeys.en_US]: 'Previous',
		[LanguageKeys.ar_SA]: 'السابق',
		[LanguageKeys.es_ES]: 'Anterior',
		[LanguageKeys.fr_FR]: 'Précédent',
		[LanguageKeys.ru_RU]: 'Предыдущий',
		[LanguageKeys.tr_TR]: 'Önceki',
		[LanguageKeys.zh_CN]: '上一个'
	},
	businesshours: {
		[LanguageKeys.de_DE]: 'Geschäftszeiten',
		[LanguageKeys.en_US]: 'Business Hours',
		[LanguageKeys.ar_SA]: 'ساعات العمل',
		[LanguageKeys.es_ES]: 'Horario comercial',
		[LanguageKeys.fr_FR]: 'Heures d\'ouverture',
		[LanguageKeys.ru_RU]: 'Часы работы',
		[LanguageKeys.tr_TR]: 'Çalışma Saatleri',
		[LanguageKeys.zh_CN]: '营业时间'
	},
	foodservicehours: {
		[LanguageKeys.de_DE]: 'Essenszeiten',
		[LanguageKeys.en_US]: 'Food Service Hours',
		[LanguageKeys.ar_SA]: 'ساعات خدمة الطعام',
		[LanguageKeys.es_ES]: 'Horario de servicio de comida',
		[LanguageKeys.fr_FR]: 'Heures de service de nourriture',
		[LanguageKeys.ru_RU]: 'Часы работы питания',
		[LanguageKeys.tr_TR]: 'Yemek Servisi Saatleri',
		[LanguageKeys.zh_CN]: '餐饮服务时间'
	},
	until: {
		[LanguageKeys.de_DE]: 'bis',
		[LanguageKeys.en_US]: 'until',
		[LanguageKeys.ar_SA]: 'حتى',
		[LanguageKeys.es_ES]: 'hasta',
		[LanguageKeys.fr_FR]: 'jusqu\'à',
		[LanguageKeys.ru_RU]: 'до',
		[LanguageKeys.tr_TR]: 'kadar',
		[LanguageKeys.zh_CN]: '直到'
	},
	day: {
		[LanguageKeys.de_DE]: 'Tag',
		[LanguageKeys.en_US]: 'Day',
		[LanguageKeys.ar_SA]: 'يوم',
		[LanguageKeys.es_ES]: 'Día',
		[LanguageKeys.fr_FR]: 'Jour',
		[LanguageKeys.ru_RU]: 'День',
		[LanguageKeys.tr_TR]: 'Gün',
		[LanguageKeys.zh_CN]: '天'
	},
	today: {
		[LanguageKeys.de_DE]: 'Heute',
		[LanguageKeys.en_US]: 'Today',
		[LanguageKeys.ar_SA]: 'اليوم',
		[LanguageKeys.es_ES]: 'Hoy',
		[LanguageKeys.fr_FR]: 'Aujourd\'hui',
		[LanguageKeys.ru_RU]: 'Сегодня',
		[LanguageKeys.tr_TR]: 'Bugün',
		[LanguageKeys.zh_CN]: '今天'
	},
	tomorrow: {
		[LanguageKeys.de_DE]: 'Morgen',
		[LanguageKeys.en_US]: 'Tomorrow',
		[LanguageKeys.ar_SA]: 'غدا',
		[LanguageKeys.es_ES]: 'Mañana',
		[LanguageKeys.fr_FR]: 'Demain',
		[LanguageKeys.ru_RU]: 'Завтра',
		[LanguageKeys.tr_TR]: 'Yarın',
		[LanguageKeys.zh_CN]: '明天'
	},
	yesterday: {
		[LanguageKeys.de_DE]: 'Gestern',
		[LanguageKeys.en_US]: 'Yesterday',
		[LanguageKeys.ar_SA]: 'أمس',
		[LanguageKeys.es_ES]: 'Ayer',
		[LanguageKeys.fr_FR]: 'Hier',
		[LanguageKeys.ru_RU]: 'Вчера',
		[LanguageKeys.tr_TR]: 'Dün',
		[LanguageKeys.zh_CN]: '昨天'
	},
	nutrition: {
		[LanguageKeys.de_DE]: 'Nährwerte',
		[LanguageKeys.en_US]: 'Nutrition',
		[LanguageKeys.ar_SA]: 'التغذية',
		[LanguageKeys.es_ES]: 'Nutrición',
		[LanguageKeys.fr_FR]: 'Nutrition',
		[LanguageKeys.ru_RU]: 'Питание',
		[LanguageKeys.tr_TR]: 'Beslenme',
		[LanguageKeys.zh_CN]: '营养'
	},
	food_information_disclaimer: {
		[LanguageKeys.de_DE]: 'Die Angaben zu den medizinischen und gesundheitsbezogenen Daten basieren auf den Informationen, die uns zur Verfügung stehen. Die Kennzeichnungen können von den tatsächlichen Inhaltsstoffen abweichen. Bei der Angabe der Nährwerte handelt es sich um Durchschnittswerte pro Portion. Änderungen vorbehalten. Weitere Informationen zu den Nährwerten und der Berechnung können hier entnommen werden:',
		[LanguageKeys.en_US]: 'The information on medical and health-related data is based on the information available to us. The labels may differ from the actual ingredients. The nutritional values are average values per portion. Subject to change. Further information on the nutritional values and the calculation can be found here:',
		[LanguageKeys.ar_SA]: 'تعتمد المعلومات حول البيانات الطبية والصحية على المعلومات المتاحة لدينا. قد تختلف التسميات عن المكونات الفعلية. القيم الغذائية هي قيم متوسطة لكل وجبة. قابل للتغيير. يمكن العثور على مزيد من المعلومات حول القيم الغذائية والحساب هنا:',
		[LanguageKeys.es_ES]: 'La información sobre datos médicos y relacionados con la salud se basa en la información disponible para nosotros. Las etiquetas pueden diferir de los ingredientes reales. Los valores nutricionales son valores promedio por porción. Sujeto a cambios. Puede encontrar más información sobre los valores nutricionales y el cálculo aquí:',
		[LanguageKeys.fr_FR]: 'Les informations sur les données médicales et liées à la santé sont basées sur les informations dont nous disposons. Les étiquettes peuvent différer des ingrédients réels. Les valeurs nutritionnelles sont des valeurs moyennes par portion. Sous réserve de modifications. Vous trouverez plus d\'informations sur les valeurs nutritionnelles et le calcul ici:',
		[LanguageKeys.ru_RU]: 'Информация о медицинских и здоровьесберегающих данных основана на имеющейся у нас информации. Метки могут отличаться от фактических ингредиентов. Пищевая ценность является средним значением на порцию. Подлежит изменению. Дополнительную информацию о пищевой ценности и расчете можно найти здесь:',
		[LanguageKeys.tr_TR]: 'Tıbbi ve sağlıkla ilgili veriler hakkındaki bilgiler, bize sunulan bilgilere dayanmaktadır. Etiketler gerçek içeriklerden farklı olabilir. Besin değerleri porsiyon başına ortalama değerlerdir. Değişiklik yapılabilir. Besin değerleri ve hesaplama hakkında daha fazla bilgi burada bulunabilir:',
		[LanguageKeys.zh_CN]: '关于医疗和与健康相关的数据的信息基于我们掌握的信息。标签可能与实际成分不同。营养价值是每份的平均值。如有更改。有关营养价值和计算的更多信息，请参见此处：'
	},
	nutrition_calories: {
		[LanguageKeys.de_DE]: 'Kalorien',
		[LanguageKeys.en_US]: 'Calories',
		[LanguageKeys.ar_SA]: 'سعرات حراريه',
		[LanguageKeys.es_ES]: 'Calorías',
		[LanguageKeys.fr_FR]: 'Calories',
		[LanguageKeys.ru_RU]: 'Калории',
		[LanguageKeys.tr_TR]: 'Kalori',
		[LanguageKeys.zh_CN]: '卡路里'
	},
	nutrition_protein: {
		[LanguageKeys.de_DE]: 'Protein',
		[LanguageKeys.en_US]: 'Protein',
		[LanguageKeys.ar_SA]: 'بروتين',
		[LanguageKeys.es_ES]: 'Proteína',
		[LanguageKeys.fr_FR]: 'Protéine',
		[LanguageKeys.ru_RU]: 'Белок',
		[LanguageKeys.tr_TR]: 'Protein',
		[LanguageKeys.zh_CN]: '蛋白质'
	},
	nutrition_fat: {
		[LanguageKeys.de_DE]: 'Fett',
		[LanguageKeys.en_US]: 'Fat',
		[LanguageKeys.ar_SA]: 'سمين',
		[LanguageKeys.es_ES]: 'Grasa',
		[LanguageKeys.fr_FR]: 'Graisse',
		[LanguageKeys.ru_RU]: 'Жир',
		[LanguageKeys.tr_TR]: 'Yağ',
		[LanguageKeys.zh_CN]: '脂肪'
	},
	nutrition_carbohydrate: {
		[LanguageKeys.de_DE]: 'Kohlenhydrate',
		[LanguageKeys.en_US]: 'Carbohydrates',
		[LanguageKeys.ar_SA]: 'الكربوهيدرات',
		[LanguageKeys.es_ES]: 'Carbohidratos',
		[LanguageKeys.fr_FR]: 'Glucides',
		[LanguageKeys.ru_RU]: 'Углеводы',
		[LanguageKeys.tr_TR]: 'Karbonhidratlar',
		[LanguageKeys.zh_CN]: '碳水化合物'
	},
	nutrition_fiber: {
		[LanguageKeys.de_DE]: 'Ballaststoffe',
		[LanguageKeys.en_US]: 'Fiber',
		[LanguageKeys.ar_SA]: 'الألياف',
		[LanguageKeys.es_ES]: 'Fibra',
		[LanguageKeys.fr_FR]: 'Fibre',
		[LanguageKeys.ru_RU]: 'Клетчатка',
		[LanguageKeys.tr_TR]: 'Lif',
		[LanguageKeys.zh_CN]: '纤维'
	},
	nutrition_sugar: {
		[LanguageKeys.de_DE]: 'Zucker',
		[LanguageKeys.en_US]: 'Sugar',
		[LanguageKeys.ar_SA]: 'سكر',
		[LanguageKeys.es_ES]: 'Azúcar',
		[LanguageKeys.fr_FR]: 'Sucre',
		[LanguageKeys.ru_RU]: 'Сахар',
		[LanguageKeys.tr_TR]: 'Şeker',
		[LanguageKeys.zh_CN]: '糖'
	},
	nutrition_sodium: {
		[LanguageKeys.de_DE]: 'Natrium',
		[LanguageKeys.en_US]: 'Sodium',
		[LanguageKeys.ar_SA]: 'صوديوم',
		[LanguageKeys.es_ES]: 'Sodio',
		[LanguageKeys.fr_FR]: 'Sodium',
		[LanguageKeys.ru_RU]: 'Натрий',
		[LanguageKeys.tr_TR]: 'Sodyum',
		[LanguageKeys.zh_CN]: '钠'
	},
	nutrition_saturated_fat: {
		[LanguageKeys.de_DE]: 'Gesättigte Fettsäuren',
		[LanguageKeys.en_US]: 'Saturated Fat',
		[LanguageKeys.ar_SA]: 'الدهون المشبعة',
		[LanguageKeys.es_ES]: 'Grasa saturada',
		[LanguageKeys.fr_FR]: 'Graisse saturée',
		[LanguageKeys.ru_RU]: 'Насыщенные жиры',
		[LanguageKeys.tr_TR]: 'Doymuş Yağ',
		[LanguageKeys.zh_CN]: '饱和脂肪'
	},
	about_us: {
		[LanguageKeys.de_DE]: 'Über uns',
		[LanguageKeys.en_US]: 'About Us',
		[LanguageKeys.ar_SA]: 'معلومات عنا',
		[LanguageKeys.es_ES]: 'Sobre nosotros',
		[LanguageKeys.fr_FR]: 'À propos de nous',
		[LanguageKeys.ru_RU]: 'О нас',
		[LanguageKeys.tr_TR]: 'Hakkımızda',
		[LanguageKeys.zh_CN]: '关于我们'
	},
	license: {
		[LanguageKeys.de_DE]: 'Lizenz',
		[LanguageKeys.en_US]: 'License',
		[LanguageKeys.ar_SA]: 'رخصة',
		[LanguageKeys.es_ES]: 'Licencia',
		[LanguageKeys.fr_FR]: 'Licence',
		[LanguageKeys.ru_RU]: 'Лицензия',
		[LanguageKeys.tr_TR]: 'Lisans',
		[LanguageKeys.zh_CN]: '许可证'
	},
	accessibility: {
		[LanguageKeys.de_DE]: 'Barrierefreiheit',
		[LanguageKeys.en_US]: 'Accessibility',
		[LanguageKeys.ar_SA]: 'إمكانية الوصول',
		[LanguageKeys.es_ES]: 'Accesibilidad',
		[LanguageKeys.fr_FR]: 'Accessibilité',
		[LanguageKeys.ru_RU]: 'Доступность',
		[LanguageKeys.tr_TR]: 'Erişilebilirlik',
		[LanguageKeys.zh_CN]: '无障碍'
	},
	cookie_policy: {
		[LanguageKeys.de_DE]: 'Cookie-Richtlinie',
		[LanguageKeys.en_US]: 'Cookie Policy',
		[LanguageKeys.ar_SA]: 'سياسة ملفات تعريف الارتباط',
		[LanguageKeys.es_ES]: 'Política de cookies',
		[LanguageKeys.fr_FR]: 'Politique de cookies',
		[LanguageKeys.ru_RU]: 'Политика использования файлов cookie',
		[LanguageKeys.tr_TR]: 'Çerez Politikası',
		[LanguageKeys.zh_CN]: 'Cookie 政策'
	},
	privacy_policy: {
		[LanguageKeys.de_DE]: 'Datenschutzrichtlinie',
		[LanguageKeys.en_US]: 'Privacy Policy',
		[LanguageKeys.ar_SA]: 'سياسة الخصوصية',
		[LanguageKeys.es_ES]: 'Política de privacidad',
		[LanguageKeys.fr_FR]: 'Politique de confidentialité',
		[LanguageKeys.ru_RU]: 'Политика конфиденциальности',
		[LanguageKeys.tr_TR]: 'Gizlilik Politikası',
		[LanguageKeys.zh_CN]: '隐私政策'
	},
	okay: {
		[LanguageKeys.de_DE]: 'Okay',
		[LanguageKeys.en_US]: 'Okay',
		[LanguageKeys.ar_SA]: 'حسنا',
		[LanguageKeys.es_ES]: 'Está bien',
		[LanguageKeys.fr_FR]: 'D\'accord',
		[LanguageKeys.ru_RU]: 'Окей',
		[LanguageKeys.tr_TR]: 'Tamam',
		[LanguageKeys.zh_CN]: '好的'
	},
	currently_logged_in_as: {
		[LanguageKeys.de_DE]: 'Derzeit angemeldet als',
		[LanguageKeys.en_US]: 'Currently logged in as',
		[LanguageKeys.ar_SA]: 'مسجل الدخول حاليًا كـ',
		[LanguageKeys.es_ES]: 'Actualmente registrado como',
		[LanguageKeys.fr_FR]: 'Actuellement connecté en tant que',
		[LanguageKeys.ru_RU]: 'В данный момент вы вошли как',
		[LanguageKeys.tr_TR]: 'Şu anda olarak giriş yaptınız',
		[LanguageKeys.zh_CN]: '当前登录身份是'
	},
	if_you_want_to_login_with_this_account_please_press: {
		[LanguageKeys.de_DE]: 'Wenn Sie sich mit diesem Konto anmelden möchten, drücken Sie bitte',
		[LanguageKeys.en_US]: 'If you want to log in with this account, please press',
		[LanguageKeys.ar_SA]: 'إذا كنت تريد تسجيل الدخول بهذا الحساب ، يرجى الضغط',
		[LanguageKeys.es_ES]: 'Si desea iniciar sesión con esta cuenta, por favor presione',
		[LanguageKeys.fr_FR]: 'Si vous voulez vous connecter avec ce compte, veuillez appuyer sur',
		[LanguageKeys.ru_RU]: 'Если вы хотите войти в систему с этой учетной записью, нажмите, пожалуйста',
		[LanguageKeys.tr_TR]: 'Bu hesapla giriş yapmak istiyorsanız, lütfen basın',
		[LanguageKeys.zh_CN]: '如果您想使用此帐户登录，请按'
	},
	logout: {
		[LanguageKeys.de_DE]: 'Abmelden',
		[LanguageKeys.en_US]: 'Logout',
		[LanguageKeys.ar_SA]: 'تسجيل خروج',
		[LanguageKeys.es_ES]: 'Cerrar sesión',
		[LanguageKeys.fr_FR]: 'Se déconnecter',
		[LanguageKeys.ru_RU]: 'Выйти',
		[LanguageKeys.tr_TR]: 'Çıkış Yap',
		[LanguageKeys.zh_CN]: '登出'
	},
	register: {
		[LanguageKeys.de_DE]: 'Registrieren',
		[LanguageKeys.en_US]: 'Register',
		[LanguageKeys.ar_SA]: 'تسجيل',
		[LanguageKeys.es_ES]: 'Registrar',
		[LanguageKeys.fr_FR]: 'S\'inscrire',
		[LanguageKeys.ru_RU]: 'Регистрация',
		[LanguageKeys.tr_TR]: 'Kayıt Ol',
		[LanguageKeys.zh_CN]: '注册'
	},
	sign_in: {
		[LanguageKeys.de_DE]: 'Anmelden',
		[LanguageKeys.en_US]: 'Sign In',
		[LanguageKeys.ar_SA]: 'تسجيل الدخول',
		[LanguageKeys.es_ES]: 'Iniciar sesión',
		[LanguageKeys.fr_FR]: 'Se connecter',
		[LanguageKeys.ru_RU]: 'Войти',
		[LanguageKeys.tr_TR]: 'Giriş Yap',
		[LanguageKeys.zh_CN]: '登录'
	},
	continue: {
		[LanguageKeys.de_DE]: 'Fortsetzen',
		[LanguageKeys.en_US]: 'Continue',
		[LanguageKeys.ar_SA]: 'استمر',
		[LanguageKeys.es_ES]: 'Continuar',
		[LanguageKeys.fr_FR]: 'Continuer',
		[LanguageKeys.ru_RU]: 'Продолжить',
		[LanguageKeys.tr_TR]: 'Devam et',
		[LanguageKeys.zh_CN]: '继续'
	},
	navigate_to: {
		[LanguageKeys.de_DE]: 'Navigieren zu',
		[LanguageKeys.en_US]: 'Navigate to',
		[LanguageKeys.ar_SA]: 'التنقل إلى',
		[LanguageKeys.es_ES]: 'Navegar a',
		[LanguageKeys.fr_FR]: 'Aller à',
		[LanguageKeys.ru_RU]: 'Перейти к',
		[LanguageKeys.tr_TR]: 'Gezinmek için',
		[LanguageKeys.zh_CN]: '导航到'
	},
	open_drawer: {
		[LanguageKeys.de_DE]: "Seitenmenü öffnen",
		[LanguageKeys.en_US]: "Open side menu",
		[LanguageKeys.ar_SA]: "افتح القائمة الجانبية",
		[LanguageKeys.es_ES]: "Abrir menú lateral",
		[LanguageKeys.fr_FR]: "Ouvrir le menu latéral",
		[LanguageKeys.ru_RU]: "Открыть боковое меню",
		[LanguageKeys.tr_TR]: "Yan menüyü aç",
		[LanguageKeys.zh_CN]: "打开侧边菜单"
	},
	navigate_back: {
		[LanguageKeys.de_DE]: 'Zurück navigieren',
		[LanguageKeys.en_US]: 'Navigate back',
		[LanguageKeys.ar_SA]: 'انتقل إلى الوراء',
		[LanguageKeys.es_ES]: 'Navegar hacia atrás',
		[LanguageKeys.fr_FR]: 'Naviguer en arrière',
		[LanguageKeys.ru_RU]: 'Навигация назад',
		[LanguageKeys.tr_TR]: 'Geriye git',
		[LanguageKeys.zh_CN]: '导航回'
	},
	canteen: {
		[LanguageKeys.de_DE]: 'Mensa',
		[LanguageKeys.en_US]: 'Canteen',
		[LanguageKeys.ar_SA]: 'مقصف',
		[LanguageKeys.es_ES]: 'Cantina',
		[LanguageKeys.fr_FR]: 'Cantine',
		[LanguageKeys.ru_RU]: 'Столовая',
		[LanguageKeys.tr_TR]: 'Yemekhane',
		[LanguageKeys.zh_CN]: '食堂'
	},
	map: {
		[LanguageKeys.de_DE]: 'Karte',
		[LanguageKeys.en_US]: 'Map',
		[LanguageKeys.ar_SA]: 'خريطة',
		[LanguageKeys.es_ES]: 'Mapa',
		[LanguageKeys.fr_FR]: 'Carte',
		[LanguageKeys.ru_RU]: 'Карта',
		[LanguageKeys.tr_TR]: 'Harita',
		[LanguageKeys.zh_CN]: '地图'
	},
	news: {
		[LanguageKeys.de_DE]: 'News',
		[LanguageKeys.en_US]: 'News',
		[LanguageKeys.ar_SA]: 'أخبار',
		[LanguageKeys.es_ES]: 'Noticias',
		[LanguageKeys.fr_FR]: 'Nouvelles',
		[LanguageKeys.ru_RU]: 'Новости',
		[LanguageKeys.tr_TR]: 'Haberler',
		[LanguageKeys.zh_CN]: '新闻'
	},
	read_more: {
		[LanguageKeys.de_DE]: 'Weiterlesen',
		[LanguageKeys.en_US]: 'Read more',
		[LanguageKeys.ar_SA]: 'اقرأ أكثر',
		[LanguageKeys.es_ES]: 'Leer más',
		[LanguageKeys.fr_FR]: 'Lire la suite',
		[LanguageKeys.ru_RU]: 'Читать далее',
		[LanguageKeys.tr_TR]: 'Daha fazla oku',
		[LanguageKeys.zh_CN]: '阅读更多'
	},
	course_timetable: {
		[LanguageKeys.de_DE]: 'Stundenplan',
		[LanguageKeys.en_US]: 'Course Timetable',
		[LanguageKeys.ar_SA]: 'الجدول الدراسي',
		[LanguageKeys.es_ES]: 'Horario del curso',
		[LanguageKeys.fr_FR]: 'Emploi du temps',
		[LanguageKeys.ru_RU]: 'Расписание курса',
		[LanguageKeys.tr_TR]: 'Ders Programı',
		[LanguageKeys.zh_CN]: '课程时间表'
	},
	eating_habits: {
		[LanguageKeys.de_DE]: 'Essgewohnheiten',
		[LanguageKeys.en_US]: 'Eating Habits',
		[LanguageKeys.ar_SA]: 'عادات الأكل',
		[LanguageKeys.es_ES]: 'Hábitos alimenticios',
		[LanguageKeys.fr_FR]: 'Habitudes alimentaires',
		[LanguageKeys.ru_RU]: 'Пищевые привычки',
		[LanguageKeys.tr_TR]: 'Yeme Alışkanlıkları',
		[LanguageKeys.zh_CN]: '饮食习惯'
	},
	markings: {
		[LanguageKeys.de_DE]: 'Kennzeichnungen',
		[LanguageKeys.en_US]: 'Labels',
		[LanguageKeys.ar_SA]: 'علامات',
		[LanguageKeys.es_ES]: 'Etiquetas',
		[LanguageKeys.fr_FR]: 'Étiquettes',
		[LanguageKeys.ru_RU]: 'Метки',
		[LanguageKeys.tr_TR]: 'Etiketler',
		[LanguageKeys.zh_CN]: '标签'
	},
	forecast: {
		[LanguageKeys.de_DE]: 'Vorhersage',
		[LanguageKeys.en_US]: 'Forecast',
		[LanguageKeys.ar_SA]: 'توقعات',
		[LanguageKeys.es_ES]: 'Pronóstico',
		[LanguageKeys.fr_FR]: 'Prévision',
		[LanguageKeys.ru_RU]: 'Прогноз',
		[LanguageKeys.tr_TR]: 'Tahmin',
		[LanguageKeys.zh_CN]: '预报'
	},
	utilization: {
		[LanguageKeys.de_DE]: 'Auslastung',
		[LanguageKeys.en_US]: 'Occupancy',
		[LanguageKeys.ar_SA]: 'الإشغال',
		[LanguageKeys.es_ES]: 'Ocupación',
		[LanguageKeys.fr_FR]: 'Occupation',
		[LanguageKeys.ru_RU]: 'Заполнение',
		[LanguageKeys.tr_TR]: 'Doluluk',
		[LanguageKeys.zh_CN]: '占用'
	},
	opens_at: {
		[LanguageKeys.de_DE]: 'Öffnet um',
		[LanguageKeys.en_US]: 'Opens at',
		[LanguageKeys.ar_SA]: 'يفتح عند',
		[LanguageKeys.es_ES]: 'Abre a las',
		[LanguageKeys.fr_FR]: 'Ouvre à',
		[LanguageKeys.ru_RU]: 'Открывается в',
		[LanguageKeys.tr_TR]: 'Şu saatte açılıyor',
		[LanguageKeys.zh_CN]: '开放时间'
	},
	closed_after: {
		[LanguageKeys.de_DE]: 'Schließt um',
		[LanguageKeys.en_US]: 'Closed after',
		[LanguageKeys.ar_SA]: 'مغلق بعد',
		[LanguageKeys.es_ES]: 'Cerrado después de',
		[LanguageKeys.fr_FR]: 'Fermé après',
		[LanguageKeys.ru_RU]: 'Закрыто после',
		[LanguageKeys.tr_TR]: 'Sonra kapalı',
		[LanguageKeys.zh_CN]: '关闭时间'
	},
	food_details: {
		[LanguageKeys.de_DE]: 'Essensdetails',
		[LanguageKeys.en_US]: 'Food Details',
		[LanguageKeys.ar_SA]: 'تفاصيل الطعام',
		[LanguageKeys.es_ES]: 'Detalles de la comida',
		[LanguageKeys.fr_FR]: 'Détails des aliments',
		[LanguageKeys.ru_RU]: 'Детали еды',
		[LanguageKeys.tr_TR]: 'Yemek Detayları',
		[LanguageKeys.zh_CN]: '食物详情'
	},
	i_like_that: {
		[LanguageKeys.de_DE]: 'Das gefällt mir',
		[LanguageKeys.en_US]: 'I like that',
		[LanguageKeys.ar_SA]: 'أنا أحب ذلك',
		[LanguageKeys.es_ES]: 'Me gusta eso',
		[LanguageKeys.fr_FR]: 'J\'aime ça',
		[LanguageKeys.ru_RU]: 'Мне это нравится',
		[LanguageKeys.tr_TR]: 'Bunu beğendim',
		[LanguageKeys.zh_CN]: '我喜欢那个'
	},
	i_dislike_that: {
		[LanguageKeys.de_DE]: 'Das gefällt mir nicht',
		[LanguageKeys.en_US]: 'I dislike that',
		[LanguageKeys.ar_SA]: 'أنا لا أحب ذلك',
		[LanguageKeys.es_ES]: 'No me gusta eso',
		[LanguageKeys.fr_FR]: 'Je n\'aime pas ça',
		[LanguageKeys.ru_RU]: 'Мне это не нравится',
		[LanguageKeys.tr_TR]: 'Bunu beğenmedim',
		[LanguageKeys.zh_CN]: '我不喜欢那个'
	},
	like_status: {
		[LanguageKeys.de_DE]: 'Gefällt mir Status',
		[LanguageKeys.en_US]: 'Like Status',
		[LanguageKeys.ar_SA]: 'أحب الحالة',
		[LanguageKeys.es_ES]: 'Estado de gusto',
		[LanguageKeys.fr_FR]: 'Statut J\'aime',
		[LanguageKeys.ru_RU]: 'Статус "Нравится"',
		[LanguageKeys.tr_TR]: 'Beğenme Durumu',
		[LanguageKeys.zh_CN]: '喜欢状态'
	},
	show_login_for_management_with_email_and_password: {
		[LanguageKeys.de_DE]: 'Verwaltungs-Login mit E-Mail und Passwort anzeigen',
		[LanguageKeys.en_US]: 'Show management login with email and password',
		[LanguageKeys.ar_SA]: 'إظهار تسجيل الدخول للإدارة بالبريد الإلكتروني وكلمة المرور',
		[LanguageKeys.es_ES]: 'Mostrar inicio de sesión de administración con correo electrónico y contraseña',
		[LanguageKeys.fr_FR]: 'Afficher la connexion de gestion avec e-mail et mot de passe',
		[LanguageKeys.ru_RU]: 'Показать управление входом с электронной почтой и паролем',
		[LanguageKeys.tr_TR]: 'E-posta ve şifre ile yönetim girişini göster',
		[LanguageKeys.zh_CN]: '显示使用电子邮件和密码的管理登录'
	},
	email: {
		[LanguageKeys.de_DE]: 'E-Mail',
		[LanguageKeys.en_US]: 'Email',
		[LanguageKeys.ar_SA]: 'البريد الإلكتروني',
		[LanguageKeys.es_ES]: 'Correo electrónico',
		[LanguageKeys.fr_FR]: 'E-mail',
		[LanguageKeys.ru_RU]: 'Эл. адрес',
		[LanguageKeys.tr_TR]: 'E-posta',
		[LanguageKeys.zh_CN]: '电子邮件'
	},
	password: {
		[LanguageKeys.de_DE]: 'Passwort',
		[LanguageKeys.en_US]: 'Password',
		[LanguageKeys.ar_SA]: 'كلمة المرور',
		[LanguageKeys.es_ES]: 'Contraseña',
		[LanguageKeys.fr_FR]: 'Mot de passe',
		[LanguageKeys.ru_RU]: 'Пароль',
		[LanguageKeys.tr_TR]: 'Şifre',
		[LanguageKeys.zh_CN]: '密码'
	},
	show: {
		[LanguageKeys.de_DE]: 'Anzeigen',
		[LanguageKeys.en_US]: 'Show',
		[LanguageKeys.ar_SA]: 'إظهار',
		[LanguageKeys.es_ES]: 'Mostrar',
		[LanguageKeys.fr_FR]: 'Afficher',
		[LanguageKeys.ru_RU]: 'Показать',
		[LanguageKeys.tr_TR]: 'Göster',
		[LanguageKeys.zh_CN]: '显示'
	},
	hide: {
		[LanguageKeys.de_DE]: 'Verbergen',
		[LanguageKeys.en_US]: 'Hide',
		[LanguageKeys.ar_SA]: 'إخفاء',
		[LanguageKeys.es_ES]: 'Ocultar',
		[LanguageKeys.fr_FR]: 'Cacher',
		[LanguageKeys.ru_RU]: 'Скрыть',
		[LanguageKeys.tr_TR]: 'Gizle',
		[LanguageKeys.zh_CN]: '隐藏'
	},
	continue_without_account: {
		[LanguageKeys.de_DE]: 'Ohne Account fortfahren',
		[LanguageKeys.en_US]: 'Continue without account',
		[LanguageKeys.ar_SA]: 'المتابعة بدون حساب',
		[LanguageKeys.es_ES]: 'Continuar sin cuenta',
		[LanguageKeys.fr_FR]: 'Continuer sans compte',
		[LanguageKeys.ru_RU]: 'Продолжить без аккаунта',
		[LanguageKeys.tr_TR]: 'Hesap olmadan devam et',
		[LanguageKeys.zh_CN]: '无需账户继续'
	},
	sign_in_with: {
		[LanguageKeys.de_DE]: 'Anmelden mit',
		[LanguageKeys.en_US]: 'Sign in with',
		[LanguageKeys.ar_SA]: 'تسجيل الدخول مع',
		[LanguageKeys.es_ES]: 'Iniciar sesión con',
		[LanguageKeys.fr_FR]: 'Se connecter avec',
		[LanguageKeys.ru_RU]: 'Войти с помощью',
		[LanguageKeys.tr_TR]: 'İle giriş yap',
		[LanguageKeys.zh_CN]: '使用登录'
	},
	home: {
		[LanguageKeys.de_DE]: 'Startseite',
		[LanguageKeys.en_US]: 'Home',
		[LanguageKeys.ar_SA]: 'الصفحة الرئيسية',
		[LanguageKeys.es_ES]: 'Inicio',
		[LanguageKeys.fr_FR]: 'Accueil',
		[LanguageKeys.ru_RU]: 'Главная',
		[LanguageKeys.tr_TR]: 'Ana Sayfa',
		[LanguageKeys.zh_CN]: '主页'
	},
	canteens: {
		[LanguageKeys.de_DE]: 'Mensen',
		[LanguageKeys.en_US]: 'Canteens',
		[LanguageKeys.ar_SA]: 'مقاصف',
		[LanguageKeys.es_ES]: 'Cantinas',
		[LanguageKeys.fr_FR]: 'Cantines',
		[LanguageKeys.ru_RU]: 'Столовые',
		[LanguageKeys.tr_TR]: 'Yemekhaneler',
		[LanguageKeys.zh_CN]: '食堂'
	},
	buildings: {
		[LanguageKeys.de_DE]: 'Gebäude',
		[LanguageKeys.en_US]: 'Buildings',
		[LanguageKeys.ar_SA]: 'المباني',
		[LanguageKeys.es_ES]: 'Edificios',
		[LanguageKeys.fr_FR]: 'Bâtiments',
		[LanguageKeys.ru_RU]: 'Здания',
		[LanguageKeys.tr_TR]: 'Binalar',
		[LanguageKeys.zh_CN]: '建筑物'
	},
	campus: {
		[LanguageKeys.de_DE]: "Campus",
		[LanguageKeys.en_US]: "Campus",
		[LanguageKeys.ar_SA]: "حرم الجامعة",
		[LanguageKeys.es_ES]: "Instalaciones",
		[LanguageKeys.fr_FR]: "Campus",
		[LanguageKeys.ru_RU]: "Кампус",
		[LanguageKeys.tr_TR]: "Yerleşke",
		[LanguageKeys.zh_CN]: "校园"
	},
	housing: {
		[LanguageKeys.de_DE]: 'Wohnen',
		[LanguageKeys.en_US]: 'Housing',
		[LanguageKeys.ar_SA]: 'إسكان',
		[LanguageKeys.es_ES]: 'Vivienda',
		[LanguageKeys.fr_FR]: 'Logement',
		[LanguageKeys.ru_RU]: 'Жилье',
		[LanguageKeys.tr_TR]: 'Barınma',
		[LanguageKeys.zh_CN]: '住房'
	},
	settings: {
		[LanguageKeys.de_DE]: 'Einstellungen',
		[LanguageKeys.en_US]: 'Settings',
		[LanguageKeys.ar_SA]: 'الإعدادات',
		[LanguageKeys.es_ES]: 'Configuraciones',
		[LanguageKeys.fr_FR]: 'Paramètres',
		[LanguageKeys.ru_RU]: 'Настройки',
		[LanguageKeys.tr_TR]: 'Ayarlar',
		[LanguageKeys.zh_CN]: '设置'
	},
	switch: {
		[LanguageKeys.de_DE]: 'Wechseln',
		[LanguageKeys.en_US]: 'Switch',
		[LanguageKeys.ar_SA]: 'تبديل',
		[LanguageKeys.es_ES]: 'Cambiar',
		[LanguageKeys.fr_FR]: 'Changer',
		[LanguageKeys.ru_RU]: 'Переключить',
		[LanguageKeys.tr_TR]: 'Değiştir',
		[LanguageKeys.zh_CN]: '切换'
	},
	edit: {
		[LanguageKeys.de_DE]: 'Bearbeiten',
		[LanguageKeys.en_US]: 'Edit',
		[LanguageKeys.ar_SA]: 'تحرير',
		[LanguageKeys.es_ES]: 'Editar',
		[LanguageKeys.fr_FR]: 'Éditer',
		[LanguageKeys.ru_RU]: 'Редактировать',
		[LanguageKeys.tr_TR]: 'Düzenle',
		[LanguageKeys.zh_CN]: '编辑'
	},
	save: {
		[LanguageKeys.de_DE]: 'Speichern',
		[LanguageKeys.en_US]: 'Save',
		[LanguageKeys.ar_SA]: 'حفظ',
		[LanguageKeys.es_ES]: 'Guardar',
		[LanguageKeys.fr_FR]: 'Enregistrer',
		[LanguageKeys.ru_RU]: 'Сохранить',
		[LanguageKeys.tr_TR]: 'Kaydet',
		[LanguageKeys.zh_CN]: '保存'
	},
	to_update: {
		[LanguageKeys.de_DE]: 'Aktualisieren',
		[LanguageKeys.en_US]: 'To Update',
		[LanguageKeys.ar_SA]: 'لتحديث',
		[LanguageKeys.es_ES]: 'Actualizar',
		[LanguageKeys.fr_FR]: 'Mettre à jour',
		[LanguageKeys.ru_RU]: 'Обновить',
		[LanguageKeys.tr_TR]: 'Güncelle',
		[LanguageKeys.zh_CN]: '更新'
	},
	send: {
		[LanguageKeys.de_DE]: 'Senden',
		[LanguageKeys.en_US]: 'Send',
		[LanguageKeys.ar_SA]: 'إرسال',
		[LanguageKeys.es_ES]: 'Enviar',
		[LanguageKeys.fr_FR]: 'Envoyer',
		[LanguageKeys.ru_RU]: 'Отправить',
		[LanguageKeys.tr_TR]: 'Gönder',
		[LanguageKeys.zh_CN]: '发送'
	},
	button_disabled: {
		[LanguageKeys.de_DE]: 'Schaltfläche deaktiviert',
		[LanguageKeys.en_US]: 'Button Disabled',
		[LanguageKeys.ar_SA]: 'الزر معطل',
		[LanguageKeys.es_ES]: 'Botón desactivado',
		[LanguageKeys.fr_FR]: 'Bouton désactivé',
		[LanguageKeys.ru_RU]: 'Кнопка отключена',
		[LanguageKeys.tr_TR]: 'Düğme Devre Dışı',
		[LanguageKeys.zh_CN]: '按钮已禁用'
	},
	select: {
		[LanguageKeys.de_DE]: 'Auswählen',
		[LanguageKeys.en_US]: 'Select',
		[LanguageKeys.ar_SA]: 'اختار',
		[LanguageKeys.es_ES]: 'Seleccionar',
		[LanguageKeys.fr_FR]: 'Sélectionner',
		[LanguageKeys.ru_RU]: 'Выбрать',
		[LanguageKeys.tr_TR]: 'Seç',
		[LanguageKeys.zh_CN]: '选择'
	},
	upload: {
		[LanguageKeys.de_DE]: 'Hochladen',
		[LanguageKeys.en_US]: 'Upload',
		[LanguageKeys.ar_SA]: 'رفع',
		[LanguageKeys.es_ES]: 'Subir',
		[LanguageKeys.fr_FR]: 'Téléverser',
		[LanguageKeys.ru_RU]: 'Загрузить',
		[LanguageKeys.tr_TR]: 'Yükle',
		[LanguageKeys.zh_CN]: '上传'
	},
	is_loading: {
		[LanguageKeys.de_DE]: 'Lädt',
		[LanguageKeys.en_US]: 'Is Loading',
		[LanguageKeys.ar_SA]: 'جاري التحميل',
		[LanguageKeys.es_ES]: 'Cargando',
		[LanguageKeys.fr_FR]: 'Chargement',
		[LanguageKeys.ru_RU]: 'Загрузка',
		[LanguageKeys.tr_TR]: 'Yükleniyor',
		[LanguageKeys.zh_CN]: '正在加载'
	},
	camera: {
		[LanguageKeys.de_DE]: 'Kamera',
		[LanguageKeys.en_US]: 'Camera',
		[LanguageKeys.ar_SA]: 'كاميرا',
		[LanguageKeys.es_ES]: 'Cámara',
		[LanguageKeys.fr_FR]: 'Caméra',
		[LanguageKeys.ru_RU]: 'Камера',
		[LanguageKeys.tr_TR]: 'Kamera',
		[LanguageKeys.zh_CN]: '相机'
	},
	gallery: {
		[LanguageKeys.de_DE]: 'Galerie',
		[LanguageKeys.en_US]: 'Gallery',
		[LanguageKeys.ar_SA]: 'معرض الصور',
		[LanguageKeys.es_ES]: 'Galería',
		[LanguageKeys.fr_FR]: 'Galerie',
		[LanguageKeys.ru_RU]: 'Галерея',
		[LanguageKeys.tr_TR]: 'Galeri',
		[LanguageKeys.zh_CN]: '画廊'
	},
	image: {
		[LanguageKeys.de_DE]: 'Bild',
		[LanguageKeys.en_US]: 'Image',
		[LanguageKeys.ar_SA]: 'صورة',
		[LanguageKeys.es_ES]: 'Imagen',
		[LanguageKeys.fr_FR]: 'Image',
		[LanguageKeys.ru_RU]: 'Изображение',
		[LanguageKeys.tr_TR]: 'Görüntü',
		[LanguageKeys.zh_CN]: '图片'
	},
	language: {
		[LanguageKeys.de_DE]: 'Sprache',
		[LanguageKeys.en_US]: 'Language',
		[LanguageKeys.ar_SA]: 'لغة',
		[LanguageKeys.es_ES]: 'Idioma',
		[LanguageKeys.fr_FR]: 'Langue',
		[LanguageKeys.ru_RU]: 'Язык',
		[LanguageKeys.tr_TR]: 'Dil',
		[LanguageKeys.zh_CN]: '语言'
	},
	language_system: {
		[LanguageKeys.de_DE]: 'Systemsprache',
		[LanguageKeys.en_US]: 'System Language',
		[LanguageKeys.ar_SA]: 'لغة النظام',
		[LanguageKeys.es_ES]: 'Idioma del sistema',
		[LanguageKeys.fr_FR]: 'Langue du système',
		[LanguageKeys.ru_RU]: 'Язык системы',
		[LanguageKeys.tr_TR]: 'Sistem Dili',
		[LanguageKeys.zh_CN]: '系统语言'
	},
	drawer_config_position: {
		[LanguageKeys.de_DE]: 'Menüposition',
		[LanguageKeys.en_US]: 'Drawer Position',
		[LanguageKeys.ar_SA]: 'موقف القائمة',
		[LanguageKeys.es_ES]: 'Posición del cajón',
		[LanguageKeys.fr_FR]: 'Position du tiroir',
		[LanguageKeys.ru_RU]: 'Положение ящика',
		[LanguageKeys.tr_TR]: 'Çekmece Konumu',
		[LanguageKeys.zh_CN]: '抽屉位置'
	},
	drawer_config_position_left: {
		[LanguageKeys.de_DE]: 'Links',
		[LanguageKeys.en_US]: 'Left',
		[LanguageKeys.ar_SA]: 'يسار',
		[LanguageKeys.es_ES]: 'Izquierda',
		[LanguageKeys.fr_FR]: 'Gauche',
		[LanguageKeys.ru_RU]: 'Слева',
		[LanguageKeys.tr_TR]: 'Sol',
		[LanguageKeys.zh_CN]: '左'
	},
	drawer_config_position_right: {
		[LanguageKeys.de_DE]: 'Rechts',
		[LanguageKeys.en_US]: 'Right',
		[LanguageKeys.ar_SA]: 'حق',
		[LanguageKeys.es_ES]: 'Derecha',
		[LanguageKeys.fr_FR]: 'Droite',
		[LanguageKeys.ru_RU]: 'Справа',
		[LanguageKeys.tr_TR]: 'Sağ',
		[LanguageKeys.zh_CN]: '右'
	},
	drawer_config_position_system: {
		[LanguageKeys.de_DE]: 'System',
		[LanguageKeys.en_US]: 'System',
		[LanguageKeys.ar_SA]: 'نظام',
		[LanguageKeys.es_ES]: 'Sistema',
		[LanguageKeys.fr_FR]: 'Système',
		[LanguageKeys.ru_RU]: 'Система',
		[LanguageKeys.tr_TR]: 'Sistem',
		[LanguageKeys.zh_CN]: '系统'
	},
	first_day_of_week: {
		[LanguageKeys.de_DE]: 'Erster Tag der Woche',
		[LanguageKeys.en_US]: 'First Day of Week',
		[LanguageKeys.ar_SA]: 'أول يوم في الأسبوع',
		[LanguageKeys.es_ES]: 'Primer día de la semana',
		[LanguageKeys.fr_FR]: 'Premier jour de la semaine',
		[LanguageKeys.ru_RU]: 'Первый день недели',
		[LanguageKeys.tr_TR]: 'Haftanın İlk Günü',
		[LanguageKeys.zh_CN]: '一周的第一天'
	},
	first_day_of_week_system: {
		[LanguageKeys.de_DE]: 'System',
		[LanguageKeys.en_US]: 'System',
		[LanguageKeys.ar_SA]: 'نظام',
		[LanguageKeys.es_ES]: 'Sistema',
		[LanguageKeys.fr_FR]: 'Système',
		[LanguageKeys.ru_RU]: 'Система',
		[LanguageKeys.tr_TR]: 'Sistem',
		[LanguageKeys.zh_CN]: '系统'
	},
	color_scheme: {
		[LanguageKeys.de_DE]: 'Farbschema',
		[LanguageKeys.en_US]: 'Color Scheme',
		[LanguageKeys.ar_SA]: 'نظام الألوان',
		[LanguageKeys.es_ES]: 'Esquema de color',
		[LanguageKeys.fr_FR]: 'Schéma de couleurs',
		[LanguageKeys.ru_RU]: 'Цветовая схема',
		[LanguageKeys.tr_TR]: 'Renk Şeması',
		[LanguageKeys.zh_CN]: '颜色方案'
	},
	color_scheme_light: {
		[LanguageKeys.de_DE]: 'Hell',
		[LanguageKeys.en_US]: 'Light',
		[LanguageKeys.ar_SA]: 'فاتح',
		[LanguageKeys.es_ES]: 'Claro',
		[LanguageKeys.fr_FR]: 'Clair',
		[LanguageKeys.ru_RU]: 'Светлый',
		[LanguageKeys.tr_TR]: 'Açık',
		[LanguageKeys.zh_CN]: '浅色'
	},
	color_scheme_dark: {
		[LanguageKeys.de_DE]: 'Dunkel',
		[LanguageKeys.en_US]: 'Dark',
		[LanguageKeys.ar_SA]: 'داكن',
		[LanguageKeys.es_ES]: 'Oscuro',
		[LanguageKeys.fr_FR]: 'Sombre',
		[LanguageKeys.ru_RU]: 'Темный',
		[LanguageKeys.tr_TR]: 'Koyu',
		[LanguageKeys.zh_CN]: '深色'
	},
	color_scheme_system: {
		[LanguageKeys.de_DE]: 'System',
		[LanguageKeys.en_US]: 'System',
		[LanguageKeys.ar_SA]: 'نظام',
		[LanguageKeys.es_ES]: 'Sistema',
		[LanguageKeys.fr_FR]: 'Système',
		[LanguageKeys.ru_RU]: 'Система',
		[LanguageKeys.tr_TR]: 'Sistem',
		[LanguageKeys.zh_CN]: '系统'
	},
	by_continuing_you_agree_to_terms_and_conditions_and_privacy_policy: {
		[LanguageKeys.de_DE]: 'Durch die Fortsetzung stimmst du den Allgemeinen Geschäftsbedingungen und der Datenschutzerklärung zu.',
		[LanguageKeys.en_US]: 'By continuing, you agree to the terms and conditions and privacy policy.',
		[LanguageKeys.ar_SA]: 'بالمتابعة، فإنك توافق على الشروط والأحكام وسياسة الخصوصية.',
		[LanguageKeys.es_ES]: 'Al continuar, aceptas los términos y condiciones y la política de privacidad.',
		[LanguageKeys.fr_FR]: 'En continuant, vous acceptez les termes et conditions et la politique de confidentialité.',
		[LanguageKeys.ru_RU]: 'Продолжая, вы соглашаетесь с условиями и политикой конфиденциальности.',
		[LanguageKeys.tr_TR]: 'Devam ederek, şartlar ve koşullar ile gizlilik politikasını kabul etmiş olursunuz.',
		[LanguageKeys.zh_CN]: '继续，即表示您同意条款和条件以及隐私政策。'
	},
	cookies: {
		[LanguageKeys.de_DE]: 'Cookies',
		[LanguageKeys.en_US]: 'Cookies',
		[LanguageKeys.ar_SA]: 'ملفات تعريف الارتباط',
		[LanguageKeys.es_ES]: 'Cookies',
		[LanguageKeys.fr_FR]: 'Cookies',
		[LanguageKeys.ru_RU]: 'Cookies',
		[LanguageKeys.tr_TR]: 'Çerezler',
		[LanguageKeys.zh_CN]: 'Cookies'
	},
	feedback: {
		[LanguageKeys.de_DE]: 'Feedback',
		[LanguageKeys.en_US]: 'Feedback',
		[LanguageKeys.ar_SA]: 'ردود الفعل',
		[LanguageKeys.es_ES]: 'Retroalimentación',
		[LanguageKeys.fr_FR]: 'Retour d\'information',
		[LanguageKeys.ru_RU]: 'Обратная связь',
		[LanguageKeys.tr_TR]: 'Geri bildirim',
		[LanguageKeys.zh_CN]: '反馈'
	},
	feedback_support_faq: {
		[LanguageKeys.de_DE]: 'Support & FAQ',
		[LanguageKeys.en_US]: 'Support & FAQ',
		[LanguageKeys.ar_SA]: 'الدعم والأسئلة الشائعة',
		[LanguageKeys.es_ES]: 'Soporte y preguntas frecuentes',
		[LanguageKeys.fr_FR]: 'Support et FAQ',
		[LanguageKeys.ru_RU]: 'Поддержка и часто задаваемые вопросы',
		[LanguageKeys.tr_TR]: 'Destek ve SSS',
		[LanguageKeys.zh_CN]: '支持和常见问题解答'
	},
	optional: {
		[LanguageKeys.de_DE]: 'Optional',
		[LanguageKeys.en_US]: 'Optional',
		[LanguageKeys.ar_SA]: 'اختياري',
		[LanguageKeys.es_ES]: 'Opcional',
		[LanguageKeys.fr_FR]: 'Optionnel',
		[LanguageKeys.ru_RU]: 'По желанию',
		[LanguageKeys.tr_TR]: 'İsteğe bağlı',
		[LanguageKeys.zh_CN]: '可选'
	},
	date_created: {
		[LanguageKeys.de_DE]: 'Erstellungsdatum',
		[LanguageKeys.en_US]: 'Date Created',
		[LanguageKeys.ar_SA]: 'تاريخ الإنشاء',
		[LanguageKeys.es_ES]: 'Fecha de creación',
		[LanguageKeys.fr_FR]: 'Date de création',
		[LanguageKeys.ru_RU]: 'Дата создания',
		[LanguageKeys.tr_TR]: 'Oluşturulma Tarihi',
		[LanguageKeys.zh_CN]: '创建日期'
	},
	date_updated: {
		[LanguageKeys.de_DE]: 'Aktualisierungsdatum',
		[LanguageKeys.en_US]: 'Date Updated',
		[LanguageKeys.ar_SA]: 'تاريخ التحديث',
		[LanguageKeys.es_ES]: 'Fecha de actualización',
		[LanguageKeys.fr_FR]: 'Date de mise à jour',
		[LanguageKeys.ru_RU]: 'Дата обновления',
		[LanguageKeys.tr_TR]: 'Güncelleme Tarihi',
		[LanguageKeys.zh_CN]: '更新日期'
	}

} as const;

// TODO markings sind eigentlich Kennzeichnungen