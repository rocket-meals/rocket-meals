import { FormExtractFormAnswer, FormExtractFormAnswerValueFileSingle, FormExtractFormAnswerValueFileSingleOrString, FormExtractRelevantInformation, FormExtractRelevantInformationSingle } from '../../forms-sync-hook';
import { BaseGermanMarkdownTemplateHelper, DEFAULT_HTML_TEMPLATE, HtmlGenerator } from '../html/HtmlGenerator';
import { PdfGeneratorHelper } from '../pdf/PdfGeneratorHelper';
import { RequestOptions } from '../pdf/PdfGeneratorInterfaces';
import { DirectusFilesAssetHelper } from '../DirectusFilesAssetHelper';
import { MarkdownHelper } from '../html/MarkdownHelper';
import { MyDatabaseTestableHelperInterface } from '../MyDatabaseHelperInterface';
import { TranslationBackendKeys, TranslationsBackend } from '../TranslationsBackend';
import {DatabaseTypes, DateHelper, DateHelperTimezone, FormHelperCommon, NumberHelper} from 'repo-depkit-common';
import { EnvVariableHelper } from '../EnvVariableHelper';
import { HashHelper } from '../HashHelper';
import {GeneratePdfFromHtmlProps} from "../pdf/HtmlPdfGeneratorInterface";
import * as fs from 'fs';
import * as path from 'path';

type FormFieldExampleData = {
  value_string?: string | null;
  value_number?: number | null;
  value_boolean?: boolean | null;
  value_date?: string | null;
  value_image?: DatabaseTypes.DirectusFiles | string | null;
  value_files?: FormExtractFormAnswerValueFileSingleOrString[] | null;
  value_custom?: string | null;
};

type AddFormFieldParams = {
  alias: string;
  data: FormFieldExampleData;
  form_field_type: string;
  prefix?: string;
  suffix?: string;
  form_submission_id: string;
  index: number;
};

export type FormGenerationParams = {
  form: DatabaseTypes.Forms;
  formExtractRelevantInformation: FormExtractRelevantInformation;
  myDatabaseHelperInterface: MyDatabaseTestableHelperInterface;
};

export type ImageValueParams = {
  fieldName: string;
  value_image: DatabaseTypes.DirectusFiles | string | null | undefined;
  myDatabaseHelperInterface: MyDatabaseTestableHelperInterface;
};

export class FormHelper {
  private static readonly FORM_IMAGE_TRANSFORM_OPTIONS = DirectusFilesAssetHelper.PRESET_FILE_TRANSFORMATION_IMAGE_HD;

  public static getExampleForm(): DatabaseTypes.Forms {
    return {
      form_fields: [], form_submissions: [], translations: [],
      id: 'example-form',
      alias: 'Example Form: Abnahmeprotokoll',
      date_created: '2021-09-01T00:00:00.000Z',
      date_updated: '2021-09-01T00:00:00.000Z',
      status: 'published',
      user_created: '1',
      user_updated: '1'
    };
  }

