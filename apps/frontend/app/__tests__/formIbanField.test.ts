import * as fs from 'fs';
import * as path from 'path';
import { FormHelperCommon } from 'repo-depkit-common';

/**
 * The IBAN field in a form is the field with the camera button.
 *
 * `form-submission` picks an input per field type, and only `IBANInput` carries
 * the scanner. Which type gets it is a one-line decision in a screen of a
 * thousand lines, and nothing else would notice if that line changed: there is
 * no renderer test here (this suite is ts-jest in Node), and a form field is
 * configured on the server, so no fixture in this repository exercises it.
 *
 * So the wiring is pinned where it is written down. Reading the source is a
 * blunt instrument, but the alternative is a feature nobody would miss until a
 * user stood in front of a field with no button.
 */
const FORM_SCREEN = path.join(__dirname, '..', 'app', '(app)', 'form-submission', 'index.tsx');
const IBAN_INPUT = path.join(__dirname, '..', 'components', 'IBANInput', 'IBANInput.tsx');

const readSource = (file: string): string => fs.readFileSync(file, 'utf-8');

/** The one line of the screen that decides what an IBAN field renders. */
const findRenderBranch = (source: string, customId: string): string | undefined => source.split('\n').find((line) => line.includes(`custom_id === '${customId}'`));

describe('the IBAN field in a form', () => {
	const screen = readSource(FORM_SCREEN);

	it('is reached by the half of the field type the screen branches on', () => {
		// `value_string-bank_account_number` -> `bank_account_number`.
		expect(FormHelperCommon.getFieldCustomId(FormHelperCommon.FORM_FIELD_TYPE.STRING_BANK_ACCOUNT)).toBe('bank_account_number');
	});

	it('renders the input that carries the scanner', () => {
		const branch = findRenderBranch(screen, FormHelperCommon.getFieldCustomId(FormHelperCommon.FORM_FIELD_TYPE.STRING_BANK_ACCOUNT));
		expect(branch).toBeDefined();
		expect(branch).toContain('<IBANInput');
	});

	it('hands the scanned number to the form the same way a typed one arrives', () => {
		const branch = findRenderBranch(screen, 'bank_account_number') ?? '';
		// `IBANInput` calls this `onChange` for a scan and for a keystroke alike,
		// so the scanned IBAN lands in `formData` without a second path.
		expect(branch).toContain('onChange={handleChange}');
		expect(branch).toContain('onError={handleError}');
		expect(branch).toContain('value={formData[fieldId]?.value');
	});

	it('gives a plain string field no scanner', () => {
		// Not a detail: the button belongs to the field type that means "this is
		// an IBAN", not to every text field on the form.
		const branch = findRenderBranch(screen, 'string') ?? '';
		expect(branch).toContain('<SingleLineInput');
		expect(branch).not.toContain('IBANInput');
	});

	it('offers the scanner whenever the field can be edited', () => {
		const input = readSource(IBAN_INPUT);
		expect(input).toContain('const isScanAvailable = !isDisabled;');
		expect(input).toContain('useGiroCardIbanScannerModal');
	});

	it('caps its length with room for the printed spacing', () => {
		const input = readSource(IBAN_INPUT);
		// A cap of 34 counts the spaces as characters of the number and cuts the
		// last group off the twelve longest countries.
		expect(input).toContain('maxLength={FormHelperCommon.IBAN_MAX_FORMATTED_LENGTH}');
		expect(input).not.toContain('maxLength={34}');
	});
});
