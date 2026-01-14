// small jest test
import {describe, expect, it} from '@jest/globals';
import {TranslationHelper, TranslationsFromParsingType} from '../TranslationHelper';
import {LanguageCodes, LanguageCodesType} from 'repo-depkit-common';
import {PrimaryKey} from '@directus/types';

// Mock Data for Testing
// Define a type for the main item
type TestType = {
  id: PrimaryKey;
  name: string;
  description?: string;
  translations: TestTranslationType[];
};

const relationField = 'test_id';

// Define a type for the translations
type TestTranslationType = {
  id: PrimaryKey;
  [relationField]: PrimaryKey;
  languages_code: LanguageCodesType;
  be_source_for_translations?: boolean | null;
  let_be_translated?: boolean | null;
  name: string;
  description?: string;
};

const mockItemWithTranslations: TestType = {
  id: 1 as PrimaryKey,
  name: 'Test Item',
  translations: [
    {
      id: 1 as PrimaryKey,
      [relationField]: 1 as PrimaryKey,
      languages_code: LanguageCodes.EN,
      be_source_for_translations: true,
      let_be_translated: true,
      name: 'Hello',
      description: 'A simple greeting',
    },
    {
      id: 2 as PrimaryKey,
      [relationField]: 1 as PrimaryKey,
      languages_code: LanguageCodes.DE,
      be_source_for_translations: false,
      let_be_translated: false,
      name: 'Hallo',
      description: 'Eine einfache Begrüßung',
    },
  ],
};

const mockTranslationsFromParsing: TranslationsFromParsingType = {
  [LanguageCodes.EN]: {
    be_source_for_translations: true,
    let_be_translated: false,
    name: 'Hello there',
    description: 'A more detailed greeting',
  },
  [LanguageCodes.DE]: {
    be_source_for_translations: false,
    let_be_translated: false,
    name: 'Hallo',
    description: 'Eine einfache Begrüßung',
  },
};

describe('TranslationHelper Test', () => {
  // should find atleast one meal offer
  it('Objects have significant change for translation', async () => {
    const objectA = {
      name: 'Pizza',
    };
    const objectB = {
      name: 'Pasta',
    };
    expect(TranslationHelper.hasSignificantTranslationChange(objectA, objectB)).toBe(true);
  });

  // should not find any significant change
  it('Objects have no significant change for translation', async () => {
    const objectA = {
      name: 'Pizza',
    };
    const objectB = {
      name: 'Pizza',
    };
    expect(TranslationHelper.hasSignificantTranslationChange(objectA, objectB)).toBe(false);
  });

  // should not find any significant change but with change at NonSignificantField
  it('Objects have no significant change for translation but with change at NonSignificantField', async () => {
    const objectSameValue = {
      name: 'Pizza',
    };
    const objectA = {
      ...objectSameValue,
      id: 'abc123',
    };
    const objectB = {
      ...objectSameValue,
      id: 'def456',
    };
    expect(TranslationHelper.hasSignificantTranslationChange(objectA, objectB)).toBe(false);
  });

  // Test case that should pass
  it('should detect updates needed when there is a significant change in translations', async () => {
    const result = await TranslationHelper._getUpdateInformationForTranslations(
      mockItemWithTranslations,
      mockItemWithTranslations,
      mockTranslationsFromParsing,
      relationField // Use TestTranslationType for the relation field
    );

    expect(result.updateNeeded).toBe(true);
    expect(result.updateObject.translations.update).toHaveLength(1);
    expect(result.updateObject.translations.create).toHaveLength(0);
    expect(result.updateObject.translations.update?.[0]?.name).toBe('Hello there');
  });

  // Test case that should fail (when no changes are detected)
  it('should not detect updates when translations have not changed', async () => {
    const mockTranslationsWithoutChange: TranslationsFromParsingType = {
      [LanguageCodes.EN]: {
        be_source_for_translations: true,
        let_be_translated: true,
        name: 'Hello',
        description: 'A simple greeting',
      },
      [LanguageCodes.DE]: {
        be_source_for_translations: false,
        let_be_translated: false,
        name: 'Hallo',
        description: 'Eine einfache Begrüßung',
      },
    };

    const result = await TranslationHelper._getUpdateInformationForTranslations(
      mockItemWithTranslations,
      mockItemWithTranslations,
      mockTranslationsWithoutChange,
      relationField // Use TestTranslationType for the relation field
    );

    expect(result.updateNeeded).toBe(false);
    expect(result.updateObject.translations.update).toHaveLength(0);
    expect(result.updateObject.translations.create).toHaveLength(0);
  });
});
