import { FormExtractFormAnswer, FormExtractFormAnswerValueFileSingle, FormExtractFormAnswerValueFileSingleOrString, FormExtractRelevantInformation, FormExtractRelevantInformationSingle } from '../../forms-sync-hook';
import { HtmlGenerator, HtmlTemplatesEnum } from '../html/HtmlGenerator';
import { PdfGeneratorHelper } from '../pdf/PdfGeneratorHelper';
import { PdfGeneratorOptions, RequestOptions } from '../pdf/PdfGeneratorInterfaces';
import { FormGenerationParams, FormPdfDocumentHelper } from './FormPdfDocumentHelper';
import { DirectusFilesAssetHelper } from '../DirectusFilesAssetHelper';
import { MarkdownHelper } from '../html/MarkdownHelper';
import { MyDatabaseTestableHelperInterface } from '../MyDatabaseHelperInterface';
import { BackendTranslationKeys, BackendTranslator } from '../translations';
import {DatabaseTypes, DateHelper, DateHelperTimezone, FormHelperCommon, MathHelper, NumberHelper} from 'repo-depkit-common';
import { EnvVariableHelper } from '../EnvVariableHelper';
import { HashHelper } from '../HashHelper';
import {GeneratePdfFromHtmlProps} from "../pdf/HtmlPdfGeneratorInterface";
import * as fs from 'node:fs';
import * as path from 'node:path';

type ImageFieldContext = {
  fieldName: string;
  value_image: DatabaseTypes.DirectusFiles | string | null | undefined;
  myDatabaseHelperInterface: MyDatabaseTestableHelperInterface;
};

type FileValueContext = {
  fieldName: string;
  value_file: FormExtractFormAnswerValueFileSingleOrString | null | undefined;
  myDatabaseHelperInterface: MyDatabaseTestableHelperInterface;
};

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

export type { FormGenerationParams };

export class FormHelper {
  private static readonly FORM_IMAGE_TRANSFORM_OPTIONS = DirectusFilesAssetHelper.PRESET_FILE_TRANSFORMATION_IMAGE_HD;
  private static readonly FORM_IMAGE_SIGNATURE_TRANSFORM_OPTIONS = DirectusFilesAssetHelper.PRESET_FILE_TRANSFORMATION_IMAGE_ORIGINAL;

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
    let form_submission_id = MathHelper.random().toString();

    let index = 0;

    formExtractRelevantInformation.push(
    	this.addFormField({
        alias: 'Text Field',
        data: { value_string: 'This is a long text example' },
        form_field_type: FormHelperCommon.FORM_FIELD_TYPE.STRING,
        form_submission_id: form_submission_id,
        index: index++
    }),
    	this.addFormField({
        alias: 'Text Field 2',
        data: { value_string: 'This is a long text example This is a long text example This is a long text example This is a long text example This is a long text example This is a long text example ' },
        form_field_type: FormHelperCommon.FORM_FIELD_TYPE.MULTILINE_TEXT,
        form_submission_id: form_submission_id,
        index: index++
    }),
    	this.addFormField({
      alias: 'IBAN',
      data: { value_string: 'DE89370400440532013000' }, // example iban (DE89 3704 0044 0532 0130 00)
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.STRING_BANK_ACCOUNT,
      form_submission_id: form_submission_id,
      index: index++
    }),
    	this.addFormField({
      alias: 'BIC',
      data: { value_string: 'DEUTDEDBXXX' }, // example bic (11 chars)
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.STRING_BIC,
      form_submission_id: form_submission_id,
      index: index++
    }),
    	this.addFormField({
        alias: 'Number Field',
        data: { value_number: 12345.67 },
        form_field_type: FormHelperCommon.FORM_FIELD_TYPE.NUMBER,
        form_submission_id: form_submission_id,
        index: index++
    }),
    	this.addFormField({
      alias: 'Number Field With Prefix',
      data: { value_number: 12345.67 },
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.NUMBER,
      prefix: "$ ",
      form_submission_id: form_submission_id,
      index: index++
    }),
    	this.addFormField({
      alias: 'Number Field With Suffix',
      data: { value_number: 12345.67 },
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.NUMBER,
        suffix: " €",
      form_submission_id: form_submission_id,
      index: index++
    }),
    	this.addFormField({
      alias: 'Number Field With Prefix And Suffix',
      data: { value_number: 12345.67 },
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.NUMBER,
      prefix: "€ ",
      suffix: " EUR",
      form_submission_id: form_submission_id,
      index: index++
    }),
    	this.addFormField({
      alias: 'Boolean Field',
      data: { value_boolean: false },
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.BOOLEAN_CHECKBOX,
      form_submission_id: form_submission_id,
      index: index++
    }),
    	this.addFormField({
      alias: 'Boolean Field True',
      data: { value_boolean: true },
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.BOOLEAN_CHECKBOX,
      form_submission_id: form_submission_id,
      index: index++
    }),
    );

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
    for (const size of sizes) {
      let imageUrl = `https://picsum.photos/${size}/${size}`;
      images.push(imageUrl);
    }

