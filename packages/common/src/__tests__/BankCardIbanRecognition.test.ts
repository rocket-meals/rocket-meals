import * as fs from 'fs';
import * as path from 'path';
import { IbanRecognitionHelper } from '../form/IbanRecognitionHelper';

/**
 * The fourteen photographed bank cards in `fixtures/bankcards`, measured.
 *
 * The images are not run through an OCR engine here — this suite is ts-jest in
 * Node, while the engine runs in a browser or a WebView — so what the engine
 * returned for each of them was recorded once and is replayed from
 * `bank-cards.ocr.json`. That makes this a test of the reading, not of
 * Tesseract: it pins down which cards the helper gets right, which it gets
 * wrong, and above all what it must never invent.
 *
 * The recorded outcome is deliberately kept in the fixture rather than written
 * out here. A change to the helper that moves any card shows up as a diff on
 * that file, which is the point: the suite is a benchmark, and a benchmark that
 * cannot be read at a glance is worth little.
 */
const FIXTURE_DIRECTORY = path.join(__dirname, 'fixtures', 'bankcards');

interface BankCard {
	file: string;
	description: string;
	/** What the card actually prints, read off the photo by eye, or `null` for a card without an IBAN. */
	printedIban: string | null;
	sharpness: number;
	recognizedLines: string[];
	recognized: {
		withValidChecksumOnly: string | null;
		allowingDummyChecksum: string | null;
	};
}

interface BankCardFixture {
	engine: string;
	description: string;
	cards: BankCard[];
}

const fixture: BankCardFixture = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIRECTORY, 'bank-cards.ocr.json'), 'utf-8'));
const cards = fixture.cards.map((card) => [card.file, card] as const);

describe('the photographed bank cards', () => {
	it('has a recorded reading for every image in the folder', () => {
		const images = fs.readdirSync(FIXTURE_DIRECTORY).filter((entry) => entry.endsWith('.png')).sort();
		expect(fixture.cards.map((card) => card.file).sort()).toEqual(images);
	});

	it.each(cards)('keeps the image %s the recognized lines belong to', (_file, card) => {
		expect(fs.existsSync(path.join(FIXTURE_DIRECTORY, card.file))).toBe(true);
	});

	it.each(cards)('withholds every specimen card from a scanner that demands a valid checksum (%s)', (_file, card) => {
		// Every card in this folder is a specimen or a marketing render, and every
		// number printed on one is a dummy. None of them may reach a user, which
		// is what the app's own scanner relies on.
		expect(IbanRecognitionHelper.findIban(card.recognizedLines)).toBeNull();
		expect(card.recognized.withValidChecksumOnly).toBeNull();
	});

	it.each(cards)('reads %s the way the fixture records it', (_file, card) => {
		const found = IbanRecognitionHelper.findIban(card.recognizedLines, { allowInvalidChecksum: true });
		expect(found?.iban ?? null).toBe(card.recognized.allowingDummyChecksum);
	});

	it.each(cards.filter(([, card]) => card.printedIban === null))('finds no IBAN on %s, which has none', (_file, card) => {
		expect(IbanRecognitionHelper.findIban(card.recognizedLines, { allowInvalidChecksum: true })).toBeNull();
	});

	it('never starts a reading inside a printed word', () => {
		// `NO53VAOBERBERGE` is what `Volksbanken` and `Eva Oberberg eG` become when
		// a window is allowed to slide into the middle of a word until something
		// looks like a country code. A reading now begins where the card begins
		// printing something, so this one cannot be assembled at all.
		const everything = fixture.cards.flatMap((card) => IbanRecognitionHelper.findIbanCandidates(card.recognizedLines).map((candidate) => candidate.iban));
		expect(everything).not.toContain('NO53VAOBERBERGE');
	});

	it('never hands over a number assembled out of the text around the number', () => {
		// These four do still turn up as candidates - `Gültig bis` in front of the
		// number really does read as `GI11 TIGB IS…`, and `girocard` plus a
		// cardholder really does read as `SE16 ITOC ARD…`. What keeps them away
		// from the user is that none of them sits on the card the way a printed
		// number does, so nothing but a valid checksum could ever accept them - and
		// roughly one reading in ninety-seven passes mod-97 by chance, while the
		// scanner looks at several frames a second.
		const assembled = ['GI11TIGBISDEQO012345678', 'GI11TIGBISDEN0123456780', 'SE16ITOCARDROBERTSCHUMAN', 'BI50EN0123456780123567000VI'];
		const candidates = fixture.cards.flatMap((card) => IbanRecognitionHelper.findIbanCandidates(card.recognizedLines));
		for (const fabrication of assembled) {
			const found = candidates.find((candidate) => candidate.iban === fabrication);
			expect(found?.looksPrinted).toBe(false);
			expect(found?.checksumValid).toBe(false);
		}
		const accepted = fixture.cards.map((card) => IbanRecognitionHelper.findIban(card.recognizedLines, { allowInvalidChecksum: true })?.iban);
		for (const fabrication of assembled) {
			expect(accepted).not.toContain(fabrication);
		}
	});

	it('reads the number off the cards the engine could resolve', () => {
		// Five of the eleven cards that print an IBAN. What stops the other six is
		// the engine, not the reading: three photos are too soft for any text at
		// all, and on the rest Tesseract drops or swaps digits inside the number.
		// See the README next to the images.
		const read = fixture.cards.filter((card) => card.printedIban !== null && card.recognized.allowingDummyChecksum === card.printedIban);
		expect(read.map((card) => card.file).sort()).toEqual(['Test_14_DE12345678901234567890.png', 'Test_1_DE00012345678901234567.png', 'Test_6_DE00012345678901234567.png', 'Test_7_DE00012345678901234567.png', 'Test_8_DE00012345678901234567.png']);
	});

	it('turns away a frame too soft to read before the engine ever sees it', () => {
		// The scanner drops a frame under MINIMUM_SHARPNESS (12 in
		// TextRecognitionShared) and says so instead of searching on in silence.
		// Two of these photos are in that range, and neither yields a single line
		// of usable text.
		const soft = fixture.cards.filter((card) => card.sharpness < 12);
		expect(soft.length).toBeGreaterThan(0);
		for (const card of soft) {
			expect(IbanRecognitionHelper.findIban(card.recognizedLines, { allowInvalidChecksum: true })).toBeNull();
		}
	});
});
