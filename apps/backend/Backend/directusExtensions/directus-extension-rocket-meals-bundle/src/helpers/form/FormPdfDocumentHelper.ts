/**
 * FormPdfDocumentHelper.ts – baut aus einem ausgefüllten Formular das Datenmodell für
 * `templates/form-document.liquid`.
 *
 * Bis hierher hat das Backend die HTML-Struktur des PDFs selbst zusammengesetzt. Das Aussehen
 * eines gedruckten Formulars – Beschriftungsspalte, Schreiblinie, Ankreuzfelder, IBAN-Kästchen –
 * lässt sich so kaum pflegen. Deshalb liefert dieser Helper nur noch **Inhalt**: Abschnitte,
 * Zeilen, Unterschriften, Anhänge. Wie das gesetzt wird, entscheidet das Liquid-Template.
 *
 * Zwei Konventionen bestimmen die Struktur:
 * - **Abschnitte** entstehen aus dem Alias der Felder. Stehen mehrere Felder mit demselben
 *   Präfix vor dem Doppelpunkt direkt hintereinander (`Mieter: Vorname`, `Mieter: Nachname`),
 *   werden sie zu einem Abschnitt „Mieter" mit den Beschriftungen „Vorname", „Nachname"
 *   zusammengefasst. Die Reihenfolge der Felder bleibt dabei unangetastet – ein Protokoll ist
 *   ein Dokument, dessen Reihenfolge der Formularautor festgelegt hat.
 * - **Leere Felder verschwinden nicht.** Ein Formular zeigt auch die Zeilen, die niemand
 *   ausgefüllt hat; nur so ist dem Leser klar, dass nichts fehlt, sondern nichts eingetragen
 *   wurde. Ausgenommen sind Bilder: ein leerer Bildrahmen sagt nichts.
 */

import { FormExtractFormAnswerValueFileSingle, FormExtractFormAnswerValueFileSingleOrString, FormExtractRelevantInformation, FormExtractRelevantInformationSingle } from '../../forms-sync-hook';
import { DirectusFilesAssetHelper } from '../DirectusFilesAssetHelper';
import { MyDatabaseTestableHelperInterface } from '../MyDatabaseHelperInterface';
import { BackendTranslationKeys, BackendTranslator } from '../translations';
import { DatabaseTypes, DateHelper, FormHelperCommon, NumberHelper, StringHelper } from 'repo-depkit-common';
import { EnvVariableHelper } from '../EnvVariableHelper';

export type FormGenerationParams = {
  form: DatabaseTypes.Forms;
  formExtractRelevantInformation: FormExtractRelevantInformation;
  myDatabaseHelperInterface: MyDatabaseTestableHelperInterface;
};

/** Welche Darstellung eine Formularzeile im Template bekommt. */
export type FormDocumentRowType = 'text' | 'multiline' | 'boolean' | 'character_boxes';

/** Eine Option eines Ankreuzfeldes, z. B. „Ja" oder „Nein". */
export type FormDocumentCheckboxOption = {
  label: string;
  checked: boolean;
};

export type FormDocumentRow = {
  type: FormDocumentRowType;
  label: string;
  /** Der Wert als reiner Text; leer, wenn das Feld nicht ausgefüllt wurde. */
  text: string;
  /** Nur bei `boolean`: die Optionen in Anzeigereihenfolge. */
  options?: FormDocumentCheckboxOption[];
  /** Nur bei `character_boxes`: Zeichen in Vierergruppen, wie auf Papierformularen. */
  boxGroups?: string[][];
};

export type FormDocumentSection = {
  /** `null`, wenn die Zeilen zu keinem gemeinsamen Abschnitt gehören. */
  title: string | null;
  rows: FormDocumentRow[];
};

export type FormDocumentSignature = {
  label: string;
  /** `null`, wenn nicht unterschrieben wurde – die Linie wird trotzdem gedruckt. */
  imageUrl: string | null;
};

export type FormDocumentAttachment = {
  label: string;
  imageUrl: string;
};

export type FormDocument = {
  documentTitle: string;
  documentSubtitle: string | null;
  sections: FormDocumentSection[];
  signatures: FormDocumentSignature[];
  attachments: FormDocumentAttachment[];
  attachmentsTitle: string;
};

