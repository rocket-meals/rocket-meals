/**
 * backendTranslations.ts – the texts for the backend-only keys of {@link BackendTranslationKeys}.
 *
 * Only keys that no app would ever show belong here. Everything generic (`Ja`, `Heute`, `Fehler`,
 * weekdays, months, …) comes from `commonTranslations` in `repo-depkit-common` and must not be
 * repeated – `BackendTranslations.test.ts` fails on a duplicate as well as on a missing language.
 *
 * Every key carries a non-empty text in **all** `ALL_TRANSLATION_LANGUAGES`, because a user with
 * an Arabic profile gets an Arabic push notification, not a German one with an Arabic fallback.
 */

import type { TranslationResources } from 'repo-depkit-common';

export const backendTranslations: TranslationResources = {
  /** Überschrift des Anhangs im Formular-PDF, unter dem die hochgeladenen Fotos stehen. */
  form_pdf_attachments: {
    de: 'Anhänge',
    en: 'Attachments',
    ar: 'المرفقات',
    es: 'Anexos',
    fr: 'Pièces jointes',
    ru: 'Приложения',
    tr: 'Ekler',
    zh: '附件',
  },

  /** Fußzeile des Formular-PDFs. `{{date}}` ist der Zeitpunkt, zu dem das PDF entstanden ist. */
  form_pdf_generated_at: {
    de: 'Erstellt am {{date}}',
    en: 'Created on {{date}}',
    ar: 'أُنشئ في {{date}}',
    es: 'Creado el {{date}}',
    fr: 'Créé le {{date}}',
    ru: 'Создано {{date}}',
    tr: '{{date}} tarihinde oluşturuldu',
    zh: '创建于 {{date}}',
  },

  /**
   * Prüfsumme in der Fußzeile des Formular-PDFs. Sie belegt, dass zwei Ausdrucke desselben
   * Formulars denselben Inhalt haben. `{{hash}}` ist der Hash über die Antworten.
   */
  form_pdf_checksum: {
    de: 'Prüfsumme: {{hash}}',
    en: 'Checksum: {{hash}}',
    ar: 'المجموع الاختباري: {{hash}}',
    es: 'Suma de verificación: {{hash}}',
    fr: 'Somme de contrôle : {{hash}}',
    ru: 'Контрольная сумма: {{hash}}',
    tr: 'Sağlama toplamı: {{hash}}',
    zh: '校验和：{{hash}}',
  },

  /** Seitenzahl in der Fußzeile des Formular-PDFs. */
  form_pdf_page: {
    de: 'Seite {{page}} von {{pages}}',
    en: 'Page {{page}} of {{pages}}',
    ar: 'صفحة {{page}} من {{pages}}',
    es: 'Página {{page}} de {{pages}}',
    fr: 'Page {{page}} sur {{pages}}',
    ru: 'Страница {{page}} из {{pages}}',
    tr: 'Sayfa {{page}} / {{pages}}',
    zh: '第 {{page}} 页，共 {{pages}} 页',
  },

  /**
   * Body of the "your meal is served soon" push notification.
   * `{{date}}` is a day the user recognises ("Morgen", "24.08.2026"), `{{food}}` the meal name.
   */
  notification_foodoffer_body: {
    de: '{{date}}: {{food}}',
    en: '{{date}}: {{food}}',
    ar: '{{date}}: {{food}}',
    es: '{{date}}: {{food}}',
    fr: '{{date}} : {{food}}',
    ru: '{{date}}: {{food}}',
    tr: '{{date}}: {{food}}',
    zh: '{{date}}：{{food}}',
  },

  /** Used as `{{food}}` when the meal has no name in any language the user could read. */
  notification_foodoffer_unknown_food: {
    de: 'ein Gericht',
    en: 'a meal',
    ar: 'وجبة',
    es: 'un plato',
    fr: 'un plat',
    ru: 'блюдо',
    tr: 'bir yemek',
    zh: '一道菜',
  },

  /**
   * Rejection of a change to a dashboard that is shipped with Rocket Meals.
   * `{{marker}}` is the name marker from `DashboardNameHelper.SYSTEM_NAME_MARKER`, so the text
   * never restates the marker as a literal.
   */
  dashboard_system_edit_forbidden: {
    de: 'Dieses Dashboard ist ein System-Dashboard (Kennzeichnung "{{marker}}" im Namen). System-Dashboards werden bei jedem Update zurückgesetzt und dürfen deshalb nicht bearbeitet werden. Bitte lege für eigene Auswertungen ein neues Dashboard an.',
    en: 'This dashboard is a system dashboard (marked with "{{marker}}" in its name). System dashboards are reset with every update and therefore cannot be edited. Please create a new dashboard for your own reports.',
    ar: 'هذه لوحة معلومات نظام (يُشار إليها بـ "{{marker}}" في الاسم). تتم إعادة ضبط لوحات معلومات النظام مع كل تحديث، ولذلك لا يمكن تعديلها. يرجى إنشاء لوحة معلومات جديدة لتقاريرك الخاصة.',
    es: 'Este panel es un panel del sistema (identificado con "{{marker}}" en el nombre). Los paneles del sistema se restablecen con cada actualización y por eso no se pueden editar. Crea un panel nuevo para tus propios análisis.',
    fr: 'Ce tableau de bord est un tableau de bord système (identifié par « {{marker}} » dans son nom). Les tableaux de bord système sont réinitialisés à chaque mise à jour et ne peuvent donc pas être modifiés. Veuillez créer un nouveau tableau de bord pour vos propres analyses.',
    ru: 'Это системная панель (обозначена «{{marker}}» в названии). Системные панели сбрасываются при каждом обновлении, поэтому их нельзя редактировать. Пожалуйста, создайте новую панель для собственных отчётов.',
    tr: 'Bu pano bir sistem panosudur (adında "{{marker}}" ile işaretlenmiştir). Sistem panoları her güncellemede sıfırlanır ve bu nedenle düzenlenemez. Kendi değerlendirmeleriniz için lütfen yeni bir pano oluşturun.',
    zh: '这是系统仪表板（名称中标有"{{marker}}"）。系统仪表板会在每次更新时被重置，因此无法编辑。请为自己的分析新建一个仪表板。',
  },

  /** Rejection of a change to a panel that belongs to a shipped dashboard. */
  dashboard_system_panel_edit_forbidden: {
    de: 'Dieses Panel gehört zu einem System-Dashboard (Kennzeichnung "{{marker}}" im Namen). System-Dashboards werden bei jedem Update zurückgesetzt und dürfen deshalb nicht bearbeitet werden. Bitte lege für eigene Auswertungen ein neues Dashboard an.',
    en: 'This panel belongs to a system dashboard (marked with "{{marker}}" in its name). System dashboards are reset with every update and therefore cannot be edited. Please create a new dashboard for your own reports.',
    ar: 'تنتمي هذه اللوحة إلى لوحة معلومات نظام (يُشار إليها بـ "{{marker}}" في الاسم). تتم إعادة ضبط لوحات معلومات النظام مع كل تحديث، ولذلك لا يمكن تعديلها. يرجى إنشاء لوحة معلومات جديدة لتقاريرك الخاصة.',
    es: 'Este panel pertenece a un panel del sistema (identificado con "{{marker}}" en el nombre). Los paneles del sistema se restablecen con cada actualización y por eso no se pueden editar. Crea un panel nuevo para tus propios análisis.',
    fr: 'Ce panneau appartient à un tableau de bord système (identifié par « {{marker}} » dans son nom). Les tableaux de bord système sont réinitialisés à chaque mise à jour et ne peuvent donc pas être modifiés. Veuillez créer un nouveau tableau de bord pour vos propres analyses.',
    ru: 'Эта панель относится к системной панели мониторинга (обозначена «{{marker}}» в названии). Системные панели сбрасываются при каждом обновлении, поэтому их нельзя редактировать. Пожалуйста, создайте новую панель для собственных отчётов.',
    tr: 'Bu bölme bir sistem panosuna aittir (adında "{{marker}}" ile işaretlenmiştir). Sistem panoları her güncellemede sıfırlanır ve bu nedenle düzenlenemez. Kendi değerlendirmeleriniz için lütfen yeni bir pano oluşturun.',
    zh: '此面板属于系统仪表板（名称中标有"{{marker}}"）。系统仪表板会在每次更新时被重置，因此无法编辑。请为自己的分析新建一个仪表板。',
  },

  /** Rejection of deleting a dashboard that is shipped with Rocket Meals. */
  dashboard_system_delete_forbidden: {
    de: 'Dieses Dashboard ist ein System-Dashboard (Kennzeichnung "{{marker}}" im Namen) und darf nicht gelöscht werden. System-Dashboards gehören zum Auslieferungsstand von Rocket Meals und werden bei jedem Update wieder angelegt.',
    en: 'This dashboard is a system dashboard (marked with "{{marker}}" in its name) and cannot be deleted. System dashboards are part of what Rocket Meals ships and are created again with every update.',
    ar: 'هذه لوحة معلومات نظام (يُشار إليها بـ "{{marker}}" في الاسم) ولا يمكن حذفها. لوحات معلومات النظام جزء من نسخة Rocket Meals ويُعاد إنشاؤها مع كل تحديث.',
    es: 'Este panel es un panel del sistema (identificado con "{{marker}}" en el nombre) y no se puede eliminar. Los paneles del sistema forman parte de la entrega de Rocket Meals y se vuelven a crear con cada actualización.',
    fr: 'Ce tableau de bord est un tableau de bord système (identifié par « {{marker}} » dans son nom) et ne peut pas être supprimé. Les tableaux de bord système font partie de la livraison de Rocket Meals et sont recréés à chaque mise à jour.',
    ru: 'Это системная панель (обозначена «{{marker}}» в названии), её нельзя удалить. Системные панели входят в поставку Rocket Meals и создаются заново при каждом обновлении.',
    tr: 'Bu pano bir sistem panosudur (adında "{{marker}}" ile işaretlenmiştir) ve silinemez. Sistem panoları Rocket Meals ile birlikte gelir ve her güncellemede yeniden oluşturulur.',
    zh: '这是系统仪表板（名称中标有"{{marker}}"），无法删除。系统仪表板属于 Rocket Meals 的交付内容，每次更新都会重新创建。',
  },

  /** Rejection of a name that would turn a dashboard into a system dashboard. */
  dashboard_system_marker_forbidden: {
    de: 'Die Kennzeichnung "{{marker}}" ist den mit Rocket Meals ausgelieferten Dashboards vorbehalten und kann nicht selbst vergeben werden. Bitte wähle einen Namen ohne diese Kennzeichnung - dein Dashboard wird automatisch mit dem Namen dieses Servers gekennzeichnet.',
    en: 'The marker "{{marker}}" is reserved for the dashboards shipped with Rocket Meals and cannot be set by hand. Please choose a name without it - your dashboard is marked with the name of this server automatically.',
    ar: 'العلامة "{{marker}}" مخصصة للوحات المعلومات المرفقة مع Rocket Meals ولا يمكن تعيينها يدويًا. يرجى اختيار اسم بدونها - سيتم وسم لوحتك تلقائيًا باسم هذا الخادم.',
    es: 'La marca "{{marker}}" está reservada a los paneles que se entregan con Rocket Meals y no se puede asignar manualmente. Elige un nombre sin ella: tu panel se marca automáticamente con el nombre de este servidor.',
    fr: 'Le marquage « {{marker}} » est réservé aux tableaux de bord livrés avec Rocket Meals et ne peut pas être attribué à la main. Veuillez choisir un nom sans ce marquage : votre tableau de bord est automatiquement marqué avec le nom de ce serveur.',
    ru: 'Обозначение «{{marker}}» зарезервировано за панелями из поставки Rocket Meals и не может быть задано вручную. Пожалуйста, выберите название без него — ваша панель автоматически получит обозначение этого сервера.',
    tr: '"{{marker}}" işareti Rocket Meals ile birlikte gelen panolara ayrılmıştır ve elle verilemez. Lütfen bu işareti içermeyen bir ad seçin - panonuz otomatik olarak bu sunucunun adıyla işaretlenir.',
    zh: '标记"{{marker}}"专用于 Rocket Meals 随附的仪表板，不能手动设置。请选择不含该标记的名称——你的仪表板会自动标上本服务器的名称。',
  },
};
