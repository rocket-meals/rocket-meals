export default class CardDimensionHelper {
	static getCardDimension(screenWidth: number): number {
		const dimensionMap = [
			{ min: 960, max: 1110, value: 300 },
			{ min: 750, max: 840, value: 350 },
			{ min: 710, max: 750, value: 330 },
			{ min: 650, max: 709, value: 300 },
			{ min: 570, max: Infinity, value: 260 },
			{ min: 530, max: Infinity, value: 240 },
			{ min: 500, max: Infinity, value: 220 },
			{ min: 450, max: Infinity, value: 210 },
			{ min: 380, max: Infinity, value: 180 },
			{ min: 360, max: Infinity, value: 170 },
			{ min: 340, max: Infinity, value: 160 },
			{ min: 320, max: Infinity, value: 150 },
			{ min: 300, max: Infinity, value: 140 },
			{ min: 280, max: Infinity, value: 130 },
		];

		for (const { min, max, value } of dimensionMap) {
			if (screenWidth > min && screenWidth < max) {
				return value;
			}
		}
		return 120;
	}

	static getCardWidth(screenWidth: number, columns: number): number {
		const offset = screenWidth < 500 ? 10 : screenWidth < 900 ? 25 : 35;
		return screenWidth / columns - offset;
	}

	static getNumColumns(screenWidth: number, columnsSetting: number): number {
		if (columnsSetting === 0) {
			const size = this.getCardDimension(screenWidth);
			return Math.max(1, Math.floor(screenWidth / size));
		}
		return columnsSetting;
	}
}
