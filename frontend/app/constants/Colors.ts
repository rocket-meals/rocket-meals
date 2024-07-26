const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export class AppAreaColors {
	static DEFAULT_PROJECT_COLOR: string = "#D14610";
	static FOODS_COLOR: string | undefined = "#DD0000";
	static CAMPUS_COLOR: string | undefined = "#00DD00";
	static HOUSING_COLOR: string | undefined = "#0000DD";
	static NEWS_COLOR: string | undefined = "#DDDD00";
}

export default {
	light: {
		text: '#000',
		background: '#fff',
		tint: tintColorLight,
		tabIconDefault: '#ccc',
		tabIconSelected: tintColorLight,
	},
	dark: {
		text: '#fff',
		background: '#000',
		tint: tintColorDark,
		tabIconDefault: '#ccc',
		tabIconSelected: tintColorDark,
	},
};
