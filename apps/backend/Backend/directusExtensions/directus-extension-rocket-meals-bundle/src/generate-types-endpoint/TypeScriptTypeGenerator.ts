import { ApiContext } from '../helpers/ApiContext';
import { Accountability, SchemaOverview } from '@directus/types';

/**
 * Generates TypeScript type definitions from the Directus schema.
 *
 * The logic mirrors the "directus-extension-generate-types" UI module
 * (see modules/generate-types/index.js) but runs entirely server-side so
 * that external callers can obtain the types via a simple HTTP request
 * instead of driving a browser with Playwright.
 */

type FieldInfo = {
  field: string;
  type: string;
  collection: string;
  schema: { is_nullable: boolean } | null;
  meta: { interface: string | null; singleton: boolean } | null;
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
    .flatMap(s => s.split('_'))
    .flatMap(s => s.split('-'))
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function fieldTypeString(field: FieldInfo, useIntersection: boolean): string {
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
    result += useIntersection ? ' & ' : ' | ';
    result += field.relation.collection ? toPascalCase(field.relation.collection) : 'any';
    if (field.relation.type === 'many') {
      result += '[]';
    }
  }

  if (field.schema?.is_nullable) {
    if (field.relation && useIntersection) {
      result = `(${result}) | null`;
    } else {
      result += ' | null';
    }
  }

  return result;
}

export class TypeScriptTypeGenerator {
  /**
   * Fetch collections, fields and relations from Directus and return
   * a fully formatted TypeScript type-definition string.
   */
  static async generate(
    apiContext: ApiContext,
    accountability: Accountability,
  ): Promise<string> {
    const schema: SchemaOverview = await apiContext.getSchema();

    const { services, database } = apiContext;

    const serviceOptions = { knex: database, accountability, schema };

    // Use the internal Directus services to read collections, fields and relations
    // @ts-ignore – service constructors are not properly typed in the extension SDK
    const collectionsService = new services.CollectionsService(serviceOptions);
    // @ts-ignore – service constructors are not properly typed in the extension SDK
    const fieldsService = new services.FieldsService(serviceOptions);
    // @ts-ignore – service constructors are not properly typed in the extension SDK
    const relationsService = new services.RelationsService(serviceOptions);

    const rawCollections: any[] = await collectionsService.readByQuery();
    const rawFields: any[] = await fieldsService.readAll();
    const rawRelations: any[] = await relationsService.readAll();

    // Build a map of collections with their fields
    const collectionMap: Record<string, CollectionInfo> = {};

    rawCollections
      .sort((a: any, b: any) => a.collection.localeCompare(b.collection))
      .forEach((c: any) => {
        collectionMap[c.collection] = {
          collection: c.collection,
          meta: c.meta,
          fields: [],
        };
      });

    rawFields
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
    rawRelations.forEach((rel: any) => {
      if (!rel.meta) return;

      const oneCollectionEntry = collectionMap[rel.meta.one_collection];
      if (oneCollectionEntry) {
        const oneField = oneCollectionEntry.fields.find(f => f.field === rel.meta.one_field);
        if (oneField) {
          oneField.relation = { type: 'many', collection: rel.meta.many_collection };
        }
      }

      const manyCollectionEntry = collectionMap[rel.meta.many_collection];
      if (manyCollectionEntry) {
        const manyField = manyCollectionEntry.fields.find(f => f.field === rel.meta.many_field);
        if (manyField) {
          manyField.relation = { type: 'one', collection: rel.meta.one_collection };
        }
      }
    });

    // Generate TypeScript output
    const useIntersection = false;
    let output = '';
    const customTypeEntries: string[] = [];

    Object.values(collectionMap).forEach(col => {
      const typeName = toPascalCase(col.collection);
      const isSingleton = col.meta?.singleton === true;

      customTypeEntries.push(`${col.collection}: ${typeName}${isSingleton ? '' : '[]'}`);

      output += `export type ${typeName} = {\n`;

      col.fields.forEach(field => {
        if (field.meta?.interface?.startsWith('presentation-')) return;

        output += '  ';
        output += field.field.includes('-') ? `"${field.field}"` : field.field;
        if (field.schema?.is_nullable) output += '?';
        output += ': ';
        output += fieldTypeString(field, useIntersection);
        output += ';\n';
      });

      output += '};\n\n';
    });

    output += 'export type CustomDirectusTypes = {\n';
    output += customTypeEntries.map(e => `  ${e};`).join('\n');
    output += '\n};\n';

    return output;
  }
}
