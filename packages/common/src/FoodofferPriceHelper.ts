import { NumberHelper } from './NumberHelper';
import { StringHelper } from './StringHelper';

/**
 * FoodofferPriceHelper – builds the price labels shown on food offer cards and on the monitors.
 *
 * A food offer usually has a fixed price per dish ("1,20 €"). Offers that are sold by weight
 * (e.g. a pasta buffet) instead carry a *price reference* in `price_reference_amount` +
 * `price_reference_unit`, and their price has to be shown as a base price ("0,40 €/100 g").
 *
 * Notation used everywhere in the apps:
 *  - a slash **without** spaces means "per": `0,40 €/100 g`
 *  - a slash **with** spaces separates the price groups: `1,00 € / 2,00 € / 3,00 €`
 *  - both combined are disambiguated by brackets: `(0,40 € / 0,90 € / 1,28 €)/100 g`
 *
 * This is deliberately language independent, so the monitors do not need a translated
 * "per"/"pro" (which would also be word-order dependent in tr/zh).
 */

/** The price groups a food offer carries a price for. */
export const PriceGroups = {
  student: 'student',
  employee: 'employee',
  guest: 'guest',
} as const;
export type PriceGroupType = (typeof PriceGroups)[keyof typeof PriceGroups];

/** Order used whenever all price groups are shown next to each other. */
export const ALL_PRICE_GROUPS: readonly PriceGroupType[] = [PriceGroups.student, PriceGroups.employee, PriceGroups.guest];

/**
 * Structural subset of `DatabaseTypes.Foodoffers` this helper needs. Kept structural so the
 * loosely typed food offers coming from the redux store can be passed in as well.
 */
export type FoodofferPriceFields = {
  price_student?: number | null;
  price_employee?: number | null;
  price_guest?: number | null;
  price_reference_amount?: number | null;
  price_reference_unit?: string | null;
};

/** A validated price reference: "per `amount` `unit`", e.g. `{ amount: 100, unit: 'g' }`. */
export type PriceReference = {
  amount: number;
  unit: string;
};

export class FoodofferPriceHelper {
  static readonly CURRENCY_SYMBOL = '€';
  /** Separator between the prices of the different price groups. */
  static readonly PRICE_GROUP_SEPARATOR = ' / ';
  /** Price of the given price group, `null` when the offer has no price for it. */
  static getPriceForPriceGroup(foodoffer: FoodofferPriceFields | null | undefined, priceGroup: string | null | undefined): number | null {
    if (!foodoffer) {
      return null;
    }
    let price: number | null | undefined;
    if (priceGroup === PriceGroups.guest) {
      price = foodoffer.price_guest;
    } else if (priceGroup === PriceGroups.employee) {
      price = foodoffer.price_employee;
    } else {
      // students are the default, same as before this helper existed
      price = foodoffer.price_student;
    }
    return typeof price === 'number' && Number.isFinite(price) ? price : null;
  }

  /**
   * The price reference of a food offer, or `null` when it is priced per dish.
   *
   * The unit is the switch: without a unit an amount alone ("per 100 ...") has no meaning and
   * is ignored, so such offers keep the classic display. A missing or invalid amount falls
   * back to `1`, which covers references like "per box".
   */
  static getPriceReference(foodoffer: FoodofferPriceFields | null | undefined): PriceReference | null {
    const unit = typeof foodoffer?.price_reference_unit === 'string' ? foodoffer.price_reference_unit.trim() : '';
    if (!unit) {
      return null;
    }
    const rawAmount = foodoffer?.price_reference_amount;
    const amount = typeof rawAmount === 'number' && Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 1;
    return { amount, unit };
  }

  /** `1` -> `"1,00 €"`, `null` -> `"0,00 €"` (the fallback the apps showed before). */
  static formatPrice(price: number | null | undefined): string {
    return NumberHelper.formatNumber(price ?? 0, FoodofferPriceHelper.CURRENCY_SYMBOL, true, ',', '.', 2);
  }

  /** `{amount: 100, unit: 'g'}` -> `"100 g"`, `{amount: 1, unit: 'Box'}` -> `"Box"`. */
  static formatPriceReference(reference: PriceReference | null | undefined): string {
    if (!reference) {
      return '';
    }
    if (reference.amount === 1) {
      return reference.unit;
    }
    return FoodofferPriceHelper.formatReferenceAmount(reference.amount) + StringHelper.NONBREAKING_HALF_SPACE + reference.unit;
  }

  /** `100` -> `"100"`, `0.5` -> `"0,5"` – reference amounts are counts, not currency. */
  private static formatReferenceAmount(amount: number): string {
    if (Number.isInteger(amount)) {
      return String(amount);
    }
    return StringHelper.replaceAllLiteralWithOptions({ str: String(amount), find: '.', replace: ',' });
  }

