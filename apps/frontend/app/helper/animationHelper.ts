export const DEFAULT_COLOR_TO_BE_REPLACED = '#FF00FF';
export const DEFAULT_COLOR_LIGHTER_TO_BE_REPLACED = '#FFAAFF';
export const DEFAULT_COLOR_DARKER_TO_BE_REPLACED = '#DD00DD';
export const DEFAULT_COLOR_TO_REPLACE_WITH = '#D14610';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: null;
}

function rgbToHsl(
	r: number,
	g: number,
	b: number
): { h: number; s: number; l: number } {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0,
		s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}

	return { h, s, l };
}

function hslToRgb(
	h: number,
	s: number,
	l: number
): { r: number; g: number; b: number } {
	let r: number, g: number, b: number;

	if (s === 0) {
		r = g = b = l; // achromatic
	} else {
		const hue2rgb = (p: number, q: number, t: number): number => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255),
	};
}

function rgbToHex(r: number, g: number, b: number): string {
	return (
		'#' +
		((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
	);
}

export function getLighterAndDarkerColors(projectColor: string): {
	lighter: string;
	darker: string;
} {
	const rgb = hexToRgb(projectColor);
	if (!rgb) {
		console.error('Invalid project color provided:', projectColor);
		return { lighter: projectColor, darker: projectColor };
	}

	const { r, g, b } = rgb;
	const { h, s, l } = rgbToHsl(r, g, b);

	// Increase lightness: Add 30% of the remaining lightness (1 - l)
	const lighterL = Math.min(1, l + (1 - l) * 0.3);
	// Decrease lightness: Subtract 30% of l
	const darkerL = Math.max(0, l * 0.7);

	const lighterRgb = hslToRgb(h, s, lighterL);
	const darkerRgb = hslToRgb(h, s, darkerL);

	return {
		lighter: rgbToHex(lighterRgb.r, lighterRgb.g, lighterRgb.b),
		darker: rgbToHex(darkerRgb.r, darkerRgb.g, darkerRgb.b),
	};
}

export function replaceLottieColors(
	lottieJSON: any,
	primaryColor: string
): any {
	if (!lottieJSON || typeof lottieJSON !== 'object') {
		console.error('Invalid Lottie JSON provided.');
		return lottieJSON;
	}
	const { lighter, darker } = getLighterAndDarkerColors(primaryColor);

	const colorReplaceMap = {
		[DEFAULT_COLOR_TO_BE_REPLACED]: primaryColor,
		[DEFAULT_COLOR_LIGHTER_TO_BE_REPLACED]: lighter,
		[DEFAULT_COLOR_DARKER_TO_BE_REPLACED]: darker,
	};

	// Helper: Convert hex color to a Lottie-compatible normalized RGB array.
	function hexToLottieColor(hex: string): number[] {
		if (!hex || hex.length !== 7 || !hex.startsWith('#')) {
			console.error(`Invalid hex color: ${hex}`);
			return [0, 0, 0];
		}
		try {
			const r = (parseInt(hex.slice(1, 3), 16) / 255).toFixed(4);
			const g = (parseInt(hex.slice(3, 5), 16) / 255).toFixed(4);
			const b = (parseInt(hex.slice(5, 7), 16) / 255).toFixed(4);
			return [parseFloat(r), parseFloat(g), parseFloat(b)];
		} catch (error) {
			console.error(`Error converting hex to Lottie color: ${hex}`, error);
			return [0, 0, 0];
		}
	}

	// Build a mapping of the default Lottie colors (converted to a string key) to their replacement RGB arrays.
	const usedColorReplaceMapAfter: { [key: string]: number[] } = {};
	for (const defaultColor in colorReplaceMap) {
		// Ensure both the default and replacement colors are valid hex strings.
		if (
			/^#[0-9A-F]{6}$/i.test(defaultColor) &&
			/^#[0-9A-F]{6}$/i.test(colorReplaceMap[defaultColor])
		) {
			usedColorReplaceMapAfter[hexToLottieColor(defaultColor).toString()] =
				hexToLottieColor(colorReplaceMap[defaultColor]);
		}
	}

	// Recursively traverse the Lottie JSON and replace colors.
	function replaceColorsInLottie(
		obj: any,
		colorMap: { [key: string]: number[] }
	): any {
		if (Array.isArray(obj)) {
			return obj.map(item => replaceColorsInLottie(item, colorMap));
		} else if (typeof obj === 'object' && obj !== null) {
			for (const key in obj) {
				if (key === 'c') {
					// When key 'c' is found, check if its color (ignoring alpha) matches any default.
					if (obj[key].a === 0 && obj[key].k && colorMap[obj[key].k.toString()]) {
						// Replace while preserving the alpha channel if present.
						obj[key].k = [...colorMap[obj[key].k.toString()], obj[key].k[3] ?? 1];
					}
				} else {
					obj[key] = replaceColorsInLottie(obj[key], colorMap);
				}
			}
		}
		return obj;
	}

	// Validate basic Lottie JSON structure.
	if (!lottieJSON.layers || !Array.isArray(lottieJSON.layers)) {
		console.error('Invalid Lottie JSON structure: Missing layers.');
		return lottieJSON;
	}

	// Deep copy before modifying.
	const modifiedJSON = JSON.parse(JSON.stringify(lottieJSON));
	return replaceColorsInLottie(modifiedJSON, usedColorReplaceMapAfter);
}