  public static getExampleFormExtractRelevantInformation(): FormExtractRelevantInformation {
    let formExtractRelevantInformation: FormExtractRelevantInformation = [];
    let form_submission_id = Math.random().toString();

    let index = 0;

    formExtractRelevantInformation.push(this.addFormField({
        alias: 'Text Field',
        data: { value_string: 'This is a long text example' },
        form_field_type: FormHelperCommon.FORM_FIELD_TYPE.STRING,
        form_submission_id: form_submission_id,
        index: index++
    }));

    formExtractRelevantInformation.push(this.addFormField({
        alias: 'Text Field 2',
        data: { value_string: 'This is a long text example This is a long text example This is a long text example This is a long text example This is a long text example This is a long text example ' },
        form_field_type: FormHelperCommon.FORM_FIELD_TYPE.MULTILINE_TEXT,
        form_submission_id: form_submission_id,
        index: index++
    }));

    formExtractRelevantInformation.push(this.addFormField({
      alias: 'IBAN',
      data: { value_string: 'DE89370400440532013000' }, // example iban (DE89 3704 0044 0532 0130 00)
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.STRING_BANK_ACCOUNT,
      form_submission_id: form_submission_id,
      index: index++
    }));

    formExtractRelevantInformation.push(this.addFormField({
      alias: 'BIC',
      data: { value_string: 'DEUTDEDBXXX' }, // example bic (11 chars)
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.STRING_BIC,
      form_submission_id: form_submission_id,
      index: index++
    }));

    formExtractRelevantInformation.push(this.addFormField({
        alias: 'Number Field',
        data: { value_number: 12345.67 },
        form_field_type: FormHelperCommon.FORM_FIELD_TYPE.NUMBER,
        form_submission_id: form_submission_id,
        index: index++
    }));

    formExtractRelevantInformation.push(this.addFormField({
      alias: 'Number Field With Prefix',
      data: { value_number: 12345.67 },
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.NUMBER,
      prefix: "$ ",
      form_submission_id: form_submission_id,
      index: index++
    }));

    formExtractRelevantInformation.push(this.addFormField({
      alias: 'Number Field With Suffix',
      data: { value_number: 12345.67 },
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.NUMBER,
        suffix: " €",
      form_submission_id: form_submission_id,
      index: index++
    }));

    formExtractRelevantInformation.push(this.addFormField({
      alias: 'Number Field With Prefix And Suffix',
      data: { value_number: 12345.67 },
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.NUMBER,
      prefix: "€ ",
      suffix: " EUR",
      form_submission_id: form_submission_id,
      index: index++
    }));

    formExtractRelevantInformation.push(this.addFormField({
      alias: 'Boolean Field',
      data: { value_boolean: false },
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.BOOLEAN_CHECKBOX,
      form_submission_id: form_submission_id,
      index: index++
    }));

    formExtractRelevantInformation.push(this.addFormField({
      alias: 'Boolean Field True',
      data: { value_boolean: true },
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.BOOLEAN_CHECKBOX,
      form_submission_id: form_submission_id,
      index: index++
    }));

    let dateTypes = [
        FormHelperCommon.FORM_FIELD_TYPE.DATE,
        FormHelperCommon.FORM_FIELD_TYPE.DATE_HH_MM,
      FormHelperCommon.FORM_FIELD_TYPE.DATE_TIMESTAMP,
      FormHelperCommon.FORM_FIELD_TYPE.DATE_DATE_AND_HH_MM,
    ]
    for (let dateType of dateTypes) {
      formExtractRelevantInformation.push(this.addFormField({
        alias: dateType,
        data: { value_date: '2021-09-01T00:00:00.000Z' },
        form_field_type: dateType,
        form_submission_id: form_submission_id,
        index: index++
      }));
    }

    let sizes = [200, 400, 800, 1600];
    let images: string[] = [];
    for (let i = 0; i < sizes.length; i++) {
      let size = sizes[i];
      let imageUrl = `https://picsum.photos/${size}/${size}`;
      images.push(imageUrl);
    }

    formExtractRelevantInformation.push(this.addFormField({
        alias: 'Image Field',
        data: { value_image: images[0] },
        form_field_type: FormHelperCommon.FORM_FIELD_TYPE.FILES_IMAGE,
        form_submission_id: form_submission_id,
        index: index++
    }));

    formExtractRelevantInformation.push(this.addFormField({
      alias: 'Files Field',
      data: { value_files: images },
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.FILES_FILES,
      form_submission_id: form_submission_id,
      index: index++
    }));

    const signaturePngPath = path.join(__dirname, '__tests__', 'data', 'signature_handwritten_example.png');
    if (fs.existsSync(signaturePngPath)) {
      const signaturePngBuffer = fs.readFileSync(signaturePngPath);
      const signatureDataUri = `data:image/png;base64,${signaturePngBuffer.toString('base64')}`;
      formExtractRelevantInformation.push(this.addFormField({
        alias: 'Signature Field',
        data: { value_image: signatureDataUri },
        form_field_type: FormHelperCommon.FORM_FIELD_TYPE.FILES_IMAGE_SIGNATURE,
        form_submission_id: form_submission_id,
        index: index++
      }));
    }

    return formExtractRelevantInformation;
  }



  private static addFormField(obj: AddFormFieldParams): FormExtractRelevantInformationSingle {
    let form_field = this.getExampleFormField(obj);
    return {
      form_field_id: form_field.id,
      sort: obj.index,
      form_field: form_field,
      form_answer: this.getExampleFormExtractFormAnswer(form_field.id, obj.form_submission_id, obj.data),
    };
  }

