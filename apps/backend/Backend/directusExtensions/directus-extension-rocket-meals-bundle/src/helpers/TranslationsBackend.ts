export { LanguageCodes } from 'repo-depkit-common';

export class TranslationsBackend {
  public static getTranslation(key: TranslationBackendKeys, language?: string): string {
    switch (key) {
      case TranslationBackendKeys.FORM_VALUE_BOOLEAN_TRUE:
        return 'Ja';
      case TranslationBackendKeys.FORM_VALUE_BOOLEAN_FALSE:
        return 'Nein';
    }
  }
}

export enum TranslationBackendKeys {
  FORM_VALUE_BOOLEAN_TRUE = 'form_value_boolean_true',
  FORM_VALUE_BOOLEAN_FALSE = 'form_value_boolean_false',
}
