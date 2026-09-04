import { FoodofferPriceHelper, PriceGroups, StringHelper } from 'repo-depkit-common';

const NBSP = StringHelper.NONBREAKING_SPACE;
const HALF_SPACE = StringHelper.NONBREAKING_HALF_SPACE;

const foodofferWithoutReference = {
	price_student: 1,
	price_employee: 2,
	price_guest: 3,
};

const pastaBuffet = {
	price_student: 0.4,
	price_employee: 0.9,
	price_guest: 1.28,
	price_reference_amount: 100,
	price_reference_unit: 'g',
};

describe('FoodofferPriceHelper.getPriceForPriceGroup', () => {
	it('returns the price of the requested price group', () => {
		expect(FoodofferPriceHelper.getPriceForPriceGroup(foodofferWithoutReference, PriceGroups.guest)).toBe(3);
		expect(FoodofferPriceHelper.getPriceForPriceGroup(foodofferWithoutReference, PriceGroups.employee)).toBe(2);
		expect(FoodofferPriceHelper.getPriceForPriceGroup(foodofferWithoutReference, PriceGroups.student)).toBe(1);
	});

	it('falls back to the student price for an unknown or missing price group', () => {
		expect(FoodofferPriceHelper.getPriceForPriceGroup(foodofferWithoutReference, undefined)).toBe(1);
		expect(FoodofferPriceHelper.getPriceForPriceGroup(foodofferWithoutReference, 'something-else')).toBe(1);
	});

	it('returns null for a missing price or a missing food offer', () => {
		expect(FoodofferPriceHelper.getPriceForPriceGroup({ price_student: null }, PriceGroups.student)).toBeNull();
		expect(FoodofferPriceHelper.getPriceForPriceGroup(null, PriceGroups.student)).toBeNull();
	});
});

describe('FoodofferPriceHelper.getPriceReference', () => {
	it('returns null when no unit is set, even when an amount is set', () => {
		expect(FoodofferPriceHelper.getPriceReference(foodofferWithoutReference)).toBeNull();
		expect(FoodofferPriceHelper.getPriceReference({ price_reference_amount: 100 })).toBeNull();
		expect(FoodofferPriceHelper.getPriceReference({ price_reference_unit: '   ' })).toBeNull();
	});

	it('defaults the amount to 1 when only a unit is set', () => {
		expect(FoodofferPriceHelper.getPriceReference({ price_reference_unit: 'Box' })).toEqual({ amount: 1, unit: 'Box' });
	});

	it('ignores an unusable amount', () => {
		expect(FoodofferPriceHelper.getPriceReference({ price_reference_amount: 0, price_reference_unit: 'g' })).toEqual({ amount: 1, unit: 'g' });
		expect(FoodofferPriceHelper.getPriceReference({ price_reference_amount: -5, price_reference_unit: 'g' })).toEqual({ amount: 1, unit: 'g' });
	});
});

describe('FoodofferPriceHelper.getPriceLabelForPriceGroup', () => {
	it('shows a plain price when the food offer has no price reference', () => {
		expect(FoodofferPriceHelper.getPriceLabelForPriceGroup(foodofferWithoutReference, PriceGroups.student)).toBe(`1,00${NBSP}€`);
	});

	it('shows a base price when the food offer has a price reference', () => {
		expect(FoodofferPriceHelper.getPriceLabelForPriceGroup(pastaBuffet, PriceGroups.student)).toBe(`0,40${NBSP}€/100${HALF_SPACE}g`);
		expect(FoodofferPriceHelper.getPriceLabelForPriceGroup(pastaBuffet, PriceGroups.guest)).toBe(`1,28${NBSP}€/100${HALF_SPACE}g`);
	});

	it('omits the amount when the price refers to a single unit', () => {
		const boxOffer = { price_student: 1, price_reference_amount: 1, price_reference_unit: 'Box' };
		expect(FoodofferPriceHelper.getPriceLabelForPriceGroup(boxOffer, PriceGroups.student)).toBe(`1,00${NBSP}€/Box`);
	});

	it('keeps the previous fallback for food offers without a price', () => {
		expect(FoodofferPriceHelper.getPriceLabelForPriceGroup({}, PriceGroups.student)).toBe(`0,00${NBSP}€`);
	});
});