  private static getExampleFormField(obj: AddFormFieldParams): DatabaseTypes.FormFields {
    return {
      alias: obj.alias,
      background_color: '#FFFFFF',
      date_created: '2021-09-01T00:00:00.000Z',
      date_updated: '2021-09-01T00:00:00.000Z',
      export_settings: '',
      external_export_field_name: null,
      external_export_id: null,
      external_import_id: null,
      field_type: obj.form_field_type,
      form: '1',
      form_settings: '',
      icon: '',
      icon_expo: '',
      id: Math.random().toString() + obj.alias,
      image: null,
      image_remote_url: null,
      image_thumb_hash: null,
      import_settings: '',
      internal_custom_id: null,
      is_disabled: false,
      is_required: false,
      is_visible_in_export: true,
      is_visible_in_form: true,
      visibility_rule: '',
      sort: 0,
      status: 'published',
      translations: [],
      user_created: '1',
      user_updated: '1',
      value_prefix: obj.prefix || null,
      value_suffix: obj.suffix || null,
    };
  }

  //"2021-09-01T00:00:00.000Z",

  private static getExampleFormExtractFormAnswer(
    form_field_id: string,
    form_submission_id: string,
    data: {
      value_string?: string | null;
      value_number?: number | null;
      value_boolean?: boolean | null;
      value_date?: string | null;
      value_image?: DatabaseTypes.DirectusFiles | string | null;
      value_files?: FormExtractFormAnswerValueFileSingleOrString[] | null;
      value_custom?: string | null;
    }
  ): FormExtractFormAnswer {
    let value_files: FormExtractFormAnswerValueFileSingleOrString[] = [];
    if (data.value_files) {
      value_files = data.value_files as FormExtractFormAnswerValueFileSingleOrString[];
    }
    let value_image = null;
    if (data.value_image) {
      value_image = data.value_image as DatabaseTypes.DirectusFiles;
    }

    return {
      date_created: '2021-09-01T00:00:00.000Z',
      date_updated: '2021-09-01T00:00:00.000Z',
      form_field: form_field_id,
      form_submission: form_submission_id,
      id: Math.random().toString(),
      sort: 0,
      status: 'published',
      user_created: '1',
      user_updated: '1',
      value_boolean: data.value_boolean !== undefined ? data.value_boolean : null,
      value_custom: data.value_custom || null,
      value_date: data.value_date || null,
      value_files: value_files || null,
      value_image: value_image || null,
      value_number: data.value_number || null,
      value_string: data.value_string || null,
      values: '',
    };
  }

  private static getFieldMarkdownNameBold(fieldName: string): string {
    return `**${fieldName}:** ` ;
  }

  private static getPrefix(formField: DatabaseTypes.FormFields){
    return formField.value_prefix || '';
  }

  private static getSuffix(formField: DatabaseTypes.FormFields){
    return formField.value_suffix || '';
  }

  private static formatValueWithPrefixAndSuffix(value: string | number, formField: DatabaseTypes.FormFields): string {
    let prefix = this.getPrefix(formField);
    let suffix = this.getSuffix(formField);
    let formattedValue: string;
    if (typeof value === 'number') {
      // NumberHelper.formatNumber(value, unit, roundUpOrDown, fractionsSeparator, thousandsSeparator, decimals)
      // German locale: comma decimal separator, dot thousands separator, 2 decimal places
      formattedValue = NumberHelper.formatNumber(value, null, true, ',', '.', 2);
    } else {
      formattedValue = value;
    }
    return `${prefix}${formattedValue}${suffix}`;
  }

  // ── HTML generation helpers ────────────────────────────────────────────────

  private static readonly FIELD_NAME_STYLE =
    'font-weight: 900; font-size: inherit;';

  /** Base style shared by every IBAN/BIC character box (no top border = open top). */
  private static readonly BANK_ACCOUNT_BOX_BASE_STYLE =
    'display:inline-block; border-bottom:1px solid #555; border-left:1px solid #555;' +
    ' width:14px; height:18px; text-align:center; font-family:monospace; font-size:11px;' +
    ' line-height:18px; margin:0; vertical-align:bottom;';

  /** Extra style appended to the last box in each group to close the right side. */
  private static readonly BANK_ACCOUNT_BOX_RIGHT_BORDER = 'border-right:1px solid #555;';

