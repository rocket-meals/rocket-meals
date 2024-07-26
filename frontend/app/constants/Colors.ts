const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export class AppAreaColors {
	static DEFAULT_PROJECT_COLOR: string = "#D14610";
	static FOODS_COLOR: string | undefined = "#a9c436"; // https://www.studentenwerk-osnabrueck.de/de/essen.html
	static CAMPUS_COLOR: string | undefined = undefined;
	static HOUSING_COLOR: string | undefined = "#1aa378"; // https://www.studentenwerk-osnabrueck.de/de/wohnen.html
	static NEWS_COLOR: string | undefined = undefined;
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