/** Ein Feld mit aufgeteilter Beschriftung, bevor daraus Abschnitte werden. */
type LabelledRow = {
  groupTitle: string | null;
  labelWithoutGroup: string;
  fullLabel: string;
  row: FormDocumentRow;
};

export class FormPdfDocumentHelper {
  private static readonly IMAGE_TRANSFORM_OPTIONS = DirectusFilesAssetHelper.PRESET_FILE_TRANSFORMATION_IMAGE_HD;
  private static readonly SIGNATURE_TRANSFORM_OPTIONS = DirectusFilesAssetHelper.PRESET_FILE_TRANSFORMATION_IMAGE_ORIGINAL;

  /** Trennzeichen, an dem der Alias eines Feldes in Abschnitt und Beschriftung zerfällt. */
  private static readonly GROUP_SEPARATOR = ':';

  /** Kästchen pro Gruppe – so sind IBANs auf Papierformularen gesetzt. */
  public static readonly CHARACTER_BOX_GROUP_SIZE = 4;

  /** Wie viele leere Kästchen gedruckt werden, wenn nichts eingetragen wurde. */
  private static readonly EMPTY_BOX_COUNT_IBAN = 22;
  private static readonly EMPTY_BOX_COUNT_BIC = 11;

  // ── Dokument ──────────────────────────────────────────────────────────────

  public static buildFormDocument(params: FormGenerationParams): FormDocument {
    const { form, formExtractRelevantInformation, myDatabaseHelperInterface } = params;

    const labelledRows: LabelledRow[] = [];
    const signatures: FormDocumentSignature[] = [];
    const attachments: FormDocumentAttachment[] = [];

    for (const formExtract of formExtractRelevantInformation) {
      const label = this.getFieldLabel(formExtract);
      const fieldType = formExtract.form_field.field_type ?? '';

      if (fieldType === FormHelperCommon.FORM_FIELD_TYPE.FILES_IMAGE_SIGNATURE) {
        signatures.push({
          label,
          imageUrl: this.resolveImageUrl(formExtract.form_answer.value_image, myDatabaseHelperInterface, true),
        });
        continue;
      }

      const attachmentsOfField = this.buildAttachmentsForField(label, formExtract, myDatabaseHelperInterface);
      if (attachmentsOfField.length > 0) {
        attachments.push(...attachmentsOfField);
        continue;
      }

      const row = this.buildRowForField(label, formExtract);
      if (row) {
        labelledRows.push(this.splitLabelIntoGroupAndLabel(row));
      }
    }

    return {
      documentTitle: form.alias || form.id,
      documentSubtitle: null,
      sections: this.buildSections(labelledRows),
      signatures,
      attachments,
      attachmentsTitle: BackendTranslator.translate(BackendTranslationKeys.form_pdf_attachments),
    };
  }

  // ── Abschnitte aus den Feld-Aliassen ──────────────────────────────────────

  /**
   * Fasst direkt aufeinanderfolgende Zeilen mit demselben Präfix zu einem Abschnitt zusammen.
   * Ein Präfix, das nur ein einziges Feld betrifft, wird nicht zum Abschnitt – dann bleibt die
   * vollständige Beschriftung stehen.
   */
  private static buildSections(labelledRows: LabelledRow[]): FormDocumentSection[] {
    const sections: FormDocumentSection[] = [];

    let index = 0;
    while (index < labelledRows.length) {
      const currentLabelledRow = labelledRows[index];
      if (!currentLabelledRow) {
        break;
      }
      const groupTitle = currentLabelledRow.groupTitle;

      let endIndex = index + 1;
      if (groupTitle) {
        while (labelledRows[endIndex]?.groupTitle === groupTitle) {
          endIndex++;
        }
      }

      const runLength = endIndex - index;
      const isSection = groupTitle !== null && runLength > 1;

      if (isSection) {
        sections.push({
          title: groupTitle,
          rows: labelledRows.slice(index, endIndex).map(labelledRow => ({ ...labelledRow.row, label: labelledRow.labelWithoutGroup })),
        });
      } else {
        const row = { ...currentLabelledRow.row, label: currentLabelledRow.fullLabel };
        const lastSection = sections[sections.length - 1];
        if (lastSection && lastSection.title === null) {
          lastSection.rows.push(row);
        } else {
          sections.push({ title: null, rows: [row] });
        }
      }

      index = isSection ? endIndex : index + 1;
    }

    return sections;
  }

