/**
 * TypeScript generation logic ported from the existing
 * `apps/backend/Backend/directusExtensions/modules/generate-types/index.js`
 * (directus-extension-generate-types by maltejur,
 * https://github.com/maltejur/directus-extension-generate-types).
 *
 * The browser-side module uses an injected axios `api` object to call
 * `/collections`, `/fields` and `/relations`. Here we use the Directus
 * service classes directly, but the generation algorithm (`ee` / `ne` / `te`
 * in the original) is identical.
 */

// ─── Minimal service interfaces (only the methods we actually call) ──────────

interface ICollectionsService {
  readByQuery(query: { limit: number }): Promise<any[]>;
}

interface IFieldsService {
  readAll(): Promise<any[]>;
}

interface IRelationsService {
  readAll(): Promise<any[]>;
}

// ─── Types (match the shapes returned by Directus REST API) ─────────────────

type RelationMeta = {
  one_collection: string | null;
  one_field: string | null;
  many_collection: string;
  many_field: string;
};

type FieldRelation = { type: 'one' | 'many'; collection: string | null };

type FieldInfo = {
  field: string;
  type: string;
  collection: string;
  schema: { is_nullable: boolean } | null;
  meta: { interface: string | null } | null;
  relation?: FieldRelation;
};

type CollectionEntry = {
  collection: string;
  meta: { singleton: boolean } | null;
  fields: FieldInfo[];
};

// ─── te() — toPascalCase ─────────────────────────────────────────────────────

function toPascalCase(name: string): string {
  return name
    .split(' ')
    .flatMap((s) => s.split('_'))
    .flatMap((s) => s.split('-'))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

// ─── Field type resolver (inline in ne() in the original) ───────────────────

function resolveFieldType(field: FieldInfo, useIntersectionTypes: boolean): string {
  let result: string;

  if (field.relation && field.relation.type === 'many') {
    result = 'any[]';
  } else if (['integer', 'bigInteger', 'float', 'decimal'].includes(field.type)) {
    result = 'number';
  } else if (field.type === 'boolean') {
    result = 'boolean';
  } else if (['json', 'csv'].includes(field.type)) {
    result = 'unknown';
  } else {
    result = 'string';
  }

  if (field.relation) {
    result += useIntersectionTypes ? ' & ' : ' | ';
    result += field.relation.collection ? toPascalCase(field.relation.collection) : 'any';
    if (field.relation.type === 'many') result += '[]';
  }

  if (field.schema?.is_nullable) {
    if (field.relation && useIntersectionTypes) {
      result = `(${result}) | null`;
    } else {
      result += ' | null';
    }
  }

  return result;
}

// ─── ee() — fetch + build collection map ────────────────────────────────────

async function buildCollectionMap(
  collectionsService: ICollectionsService,
  fieldsService: IFieldsService,
  relationsService: IRelationsService,
): Promise<Record<string, CollectionEntry>> {
  const collectionsRaw: any[] = await collectionsService.readByQuery({ limit: -1 });
  const fieldsRaw: any[] = (await fieldsService.readAll()) ?? [];
  const relationsRaw: any[] = (await relationsService.readAll()) ?? [];

  // Build sorted collection map (mirrors ee() sort + forEach)
  const map: Record<string, CollectionEntry> = {};
  collectionsRaw
    .sort((a, b) => a.collection.localeCompare(b.collection))
    .forEach((c) => {
      map[c.collection] = { collection: c.collection, meta: c.meta ?? null, fields: [] };
    });

  // Attach fields (mirrors ee() fields block)
  fieldsRaw
    .sort((a, b) => a.field.localeCompare(b.field))
    .forEach((f) => {
      if (map[f.collection]) {
        map[f.collection].fields.push(f as FieldInfo);
      }
    });

  // Remove collections without fields (mirrors ee() cleanup)
  for (const key of Object.keys(map)) {
    if (map[key].fields.length === 0) delete map[key];
  }

  // Attach relation info to fields (mirrors ee() relations block)
  relationsRaw.forEach((rel) => {
    const meta: RelationMeta | undefined = rel.meta;
    if (!meta) return;

    const oneEntry = meta.one_collection ? map[meta.one_collection] : undefined;
    if (oneEntry && meta.one_field) {
      const f = oneEntry.fields.find((x) => x.field === meta.one_field);
      if (f) f.relation = { type: 'many', collection: meta.many_collection };
    }

    const manyEntry = map[meta.many_collection];
    if (manyEntry && meta.many_field) {
      const f = manyEntry.fields.find((x) => x.field === meta.many_field);
      if (f) f.relation = { type: 'one', collection: meta.one_collection };
    }
  });

  return map;
}

// ─── ne() — generate TypeScript string ──────────────────────────────────────

export async function generateTypes(
  collectionsService: ICollectionsService,
  fieldsService: IFieldsService,
  relationsService: IRelationsService,
  useIntersectionTypes = false,
  sdk11 = true,
): Promise<string> {
  const map = await buildCollectionMap(collectionsService, fieldsService, relationsService);

  let output = '';
  const customTypeEntries: string[] = [];

  Object.values(map).forEach((col) => {
    const typeName = toPascalCase(col.collection);
    const isSingleton = col.meta?.singleton === true;

    customTypeEntries.push(
      sdk11 ? `${col.collection}: ${typeName}${isSingleton ? '' : '[]'}` : `${col.collection}: ${typeName}`,
    );

    output += `export type ${typeName} = {\n`;

    col.fields.forEach((field) => {
      if (field.meta?.interface?.startsWith('presentation-')) return;

      output += '  ';
      output += field.field.includes('-') ? `"${field.field}"` : field.field;
      if (field.schema?.is_nullable) output += '?';
      output += ': ';
      output += resolveFieldType(field, useIntersectionTypes);
      output += ';\n';
    });

    output += '};\n\n';
  });

  output += 'export type CustomDirectusTypes = {\n';
  output += customTypeEntries.map((e) => `  ${e};`).join('\n');
  output += '\n};\n';

  return output;
}