  /** Price label of one price group: `"1,20 €"` or `"0,40 €/100 g"`. */
  static getPriceLabelForPriceGroup(foodoffer: FoodofferPriceFields | null | undefined, priceGroup: string | null | undefined): string {
    const priceLabel = FoodofferPriceHelper.formatPrice(FoodofferPriceHelper.getPriceForPriceGroup(foodoffer, priceGroup));
    const reference = FoodofferPriceHelper.getPriceReference(foodoffer);
    if (!reference) {
      return priceLabel;
    }
    return priceLabel + '/' + FoodofferPriceHelper.formatPriceReference(reference);
  }

  /**
   * Price label of several price groups at once (monitors):
   * `"1,00 € / 2,00 € / 3,00 €"` or `"(0,40 € / 0,90 € / 1,28 €)/100 g"`.
   */
  static getPriceLabelForPriceGroups(foodoffer: FoodofferPriceFields | null | undefined, priceGroups: readonly string[] = ALL_PRICE_GROUPS): string {
    const priceLabels = priceGroups.map(priceGroup => FoodofferPriceHelper.formatPrice(FoodofferPriceHelper.getPriceForPriceGroup(foodoffer, priceGroup)));
    const joinedPriceLabels = priceLabels.join(FoodofferPriceHelper.PRICE_GROUP_SEPARATOR);
    const reference = FoodofferPriceHelper.getPriceReference(foodoffer);
    if (!reference) {
      return joinedPriceLabels;
    }
    if (priceLabels.length < 2) {
      return joinedPriceLabels + '/' + FoodofferPriceHelper.formatPriceReference(reference);
    }
    // brackets so the "per" slash cannot be confused with the price group separator
    return '(' + joinedPriceLabels + ')/' + FoodofferPriceHelper.formatPriceReference(reference);
  }

  /**
   * Words a source system may put in front of the reference ("pro 100 g"), stripped before parsing.
   */
  private static readonly PRICE_REFERENCE_PREFIXES = ['pro', 'per', 'je'];

  /**
   * Long unit names a source system may use, mapped to the short units the Directus dropdown offers.
   * Anything not listed here is kept as written, so customers can use their own units ("Box").
   */
  private static readonly PRICE_REFERENCE_UNIT_ALIASES: Record<string, string> = {
    gramm: 'g',
    gram: 'g',
    gramme: 'g',
    grams: 'g',
    kilogramm: 'kg',
    kilogram: 'kg',
    milliliter: 'ml',
    millilitre: 'ml',
    liter: 'l',
    litre: 'l',
  };

  /**
   * Parses a price reference as written in an external report (e.g. a TL1 "FREI" field) into
   * the two database fields. Understands "100g", "100 g", "pro 100 g", "100 Gramm" and a bare
   * unit like "Box" (which means "per 1 box").
   *
   * Returns `null` for empty values and for values without a unit, so a food offer without a
   * usable reference simply keeps its classic per-dish price.
   */
  static parsePriceReference(rawValue: string | null | undefined): PriceReference | null {
    if (typeof rawValue !== 'string') {
      return null;
    }
    let value = rawValue.trim();
    if (!value) {
      return null;
    }

    for (const prefix of FoodofferPriceHelper.PRICE_REFERENCE_PREFIXES) {
      if (value.toLowerCase().startsWith(prefix + ' ')) {
        value = value.slice(prefix.length).trim();
        break;
      }
    }

    const match = /^(\d+(?:[.,]\d+)?)?\s*(.*)$/.exec(value);
    if (!match) {
      return null;
    }

    const rawUnit = (match[2] ?? '').trim();
    if (!rawUnit) {
      return null;
    }
    const unit = FoodofferPriceHelper.PRICE_REFERENCE_UNIT_ALIASES[rawUnit.toLowerCase()] ?? rawUnit;

    const rawAmount = match[1];
    if (rawAmount === undefined) {
      return { amount: 1, unit };
    }
    const amount = Number.parseFloat(StringHelper.replaceAllLiteralWithOptions({ str: rawAmount, find: ',', replace: '.' }));
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    return { amount, unit };
  }

  /**
   * The two database fields for a parsed price reference, ready to be spread into the food offer
   * a parser creates. Returns an empty object when there is no reference, so food offers without
   * one stay byte identical (their `result_hash` must not change).
   */
  static getPriceReferenceFieldsForParser(rawValue: string | null | undefined): { price_reference_amount?: number; price_reference_unit?: string } {
    const reference = FoodofferPriceHelper.parsePriceReference(rawValue);
    if (!reference) {
      return {};
    }
    return {
      price_reference_amount: reference.amount,
      price_reference_unit: reference.unit,
    };
  }
}
