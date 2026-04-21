import * as fs from 'node:fs';
import * as path from 'node:path';
import { FetchIgnoreSelfSignedCertHelper } from './FetchIgnoreSelfSignedCertHelper';

export interface DirectusTypeDownloaderOptions {
  directusInstanceUrl: string;
  adminEmail: string;
  adminPassword: string;
  targetTypesFilePath: string;
}

// ─── Type generation logic ──────────────────────────────────────────────────
// Mirrors the browser-side code in the existing "directus-extension-generate-types"
// UI module (apps/backend/Backend/directusExtensions/modules/generate-types/index.js)
// which uses the same Directus REST endpoints below.

type FieldInfo = {
  field: string;
  type: string;
  collection: string;
  schema: { is_nullable: boolean } | null;
  meta: { interface: string | null } | null;
  relation?: { type: 'one' | 'many'; collection: string | null };
};

type CollectionInfo = {
  collection: string;
  meta: { singleton: boolean } | null;
  fields: FieldInfo[];
};

function toPascalCase(name: string): string {
  return name
    .split(' ')
    .flatMap((s: string) => s.split('_'))
    .flatMap((s: string) => s.split('-'))
    .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function fieldTypeString(field: FieldInfo): string {
  let result: string;

  if (field.relation && field.relation.type === 'many') {
    result = 'any[]';
  } else if (['integer', 'bigInteger', 'float', 'decimal'].includes(field.type)) {
    result = 'number';
  } else if (['boolean'].includes(field.type)) {
    result = 'boolean';
  } else if (['json', 'csv'].includes(field.type)) {
    result = 'unknown';
  } else {
    result = 'string';
  }

  if (field.relation) {
    result += ' | ';
    result += field.relation.collection ? toPascalCase(field.relation.collection) : 'any';
    if (field.relation.type === 'many') {
      result += '[]';
    }
  }

  if (field.schema?.is_nullable) {
    result += ' | null';
  }

  return result;
}

function generateTypeScript(
  collections: any[],
  fields: any[],
  relations: any[],
): string {
  // Build collection map
  const collectionMap: Record<string, CollectionInfo> = {};

  collections
    .sort((a: any, b: any) => a.collection.localeCompare(b.collection))
    .forEach((c: any) => {
      collectionMap[c.collection] = { collection: c.collection, meta: c.meta, fields: [] };
    });

  fields
    .sort((a: any, b: any) => a.field.localeCompare(b.field))
    .forEach((f: any) => {
      const entry = collectionMap[f.collection];
      if (entry) {
        entry.fields.push(f as FieldInfo);
      }
    });

  // Remove collections without fields
  for (const key of Object.keys(collectionMap)) {
    const entry = collectionMap[key];
    if (entry && entry.fields.length === 0) {
      delete collectionMap[key];
    }
  }

  // Attach relation info to fields
  relations.forEach((rel: any) => {
    if (!rel.meta) return;

    const oneEntry = collectionMap[rel.meta.one_collection];
    if (oneEntry) {
      const oneField = oneEntry.fields.find((f: FieldInfo) => f.field === rel.meta.one_field);
      if (oneField) {
        oneField.relation = { type: 'many', collection: rel.meta.many_collection };
      }
    }

    const manyEntry = collectionMap[rel.meta.many_collection];
    if (manyEntry) {
      const manyField = manyEntry.fields.find((f: FieldInfo) => f.field === rel.meta.many_field);
      if (manyField) {
        manyField.relation = { type: 'one', collection: rel.meta.one_collection };
      }
    }
  });

  // Render TypeScript
  let output = '';
  const customTypeEntries: string[] = [];

  Object.values(collectionMap).forEach((col: CollectionInfo) => {
    const typeName = toPascalCase(col.collection);
    const isSingleton = col.meta?.singleton === true;

    customTypeEntries.push(`${col.collection}: ${typeName}${isSingleton ? '' : '[]'}`);

    output += `export type ${typeName} = {\n`;

    col.fields.forEach((field: FieldInfo) => {
      if (field.meta?.interface?.startsWith('presentation-')) return;

      output += '  ';
      output += field.field.includes('-') ? `"${field.field}"` : field.field;
      if (field.schema?.is_nullable) output += '?';
      output += ': ';
      output += fieldTypeString(field);
      output += ';\n';
    });

    output += '};\n\n';
  });

  output += 'export type CustomDirectusTypes = {\n';
  output += customTypeEntries.map((e: string) => `  ${e};`).join('\n');
  output += '\n};\n';

  return output;
}

// ─── Downloader ─────────────────────────────────────────────────────────────

export class DirectusTypeDownloaderHelper {
  private readonly options: DirectusTypeDownloaderOptions;

  constructor(options: DirectusTypeDownloaderOptions) {
    this.options = options;
  }

  /**
   * Authenticate with Directus and obtain an access token.
   */
  private async getAccessToken(): Promise<string> {
    const { directusInstanceUrl, adminEmail, adminPassword } = this.options;

    console.log('🔐 Authentifiziere bei Directus...');
    const response = await FetchIgnoreSelfSignedCertHelper.fetch(
      `${directusInstanceUrl}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login fehlgeschlagen (HTTP ${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const accessToken = data?.data?.access_token;
    if (!accessToken) {
      throw new Error('Login erfolgreich, aber kein access_token erhalten');
    }
    console.log('✅ Erfolgreich authentifiziert');
    return accessToken;
  }

  /**
   * Fetch a JSON list from a Directus endpoint using the given access token.
   */
  private async fetchList(url: string, accessToken: string): Promise<any[]> {
    const response = await FetchIgnoreSelfSignedCertHelper.fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fehler beim Abrufen von ${url} (HTTP ${response.status}): ${errorText}`);
    }

    const json = await response.json();
    return json?.data ?? [];
  }

  /**
   * Download and generate TypeScript types by calling the same standard
   * Directus REST endpoints that the existing "generate-types" UI extension
   * uses internally.
   */
  public async downloadTypes(): Promise<void> {
    const { directusInstanceUrl, targetTypesFilePath } = this.options;

    console.log('📡 Lade TypeScript-Typen via Directus REST-API...');

    const accessToken = await this.getAccessToken();

    console.log('📦 Rufe Collections, Fields und Relations ab...');
    const [collections, fields, relations] = await Promise.all([
      this.fetchList(`${directusInstanceUrl}/collections?limit=-1`, accessToken),
      this.fetchList(`${directusInstanceUrl}/fields?limit=-1`, accessToken),
      this.fetchList(`${directusInstanceUrl}/relations?limit=-1`, accessToken),
    ]);

    console.log(`  → ${collections.length} Collections, ${fields.length} Fields, ${relations.length} Relations`);

    const typesContent = generateTypeScript(collections, fields, relations);

    if (!typesContent || typesContent.trim().length === 0) {
      throw new Error('Typ-Generierung ergab leere Ausgabe');
    }

    const targetDir = path.dirname(targetTypesFilePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetTypesFilePath, typesContent, 'utf-8');
    console.log(`✅ TypeScript-Typen erfolgreich gespeichert: ${targetTypesFilePath}`);
  }
}