describe('FoodofferPriceHelper.getPriceLabelForPriceGroups', () => {
	it('joins the price groups unchanged when there is no price reference', () => {
		expect(FoodofferPriceHelper.getPriceLabelForPriceGroups(foodofferWithoutReference)).toBe(`1,00${NBSP}€ / 2,00${NBSP}€ / 3,00${NBSP}€`);
	});

	it('brackets the price groups so the reference cannot be misread as a separator', () => {
		expect(FoodofferPriceHelper.getPriceLabelForPriceGroups(pastaBuffet)).toBe(`(0,40${NBSP}€ / 0,90${NBSP}€ / 1,28${NBSP}€)/100${HALF_SPACE}g`);
	});

	it('does not bracket a single price group', () => {
		expect(FoodofferPriceHelper.getPriceLabelForPriceGroups(pastaBuffet, [PriceGroups.student])).toBe(`0,40${NBSP}€/100${HALF_SPACE}g`);
	});
});

describe('FoodofferPriceHelper.parsePriceReference', () => {
	it('parses amount and unit written together or apart', () => {
		expect(FoodofferPriceHelper.parsePriceReference('100g')).toEqual({ amount: 100, unit: 'g' });
		expect(FoodofferPriceHelper.parsePriceReference('100 g')).toEqual({ amount: 100, unit: 'g' });
		expect(FoodofferPriceHelper.parsePriceReference('  100   g ')).toEqual({ amount: 100, unit: 'g' });
	});

	it('strips a leading "pro" / "per" / "je"', () => {
		expect(FoodofferPriceHelper.parsePriceReference('pro 100 g')).toEqual({ amount: 100, unit: 'g' });
		expect(FoodofferPriceHelper.parsePriceReference('per 100 g')).toEqual({ amount: 100, unit: 'g' });
		expect(FoodofferPriceHelper.parsePriceReference('je 100 g')).toEqual({ amount: 100, unit: 'g' });
	});

	it('maps long unit names to the short units of the Directus dropdown', () => {
		expect(FoodofferPriceHelper.parsePriceReference('100 Gramm')).toEqual({ amount: 100, unit: 'g' });
		expect(FoodofferPriceHelper.parsePriceReference('1 Kilogramm')).toEqual({ amount: 1, unit: 'kg' });
		expect(FoodofferPriceHelper.parsePriceReference('250 Milliliter')).toEqual({ amount: 250, unit: 'ml' });
	});

	it('keeps unknown units as written', () => {
		expect(FoodofferPriceHelper.parsePriceReference('Box')).toEqual({ amount: 1, unit: 'Box' });
		expect(FoodofferPriceHelper.parsePriceReference('2 Schalen')).toEqual({ amount: 2, unit: 'Schalen' });
	});

	it('accepts a decimal amount with comma or dot', () => {
		expect(FoodofferPriceHelper.parsePriceReference('0,5 l')).toEqual({ amount: 0.5, unit: 'l' });
		expect(FoodofferPriceHelper.parsePriceReference('0.5 l')).toEqual({ amount: 0.5, unit: 'l' });
	});

	it('returns null for empty values and for values without a unit', () => {
		expect(FoodofferPriceHelper.parsePriceReference('')).toBeNull();
		expect(FoodofferPriceHelper.parsePriceReference('   ')).toBeNull();
		expect(FoodofferPriceHelper.parsePriceReference(null)).toBeNull();
		expect(FoodofferPriceHelper.parsePriceReference(undefined)).toBeNull();
		expect(FoodofferPriceHelper.parsePriceReference('100')).toBeNull();
		expect(FoodofferPriceHelper.parsePriceReference('0 g')).toBeNull();
	});
});

describe('FoodofferPriceHelper.getPriceReferenceFieldsForParser', () => {
	it('returns an empty object without a reference, so the result hash stays unchanged', () => {
		expect(FoodofferPriceHelper.getPriceReferenceFieldsForParser(null)).toEqual({});
		expect(FoodofferPriceHelper.getPriceReferenceFieldsForParser('')).toEqual({});
		expect(Object.keys(FoodofferPriceHelper.getPriceReferenceFieldsForParser(undefined))).toHaveLength(0);
	});

	it('returns both database fields for a parsed reference', () => {
		expect(FoodofferPriceHelper.getPriceReferenceFieldsForParser('100g')).toEqual({
			price_reference_amount: 100,
			price_reference_unit: 'g',
		});
	});
});
