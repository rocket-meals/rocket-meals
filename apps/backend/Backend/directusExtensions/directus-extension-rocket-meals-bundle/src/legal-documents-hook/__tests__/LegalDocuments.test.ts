import { describe, expect, it } from '@jest/globals';
import { ALL_TRANSLATION_LANGUAGES, CustomerLegalEntity, OPERATOR_LEGAL_ENTITY } from 'repo-depkit-common';
import { LEGAL_DOCUMENTS, type LegalDocument } from '../LegalDocuments';
import { LegalDocumentRenderer } from '../LegalDocumentRenderer';
import { CUSTOMER_LEGAL_ENTITIES, LegalEntities } from '../LegalEntities';
import { LEGACY_CUSTOM_ID_PREFIX, LEGAL_WIKI_SETTINGS, LegalDocumentsDatabase, LegalDocumentsSync, LegalWiki, LegalWikiTranslation } from '../LegalDocumentsSync';
import { LegalWikiProtection } from '../LegalWikiProtection';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';

const CUSTOMER: CustomerLegalEntity = {
  name: 'Studierendenwerk Beispielstadt',
  legalForm: 'Anstalt des öffentlichen Rechts',
  phone: '(01234) 5678',
  email: 'info@example.org',
  privacyPolicyUrl: 'https://example.org/datenschutz',
};
const VALUES = LegalEntities.buildPlaceholderValues(OPERATOR_LEGAL_ENTITY, CUSTOMER);

/** Company data that must only reach a text through a placeholder. */
const COMPANY_LITERALS = ['Baumgartner', 'Bernhardstraße', 'Dinklage', '2215430', '362633044', '68/213/02808', 'Osnabrück', 'osnabrueck', 'sw-os.de', '331070', 'studentenwerk-hannover', '76-88022'];

class InMemoryDatabase implements LegalDocumentsDatabase {
  wikis: LegalWiki[] = [];
  translations: (LegalWikiTranslation & { wikis_id: string })[] = [];
  writes: string[] = [];
  private nextTranslationId = 1;

  constructor(private readonly languageCodes: string[]) {}

  async readLanguageCodes() {
    return this.languageCodes;
  }
  async readWikisByIdOrCustomIds(id: string, customIds: readonly string[]) {
    return this.wikis.filter(wiki => wiki.id === id || customIds.includes(wiki.custom_id ?? ''));
  }
  async readTranslations(wikiId: string) {
    return this.translations.filter(translation => translation.wikis_id === wikiId);
  }
  async createWiki(wiki: Record<string, unknown>) {
    this.writes.push('createWiki');
    this.wikis.push({ status: 'published', ...wiki } as LegalWiki);
  }
  async updateWiki(id: string, update: Record<string, unknown>) {
    this.writes.push('updateWiki');
    Object.assign(this.wikis.find(wiki => wiki.id === id)!, update);
  }
  async writeTranslations(wikiId: string, create: Record<string, unknown>[], update: Record<string, unknown>[]) {
    this.writes.push('writeTranslations');
    for (const row of create) {
      this.translations.push({ id: this.nextTranslationId++, wikis_id: wikiId, languages_code: row.languages_code as string, title: row.title as string, content: row.content as string });
    }
    for (const row of update) {
      Object.assign(this.translations.find(translation => translation.id === row.id)!, { title: row.title, content: row.content });
    }
  }
}

const PRIVACY_POLICY = LEGAL_DOCUMENTS.find(document => document.customId === 'privacy-policy') as LegalDocument;

