// Jest test: convert forms_export.json forms to PDFs with auto-filled example data
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { TestArtifacts } from '../../../../TestArtifacts';
import { FormHelper } from '../../../FormHelper';
import { PdfGeneratorForJest } from '../../../../pdf/PdfGeneratorHelperForJest';
import { MyDatabaseTestableHelper } from '../../../../MyDatabaseHelperInterface';
import { DatabaseTypes, FormHelperCommon, StringHelper } from 'repo-depkit-common';
import {
  FormExtractFormAnswer,
  FormExtractFormAnswerValueFileSingleOrString,
  FormExtractRelevantInformation,
  FormExtractRelevantInformationSingle,
} from '../../../../../forms-sync-hook';

PdfGeneratorForJest.activateForJest();

// ── Example fill values ──────────────────────────────────────────────────────

const EXAMPLE_STRING    = 'Max Mustermann';
const EXAMPLE_MULTILINE =
  'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum.';
const EXAMPLE_EMAIL     = 'max.mustermann@example.com';
const EXAMPLE_IBAN      = 'DE89370400440532013000';
const EXAMPLE_BIC       = 'DEUTDEDBXXX';
const EXAMPLE_NUMBER    = 12345.67;
const EXAMPLE_DATE      = '2000-01-01T00:00:00.000Z'; // 01.01.2000
// EXAMPLE_DROPDOWN is resolved dynamically from dropdown_values; this is the fallback
const EXAMPLE_DROPDOWN_FALLBACK = 'Option A';
// Photo URLs used for FILES_FILES fields — use larger images so they render clearly
const EXAMPLE_FILE_PHOTOS = [
  'https://picsum.photos/600/400',
  'https://picsum.photos/601/400',
];

// Signature image as data URI (reuse existing test fixture)
const SIGNATURE_PNG_PATH = path.join(__dirname, '../../../__tests__/data/signature_handwritten_example.png');
const EXAMPLE_SIGNATURE_DATA_URI: string | null = fs.existsSync(SIGNATURE_PNG_PATH)
  ? `data:image/png;base64,${fs.readFileSync(SIGNATURE_PNG_PATH).toString('base64')}`
  : null;

// A small placeholder image URL for regular image fields
const EXAMPLE_IMAGE_URL: string = EXAMPLE_FILE_PHOTOS[0] ?? 'https://picsum.photos/600/400';

// ── Helper: build a FormExtractRelevantInformationSingle from a raw form field ─

