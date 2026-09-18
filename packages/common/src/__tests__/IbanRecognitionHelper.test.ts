import * as fs from 'fs';
import * as path from 'path';
import { IbanRecognitionHelper } from '../form/IbanRecognitionHelper';

/**
 * The recorded OCR output for `fixtures/girocard/girocard-sample.jpg` — see the
 * README next to it. The image itself is not run through an OCR engine here:
 * this suite is ts-jest in Node, while the engine runs in a browser or a WebView.
 */
const FIXTURE_DIRECTORY = path.join(__dirname, 'fixtures', 'girocard');

interface GiroCardReading {
	source: string;
	recognizedLines: string[];
}

interface GiroCardFixture {
	image: string;
	engine: string;
	readings: GiroCardReading[];
	expected: {
		iban: string;
		formatted: string;
		countryCode: string;
		lengthValid: boolean;
		checksumValid: boolean;
	};
}

const giroCardFixture: GiroCardFixture = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIRECTORY, 'girocard-sample.ocr.json'), 'utf-8'));

/** A real, checksum-valid German IBAN used across the SEPA documentation. */
const VALID_DE_IBAN = 'DE89370400440532013000';
const VALID_AT_IBAN = 'AT611904300234573201';
const VALID_GB_IBAN = 'GB29NWBK60161331926819';