  /** Shared style for the empty/checked boolean checkbox square. */
  private static readonly BOOLEAN_CHECKBOX_STYLE =
    'display:inline-block; width:18px; height:18px; border:2px solid #333;' +
    ' vertical-align:middle; line-height:18px; text-align:center; font-size:14px; font-weight:900;';

  private static generateFieldNameHtml(fieldName: string): string {
    return `<strong style="${FormHelper.FIELD_NAME_STYLE}">${fieldName}:</strong>`;
  }

  /**
   * Renders a bank-account string (IBAN or BIC) as a row of bordered single-
   * character boxes, grouped in fours to match printed form conventions.
   * Only as many boxes as there are characters are rendered.
   * Each box has no top border (open top). Boxes within a group share borders
   * (collapsed) for a connected look; groups are separated by a small gap.
   */
  private static generateBankAccountBoxesHtml(value: string): string {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    const total = cleaned.length;

    let html = '<span style="display:inline-flex; flex-wrap:nowrap; align-items:flex-end; gap:0; line-height:0;">';
    for (let i = 0; i < total; i++) {
      const posInGroup = i % 4;
      const isLastInGroup = posInGroup === 3 || i === total - 1;

      if (i > 0 && posInGroup === 0) {
        // gap between groups
        html += '<span style="display:inline-block; width:5px;"></span>';
      }

      const boxStyle = isLastInGroup
        ? `${FormHelper.BANK_ACCOUNT_BOX_BASE_STYLE} ${FormHelper.BANK_ACCOUNT_BOX_RIGHT_BORDER}`
        : FormHelper.BANK_ACCOUNT_BOX_BASE_STYLE;
      html += `<span style="${boxStyle}">${cleaned[i]}</span>`;
    }
    html += '</span>';
    return html;
  }

  /**
   * Renders a boolean value as two labelled checkboxes:
   *   ☑ Nein   ☐ Ja   (when false)
   *   ☐ Nein   ☑ Ja   (when true)
   * The check symbol is rendered large and bold via CSS.
   */
  private static generateBooleanCheckboxHtml(value: boolean): string {
    const checkSymbol = '&#x2713;'; // ✓  thick check mark
    const checkStyle = FormHelper.BOOLEAN_CHECKBOX_STYLE;
    const emptyBox   = `<span style="${checkStyle}"></span>`;
    const checkedBox = `<span style="${checkStyle}">${checkSymbol}</span>`;

    const neinBox = value ? emptyBox : checkedBox;
    const jaBox   = value ? checkedBox : emptyBox;
    return (
      `<span style="margin-right:20px;">${neinBox}&nbsp;Nein</span>` +
      `<span>${jaBox}&nbsp;Ja</span>`
    );
  }

  private static generateHtmlForStringField(
    fieldName: string,
    formExtract: FormExtractRelevantInformationSingle,
  ): string {
    const value = formExtract.form_answer.value_string;
    if (!value) return '';
    const fieldType = formExtract.form_field.field_type;
    let valueHtml: string;
    if (fieldType === FormHelperCommon.FORM_FIELD_TYPE.STRING_BANK_ACCOUNT) {
      valueHtml = this.generateBankAccountBoxesHtml(value);
    } else if (fieldType === FormHelperCommon.FORM_FIELD_TYPE.STRING_BIC) {
      valueHtml = this.generateBankAccountBoxesHtml(value);
    } else {
      const formatted = this.formatValueWithPrefixAndSuffix(value, formExtract.form_field);
      valueHtml = `<span>${formatted}</span>`;
    }
    return `<div style="margin:4px 0 10px 0;">${this.generateFieldNameHtml(fieldName)} ${valueHtml}</div>\n`;
  }

  private static generateHtmlForNumberField(
    fieldName: string,
    formExtract: FormExtractRelevantInformationSingle,
  ): string {
    const value = formExtract.form_answer.value_number;
    if (value === null || value === undefined) return '';
    const formatted = this.formatValueWithPrefixAndSuffix(value, formExtract.form_field);
    return `<div style="margin:4px 0 10px 0;">${this.generateFieldNameHtml(fieldName)} <span>${formatted}</span></div>\n`;
  }

  private static generateHtmlForBooleanField(
    fieldName: string,
    value: boolean | null | undefined,
  ): string {
    if (value !== true && value !== false) return '';
    return `<div style="margin:4px 0 10px 0;">${this.generateFieldNameHtml(fieldName)}&nbsp;&nbsp;&nbsp;${this.generateBooleanCheckboxHtml(value)}</div>\n`;
  }

