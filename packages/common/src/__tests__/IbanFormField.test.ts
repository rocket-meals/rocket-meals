import { FormHelperCommon } from '../form/FormHelperCommon';
import { IbanRecognitionHelper } from '../form/IbanRecognitionHelper';

/**
 * What an IBAN form field has to get right once the value carries the printed
 * spacing.
 *
 * The field shows and stores an IBAN grouped in fours, the way a card prints it
 * and the way anyone reads one back to check it. That is the point of the
 * grouping — and it is also what broke two measurements that were taken of the
 * displayed string instead of the number: the input's length cap and its
 * "long enough?" check. Both are pinned down here.
 */

/** Registry example IBANs: real check digits, and long enough to matter. */
const VALID_DE_IBAN = 'DE89370400440532013000';
const VALID_MT_IBAN = 'MT84MALT011000012345MTLCAST001S';
const VALID_RU_IBAN = 'RU0304452522540817810538091310419';
const VALID_NO_IBAN = 'NO9386011117947';

describe('an IBAN in a form field', () => {
	describe('the spacing it is stored with', () => {
		it('groups the number the way a card prints it', () => {
			expect(FormHelperCommon.formatIban(VALID_DE_IBAN)).toBe('DE89 3704 0044 0532 0130 00');
		});

		it('can be applied again without changing anything', () => {
			// The field formats on the way in and on the way out, so this has to
			// hold or typing would fight the formatter.
			const once = FormHelperCommon.formatIban(VALID_DE_IBAN);
			expect(FormHelperCommon.formatIban(once)).toBe(once);
		});

		it('never ends on a space, however many characters are in the last group', () => {
			for (const iban of [VALID_DE_IBAN, VALID_MT_IBAN, VALID_RU_IBAN, VALID_NO_IBAN]) {
				for (let length = 1; length <= iban.length; length++) {
					const formatted = FormHelperCommon.formatIban(iban.slice(0, length));
					expect(formatted).toBe(formatted.trimEnd());
				}
			}
		});

		it('survives a round trip back to the bare number', () => {
			for (const iban of [VALID_DE_IBAN, VALID_MT_IBAN, VALID_RU_IBAN, VALID_NO_IBAN]) {
				expect(FormHelperCommon.normalizeIban(FormHelperCommon.formatIban(iban))).toBe(iban);
			}
		});
	});

	describe('the length an input may cap at', () => {
		it('leaves room for the spacing of the longest IBAN there is', () => {
			// 34 characters, and eight spaces between the nine groups they form.
			expect(FormHelperCommon.IBAN_MAX_FORMATTED_LENGTH).toBe(42);
		});

		it('fits every IBAN in the registry once it is grouped', () => {
			// The cap used to be the bare 34, which cut the last group off every
			// country whose IBAN is 29 characters or longer - twelve of them.
			const longest = Object.values(IbanRecognitionHelper.IBAN_LENGTH_BY_COUNTRY).reduce((a, b) => Math.max(a, b), 0);
			const longestFormatted = FormHelperCommon.formatIban('X'.repeat(longest));
			expect(longestFormatted.length).toBeGreaterThan(FormHelperCommon.IBAN_MAX_LENGTH);
			expect(longestFormatted.length).toBeLessThanOrEqual(FormHelperCommon.IBAN_MAX_FORMATTED_LENGTH);
		});

		it('would have truncated a Maltese and a Russian IBAN at the old cap', () => {
			for (const iban of [VALID_MT_IBAN, VALID_RU_IBAN]) {
				const formatted = FormHelperCommon.formatIban(iban);
				expect(formatted.length).toBeGreaterThan(FormHelperCommon.IBAN_MAX_LENGTH);
				expect(formatted.length).toBeLessThanOrEqual(FormHelperCommon.IBAN_MAX_FORMATTED_LENGTH);
				// And what a 34-character cap would have left of it is not an IBAN.
				expect(IbanRecognitionHelper.getIbanFieldProblem(formatted.slice(0, FormHelperCommon.IBAN_MAX_LENGTH))).toBe('invalid-length');
			}
		});
	});

	describe('what it says is wrong', () => {
		it('says nothing about an empty field', () => {
			expect(IbanRecognitionHelper.getIbanFieldProblem('')).toBeNull();
			expect(IbanRecognitionHelper.getIbanFieldProblem('   ')).toBeNull();
		});

		it('accepts a complete IBAN, spaced or not', () => {
			for (const iban of [VALID_DE_IBAN, VALID_MT_IBAN, VALID_RU_IBAN, VALID_NO_IBAN]) {
				expect(IbanRecognitionHelper.getIbanFieldProblem(iban)).toBeNull();
				expect(IbanRecognitionHelper.getIbanFieldProblem(FormHelperCommon.formatIban(iban))).toBeNull();
			}
		});

		it('counts the number, not the spaces', () => {
			// Thirteen characters of a German IBAN. With its spacing the string is
			// sixteen characters long, which is how it slipped past a check that
			// asked whether the *displayed* value was shorter than fifteen.
			const fragment = FormHelperCommon.formatIban(VALID_DE_IBAN.slice(0, 13));
			expect(fragment.length).toBeGreaterThan(FormHelperCommon.IBAN_MIN_LENGTH);
			expect(FormHelperCommon.normalizeIban(fragment).length).toBeLessThan(FormHelperCommon.IBAN_MIN_LENGTH);
			expect(IbanRecognitionHelper.getIbanFieldProblem(fragment)).toBe('invalid-length');
		});

		it('complains about every incomplete prefix of a real IBAN', () => {
			for (let length = 1; length < VALID_DE_IBAN.length; length++) {
				expect(IbanRecognitionHelper.getIbanFieldProblem(VALID_DE_IBAN.slice(0, length))).toBe('invalid-length');
			}
		});

		it('tells a wrong length from a wrong check digit', () => {
			// Right length for Germany, one digit changed.
			expect(IbanRecognitionHelper.getIbanFieldProblem('DE89370400440532013001')).toBe('invalid-checksum');
			// One character too many for Germany.
			expect(IbanRecognitionHelper.getIbanFieldProblem(VALID_DE_IBAN + '0')).toBe('invalid-length');
			// A country that issues no IBAN at all.
			expect(IbanRecognitionHelper.getIbanFieldProblem('ZZ89370400440532013000')).toBe('invalid-length');
		});

		it('accepts a number typed in lower case', () => {
			expect(IbanRecognitionHelper.getIbanFieldProblem('de89 3704 0044 0532 0130 00')).toBeNull();
		});
	});

	describe('the field type the form branches on', () => {
		it('is the half of the bank account field type the screen compares against', () => {
			// `form-submission` splits `field_type` on the first `-` and renders
			// `IBANInput` - the field with the scan button - for this half.
			expect(FormHelperCommon.getFieldCustomId(FormHelperCommon.FORM_FIELD_TYPE.STRING_BANK_ACCOUNT)).toBe('bank_account_number');
			expect(FormHelperCommon.FORM_FIELD_TYPE.STRING_BANK_ACCOUNT.split('-')[0]).toBe('value_string');
		});

		it('keeps a custom reference own dashes intact', () => {
			expect(FormHelperCommon.getFieldCustomId(FormHelperCommon.FORM_FIELD_TYPE.CUSTOM_REFERENCE_APARTMENT)).toBe('reference-apartments');
		});
	});
});