describe('IbanRecognitionHelper', () => {
	describe('normalizeIban', () => {
		it('drops separators and uppercases', () => {
			expect(IbanRecognitionHelper.normalizeIban('de89 3704 0044 0532 0130 00')).toBe(VALID_DE_IBAN);
			expect(IbanRecognitionHelper.normalizeIban('DE89-3704.0044/0532 0130 00')).toBe(VALID_DE_IBAN);
		});
	});

	describe('isValidIbanChecksum', () => {
		it('accepts real IBANs', () => {
			expect(IbanRecognitionHelper.isValidIbanChecksum(VALID_DE_IBAN)).toBe(true);
			expect(IbanRecognitionHelper.isValidIbanChecksum(VALID_AT_IBAN)).toBe(true);
			expect(IbanRecognitionHelper.isValidIbanChecksum(VALID_GB_IBAN)).toBe(true);
		});

		it('rejects a single wrong digit', () => {
			expect(IbanRecognitionHelper.isValidIbanChecksum('DE89370400440532013001')).toBe(false);
		});

		it('rejects the dummy check digits printed on specimen cards', () => {
			expect(IbanRecognitionHelper.isValidIbanChecksum('DE00012345678901234567')).toBe(false);
		});

		it('rejects anything shorter than the shortest IBAN', () => {
			expect(IbanRecognitionHelper.isValidIbanChecksum('DE89')).toBe(false);
		});
	});

	describe('hasValidIbanLength', () => {
		it('measures against the registry entry of the country', () => {
			expect(IbanRecognitionHelper.hasValidIbanLength(VALID_DE_IBAN)).toBe(true);
			expect(IbanRecognitionHelper.hasValidIbanLength('DE8937040044053201300')).toBe(false);
			expect(IbanRecognitionHelper.hasValidIbanLength(VALID_AT_IBAN)).toBe(true);
		});

		it('rejects an unknown country code', () => {
			expect(IbanRecognitionHelper.hasValidIbanLength('ZZ89370400440532013000')).toBe(false);
		});
	});

	describe('repairOcrConfusions', () => {
		it('turns letters read for the check digits back into digits', () => {
			expect(IbanRecognitionHelper.repairOcrConfusions('DEB9370400440532013000')).toBe(VALID_DE_IBAN);
			expect(IbanRecognitionHelper.repairOcrConfusions('DES9370400440532013000')).toBe('DE59370400440532013000');
		});

		it('turns digits read for the country code back into letters', () => {
			expect(IbanRecognitionHelper.repairOcrConfusions('0E89370400440532013000')).toBe('OE89370400440532013000');
		});

		it('leaves the account part untouched', () => {
			expect(IbanRecognitionHelper.repairOcrConfusions(VALID_GB_IBAN)).toBe(VALID_GB_IBAN);
		});
	});

	describe('findIban', () => {
		it('reads an IBAN printed as one line', () => {
			const found = IbanRecognitionHelper.findIban(['DE89 3704 0044 0532 0130 00']);
			expect(found?.iban).toBe(VALID_DE_IBAN);
			expect(found?.formatted).toBe('DE89 3704 0044 0532 0130 00');
			expect(found?.countryCode).toBe('DE');
			expect(found?.checksumValid).toBe(true);
			expect(found?.lengthValid).toBe(true);
		});

		it('ignores the label the card prints in front of the number', () => {
			expect(IbanRecognitionHelper.findIban(['IBAN: DE89 3704 0044 0532 0130 00'])?.iban).toBe(VALID_DE_IBAN);
			expect(IbanRecognitionHelper.findIban(['IBAN', 'DE89 3704 0044 0532 0130 00'])?.iban).toBe(VALID_DE_IBAN);
		});

		it('joins a number the engine tore into two lines', () => {
			expect(IbanRecognitionHelper.findIban(['DE89 3704 0044', '0532 0130 00'])?.iban).toBe(VALID_DE_IBAN);
		});

		it('repairs the zeros an engine read as the letter O', () => {
			expect(IbanRecognitionHelper.findIban(['DE89 37O4 OO44 O532 O13O OO'])?.iban).toBe(VALID_DE_IBAN);
		});

		it('picks the IBAN out of the other text on the card', () => {
			const lines = ['Volksbanken Oberberg eG', 'Toni Raiffeisen', 'girocard', 'IBAN: DE89 3704 0044 0532 0130 00', 'Gültig bis 12/29'];
			expect(IbanRecognitionHelper.findIban(lines)?.iban).toBe(VALID_DE_IBAN);
		});

		it('returns null while nothing IBAN-shaped was recognized', () => {
			expect(IbanRecognitionHelper.findIban([])).toBeNull();
			expect(IbanRecognitionHelper.findIban(['Volksbanken Oberberg eG', 'Toni Raiffeisen'])).toBeNull();
			expect(IbanRecognitionHelper.findIban(['0000 0000 0000 0000 0000 00'])).toBeNull();
		});

		it('rejects a number whose checksum does not add up', () => {
			expect(IbanRecognitionHelper.findIban(['DE89 3704 0044 0532 0130 01'])).toBeNull();
		});

		it('accepts such a number only when the caller opts in', () => {
			const found = IbanRecognitionHelper.findIban(['DE89 3704 0044 0532 0130 01'], { allowInvalidChecksum: true });
			expect(found?.iban).toBe('DE89370400440532013001');
			expect(found?.checksumValid).toBe(false);
			expect(found?.lengthValid).toBe(true);
		});

		it('never starts a number in the middle of a printed word', () => {
			// `Volksbanken` and `Eva Oberberg eG` glued together carry `NO53VAOBERBERGE`
			// inside them, and Norway's IBANs are fifteen characters long. A reading
			// begins where the card begins printing something, so nothing here is a
			// candidate at all.
			const lines = ['Volksbanken os', 'Eva Oberberg eG MeinPlus ese'];
			expect(IbanRecognitionHelper.findIbanCandidates(lines)).toHaveLength(0);
		});

		it('still reads a number the engine welded to the label in front of it', () => {
			expect(IbanRecognitionHelper.findIban(['IBANDE89 3704 0044 0532 0130 00'])?.iban).toBe(VALID_DE_IBAN);
		});

		it('reports whether a reading sits on the card the way a printed number does', () => {
			const printed = IbanRecognitionHelper.findIbanCandidates(['DE89 3704 0044 0532 0130 00', 'Gültig bis 12/29']);
			expect(printed[0]?.looksPrinted).toBe(true);

			// `Gültig bis` in front of the number reads as `GI11 TIGB IS…`, and
			// Gibraltar's IBANs are twenty-three characters long - the shape of the
			// thing is all that gives it away.
			const assembled = IbanRecognitionHelper.findIbanCandidates(['IBAN: Giiltig bis', 'DEQO 0123 4567 8901 2345 67 2030']);
			expect(assembled.find((candidate) => candidate.iban.startsWith('GI11'))?.looksPrinted).toBe(false);
		});

		it('refuses a reading without a checksum that does not look printed', () => {
			// The caller waived the checksum, so the shape is the only thing left
			// that can speak for the number.
			const lines = ['IBAN: Gilltig bis', 'den 0123 4567 801 235 67 00/0 VISA'];
			expect(IbanRecognitionHelper.findIbanCandidates(lines).length).toBeGreaterThan(0);
			expect(IbanRecognitionHelper.findIban(lines, { allowInvalidChecksum: true })).toBeNull();
		});

		it('prefers the checksum-valid candidate when the card shows several numbers', () => {
			const lines = ['Kartennummer 6789 0123 4567 8901 2345 67', 'DE89 3704 0044 0532 0130 00'];
			expect(IbanRecognitionHelper.findIban(lines, { allowInvalidChecksum: true })?.iban).toBe(VALID_DE_IBAN);
		});
	});

	describe('the recorded giro card photo', () => {
		it('recorded the engine it came from', () => {
			expect(giroCardFixture.engine).toContain('Tesseract');
			expect(giroCardFixture.readings.length).toBeGreaterThan(1);
		});

		it('keeps the misreadings the engine actually produced', () => {
			// `DE00` came back as `DEDD` once and as `DEOD` the other time. Were
			// these tidied up in the fixture, the repair would be tested against a
			// problem that never occurs.
			const recognized = giroCardFixture.readings.map((reading) => reading.recognizedLines.join(' '));
			expect(recognized.some((text) => text.includes('DEDD'))).toBe(true);
			expect(recognized.some((text) => text.includes('DEOD'))).toBe(true);
		});

		it('keeps the image the recognized lines belong to', () => {
			expect(fs.existsSync(path.join(FIXTURE_DIRECTORY, giroCardFixture.image))).toBe(true);
		});

		it.each(giroCardFixture.readings.map((reading) => [reading.source, reading] as const))('reads the printed IBAN out of the lines from %s', (_source, reading) => {
			const candidates = IbanRecognitionHelper.findIbanCandidates(reading.recognizedLines);
			const printed = candidates.find((candidate) => candidate.iban === giroCardFixture.expected.iban);
			expect(printed).toBeDefined();
			expect(printed?.formatted).toBe(giroCardFixture.expected.formatted);
			expect(printed?.countryCode).toBe(giroCardFixture.expected.countryCode);
			expect(printed?.lengthValid).toBe(giroCardFixture.expected.lengthValid);
			expect(printed?.checksumValid).toBe(giroCardFixture.expected.checksumValid);
		});

		it.each(giroCardFixture.readings.map((reading) => [reading.source, reading] as const))('withholds the specimen IBAN from a scanner that demands a valid checksum (%s)', (_source, reading) => {
			expect(IbanRecognitionHelper.findIban(reading.recognizedLines)).toBeNull();
		});

		it.each(giroCardFixture.readings.map((reading) => [reading.source, reading] as const))('hands it over once the caller allows a dummy checksum (%s)', (_source, reading) => {
			const found = IbanRecognitionHelper.findIban(reading.recognizedLines, { allowInvalidChecksum: true });
			expect(found?.iban).toBe(giroCardFixture.expected.iban);
			expect(found?.formatted).toBe(giroCardFixture.expected.formatted);
		});
	});
});
