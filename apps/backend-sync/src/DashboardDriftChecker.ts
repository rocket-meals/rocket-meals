import * as fs from 'node:fs';
import * as path from 'node:path';
import { StringHelper } from 'repo-depkit-common';
import { DirectusConnectionOptions } from './DirectusConnectionOptions';
import { DirectusSessionHelper } from './DirectusSessionHelper';
import { DockerDirectusPingHelper } from './DockerDirectusPingHelper';
import { FetchIgnoreSelfSignedCertHelper } from './FetchIgnoreSelfSignedCertHelper';

/**
 * Collections of the directus-sync dump that admins edit through the Directus UI and
 * that a deploy would silently overwrite: on every start the backend-sync container
 * pushes the state of this repository into Directus (see index.ts / SyncDatabaseSchema).
 * A dashboard that was built in the UI but never pulled into the repository is deleted
 * by that push - which is exactly what this check prevents.
 */
export const DEFAULT_COLLECTIONS_TO_CHECK = ['dashboards', 'panels'];

export enum DriftStatus {
  /** Server matches the repository - a deploy is safe. */
  UNCHANGED = 'unchanged',
  /** Server differs from the repository - a deploy would overwrite those changes. */
  DRIFTED = 'drifted',
  /** Server did not answer, e.g. because it is currently down. */
  UNREACHABLE = 'unreachable',
  /** Server answered but could not be checked (login failed, bad response, ...). */
  ERROR = 'error',
}

export type DriftResult = {
  status: DriftStatus;
  differences: string[];
  message?: string;
};

export type DashboardDriftCheckerOptions = {
  /** Path to "data/directus-sync-data" of this repository. */
  pathToDataDirectusSyncData: string;
  /** Defaults to DEFAULT_COLLECTIONS_TO_CHECK. */
  collections?: string[];
  /** How often the server is pinged before it counts as unreachable. */
  pingRetries?: number;
};

type DirectusItem = Record<string, unknown>;

const MAX_VALUE_LENGTH_IN_LOG = 120;
const SAFE_COLLECTION_NAME = /^[a-z0-9_]+$/;

/** Removes control characters so server side content cannot forge log lines. */
function sanitizeForLog(value: string): string {
  return StringHelper.replaceAllWithOptions({ str: value, find: '[\\u0000-\\u001f]', replace: ' ' });
}

