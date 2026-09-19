// Jest test: the content model behind templates/form-document.liquid
import { describe, expect, it } from '@jest/globals';
import { DatabaseTypes, FormHelperCommon } from 'repo-depkit-common';
import { FormPdfDocumentHelper } from '../FormPdfDocumentHelper';
import { MyDatabaseTestableHelper } from '../../MyDatabaseHelperInterface';
import { FormExtractFormAnswer, FormExtractFormAnswerValueFileSingleOrString, FormExtractRelevantInformation, FormExtractRelevantInformationSingle } from '../../../forms-sync-hook';

const FIELD_TYPE = FormHelperCommon.FORM_FIELD_TYPE;

type AnswerValues = {
  value_string?: string | null;
  value_number?: number | null;
  value_boolean?: boolean | null;
  value_date?: string | null;
  value_image?: string | null;
  value_files?: string[];
};

function buildExtract(alias: string, fieldType: string, values: AnswerValues = {}): FormExtractRelevantInformationSingle {
  const formField = {
    alias,
    field_type: fieldType,
    export_settings: '',
    form_settings: '',
    import_settings: '',
    id: `field-${alias}`,
    status: 'published',
    translations: [],
  } as unknown as DatabaseTypes.FormFields;

  const answer = {
    form_field: formField.id,
    form_submission: 'submission',
    id: `answer-${alias}`,
    sort: 0,
    status: 'published',
    value_boolean: values.value_boolean ?? null,
    value_custom: null,
    value_date: values.value_date ?? null,
    value_files: (values.value_files ?? []) as unknown as FormExtractFormAnswerValueFileSingleOrString[],
    value_image: values.value_image as unknown as DatabaseTypes.DirectusFiles | null,
    value_number: values.value_number ?? null,
    value_string: values.value_string ?? null,
    values: '',
  } as unknown as FormExtractFormAnswer;

  return { form_field_id: formField.id, sort: 0, form_field: formField, form_answer: answer };
}

function buildDocument(formExtractRelevantInformation: FormExtractRelevantInformation) {
  return FormPdfDocumentHelper.buildFormDocument({
    form: { id: 'form-id', alias: 'Übergabeprotokoll' } as unknown as DatabaseTypes.Forms,
    formExtractRelevantInformation,
    myDatabaseHelperInterface: new MyDatabaseTestableHelper(),
  });
}

