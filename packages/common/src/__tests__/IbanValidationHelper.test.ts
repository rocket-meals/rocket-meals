import { IbanValidationHelper } from '../form/IbanValidationHelper';

/** Real, checksum-valid numbers from the SWIFT registry's own examples. */
const VALID_DE_IBAN = 'DE89370400440532013000';
const VALID_NL_IBAN = 'NL91ABNA0417164300';
const VALID_GB_IBAN = 'GB82WEST12345698765432';

/** The specimen card in `fixtures/girocard`: right shape, dummy check digits. */
const SPECIMEN_DE_IBAN = 'DE00012345678901234567';

describe('IbanValidationHelper', () => {
	describe('normalize', () => {
		it('drops the printed spacing and uppercases', () => {
			expect(IbanValidationHelper.normalize('de89 3704 0044 0532 0130 00')).toBe(VALID_DE_IBAN);
		});
	});

	describe('hasValidChecksum', () => {
		it('accepts the registry examples', () => {
			expect(IbanValidationHelper.hasValidChecksum(VALID_DE_IBAN)).toBe(true);
			expect(IbanValidationHelper.hasValidChecksum(VALID_NL_IBAN)).toBe(true);
			expect(IbanValidationHelper.hasValidChecksum(VALID_GB_IBAN)).toBe(true);
		});

		it('rejects a single changed digit', () => {
			expect(IbanValidationHelper.hasValidChecksum('DE89370400440532013001')).toBe(false);
		});

		it('rejects the specimen card', () => {
			expect(IbanValidationHelper.hasValidChecksum(SPECIMEN_DE_IBAN)).toBe(false);
		});
	});

	describe('hasValidStructure', () => {
		it('accepts a number whose characters sit where its country prints them', () => {
			expect(IbanValidationHelper.hasValidStructure(VALID_DE_IBAN)).toBe(true);
			expect(IbanValidationHelper.hasValidStructure(VALID_NL_IBAN)).toBe(true);
			expect(IbanValidationHelper.hasValidStructure(VALID_GB_IBAN)).toBe(true);
		});

		it('accepts the specimen card, whose only fault is its check digits', () => {
			expect(IbanValidationHelper.hasValidStructure(SPECIMEN_DE_IBAN)).toBe(true);
		});

		it('rejects a letter where the country prints a digit', () => {
			// Germany's account part is eighteen digits; the Dutch bank code is not.
			expect(IbanValidationHelper.hasValidStructure('DE00ABNA45678901234567')).toBe(false);
			// `girocard Robert Schumann` welds into the right length for Sweden,
			// whose account part carries no letters at all.
			expect(IbanValidationHelper.hasValidStructure('SE16ITOCARDROBERTSCHUMAN')).toBe(false);
		});

		it('rejects a digit where the country prints a letter', () => {
			expect(IbanValidationHelper.hasValidStructure('NL9112340417164300')).toBe(false);
		});

		it('rejects the wrong length and an unknown country', () => {
			expect(IbanValidationHelper.hasValidStructure('DE8937040044053201300')).toBe(false);
			expect(IbanValidationHelper.hasValidStructure('ZZ89370400440532013000')).toBe(false);
		});

		it('rejects a reading that does not open with two letters and two digits', () => {
			expect(IbanValidationHelper.hasValidStructure('D189370400440532013000')).toBe(false);
			expect(IbanValidationHelper.hasValidStructure('DEA9370400440532013000')).toBe(false);
		});

		it('falls back to the length alone where our register outranks the package', () => {
			// The package was last published in 2019: it predates these countries
			// entirely, and still has Burundi at the 16 characters it left behind.
			// Our own register is the authority on length, so a number of the right
			// length is still accepted rather than silently refused.
			expect(IbanValidationHelper.getIbanLength('RU')).toBe(33);
			expect(IbanValidationHelper.hasValidStructure('RU0204452522540817810538091310419')).toBe(true);
			expect(IbanValidationHelper.getIbanLength('BI')).toBe(27);
			expect(IbanValidationHelper.hasValidStructure('BI4210000100010000332045181')).toBe(true);
		});
	});

	describe('isValidIban', () => {
		it('demands both halves by default', () => {
			expect(IbanValidationHelper.isValidIban(VALID_DE_IBAN)).toBe(true);
			expect(IbanValidationHelper.isValidIban(SPECIMEN_DE_IBAN)).toBe(false);
		});

		it('waives the check digits when asked, and nothing else', () => {
			expect(IbanValidationHelper.isValidIban(SPECIMEN_DE_IBAN, { ignoreChecksum: true })).toBe(true);
			// Still the wrong length, still an unknown country, still a letter where
			// Sweden prints a digit - none of which the check digits were carrying.
			expect(IbanValidationHelper.isValidIban('DE8937040044053201300', { ignoreChecksum: true })).toBe(false);
			expect(IbanValidationHelper.isValidIban('ZZ89370400440532013000', { ignoreChecksum: true })).toBe(false);
			expect(IbanValidationHelper.isValidIban('SE16ITOCARDROBERTSCHUMAN', { ignoreChecksum: true })).toBe(false);
		});

		it('takes a number the way a card prints it', () => {
			expect(IbanValidationHelper.isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true);
		});
	});

	describe('hasNumericBban', () => {
		it('knows which countries print digits only', () => {
			expect(IbanValidationHelper.hasNumericBban('DE')).toBe(true);
			expect(IbanValidationHelper.hasNumericBban('AT')).toBe(true);
		});

		it('knows the ones a hand-kept list had wrong', () => {
			// All five were listed as numeric before the registry was asked, which
			// mapped the letters of a legitimate account part onto digits.
			expect(IbanValidationHelper.hasNumericBban('NL')).toBe(false);
			expect(IbanValidationHelper.hasNumericBban('LU')).toBe(false);
			expect(IbanValidationHelper.hasNumericBban('LV')).toBe(false);
			expect(IbanValidationHelper.hasNumericBban('GR')).toBe(false);
			expect(IbanValidationHelper.hasNumericBban('RO')).toBe(false);
		});

		it('says no for a country it does not know', () => {
			expect(IbanValidationHelper.hasNumericBban('ZZ')).toBe(false);
		});
	});
});
