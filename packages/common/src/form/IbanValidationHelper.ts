import IBAN from 'iban';

import { StringHelper } from '../StringHelper';

export interface IbanValidationOptions {
  /**
   * Accept an IBAN whose ISO 7064 mod-97-10 check digits do not add up.
   *
   * Everything else still has to hold: the country has to exist, the length has
   * to match it, and every position has to carry the kind of character that
   * country prints there. Only for a specimen card with dummy check digits —
   * see `__tests__/fixtures/girocard`. A real card always adds up.
   */
  ignoreChecksum?: boolean;
}

/**
 * Says whether a string is an IBAN, and lets the caller decide how much of the
 * standard has to hold.
 *
 * The question has two halves, and OCR is the reason they are asked separately.
 * The check digits are one half: they catch a misread character, and they are
 * the only thing a specimen card fails. The **structure** is the other: ISO
 * 13616 fixes a length and a character pattern per country — `DE` is two
 * letters, two check digits and eighteen more digits; `NL` carries four letters
 * where `DE` has digits — and a reading that violates that pattern was never an
 * IBAN, whatever its checksum says.
 *
 * Structure comes from the `iban` package, which carries the SWIFT registry as
 * of its last release. Its own `isValid` always asks for both halves at once,
 * which is exactly what a specimen card cannot give; `isValidBBAN` asks only
 * about the structure, so the two are recombined here into one question with a
 * switch.
 *
 * **The length register below stays ours, and it outranks the package.** The
 * package was last published in 2019 and predates seven countries (DJ, LY, MN,
 * NI, RU, SD, SO) and Burundi's move from 16 to 27 characters; it also lists
 * two dozen countries that issue no IBAN at all. So a country is only ever as
 * long as this register says, and the package's structure check is applied only
 * where the two agree on that length — where they do not, the reading is
 * checked by length alone, exactly as before the package was there. The result
 * is strictly stricter than a length check and never looser.
 */
export class IbanValidationHelper {
  /** Shortest and longest IBAN in the register — used to bound a scan. */
  static readonly MIN_IBAN_LENGTH = 15;
  static readonly MAX_IBAN_LENGTH = 34;

  /** IBAN length per country, from the SWIFT IBAN registry. */
  static readonly IBAN_LENGTH_BY_COUNTRY: Readonly<Record<string, number>> = {
    AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22,
    BI: 27, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DJ: 27,
    DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22,
    GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21, HU: 28, IE: 22, IL: 23,
    IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21,
    LT: 20, LU: 20, LV: 21, LY: 25, MC: 27, MD: 24, ME: 22, MK: 19, MN: 20,
    MR: 27, MT: 31, MU: 30, NI: 28, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29,
    PT: 25, QA: 29, RO: 24, RS: 22, RU: 33, SA: 24, SC: 31, SD: 18, SE: 24,
    SI: 19, SK: 24, SM: 27, SO: 23, ST: 25, SV: 28, TL: 23, TN: 24, TR: 26,
    UA: 29, VA: 22, VG: 24, XK: 20,
  };

  /** Uppercases and drops everything that cannot be part of an IBAN. */
  static normalize(text: string): string {
    const withoutSeparators = StringHelper.replaceAllWithOptions({
      str: text,
      find: '[^A-Za-z0-9]',
      replace: '',
    });
    return withoutSeparators.toUpperCase();
  }

  /** The length this country's IBANs have, or `undefined` for a country that issues none. */
  static getIbanLength(countryCode: string): number | undefined {
    return IbanValidationHelper.IBAN_LENGTH_BY_COUNTRY[countryCode.toUpperCase()];
  }

  /**
   * The package's entry for a country, but only where it agrees with the length
   * register above — a stale entry describes a number that is no longer printed
   * anywhere and would reject the real thing.
   */
  private static getAgreeingSpecification(countryCode: string): IBAN.Specification | undefined {
    const specification = IBAN.countries[countryCode.toUpperCase()];
    if (specification === undefined) {
      return undefined;
    }
    return specification.length === IbanValidationHelper.getIbanLength(countryCode) ? specification : undefined;
  }

  /** True when the length matches the register entry for the country. */
  static hasValidLength(value: string): boolean {
    const normalized = IbanValidationHelper.normalize(value);
    return IbanValidationHelper.getIbanLength(normalized.slice(0, 2)) === normalized.length;
  }

  /**
   * True when every position carries the kind of character its country prints
   * there — length included, but the check digits' own arithmetic left out.
   */
  static hasValidStructure(value: string): boolean {
    const normalized = IbanValidationHelper.normalize(value);
    // The two leading letters and the two check digits are the same in every
    // country; the registry only describes what comes after them.
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]*$/.test(normalized)) {
      return false;
    }
    if (!IbanValidationHelper.hasValidLength(normalized)) {
      return false;
    }
    const specification = IbanValidationHelper.getAgreeingSpecification(normalized.slice(0, 2));
    if (specification === undefined) {
      // A country the package does not describe, or describes at a length the
      // register has since moved on from: the length is all that can be said.
      return true;
    }
    return specification.isValidBBAN(normalized.slice(4));
  }

  /** Verifies the ISO 13616 / ISO 7064 mod-97-10 check digits. */
  static hasValidChecksum(value: string): boolean {
    const normalized = IbanValidationHelper.normalize(value);
    if (normalized.length < IbanValidationHelper.MIN_IBAN_LENGTH || normalized.length > IbanValidationHelper.MAX_IBAN_LENGTH) {
      return false;
    }
    const rearranged = normalized.slice(4) + normalized.slice(0, 4);
    let remainder = 0;
    for (const character of rearranged) {
      const codePoint = character.charCodeAt(0);
      // 'A'..'Z' expand to 10..35, digits stay as they are.
      const isLetter = codePoint >= 65 && codePoint <= 90;
      const isDigit = codePoint >= 48 && codePoint <= 57;
      if (!isLetter && !isDigit) {
        return false;
      }
      const characterValue = isLetter ? codePoint - 55 : codePoint - 48;
      remainder = (remainder * (characterValue > 9 ? 100 : 10) + characterValue) % 97;
    }
    return remainder === 1;
  }

  /**
   * The one question a caller asks: is this an IBAN?
   *
   * `ignoreChecksum` waives the check digits and nothing else.
   */
  static isValidIban(value: string, options?: IbanValidationOptions): boolean {
    if (!IbanValidationHelper.hasValidStructure(value)) {
      return false;
    }
    if (options?.ignoreChecksum === true) {
      return true;
    }
    return IbanValidationHelper.hasValidChecksum(value);
  }

  /**
   * True when this country prints its account part as digits only.
   *
   * Read off the registry's structure rather than listed by hand: a block is
   * described by a letter for the characters it allows and two digits for its
   * length, and `F` is the one that means digits. That is what lets an `O` an
   * engine read on a German card be mapped back to the `0` that is printed
   * there — and what forbids the same repair on a Dutch one, whose account part
   * opens with four letters. The hand-kept list this replaced had exactly that
   * wrong for GR, LU, LV, NL and RO.
   */
  static hasNumericBban(countryCode: string): boolean {
    const structure = IBAN.countries[countryCode.toUpperCase()]?.structure;
    if (structure === undefined) {
      return false;
    }
    const blocks = structure.match(/.{3}/g) ?? [];
    return blocks.length > 0 && blocks.every((block) => block.startsWith('F'));
  }
}