  private static generateHtmlForDateField(
    fieldName: string,
    formExtract: FormExtractRelevantInformationSingle,
  ): string {
    const value = formExtract.form_answer.value_date;
    if (!value) return '';
    let momentFormat = DateHelper.MOMENT_FORMAT.DATE_ONLY;
    switch (formExtract.form_field.field_type) {
      case FormHelperCommon.FORM_FIELD_TYPE.DATE_HH_MM:
        momentFormat = DateHelper.MOMENT_FORMAT.DATE_HH_MM;
        break;
      case FormHelperCommon.FORM_FIELD_TYPE.DATE_DATE_AND_HH_MM:
        momentFormat = DateHelper.MOMENT_FORMAT.DATE_AND_HH_MM;
        break;
      case FormHelperCommon.FORM_FIELD_TYPE.DATE_TIMESTAMP:
        momentFormat = DateHelper.MOMENT_FORMAT.DATE_TIMESTAMP;
        break;
      case FormHelperCommon.FORM_FIELD_TYPE.DATE:
        momentFormat = DateHelper.MOMENT_FORMAT.DATE_ONLY;
        break;
    }
    const dateString = DateHelper.formatDateToTimeZoneReadable(
      new Date(value),
      EnvVariableHelper.getTimeZoneString(),
      momentFormat,
    );
    return `<div style="margin:4px 0 10px 0;">${this.generateFieldNameHtml(fieldName)} <span>${dateString}</span></div>\n`;
  }

  private static generateHtmlForImageUrl(fieldName: string, imageUrl: string | undefined, isSignature = false): string {
    if (!imageUrl) return '';
    if (isSignature) {
      // Signature layout: field name label, then the image sitting on a bottom-border line
      return (
        `<div style="margin:8px 0 0 0;">${this.generateFieldNameHtml(fieldName)}</div>\n` +
        `<div style="display:inline-block; border-bottom:1px solid #000; min-width:200px; vertical-align:bottom; margin:2px 0 14px 0;">` +
        `<img src="${imageUrl}" alt="${fieldName}" style="max-height:40px; width:auto; display:block;"/>` +
        `</div>\n`
      );
    }
    return (
      `<div style="margin:4px 0 4px 0;">${this.generateFieldNameHtml(fieldName)}</div>\n` +
      `<div style="margin:4px 0 10px 0;"><img src="${imageUrl}" alt="${fieldName}" style="max-width:100%; height:auto;"/></div>\n`
    );
  }

  private static generateHtmlForImageValue(
    params: ImageValueParams,
    isSignature = false,
  ): string {
    const { fieldName, value_image, myDatabaseHelperInterface } = params;
    let assetUrl: string | undefined;
    if (value_image) {
      if (typeof value_image === 'string' && (value_image.startsWith('http') || value_image.startsWith('data:'))) {
        assetUrl = value_image;
      } else {
        assetUrl = DirectusFilesAssetHelper.getDirectAssetUrlByObjectOrId(
          value_image,
          myDatabaseHelperInterface,
          FormHelper.FORM_IMAGE_TRANSFORM_OPTIONS,
        );
      }
    }
    return this.generateHtmlForImageUrl(fieldName, assetUrl, isSignature);
  }

  private static generateHtmlForFileValue(
    fieldName: string,
    value_file: FormExtractFormAnswerValueFileSingleOrString | null | undefined,
    myDatabaseHelperInterface: MyDatabaseTestableHelperInterface,
  ): string {
    let assetUrl: string | undefined;
    if (value_file) {
      if (typeof value_file === 'string' && value_file.startsWith('http')) {
        assetUrl = value_file;
      } else {
        const valueFileAsObject = value_file as FormExtractFormAnswerValueFileSingle;
        assetUrl = DirectusFilesAssetHelper.getDirectAssetUrlByObjectOrId(
          valueFileAsObject.directus_files_id,
          myDatabaseHelperInterface,
          FormHelper.FORM_IMAGE_TRANSFORM_OPTIONS,
        );
      }
    }
    return this.generateHtmlForImageUrl(fieldName, assetUrl);
  }

  // ── Markdown generation (kept for backward compatibility) ─────────────────

