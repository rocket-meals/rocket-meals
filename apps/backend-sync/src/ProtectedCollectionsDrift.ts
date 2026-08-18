/**
 * Pure comparison logic for the "protected collections" guard.
 *
 * Background: `directus-sync push` makes the target instance match the dump in the repository.
 * Everything the repository does not know about is deleted, everything it knows about is
 * overwritten. For configuration that is only ever edited in the repository (permissions,
 * flows, schema) that is exactly what we want. For collections that customers edit in the
 * Directus admin UI - most importantly the Insights dashboards and their panels - it silently
 * destroys their work on the next backend update.
 *
 * This module compares the dump in the repository with a fresh dump pulled from the live
 * instance and reports which entries a push would delete or overwrite.
 */

/** Field that directus-sync uses to identify an entry across instances. */
export const SYNC_ID_FIELD = '_syncId';

/** Collections known to directus-sync (see CollectionsList of the directus-sync package). */
export const KNOWN_SYNC_COLLECTIONS = ['dashboards', 'flows', 'folders', 'operations', 'panels', 'permissions', 'policies', 'presets', 'roles', 'settings', 'translations'];

export type CollectionEntry = Record<string, unknown>;

export type DriftKind =
  /** Exists only in the live instance - a push would DELETE it. */
  | 'only-in-instance'
  /** Exists in both, but the live instance has different content - a push would OVERWRITE it. */
  | 'changed-in-instance';

export type DriftItem = {
  syncId: string;
  label: string;
  kind: DriftKind;
};

export type CollectionDrift = {
  collection: string;
  items: DriftItem[];
  /** Entries the repository has but the instance does not. A push only creates those, so no data is lost. */
  onlyInRepositoryCount: number;
};

/**
 * Recursively drops null/undefined values and sorts object keys, so that two dumps can be
 * compared as strings without reporting differences that Directus/directus-sync did not mean
 * ("field missing" and "field is null" describe the same state).
 */
export function normalizeForComparison(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForComparison);
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      const entryValue = source[key];
      if (entryValue === null || entryValue === undefined) {
        continue;
      }
      normalized[key] = normalizeForComparison(entryValue);
    }
    return normalized;
  }
  return value;
}

function isEqualEntry(a: CollectionEntry, b: CollectionEntry): boolean {
  return JSON.stringify(normalizeForComparison(a)) === JSON.stringify(normalizeForComparison(b));
}

function getSyncId(entry: CollectionEntry): string | undefined {
  const syncId = entry[SYNC_ID_FIELD];
  return typeof syncId === 'string' ? syncId : undefined;
}

/** Human readable name of an entry, used in the report and the notification. */
export function getEntryLabel(entry: CollectionEntry): string {
  const name = entry['name'];
  if (typeof name === 'string' && name.trim().length > 0) {
    return name;
  }
  return getSyncId(entry) ?? 'unbekannt';
}

function toEntryMap(entries: CollectionEntry[]): Map<string, CollectionEntry> {
  const map = new Map<string, CollectionEntry>();
  for (const entry of entries) {
    const syncId = getSyncId(entry);
    if (syncId) {
      map.set(syncId, entry);
    }
  }
  return map;
}

/**
 * Compares the repository dump of a single collection with the dump pulled from the live
 * instance and returns everything a push would destroy.
 */
export function compareCollection(collection: string, repositoryEntries: CollectionEntry[], instanceEntries: CollectionEntry[]): CollectionDrift {
  const repositoryById = toEntryMap(repositoryEntries);
  const instanceById = toEntryMap(instanceEntries);
  const items: DriftItem[] = [];

  for (const [syncId, instanceEntry] of instanceById) {
    const repositoryEntry = repositoryById.get(syncId);
    if (!repositoryEntry) {
      items.push({ syncId, label: getEntryLabel(instanceEntry), kind: 'only-in-instance' });
    } else if (!isEqualEntry(repositoryEntry, instanceEntry)) {
      items.push({ syncId, label: getEntryLabel(instanceEntry), kind: 'changed-in-instance' });
    }
  }

  let onlyInRepositoryCount = 0;
  for (const syncId of repositoryById.keys()) {
    if (!instanceById.has(syncId)) {
      onlyInRepositoryCount++;
    }
  }

  // Stable order, so that reports of two runs can be compared with each other.
  items.sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label) || a.syncId.localeCompare(b.syncId));

  return { collection, items, onlyInRepositoryCount };
}

export function hasDataLoss(drifts: CollectionDrift[]): boolean {
  return drifts.some(drift => drift.items.length > 0);
}

export function countDriftItems(drifts: CollectionDrift[], kind: DriftKind): number {
  return drifts.reduce((sum, drift) => sum + drift.items.filter(item => item.kind === kind).length, 0);
}

/** Maximum number of entries listed per collection, so a notification stays readable. */
const MAX_LISTED_ITEMS_PER_COLLECTION = 15;

/** Renders the drift as a German report for the log, the backup folder and the notification. */
export function describeDrift(drifts: CollectionDrift[]): string {
  const lines: string[] = [];
  for (const drift of drifts) {
    if (drift.items.length === 0) {
      continue;
    }
    const created = drift.items.filter(item => item.kind === 'only-in-instance');
    const changed = drift.items.filter(item => item.kind === 'changed-in-instance');
    lines.push(`${drift.collection}: ${created.length} nur im Backend vorhanden, ${changed.length} im Backend geändert`);
    for (const item of drift.items.slice(0, MAX_LISTED_ITEMS_PER_COLLECTION)) {
      const kindText = item.kind === 'only-in-instance' ? 'nur im Backend (würde gelöscht)' : 'im Backend geändert (würde überschrieben)';
      lines.push(`  - "${item.label}" [${kindText}]`);
    }
    if (drift.items.length > MAX_LISTED_ITEMS_PER_COLLECTION) {
      lines.push(`  - ... und ${drift.items.length - MAX_LISTED_ITEMS_PER_COLLECTION} weitere`);
    }
  }
  return lines.join('\n');
}