function buildExtract(
  formField: DatabaseTypes.FormFields,
  submissionId: string,
  index: number,
  fillWithExampleValues = true,
): FormExtractRelevantInformationSingle {
  const ft = formField.field_type ?? '';
  const FT = FormHelperCommon.FORM_FIELD_TYPE;

  let value_string: string | null   = null;
  let value_number: number | null   = null;
  let value_boolean: boolean | null = null;
  let value_date: string | null     = null;
  let value_image: string | null    = null;
  let value_files: string[]         = [];

  // Ein unausgefülltes Formular ist der zweite Fall, den das Layout können muss: es druckt die
  // Beschriftungen mit leeren Linien, statt die Zeilen wegzulassen.
  switch (fillWithExampleValues ? ft : '') {
    case FT.STRING:
    case FT.STRING_ADDRESS:
      value_string = EXAMPLE_STRING;
      break;
    case FT.MULTILINE_TEXT:
      value_string = EXAMPLE_MULTILINE;
      break;
    case FT.DROPDOWN: {
      // Use the first option from dropdown_values if available, otherwise fall back
      const rawOptions = formField.dropdown_values;
      const options: string[] = Array.isArray(rawOptions) ? (rawOptions as string[]) : [];
      value_string = options[0] ?? EXAMPLE_DROPDOWN_FALLBACK;
      break;
    }
    case FT.STRING_EMAIL:
      value_string = EXAMPLE_EMAIL;
      break;
    case FT.STRING_BANK_ACCOUNT:
      value_string = EXAMPLE_IBAN;
      break;
    case FT.STRING_BIC:
      value_string = EXAMPLE_BIC;
      break;
    case FT.NUMBER:
      value_number = EXAMPLE_NUMBER;
      break;
    case FT.BOOLEAN_CHECKBOX:
      value_boolean = false;
      break;
    case FT.DATE:
    case FT.DATE_HH_MM:
    case FT.DATE_TIMESTAMP:
    case FT.DATE_DATE_AND_HH_MM:
      value_date = EXAMPLE_DATE;
      break;
    case FT.FILES_IMAGE_SIGNATURE:
      value_image = EXAMPLE_SIGNATURE_DATA_URI;
      break;
    case FT.FILES_IMAGE:
      value_image = EXAMPLE_IMAGE_URL;
      break;
    case FT.FILES_FILES:
      value_files = EXAMPLE_FILE_PHOTOS;
      break;
    default:
      break;
  }

  const answer: FormExtractFormAnswer = {
    date_created: '2000-01-01T00:00:00.000Z',
    date_updated: '2000-01-01T00:00:00.000Z',
    form_field: formField.id,
    form_submission: submissionId,
    id: `answer-${index}-${formField.id}`,
    sort: index,
    status: 'published',
    user_created: '1',
    user_updated: '1',
    value_boolean,
    value_custom: null,
    value_date,
    value_files: value_files as unknown as FormExtractFormAnswerValueFileSingleOrString[],
    value_image: value_image as unknown as DatabaseTypes.DirectusFiles | null,
    value_number,
    value_string,
    values: '',
  };

  return {
    form_field_id: formField.id,
    sort: index,
    form_field: formField,
    form_answer: answer,
  };
}

function buildFormExtract(form: DatabaseTypes.Forms, fillWithExampleValues = true): FormExtractRelevantInformation {
  const submissionId = `test-submission-${form.id}`;
  const fields: DatabaseTypes.FormFields[] = (form.form_fields ?? []) as DatabaseTypes.FormFields[];
  return fields
    .filter(ff => ff.status === 'published' && ff.is_visible_in_export !== false)
    .map((ff, idx) => buildExtract(ff, submissionId, idx, fillWithExampleValues));
}

// ── Tests ────────────────────────────────────────────────────────────────────

const FORMS_EXPORT_PATH = path.join(__dirname, '../reference_form/forms_export.json');

async function generatePdfsForAllForms(fillWithExampleValues: boolean, fileNameSuffix: string): Promise<void> {
  const raw = fs.readFileSync(FORMS_EXPORT_PATH, 'utf-8');
  const forms: DatabaseTypes.Forms[] = JSON.parse(raw);
  expect(forms.length).toBeGreaterThan(0);

  const myDatabaseHelper = new MyDatabaseTestableHelper();
  const requestOptions = { mockImageResolution: true };

  for (const form of forms) {
    const formExtract = buildFormExtract(form, fillWithExampleValues);
    const pdfBuffer = await FormHelper.generatePdfFromForm({
      form,
      formExtractRelevantInformation: formExtract,
      myDatabaseHelperInterface: myDatabaseHelper,
      requestOptions,
    });
    expect(pdfBuffer).toBeTruthy();
    const safeName = StringHelper.replaceAllWithOptions({ str: (form.alias ?? form.id ?? 'unknown'), find: '[^a-z0-9_\\-]', replace: '_', flags: 'gi' });
    TestArtifacts.saveTestArtifact(pdfBuffer, `form/pdf/hannover/${safeName}${fileNameSuffix}.pdf`);
  }
}

describe('Hannover forms_export PDF Generator', () => {
  it('forms_export.json exists', () => {
    expect(fs.existsSync(FORMS_EXPORT_PATH)).toBe(true);
  });

  it('generates a PDF for every form in forms_export.json', async () => {
    await generatePdfsForAllForms(true, '');
  });

  it('generates a PDF for every form without any answers', async () => {
    await generatePdfsForAllForms(false, '_leer');
  });
});
