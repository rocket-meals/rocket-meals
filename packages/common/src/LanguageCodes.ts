export class LanguageCodes {
  public static readonly _codes = {
    de: 'de-DE' as const,
    en: 'en-US' as const,
  };

  static readonly DE = LanguageCodes._codes.de;
  static readonly EN = LanguageCodes._codes.en;
}

export type LanguageCodesType = (typeof LanguageCodes._codes)[keyof typeof LanguageCodes._codes];