    formExtractRelevantInformation.push(
      this.addFormField({
        alias: 'Image Field',
        data: { value_image: images[0] },
        form_field_type: FormHelperCommon.FORM_FIELD_TYPE.FILES_IMAGE,
        form_submission_id: form_submission_id,
        index: index++
    }),
      this.addFormField({
      alias: 'Files Field',
      data: { value_files: images },
      form_field_type: FormHelperCommon.FORM_FIELD_TYPE.FILES_FILES,
      form_submission_id: form_submission_id,
      index: index++
    }),
    );

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
      id: MathHelper.random().toString() + obj.alias,
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
      id: MathHelper.random().toString(),
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
      let booleanValueString = BackendTranslator.translate(value ? BackendTranslationKeys.yes : BackendTranslationKeys.no);
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

  private static generateMarkdownForTypeImageValue(context: ImageFieldContext): string {
    const { fieldName, value_image, myDatabaseHelperInterface } = context;
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

  private static generateMarkdownForTypeFilesValue(context: FileValueContext): string {
    const { fieldName, value_file, myDatabaseHelperInterface } = context;
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

  public static async generateMarkdownContentFromForm(params: FormGenerationParams): Promise<string> {
    const { form, formExtractRelevantInformation, myDatabaseHelperInterface } = params;
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
          markdownContent += this.generateMarkdownForTypeFilesValue({ fieldName, value_file: formAnswerValueFile, myDatabaseHelperInterface });
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

  public static async generatePdfFromHtml(html: string, myDatabaseHelperInterface: MyDatabaseTestableHelperInterface, requestOptions?: RequestOptions, options?: PdfGeneratorOptions): Promise<Buffer> {
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
      options: options,
    };
    let pdfBuffer = await PdfGeneratorHelper.generatePdfFromHtml(data);
    return pdfBuffer;
  }

  /**
   * Renders the filled form as a print-ready A4 document.
   *
   * The layout – label column, writing lines, checkboxes, IBAN boxes, signature fields – lives
   * in `templates/form-document.liquid`; this method only hands over the content model that
   * {@link FormPdfDocumentHelper} builds from the answers.
   */
  public static async generateHtmlFromForm(params: FormGenerationParams): Promise<string> {
    const { myDatabaseHelperInterface } = params;
    const formDocument = FormPdfDocumentHelper.buildFormDocument(params);
    return await HtmlGenerator.generateHtml({ ...formDocument }, myDatabaseHelperInterface, HtmlTemplatesEnum.FORM_DOCUMENT);
  }

  /**
   * The footer Chromium repeats on every page: when the document was created, the checksum over
   * the answers, and the page number. It is rendered as its own document, hence the inline styles.
   */
  private static getPdfFooterTemplate(formExtractRelevantInformation: FormExtractRelevantInformation): string {
    const generatedAtDateString = DateHelper.formatDateToTimeZoneReadable(new Date(), DateHelperTimezone.GERMANY);
    const generatedAtText = BackendTranslator.translate(BackendTranslationKeys.form_pdf_generated_at, undefined, { date: generatedAtDateString });
    const checksumText = BackendTranslator.translate(BackendTranslationKeys.form_pdf_checksum, undefined, { hash: HashHelper.getHashFromObject(formExtractRelevantInformation) });
    const pageText = BackendTranslator.translate(BackendTranslationKeys.form_pdf_page, undefined, {
      page: '<span class="pageNumber"></span>',
      pages: '<span class="totalPages"></span>',
    });

    return (
      '<div style="width:100%; font-family: Helvetica, Arial, sans-serif; font-size:7pt; color:#5c6169;' +
      ' padding:0 14mm; display:flex; justify-content:space-between; align-items:center;">' +
      `<span>${generatedAtText} &middot; ${checksumText}</span>` +
      `<span>${pageText}</span>` +
      '</div>'
    );
  }

  /** Page setup of the form PDF: A4 with room for the repeated footer. */
  private static getPdfGeneratorOptionsForForm(formExtractRelevantInformation: FormExtractRelevantInformation): PdfGeneratorOptions {
    return {
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: {
        top: '16mm',
        bottom: '18mm',
        left: '16mm',
        right: '16mm',
      },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: FormHelper.getPdfFooterTemplate(formExtractRelevantInformation),
    };
  }

  public static async generatePdfFromForm(params: FormGenerationParams & { requestOptions?: RequestOptions }): Promise<Buffer> {
    let { requestOptions, ...formGenerationParams } = params;
    let { myDatabaseHelperInterface, formExtractRelevantInformation } = formGenerationParams;
    let html = await this.generateHtmlFromForm(formGenerationParams);
    let options = FormHelper.getPdfGeneratorOptionsForForm(formExtractRelevantInformation);
    let pdfBuffer = await this.generatePdfFromHtml(html, myDatabaseHelperInterface, requestOptions, options);
    return pdfBuffer;
  }
}