/** JSON with sorted keys, so that a different key order is not reported as a change. */
function stableStringify(value: unknown): string {
  if (value === undefined) {
    return 'null'; // a field the API omits is treated like an empty field
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(',')}}`;
}

function describeValue(value: unknown): string {
  const asText = sanitizeForLog(stableStringify(value));
  if (asText.length <= MAX_VALUE_LENGTH_IN_LOG) {
    return asText;
  }
  return `${asText.slice(0, MAX_VALUE_LENGTH_IN_LOG)}…`;
}

function describeItem(item: DirectusItem, fallbackId: string): string {
  const name = item['name'];
  const label = typeof name === 'string' && name.length > 0 ? name : fallbackId;
  return sanitizeForLog(label);
}

function toErrorMessage(error: unknown): string {
  return sanitizeForLog(error instanceof Error ? error.message : String(error));
}

/**
 * Compares the Directus configuration of a running backend with the state stored in
 * this repository, without changing anything on either side.
 */
export class DashboardDriftChecker {
  private readonly collectionsPath: string;
  private readonly collections: string[];
  private readonly pingRetries: number;

  constructor(options: DashboardDriftCheckerOptions) {
    this.collectionsPath = path.resolve(options.pathToDataDirectusSyncData, 'configuration/directus-config/collections');
    this.collections = options.collections ?? DEFAULT_COLLECTIONS_TO_CHECK;
    this.pingRetries = options.pingRetries ?? 2;
  }

  public async check(connection: DirectusConnectionOptions): Promise<DriftResult> {
    const reachable = await DockerDirectusPingHelper.waitForDirectusHealthy(connection.directusInstanceUrl, this.pingRetries, 5);
    if (!reachable) {
      return {
        status: DriftStatus.UNREACHABLE,
        differences: [],
        message: 'Server hat auf den Ping nicht geantwortet (läuft der Server?)',
      };
    }

    let headers: Headers;
    try {
      headers = await DirectusSessionHelper.login(connection);
    } catch (error) {
      return {
        status: DriftStatus.ERROR,
        differences: [],
        message: `Login fehlgeschlagen: ${toErrorMessage(error)}`,
      };
    }

    const differences: string[] = [];
    for (const collection of this.collections) {
      try {
        const localItems = this.readLocalItems(collection);
        const remoteItems = await DashboardDriftChecker.fetchRemoteItems(connection, headers, collection);
        differences.push(...DashboardDriftChecker.compareItems(collection, localItems, remoteItems));
      } catch (error) {
        return {
          status: DriftStatus.ERROR,
          differences,
          message: `Sammlung "${sanitizeForLog(collection)}" konnte nicht geprüft werden: ${toErrorMessage(error)}`,
        };
      }
    }

    return {
      status: differences.length > 0 ? DriftStatus.DRIFTED : DriftStatus.UNCHANGED,
      differences,
    };
  }

  /** The state this repository would push, e.g. "…/directus-config/collections/dashboards.json". */
  private readLocalItems(collection: string): DirectusItem[] {
    const filePath = path.resolve(this.collectionsPath, `${DashboardDriftChecker.requireSafeCollectionName(collection)}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Datei "${filePath}" wurde nicht gefunden`);
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!Array.isArray(parsed)) {
      throw new Error(`Datei "${filePath}" enthält keine Liste`);
    }
    return parsed as DirectusItem[];
  }

  /** The state that currently lives on the server. */
  private static async fetchRemoteItems(connection: DirectusConnectionOptions, headers: Headers, collection: string): Promise<DirectusItem[]> {
    const url = `${connection.directusInstanceUrl}/${DashboardDriftChecker.requireSafeCollectionName(collection)}?limit=-1`;
    const response = await FetchIgnoreSelfSignedCertHelper.fetch(url, {
      method: 'GET',
      headers: { Cookie: headers.get('cookie') },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    if (!Array.isArray(json?.data)) {
      throw new Error('Antwort enthält keine Liste');
    }
    return json.data as DirectusItem[];
  }

  // The collection name ends up in a url and a file path, so only allow plain names.
  private static requireSafeCollectionName(collection: string): string {
    if (!SAFE_COLLECTION_NAME.test(collection)) {
      throw new Error(`Ungültiger Sammlungsname "${sanitizeForLog(collection)}"`);
    }
    return collection;
  }

  /**
   * Items are matched by id: the dump stores the real Directus id as "_syncId" because
   * dashboards and panels are pushed with "--preserve-ids" (see DirectusDatabaseSync).
   */
  private static compareItems(collection: string, localItems: DirectusItem[], remoteItems: DirectusItem[]): string[] {
    const differences: string[] = [];
    const localItemsById = new Map(localItems.map(item => [String(item['_syncId']), item]));
    const remoteItemsById = new Map(remoteItems.map(item => [String(item['id']), item]));

    for (const [id, localItem] of localItemsById) {
      const remoteItem = remoteItemsById.get(id);
      if (!remoteItem) {
        differences.push(`${collection}: "${describeItem(localItem, id)}" wurde auf dem Server gelöscht (würde durch den Deploy wieder angelegt)`);
        continue;
      }
      for (const field of Object.keys(localItem)) {
        if (field === '_syncId') {
          continue;
        }
        if (stableStringify(localItem[field]) !== stableStringify(remoteItem[field])) {
          differences.push(`${collection}: "${describeItem(remoteItem, id)}" – Feld "${sanitizeForLog(field)}" wurde auf dem Server geändert ` + `(Server: ${describeValue(remoteItem[field])} | Repository: ${describeValue(localItem[field])})`);
        }
      }
    }

    for (const [id, remoteItem] of remoteItemsById) {
      if (!localItemsById.has(id)) {
        differences.push(`${collection}: "${describeItem(remoteItem, id)}" existiert nur auf dem Server (würde durch den Deploy gelöscht)`);
      }
    }

    return differences;
  }
}