  private static generateMarkdownForTypeStringValue(fieldName: string, formExtract: FormExtractRelevantInformationSingle): string {
    let markdownContent = '';

    let value = formExtract.form_answer.value_string;
    if (value) {
      markdownContent += FormHelper.getFieldMarkdownNameBold(fieldName);


      if(formExtract.form_field.field_type === FormHelperCommon.FORM_FIELD_TYPE.STRING_BANK_ACCOUNT){
        // format IBAN
        let formattedIban = FormHelperCommon.formatIban(value);
        markdownContent += `${formattedIban}`;
      } else {
        markdownContent += FormHelper.formatValueWithPrefixAndSuffix(value, formExtract.form_field);

      }

      markdownContent += MarkdownHelper.getMarkdownNewLine();
    }
    return markdownContent;
  }

  private static generateMarkdownForTypeNumberValue(fieldName: string, formExtract: FormExtractRelevantInformationSingle): string {
    let markdownContent = '';
    let value = formExtract.form_answer.value_number;
    if (value) {
      markdownContent += FormHelper.getFieldMarkdownNameBold(fieldName);
      markdownContent += FormHelper.formatValueWithPrefixAndSuffix(value, formExtract.form_field);
      markdownContent += MarkdownHelper.getMarkdownNewLine();
    }
    return markdownContent;
  }

  private static generateMarkdownForTypeBooleanValue(fieldName: string, value: boolean | null | undefined): string {
    let markdownContent = '';
    if (value === true || value === false) {
      markdownContent += FormHelper.getFieldMarkdownNameBold(fieldName);
      let booleanValueString = value ? TranslationsBackend.getTranslation(TranslationBackendKeys.FORM_VALUE_BOOLEAN_TRUE) : TranslationsBackend.getTranslation(TranslationBackendKeys.FORM_VALUE_BOOLEAN_FALSE);
      markdownContent += `${booleanValueString}`;
      markdownContent += MarkdownHelper.getMarkdownNewLine();
    }
    return markdownContent;
  }

  private static generateMarkdownForTypeDateValue(fieldName: string, formExtract: FormExtractRelevantInformationSingle): string {
    let markdownContent = '';
    let value = formExtract.form_answer.value_date;
    if (value) {
      markdownContent += FormHelper.getFieldMarkdownNameBold(fieldName);
      let momentFormat = DateHelper.MOMENT_FORMAT.DATE_ONLY;
      switch (formExtract.form_field.field_type){
        case FormHelperCommon.FORM_FIELD_TYPE.DATE_HH_MM:
          momentFormat = DateHelper.MOMENT_FORMAT.DATE_HH_MM;
          break;
        case FormHelperCommon.FORM_FIELD_TYPE.DATE_DATE_AND_HH_MM:
          momentFormat = DateHelper.MOMENT_FORMAT.DATE_AND_HH_MM;
          break;
        case FormHelperCommon.FORM_FIELD_TYPE.DATE_TIMESTAMP:
          momentFormat = DateHelper.MOMENT_FORMAT.DATE_TIMESTAMP
          break;
        case FormHelperCommon.FORM_FIELD_TYPE.DATE:
          momentFormat = DateHelper.MOMENT_FORMAT.DATE_ONLY;
          break;
      }

      let dateString = DateHelper.formatDateToTimeZoneReadable(new Date(value), EnvVariableHelper.getTimeZoneString(), momentFormat);
      markdownContent += `${dateString}`;
      markdownContent += MarkdownHelper.getMarkdownNewLine();
    }
    return markdownContent;
  }

  private static generateMarkdownForTypeImageUrl(fieldName: string, imageUrl: string | undefined): string {
    let markdownContent = '';
    if (imageUrl) {
      markdownContent += FormHelper.getFieldMarkdownNameBold(fieldName);
      markdownContent += MarkdownHelper.getMarkdownNewLine();
      markdownContent += `![${fieldName}](${imageUrl})`;
      markdownContent += MarkdownHelper.getMarkdownNewLine();
    }
    return markdownContent;
  }