describe('legal documents', () => {
  it('have unique fixed ids and custom ids', () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(LEGAL_DOCUMENTS.every(document => uuid.test(document.wikiId))).toBe(true);
    expect(new Set(LEGAL_DOCUMENTS.map(document => document.wikiId)).size).toBe(LEGAL_DOCUMENTS.length);
    expect(new Set(LEGAL_DOCUMENTS.map(document => document.customId)).size).toBe(LEGAL_DOCUMENTS.length);
  });

  for (const document of LEGAL_DOCUMENTS) {
    for (const language of ALL_TRANSLATION_LANGUAGES) {
      const text = document.texts[language];

      it(`${document.customId} (${language}) has a title and content`, () => {
        expect(text.title.trim()).not.toBe('');
        expect(text.content.trim()).not.toBe('');
      });

      it(`${document.customId} (${language}) only uses known placeholders`, () => {
        const unknown = LegalDocumentRenderer.findPlaceholders(text.title + text.content).filter(name => VALUES[name] === undefined);
        expect(unknown).toEqual([]);
      });

      it(`${document.customId} (${language}) contains company data only as placeholders`, () => {
        expect(COMPANY_LITERALS.filter(literal => (text.title + text.content).includes(literal))).toEqual([]);
      });
    }

    it(`${document.customId} uses the same placeholders in every language`, () => {
      const placeholders = ALL_TRANSLATION_LANGUAGES.map(language => LegalDocumentRenderer.findPlaceholders(document.texts[language].content).sort().join(','));
      expect(new Set(placeholders).size).toBe(1);
    });
  }
});

describe('LegalEntities', () => {
  it('has every field for the configured customers', () => {
    for (const customer of Object.values(CUSTOMER_LEGAL_ENTITIES)) {
      if (customer) {
        expect(Object.values(customer).every(value => value.trim().length > 0)).toBe(true);
      }
    }
  });
});

describe('LegalDocumentRenderer', () => {
  it('fills in the placeholders', () => {
    const rendered = LegalDocumentRenderer.render({ title: 'T', content: 'Contact: {{operator.email}}, {{ customer.name }}' }, VALUES);
    expect(rendered.content).toBe(`Contact: ${OPERATOR_LEGAL_ENTITY.email}, ${CUSTOMER.name}`);
  });

  it('refuses a placeholder without a value', () => {
    expect(() => LegalDocumentRenderer.render({ title: 'T', content: '{{customer.fax}}' }, VALUES)).toThrow('customer.fax');
  });
});

describe('LegalDocumentsSync', () => {
  it('replaces the old wiki with the fixed id and writes the languages of the server', async () => {
    const database = new InMemoryDatabase(['de-DE', 'EN-us', 'xx-XX']);
    database.wikis.push({ id: 'old', custom_id: 'privacy-policy', status: 'published', show_in_drawer_as_bottom_item: true, position: 3 });

    const result = await new LegalDocumentsSync(database).syncAll([PRIVACY_POLICY], CUSTOMER);

    const created = database.wikis.find(wiki => wiki.id === PRIVACY_POLICY.wikiId);
    expect(created).toMatchObject({ ...LEGAL_WIKI_SETTINGS, custom_id: 'privacy-policy', position: 3 });
    expect(database.wikis.find(wiki => wiki.id === 'old')).toMatchObject({ custom_id: LEGACY_CUSTOM_ID_PREFIX + 'privacy-policy', status: 'archived', show_in_drawer_as_bottom_item: false });
    expect(database.translations.map(translation => translation.languages_code)).toEqual(['de-DE', 'EN-us']);
    const german = database.translations[0]!;
    expect(german.title).toBe(PRIVACY_POLICY.texts.de.title);
    expect(german.content).toContain(CUSTOMER.name);
    expect(german.content).not.toContain('{{');
    expect(result.log.some(line => line.includes('failed'))).toBe(false);
  });

  it('takes a wiki archived earlier out of the footer', async () => {
    const database = new InMemoryDatabase(['de-DE']);
    database.wikis.push({ id: 'legacy', custom_id: LEGACY_CUSTOM_ID_PREFIX + 'privacy-policy', status: 'archived', show_in_drawer: false, show_in_drawer_as_bottom_item: true });
    const sync = new LegalDocumentsSync(database);

    await sync.syncAll([PRIVACY_POLICY], CUSTOMER);

    expect(database.wikis.find(wiki => wiki.id === 'legacy')).toMatchObject({ status: 'archived', show_in_drawer_as_bottom_item: false });
    database.writes = [];
    await sync.syncAll([PRIVACY_POLICY], CUSTOMER);
    expect(database.writes).toEqual([]);
  });

  it('writes nothing when everything is up to date', async () => {
    const database = new InMemoryDatabase(['de-DE', 'en-US']);
    const sync = new LegalDocumentsSync(database);
    await sync.syncAll([PRIVACY_POLICY], CUSTOMER);
    database.writes = [];

    const result = await sync.syncAll([PRIVACY_POLICY], CUSTOMER);

    expect(database.writes).toEqual([]);
    expect(result.log).toEqual([]);
  });

  it('makes a hidden legal document visible again', async () => {
    const database = new InMemoryDatabase(['de-DE']);
    const sync = new LegalDocumentsSync(database);
    await sync.syncAll([PRIVACY_POLICY], CUSTOMER);
    Object.assign(database.wikis[0]!, { public: false, show_in_drawer_as_bottom_item: false, icon: 'star' });

    const result = await sync.syncAll([PRIVACY_POLICY], CUSTOMER);

    expect(result.log).toEqual(['privacy-policy: reset public, show_in_drawer_as_bottom_item']);
    expect(database.wikis[0]).toMatchObject({ ...LEGAL_WIKI_SETTINGS, icon: 'star' });
  });

  it('only updates the language that differs from the code', async () => {
    const database = new InMemoryDatabase(['de-DE', 'en-US']);
    const sync = new LegalDocumentsSync(database);
    await sync.syncAll([PRIVACY_POLICY], CUSTOMER);
    database.translations[1]!.content = 'edited in Directus';

    const result = await sync.syncAll([PRIVACY_POLICY], CUSTOMER);

    expect(result.log).toEqual(['privacy-policy: updated en-US']);
    expect(database.translations[1]!.content).toContain(CUSTOMER.name);
  });

  it('touches nothing when a placeholder has no value', async () => {
    const database = new InMemoryDatabase(['de-DE']);
    database.wikis.push({ id: 'old', custom_id: 'privacy-policy', status: 'published' });
    const broken: LegalDocument = { ...PRIVACY_POLICY, texts: { ...PRIVACY_POLICY.texts, de: { title: 'T', content: '{{customer.fax}}' } } };

    const result = await new LegalDocumentsSync(database).syncAll([broken], CUSTOMER);

    expect(database.writes).toEqual([]);
    expect(result.log[0]).toContain('customer.fax');
  });
});

