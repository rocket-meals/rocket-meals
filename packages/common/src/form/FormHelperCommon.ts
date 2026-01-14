export class FormHelperCommon {

  static FORM_FIELD_PREFIX_CUSTOM_REFERENCE = "value_custom-reference-";

  static FORM_FIELD_TYPE = {
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

  static formatIban(text: string): string {
      let cleaned = text.replace(/[^A-Za-z0-9]/g, '');
      let formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
      return formatted;
  }

}