  private static generateMarkdownForTypeImageValue(params: ImageValueParams): string {
    const { fieldName, value_image, myDatabaseHelperInterface } = params;
    let assetUrl: undefined | string = undefined;
    if (value_image) {
      if (typeof value_image === 'string' && (value_image.startsWith('http') || value_image.startsWith('data:'))) {
        assetUrl = value_image;
      } else {
        assetUrl = DirectusFilesAssetHelper.getDirectAssetUrlByObjectOrId(value_image, myDatabaseHelperInterface, FormHelper.FORM_IMAGE_TRANSFORM_OPTIONS);
      }
    }
    return this.generateMarkdownForTypeImageUrl(fieldName, assetUrl);
  }

  private static generateMarkdownForTypeFilesValue(fieldName: string, value_file: FormExtractFormAnswerValueFileSingleOrString | null | undefined, myDatabaseHelperInterface: MyDatabaseTestableHelperInterface): string {
    let assetUrl: undefined | string = undefined;
    //console.log("generateMarkdownForTypeFilesValue");
    //console.log(JSON.stringify(value_file, null, 2));
    if (value_file) {
      if (typeof value_file === 'string' && value_file.startsWith('http')) {
        assetUrl = value_file;
      } else {
        let valueFileAsObject: FormExtractFormAnswerValueFileSingle = value_file as FormExtractFormAnswerValueFileSingle;
        assetUrl = DirectusFilesAssetHelper.getDirectAssetUrlByObjectOrId(valueFileAsObject.directus_files_id, myDatabaseHelperInterface, FormHelper.FORM_IMAGE_TRANSFORM_OPTIONS);
      }
    }

    //console.log("assetUrl", assetUrl);
    return this.generateMarkdownForTypeImageUrl(fieldName, assetUrl);
  }

  public static getFieldMarkdownNameAsHeading(fieldName: string): string {
    return `### ${fieldName}` + MarkdownHelper.getMarkdownNewLine();
  }

  public static async generateMarkdownContentFromForm(form: DatabaseTypes.Forms, formExtractRelevantInformation: FormExtractRelevantInformationSingle[], myDatabaseHelperInterface: MyDatabaseTestableHelperInterface): Promise<string> {
    let markdownNewLine = MarkdownHelper.getMarkdownNewLine();

    let markdownContent = '';

    markdownContent += `# ${form.alias || form.id}`;
    markdownContent += markdownNewLine;


    //console.log("generateMarkdownContentFromForm");
    //console.log(JSON.stringify(formExtractRelevantInformation, null, 2));
    //console.log("---")

    // export type FormExtractRelevantInformationSingle = {form_field_id: string, sort: number | null | undefined, form_field: FormFields, form_answer: FormAnswers }
    for (let formExtractRelevantInformationSingle of formExtractRelevantInformation) {
      let fieldName = formExtractRelevantInformationSingle.form_field.alias || formExtractRelevantInformationSingle.form_field.id;

      markdownContent += this.generateMarkdownForTypeStringValue(fieldName, formExtractRelevantInformationSingle);
      markdownContent += this.generateMarkdownForTypeNumberValue(fieldName, formExtractRelevantInformationSingle);
      markdownContent += this.generateMarkdownForTypeBooleanValue(fieldName, formExtractRelevantInformationSingle.form_answer.value_boolean);
      markdownContent += this.generateMarkdownForTypeDateValue(fieldName, formExtractRelevantInformationSingle);
      markdownContent += this.generateMarkdownForTypeImageValue({ fieldName, value_image: formExtractRelevantInformationSingle.form_answer.value_image, myDatabaseHelperInterface });
      if(formExtractRelevantInformationSingle.form_answer.value_files.length > 0){
        for (let formAnswerValueFile of formExtractRelevantInformationSingle.form_answer.value_files || []) {
          markdownContent += this.generateMarkdownForTypeFilesValue(fieldName, formAnswerValueFile, myDatabaseHelperInterface);
        }
      }
    }

    // add a line break at the end
    markdownContent += `-----------------` + markdownNewLine;

    // add a generated at date
    let generatedAtDateString = DateHelper.formatDateToTimeZoneReadable(new Date(), DateHelperTimezone.GERMANY);
    markdownContent += `Generiert am ${generatedAtDateString}`;
    markdownContent += markdownNewLine;

    let hashValue = HashHelper.getHashFromObject(formExtractRelevantInformation);
    markdownContent += `Hash: ${hashValue}`;
    markdownContent += markdownNewLine;

    return markdownContent;
  }