describe('LegalWikiProtection', () => {
  const protection = new LegalWikiProtection();
  const legalId = PRIVACY_POLICY.wikiId;

  it('lets people move a legal wiki and change its icon', () => {
    expect(protection.checkWikiUpdate([legalId], { position: 2, icon: 'star', color: '#fff', date_updated: 'now' })).toBeNull();
  });

  it('rejects changes to the texts, the visibility or the custom_id of a legal wiki', () => {
    const forbidden = { key: BackendTranslationKeys.legal_document_edit_forbidden };
    expect(protection.checkWikiUpdate([legalId], { translations: { update: [] } })).toEqual(forbidden);
    expect(protection.checkWikiUpdate(['other', legalId], { public: false })).toEqual(forbidden);
    expect(protection.checkWikiUpdate([legalId], { custom_id: 'x' })).toEqual(forbidden);
    expect(protection.checkWikiDelete([legalId])).toEqual(forbidden);
    expect(protection.checkWikiCreate({ id: legalId })).toEqual(forbidden);
    expect(protection.checkTranslationWrite([legalId])).toEqual(forbidden);
  });

  it('reserves the custom_ids of the legal documents', () => {
    const reserved = { key: BackendTranslationKeys.legal_document_custom_id_reserved, params: { custom_id: 'privacy-policy' } };
    expect(protection.checkWikiCreate({ custom_id: 'privacy-policy' })).toEqual(reserved);
    expect(protection.checkWikiUpdate(['other'], { custom_id: 'privacy-policy' })).toEqual(reserved);
  });

  it('leaves other wikis alone', () => {
    expect(protection.checkWikiCreate({ custom_id: 'faq' })).toBeNull();
    expect(protection.checkWikiUpdate(['other'], { translations: { update: [] } })).toBeNull();
    expect(protection.checkWikiDelete(['other'])).toBeNull();
    expect(protection.checkTranslationWrite(['other', null])).toBeNull();
  });
});