describe('FormPdfDocumentHelper', () => {
  it('uses the form alias as document title', () => {
    const document = buildDocument([buildExtract('Wohnheim', FIELD_TYPE.STRING, { value_string: 'Dorotheenstr. 5' })]);
    expect(document.documentTitle).toBe('Übergabeprotokoll');
  });

  it('groups consecutive fields that share an alias prefix into one section', () => {
    const document = buildDocument([buildExtract('Wohnheim', FIELD_TYPE.STRING, { value_string: 'Dorotheenstr. 5' }), buildExtract('Mieter: Vorname', FIELD_TYPE.STRING, { value_string: 'Max' }), buildExtract('Mieter: Nachname', FIELD_TYPE.STRING, { value_string: 'Mustermann' })]);

    expect(document.sections).toHaveLength(2);
    expect(document.sections[0]?.title).toBeNull();
    expect(document.sections[0]?.rows.map(row => row.label)).toEqual(['Wohnheim']);
    expect(document.sections[1]?.title).toBe('Mieter');
    expect(document.sections[1]?.rows.map(row => row.label)).toEqual(['Vorname', 'Nachname']);
  });

  it('keeps the full label when a prefix is used by a single field only', () => {
    const document = buildDocument([buildExtract('Mieter: Nummer', FIELD_TYPE.STRING, { value_string: '188030' }), buildExtract('Wohnheim', FIELD_TYPE.STRING, { value_string: 'Dorotheenstr. 5' })]);

    expect(document.sections).toHaveLength(1);
    expect(document.sections[0]?.title).toBeNull();
    expect(document.sections[0]?.rows.map(row => row.label)).toEqual(['Mieter: Nummer', 'Wohnheim']);
  });

  it('keeps the order of the fields the form author defined', () => {
    const document = buildDocument([buildExtract('Mieter: Vorname', FIELD_TYPE.STRING, { value_string: 'Max' }), buildExtract('Mieter: Nachname', FIELD_TYPE.STRING, { value_string: 'Mustermann' }), buildExtract('Auszugsdatum', FIELD_TYPE.DATE, { value_date: '2000-01-01T00:00:00.000Z' }), buildExtract('Mieter: Telefon', FIELD_TYPE.STRING, { value_string: '0123' })]);

    const labelsInOrder = document.sections.flatMap(section => section.rows.map(row => row.label));
    expect(labelsInOrder).toEqual(['Vorname', 'Nachname', 'Auszugsdatum', 'Mieter: Telefon']);
  });

  it('prints a row for a field nobody filled in', () => {
    const document = buildDocument([buildExtract('Konto-Inhaber/in', FIELD_TYPE.STRING, { value_string: null })]);

    expect(document.sections[0]?.rows[0]).toMatchObject({ type: 'text', label: 'Konto-Inhaber/in', text: '' });
  });

  it('renders a checkbox for both answers of a boolean field', () => {
    const document = buildDocument([buildExtract('Mängelfrei?', FIELD_TYPE.BOOLEAN_CHECKBOX, { value_boolean: true }), buildExtract('Mieterbelastung', FIELD_TYPE.BOOLEAN_CHECKBOX, { value_boolean: false }), buildExtract('Unbeantwortet', FIELD_TYPE.BOOLEAN_CHECKBOX, { value_boolean: null })]);

    const rows = document.sections[0]?.rows ?? [];
    expect(rows[0]?.options?.map(option => option.checked)).toEqual([false, true]);
    expect(rows[1]?.options?.map(option => option.checked)).toEqual([true, false]);
    expect(rows[2]?.options?.map(option => option.checked)).toEqual([false, false]);
  });

  it('splits an IBAN into groups of four characters', () => {
    const document = buildDocument([buildExtract('Bankverbindung', FIELD_TYPE.STRING_BANK_ACCOUNT, { value_string: 'DE89 3704 0044 0532 0130 00' })]);

    const row = document.sections[0]?.rows[0];
    expect(row?.type).toBe('character_boxes');
    expect(row?.boxGroups).toEqual([
      ['D', 'E', '8', '9'],
      ['3', '7', '0', '4'],
      ['0', '0', '4', '4'],
      ['0', '5', '3', '2'],
      ['0', '1', '3', '0'],
      ['0', '0'],
    ]);
  });

  it('prints empty boxes when no bank details were given', () => {
    const document = buildDocument([buildExtract('IBAN', FIELD_TYPE.STRING_BANK_ACCOUNT, { value_string: null }), buildExtract('BIC', FIELD_TYPE.STRING_BIC, { value_string: null })]);

    const rows = document.sections[0]?.rows ?? [];
    const countBoxes = (boxGroups: string[][] | undefined) => (boxGroups ?? []).reduce((sum, group) => sum + group.length, 0);
    expect(countBoxes(rows[0]?.boxGroups)).toBe(22);
    expect(countBoxes(rows[1]?.boxGroups)).toBe(11);
    expect(rows[0]?.boxGroups?.[0]).toEqual(['', '', '', '']);
  });

  it('formats numbers in German notation and keeps prefix and suffix', () => {
    const extract = buildExtract('Kaution', FIELD_TYPE.NUMBER, { value_number: 1380.5 });
    extract.form_field.value_prefix = '€ ';
    extract.form_field.value_suffix = ' brutto';

    const document = buildDocument([extract]);
    expect(document.sections[0]?.rows[0]?.text).toBe('€ 1.380,50 brutto');
  });

  it('puts signatures and photos into their own areas instead of the field list', () => {
    const document = buildDocument([buildExtract('Zimmer', FIELD_TYPE.STRING, { value_string: '42-7' }), buildExtract('Unterschrift Heimleitung', FIELD_TYPE.FILES_IMAGE_SIGNATURE, { value_image: 'https://example.com/signature.png' }), buildExtract('Unterschrift Mieter/in', FIELD_TYPE.FILES_IMAGE_SIGNATURE, { value_image: null }), buildExtract('Mängel: Fotos', FIELD_TYPE.FILES_FILES, { value_files: ['https://example.com/a.jpg', 'https://example.com/b.jpg'] })]);

    expect(document.sections.flatMap(section => section.rows).map(row => row.label)).toEqual(['Zimmer']);
    expect(document.signatures).toEqual([
      { label: 'Unterschrift Heimleitung', imageUrl: 'https://example.com/signature.png' },
      { label: 'Unterschrift Mieter/in', imageUrl: null },
    ]);
    expect(document.attachments).toEqual([
      { label: 'Mängel: Fotos (1/2)', imageUrl: 'https://example.com/a.jpg' },
      { label: 'Mängel: Fotos (2/2)', imageUrl: 'https://example.com/b.jpg' },
    ]);
  });
});