  /**
   * Generates HTML content directly for a form, enabling richer rendering than
   * the markdown-based approach (e.g. IBAN/BIC character boxes, boolean
   * checkboxes, bold field names).
   */
  public static async generateHtmlContentFromForm(
    form: DatabaseTypes.Forms,
    formExtractRelevantInformation: FormExtractRelevantInformationSingle[],
    myDatabaseHelperInterface: MyDatabaseTestableHelperInterface,
  ): Promise<string> {
    let html = '';

    html += `<h1 style="font-size:1.6em; margin-bottom:12px;">${form.alias || form.id}</h1>\n`;
    html += '<div style="font-size:14px; line-height:1.7;">\n';

    for (const formExtract of formExtractRelevantInformation) {
      const fieldName = formExtract.form_field.alias || formExtract.form_field.id;

      html += this.generateHtmlForStringField(fieldName, formExtract);
      html += this.generateHtmlForNumberField(fieldName, formExtract);
      html += this.generateHtmlForBooleanField(fieldName, formExtract.form_answer.value_boolean);
      html += this.generateHtmlForDateField(fieldName, formExtract);
      const isSignature = formExtract.form_field.field_type === FormHelperCommon.FORM_FIELD_TYPE.FILES_IMAGE_SIGNATURE;
      html += this.generateHtmlForImageValue({ fieldName, value_image: formExtract.form_answer.value_image, myDatabaseHelperInterface }, isSignature);
      if (formExtract.form_answer.value_files && formExtract.form_answer.value_files.length > 0) {
        for (const file of formExtract.form_answer.value_files) {
          html += this.generateHtmlForFileValue(fieldName, file, myDatabaseHelperInterface);
        }
      }
    }

    html += '</div>\n';

    // footer
    html += '<hr style="margin:24px 0 12px 0;"/>\n';
    const generatedAtDateString = DateHelper.formatDateToTimeZoneReadable(new Date(), DateHelperTimezone.GERMANY);
    html += `<p style="font-size:12px; color:#555;">Generiert am ${generatedAtDateString}</p>\n`;
    const hashValue = HashHelper.getHashFromObject(formExtractRelevantInformation);
    html += `<p style="font-size:12px; color:#555;">Hash: ${hashValue}</p>\n`;

    return html;
  }

  public static async generatePdfFromHtml(html: string, myDatabaseHelperInterface: MyDatabaseTestableHelperInterface, requestOptions?: RequestOptions): Promise<Buffer> {
    if (!requestOptions) {
      requestOptions = {};
    }
    let adminBearerToken = await myDatabaseHelperInterface.getAdminBearerToken();
    if (adminBearerToken) {
      requestOptions.bearerToken = adminBearerToken;
    }

    //console.log("Generating PDF from HTML with length:", html.length);
    //console.log("Using request options:", requestOptions);

    let data: GeneratePdfFromHtmlProps = {
      html: html,
      requestOptions: requestOptions,
    };
    let pdfBuffer = await PdfGeneratorHelper.generatePdfFromHtml(data);
    return pdfBuffer;
  }

  public static async generateHtmlFromForm(params: FormGenerationParams): Promise<string> {
    let { form, formExtractRelevantInformation, myDatabaseHelperInterface } = params;
    let htmlContent = await this.generateHtmlContentFromForm(form, formExtractRelevantInformation, myDatabaseHelperInterface);
    let template = DEFAULT_HTML_TEMPLATE;
    // Pass the generated HTML directly into the template field.
    // Note: despite the field name containing "Markdown", the Liquid template simply
    // outputs the value as-is ({{ mailContentFieldRenderedAsHtml }}), so both
    // markdown-converted HTML and raw HTML are accepted here.
    let templateData = { [BaseGermanMarkdownTemplateHelper.TEMPLATE_MARKDOWN_FIELD]: htmlContent };
    let html = await HtmlGenerator.generateHtml(templateData, myDatabaseHelperInterface, template);

    return html;
  }

  public static async generatePdfFromForm(params: FormGenerationParams & { requestOptions?: RequestOptions }): Promise<Buffer> {
    let { requestOptions, ...formGenerationParams } = params;
    let { myDatabaseHelperInterface } = formGenerationParams;
    let html = await this.generateHtmlFromForm(formGenerationParams);
    let pdfBuffer = await this.generatePdfFromHtml(html, myDatabaseHelperInterface, requestOptions);
    return pdfBuffer;
  }
}