  private static splitLabelIntoGroupAndLabel(row: FormDocumentRow): LabelledRow {
    const fullLabel = row.label;
    const separatorIndex = fullLabel.indexOf(this.GROUP_SEPARATOR);
    const groupTitle = separatorIndex > 0 ? fullLabel.slice(0, separatorIndex).trim() : '';
    const labelWithoutGroup = separatorIndex > 0 ? fullLabel.slice(separatorIndex + 1).trim() : '';

    if (!groupTitle || !labelWithoutGroup) {
      return { groupTitle: null, labelWithoutGroup: fullLabel, fullLabel, row };
    }
    return { groupTitle, labelWithoutGroup, fullLabel, row };
  }

  // ── Einzelne Zeilen ───────────────────────────────────────────────────────

  private static getFieldLabel(formExtract: FormExtractRelevantInformationSingle): string {
    return formExtract.form_field.alias || formExtract.form_field.id;
  }

  private static buildRowForField(label: string, formExtract: FormExtractRelevantInformationSingle): FormDocumentRow | null {
    const fieldType = formExtract.form_field.field_type ?? '';
    const FIELD_TYPE = FormHelperCommon.FORM_FIELD_TYPE;

    if (fieldType === FIELD_TYPE.BOOLEAN_CHECKBOX) {
      return this.buildBooleanRow(label, formExtract.form_answer.value_boolean);
    }
    if (fieldType === FIELD_TYPE.STRING_BANK_ACCOUNT || fieldType === FIELD_TYPE.STRING_BIC) {
      return this.buildCharacterBoxesRow(label, formExtract.form_answer.value_string, fieldType);
    }
    if (fieldType === FIELD_TYPE.MULTILINE_TEXT) {
      return { type: 'multiline', label, text: formExtract.form_answer.value_string ?? '' };
    }
    if (FormHelperCommon.isDateFieldType(fieldType)) {
      return { type: 'text', label, text: this.formatDateValue(formExtract) };
    }
    if (formExtract.form_answer.value_number !== null && formExtract.form_answer.value_number !== undefined) {
      return { type: 'text', label, text: this.formatValueWithPrefixAndSuffix(formExtract.form_answer.value_number, formExtract.form_field) };
    }
    if (fieldType === FIELD_TYPE.NUMBER) {
      return { type: 'text', label, text: '' };
    }
    if (fieldType === FIELD_TYPE.FILES_IMAGE || fieldType === FIELD_TYPE.FILES_FILES) {
      // Ein Bildfeld ohne Bild bekommt keine leere Zeile – siehe Dateikopf.
      return null;
    }

    const value = formExtract.form_answer.value_string;
    return {
      type: 'text',
      label,
      text: value ? this.formatValueWithPrefixAndSuffix(value, formExtract.form_field) : '',
    };
  }

  private static buildBooleanRow(label: string, value: boolean | null | undefined): FormDocumentRow {
    return {
      type: 'boolean',
      label,
      text: '',
      options: [
        { label: BackendTranslator.translate(BackendTranslationKeys.no), checked: value === false },
        { label: BackendTranslator.translate(BackendTranslationKeys.yes), checked: value === true },
      ],
    };
  }

  private static buildCharacterBoxesRow(label: string, value: string | null | undefined, fieldType: string): FormDocumentRow {
    const cleanedValue = value ? StringHelper.replaceAllWithOptions({ str: value, find: String.raw`\s`, replace: '' }).toUpperCase() : '';
    const emptyBoxCount = fieldType === FormHelperCommon.FORM_FIELD_TYPE.STRING_BIC ? this.EMPTY_BOX_COUNT_BIC : this.EMPTY_BOX_COUNT_IBAN;
    const characterCount = cleanedValue.length > 0 ? cleanedValue.length : emptyBoxCount;

    const boxGroups: string[][] = [];
    let currentGroup: string[] = [];
    for (let index = 0; index < characterCount; index++) {
      if (index % this.CHARACTER_BOX_GROUP_SIZE === 0) {
        currentGroup = [];
        boxGroups.push(currentGroup);
      }
      currentGroup.push(cleanedValue[index] ?? '');
    }

    return { type: 'character_boxes', label, text: cleanedValue, boxGroups };
  }

