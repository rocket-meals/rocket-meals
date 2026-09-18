import { StringHelper } from '../StringHelper';

export class FormHelperCommon {

  static readonly FORM_FIELD_PREFIX_CUSTOM_REFERENCE = "value_custom-reference-";

  static readonly FORM_FIELD_TYPE = {
    STRING: "value_string-string",
    MULTILINE_TEXT: "value_string-multiline",
    DROPDOWN: "value_string-dropdown",
    NUMBER: "value_number-number",
    DATE_DATE_AND_HH_MM: "value_date-date_hh_mm",
    DATE: "value_date-date",
    DATE_HH_MM: "value_date-hh_mm",
    DATE_TIMESTAMP: "value_date-timestamp",
    STRING_ADDRESS: "value_string-address",
    STRING_EMAIL: "value_string-email",
    STRING_BANK_ACCOUNT: "value_string-bank_account_number",
    STRING_BIC: "value_string-bic",
    BOOLEAN_CHECKBOX: "value_boolean-checkbox",
    FILES_FILES: "value_files-files",
    FILES_IMAGE: "value_image-image",
    FILES_IMAGE_SIGNATURE: "value_image-signature",
    CUSTOM_REFERENCE_APARTMENT: FormHelperCommon.FORM_FIELD_PREFIX_CUSTOM_REFERENCE+"apartments"
  }

  static isFieldTypeNumber(fieldType: string): boolean {
    return fieldType === FormHelperCommon.FORM_FIELD_TYPE.NUMBER;
  }

  static isDateFieldType(fieldType: string): boolean {
    return (
        fieldType === FormHelperCommon.FORM_FIELD_TYPE.DATE_DATE_AND_HH_MM ||
        fieldType === FormHelperCommon.FORM_FIELD_TYPE.DATE ||
        fieldType === FormHelperCommon.FORM_FIELD_TYPE.DATE_HH_MM ||
        fieldType === FormHelperCommon.FORM_FIELD_TYPE.DATE_TIMESTAMP
    );
  }

  static isFieldTypeCustomReference(fieldType: string): boolean {
    return fieldType.startsWith(FormHelperCommon.FORM_FIELD_PREFIX_CUSTOM_REFERENCE);
  }

  /** The `custom_id` half of a field type - what the form screen branches on. */
  static getFieldCustomId(fieldType: string): string {
    const [, ...idParts] = fieldType.split('-');
    return idParts.join('-');
  }

  /** Shortest and longest IBAN in the SWIFT registry, without the printed spacing. */
  static readonly IBAN_MIN_LENGTH = 15;
  static readonly IBAN_MAX_LENGTH = 34;

  /** A card prints its IBAN in groups of this many characters. */
  static readonly IBAN_BLOCK_LENGTH = 4;

  /**
   * How long the longest IBAN gets once it is grouped the way it is printed.
   *
   * An input that caps its length at {@link IBAN_MAX_LENGTH} is measuring the
   * wrong string: the value carries the spaces, and the longest IBAN plus its
   * spacing is eight characters longer than the number itself. Capping at 34
   * silently cut the last group off a Maltese, Russian or Brazilian IBAN — of
   * the countries in the registry, twelve are long enough to be truncated.
   */
  static readonly IBAN_MAX_FORMATTED_LENGTH =
      FormHelperCommon.IBAN_MAX_LENGTH + Math.floor((FormHelperCommon.IBAN_MAX_LENGTH - 1) / FormHelperCommon.IBAN_BLOCK_LENGTH);

  /** Uppercases and drops everything that cannot be part of an IBAN, spacing included. */
  static normalizeIban(text: string): string {
    const cleaned = StringHelper.replaceAllWithOptions({ str: text, find: '[^A-Za-z0-9]', replace: '' });
    return cleaned.toUpperCase();
  }

  /**
   * Groups an IBAN the way a card prints it. Idempotent, so it can be applied
   * to a value that already carries its spacing.
   */
  static formatIban(text: string): string {
      const cleaned = StringHelper.replaceAllWithOptions({ str: text, find: '[^A-Za-z0-9]', replace: '' });
      return StringHelper.replaceAllWithOptions({ str: cleaned, find: `(.{${FormHelperCommon.IBAN_BLOCK_LENGTH}})`, replace: '$1 ' }).trim();
  }

}