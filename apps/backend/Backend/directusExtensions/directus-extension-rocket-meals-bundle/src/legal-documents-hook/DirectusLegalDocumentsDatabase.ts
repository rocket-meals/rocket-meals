import { DatabaseTypes } from 'repo-depkit-common';
import { ItemsServiceHelper } from '../helpers/ItemsServiceHelper';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { LEGAL_WIKI_SETTINGS, LegalDocumentsDatabase, LegalWiki, LegalWikiTranslation, WIKI_DISPLAY_FIELDS } from './LegalDocumentsSync';

const WIKIS = 'wikis';
const WIKIS_TRANSLATIONS = 'wikis_translations';
const NO_EVENTS = { disableEventEmit: true };

/** `LegalDocumentsDatabase` with the Directus services. Writes emit no events (no auto translation, no hooks). */
export class DirectusLegalDocumentsDatabase implements LegalDocumentsDatabase {
  private readonly wikis: ItemsServiceHelper<DatabaseTypes.Wikis>;
  private readonly translations: ItemsServiceHelper<DatabaseTypes.WikisTranslations>;

  constructor(private readonly myDatabaseHelper: MyDatabaseHelper) {
    this.wikis = new ItemsServiceHelper<DatabaseTypes.Wikis>(myDatabaseHelper, WIKIS);
    this.translations = new ItemsServiceHelper<DatabaseTypes.WikisTranslations>(myDatabaseHelper, WIKIS_TRANSLATIONS);
  }

  async readLanguageCodes(): Promise<string[]> {
    const languages = await this.myDatabaseHelper.getLanguagesHelper().readByQuery({ fields: ['code'], limit: -1 });
    return languages.map(language => language.code).filter((code): code is string => typeof code === 'string' && code.length > 0);
  }

  async readWikisByIdOrCustomIds(id: string, customIds: readonly string[]): Promise<LegalWiki[]> {
    const wikis = await this.wikis.readByQuery({
      filter: { _or: [{ id: { _eq: id } }, { custom_id: { _in: [...customIds] } }] },
      fields: ['id', 'custom_id', ...WIKI_DISPLAY_FIELDS, ...Object.keys(LEGAL_WIKI_SETTINGS)],
      sort: ['date_created'],
      limit: -1,
    });
    return wikis as unknown as LegalWiki[];
  }

  async readTranslations(wikiId: string): Promise<LegalWikiTranslation[]> {
    const translations = await this.translations.readByQuery({
      filter: { wikis_id: { _eq: wikiId } },
      fields: ['id', 'languages_code', 'title', 'content'],
      limit: -1,
    });
    return translations as unknown as LegalWikiTranslation[];
  }

  async createWiki(wiki: Record<string, unknown>): Promise<void> {
    await this.wikis.createOne(wiki as Partial<DatabaseTypes.Wikis>, NO_EVENTS);
  }

  async updateWiki(id: string, update: Record<string, unknown>): Promise<void> {
    await this.wikis.updateOne(id, update as Partial<DatabaseTypes.Wikis>, NO_EVENTS);
  }

  async writeTranslations(wikiId: string, create: Record<string, unknown>[], update: Record<string, unknown>[]): Promise<void> {
    await this.wikis.updateOne(wikiId, { translations: { create, update, delete: [] } } as unknown as Partial<DatabaseTypes.Wikis>, NO_EVENTS);
  }
}
