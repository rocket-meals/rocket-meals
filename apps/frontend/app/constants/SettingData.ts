//import flagUs from '@/assets/images/flags/us.svg';
//import flagTr from '@/assets/images/flags/tr.svg';
//import flagEs from '@/assets/images/flags/es.svg';
//import flagFr from '@/assets/images/flags/fr.svg';
//import flagDe from '@/assets/images/flags/de.svg';
//import flagCn from '@/assets/images/flags/cn.svg';
//import flagSa from '@/assets/images/flags/sa.svg';
//import flagRu from '@/assets/images/flags/ru.svg';
const flagUs = require('@/assets/images/flags/us.png');
const flagTr = require('@/assets/images/flags/tr.png');
const flagEs = require('@/assets/images/flags/es.png');
const flagFr = require('@/assets/images/flags/fr.png');
const flagDe = require('@/assets/images/flags/de.png');
const flagCn = require('@/assets/images/flags/cn.png');
const flagSa = require('@/assets/images/flags/sa.png');
const flagRu = require('@/assets/images/flags/ru.png');

// Themes
export const themes = [
	{ id: 'light', name: 'color_scheme_light', icon: 'white-balance-sunny' },
	{ id: 'dark', name: 'color_scheme_dark', icon: 'moon-waning-crescent' },
	{ id: 'systematic', name: 'color_scheme_system', icon: 'theme-light-dark' },
];

// Languages
export const languages = [
	{
		label: 'English',
		flag: flagUs,
		value: 'en',
	},
	{
		label: 'Turkish (Türkçe)',
		flag: flagTr,
		value: 'tr',
	},
	{
		label: 'Spanish (Español)',
		flag: flagEs,
		value: 'es',
	},
	{
		label: 'French (Français)',
		flag: flagFr,
		value: 'fr',
	},
	{
		label: 'German',
		flag: flagDe,
		value: 'de',
	},
	{
		label: 'Chinese (中文)',
		flag: flagCn,
		value: 'zh',
	},
	{
		label: 'Arabic (العربية)',
		flag: flagSa,
		value: 'ar',
	},
	{
		label: 'Russian (Русский)',
		flag: flagRu,
		value: 'ru',
	},
];

// Drawers
export const drawers = [
	{
		id: 'left',
		name: 'drawer_config_position_left',
		icon: 'format-horizontal-align-left',
	},
	{
		id: 'right',
		name: 'drawer_config_position_right',
		icon: 'format-horizontal-align-right',
	},
	{
		id: 'system',
		name: 'drawer_config_position_system',
		icon: 'format-horizontal-align-left',
	},
];

// Amount Column
export const AmountColumn = [
	{ id: 0, name: 'Automatic' },
	{ id: 1, name: '1' },
	{ id: 2, name: '2' },
	{ id: 3, name: '3' },
	{ id: 4, name: '4' },
	{ id: 5, name: '5' },
	{ id: 6, name: '6' },
	{ id: 7, name: '7' },
	{ id: 8, name: '8' },
	{ id: 9, name: '9' },
	{ id: 10, name: '10' },
];

// First day of the week
export const days = [
	{ id: 'monday', name: 'Mon' },
	{ id: 'tuesday', name: 'Tue' },
	{ id: 'wednesday', name: 'Wed' },
	{ id: 'thursday', name: 'Thu' },
	{ id: 'friday', name: 'Fri' },
	{ id: 'saturday', name: 'Sat' },
	{ id: 'sunday', name: 'Sun' },
];

export const daysData = [
	{ id: 'monday', name: 'Mon' },
	{ id: 'tuesday', name: 'Tue' },
	{ id: 'wednesday', name: 'Wed' },
	{ id: 'thursday', name: 'Thu' },
	{ id: 'friday', name: 'Fri' },
	{ id: 'saturday', name: 'Sat' },
	{ id: 'sunday', name: 'Sun' },
];