  private static formatDateValue(formExtract: FormExtractRelevantInformationSingle): string {
    const value = formExtract.form_answer.value_date;
    if (!value) {
      return '';
    }
    const momentFormat = this.getMomentFormatForFieldType(formExtract.form_field.field_type ?? '');
    return DateHelper.formatDateToTimeZoneReadable(new Date(value), EnvVariableHelper.getTimeZoneString(), momentFormat);
  }

  private static getMomentFormatForFieldType(fieldType: string): string {
    switch (fieldType) {
      case FormHelperCommon.FORM_FIELD_TYPE.DATE_HH_MM:
        return DateHelper.MOMENT_FORMAT.DATE_HH_MM;
      case FormHelperCommon.FORM_FIELD_TYPE.DATE_DATE_AND_HH_MM:
        return DateHelper.MOMENT_FORMAT.DATE_AND_HH_MM;
      case FormHelperCommon.FORM_FIELD_TYPE.DATE_TIMESTAMP:
        return DateHelper.MOMENT_FORMAT.DATE_TIMESTAMP;
      default:
        return DateHelper.MOMENT_FORMAT.DATE_ONLY;
    }
  }

  private static formatValueWithPrefixAndSuffix(value: string | number, formField: DatabaseTypes.FormFields): string {
    const prefix = formField.value_prefix || '';
    const suffix = formField.value_suffix || '';
    let formattedValue: string;
    if (typeof value === 'number') {
      // Deutsche Schreibweise: Komma als Dezimaltrenner, Punkt als Tausendertrenner.
      formattedValue = NumberHelper.formatNumber(value, null, true, ',', '.', 2);
    } else {
      formattedValue = value;
    }
    return `${prefix}${formattedValue}${suffix}`;
  }

  // ── Bilder ────────────────────────────────────────────────────────────────

  private static buildAttachmentsForField(label: string, formExtract: FormExtractRelevantInformationSingle, myDatabaseHelperInterface: MyDatabaseTestableHelperInterface): FormDocumentAttachment[] {
    const imageUrls: string[] = [];

    const imageUrl = this.resolveImageUrl(formExtract.form_answer.value_image, myDatabaseHelperInterface, false);
    if (imageUrl) {
      imageUrls.push(imageUrl);
    }
    for (const file of formExtract.form_answer.value_files || []) {
      const fileUrl = this.resolveFileUrl(file, myDatabaseHelperInterface);
      if (fileUrl) {
        imageUrls.push(fileUrl);
      }
    }

    return imageUrls.map((url, index) => ({
      label: imageUrls.length > 1 ? `${label} (${index + 1}/${imageUrls.length})` : label,
      imageUrl: url,
    }));
  }

  private static resolveImageUrl(value_image: DatabaseTypes.DirectusFiles | string | null | undefined, myDatabaseHelperInterface: MyDatabaseTestableHelperInterface, isSignature: boolean): string | null {
    if (!value_image) {
      return null;
    }
    if (typeof value_image === 'string' && (value_image.startsWith('http') || value_image.startsWith('data:'))) {
      return value_image;
    }
    // Eine Unterschrift ist kein quadratisches Bild und darf nicht beschnitten werden.
    const transformOptions = isSignature ? this.SIGNATURE_TRANSFORM_OPTIONS : this.IMAGE_TRANSFORM_OPTIONS;
    return DirectusFilesAssetHelper.getDirectAssetUrlByObjectOrId(value_image, myDatabaseHelperInterface, transformOptions) ?? null;
  }

  private static resolveFileUrl(value_file: FormExtractFormAnswerValueFileSingleOrString | null | undefined, myDatabaseHelperInterface: MyDatabaseTestableHelperInterface): string | null {
    if (!value_file) {
      return null;
    }
    if (typeof value_file === 'string') {
      return value_file.startsWith('http') || value_file.startsWith('data:') ? value_file : null;
    }
    const valueFileAsObject = value_file as FormExtractFormAnswerValueFileSingle;
    return DirectusFilesAssetHelper.getDirectAssetUrlByObjectOrId(valueFileAsObject.directus_files_id, myDatabaseHelperInterface, this.IMAGE_TRANSFORM_OPTIONS) ?? null;
  }
}
