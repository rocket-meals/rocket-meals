import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { CollectionDrift, CollectionEntry, compareCollection, countDriftItems, describeDrift, hasDataLoss, KNOWN_SYNC_COLLECTIONS } from './ProtectedCollectionsDrift';
import { DirectusNotificationHelper } from './DirectusNotificationHelper';

/**
 * Collections that are edited by the customers themselves in the Directus admin UI and are
 * therefore protected by default. Insights dashboards and their panels are the ones that hurt:
 * a customer builds an evaluation page and the next backend update deletes it again.
 */
export const DEFAULT_PROTECTED_COLLECTIONS = ['dashboards', 'panels'];

export const ENV_PROTECTED_COLLECTIONS = 'DIRECTUS_SYNC_PROTECTED_COLLECTIONS';
export const ENV_PROTECTION_MODE = 'DIRECTUS_SYNC_PROTECTION_MODE';
export const ENV_FORCE_OVERWRITE = 'DIRECTUS_SYNC_FORCE_OVERWRITE_PROTECTED_COLLECTIONS';
export const ENV_NOTIFY_EMAILS = 'DIRECTUS_SYNC_DRIFT_NOTIFY_EMAILS';
export const ENV_BACKUP_PATH = 'DIRECTUS_SYNC_DRIFT_BACKUP_PATH';

/**
 * How the sync reacts to changes that were made in the live instance:
 * - `skip`   (default): the affected collections are not pushed, so nothing is lost.
 * - `report`: the collections are pushed (the changes are overwritten), but a backup is
 *             written and a notification is sent - updates keep rolling out unchanged.
 * - `off`:    no check at all (the behaviour before this guard existed).
 */
export type ProtectionMode = 'skip' | 'report' | 'off';

export const PROTECTION_MODES: ProtectionMode[] = ['skip', 'report', 'off'];

export type ProtectedCollectionsConfig = {
  /** Collections that must not be overwritten silently. Empty disables the guard. */
  collections: string[];
  /** What happens when changes are found in the live instance. */
  mode: ProtectionMode;
  /** Overwrite the instance even though it has local changes (explicit opt-in). */
  forceOverwrite: boolean;
  /** Additional email addresses (Directus users) that are notified about local changes. */
  notifyEmails: string[];
  /** Folder the backup of the local changes is written to. */
  backupPath: string;
};

export type ProtectedCollectionsGuardResult = {
  /** Collections that must be excluded from the following `directus-sync push`. */
  collectionsToExcludeFromPush: string[];
  drifts: CollectionDrift[];
};

function parseBoolean(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ['true', '1', 'yes', 'y', 'on'].includes(value.trim().toLowerCase());
}

function parseMode(value: string | undefined): ProtectionMode {
  if (!value) {
    return 'skip';
  }
  const mode = value.trim().toLowerCase();
  if (!PROTECTION_MODES.includes(mode as ProtectionMode)) {
    throw new Error(`${ENV_PROTECTION_MODE} muss einer der folgenden Werte sein: ${PROTECTION_MODES.join(', ')} (war: ${mode})`);
  }
  return mode as ProtectionMode;
}

function parseList(value: string | undefined): string[] {
  if (value === undefined) {
    return [];
  }
  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);
}

/**
 * Builds the guard configuration from the environment. Every value can be overridden by the
 * caller (CLI flags), the environment is what the Docker deployment uses.
 */
export function resolveProtectedCollectionsConfig(params: { defaultBackupPath: string; forceOverwrite?: boolean }): ProtectedCollectionsConfig {
  const configuredCollections = process.env[ENV_PROTECTED_COLLECTIONS];
  const collections = configuredCollections === undefined ? [...DEFAULT_PROTECTED_COLLECTIONS] : parseList(configuredCollections);

  const unknownCollections = collections.filter(collection => !KNOWN_SYNC_COLLECTIONS.includes(collection));
  if (unknownCollections.length > 0) {
    throw new Error(`${ENV_PROTECTED_COLLECTIONS} enthält unbekannte Kollektionen: ${unknownCollections.join(', ')}. Erlaubt sind: ${KNOWN_SYNC_COLLECTIONS.join(', ')}`);
  }

  return {
    collections,
    mode: parseMode(process.env[ENV_PROTECTION_MODE]),
    forceOverwrite: params.forceOverwrite || parseBoolean(process.env[ENV_FORCE_OVERWRITE]),
    notifyEmails: parseList(process.env[ENV_NOTIFY_EMAILS]),
    backupPath: process.env[ENV_BACKUP_PATH] || params.defaultBackupPath,
  };
}

export type ProtectedCollectionsGuardOptions = {
  config: ProtectedCollectionsConfig;
  /** Folder with the collection dumps of the repository (the state that would be pushed). */
  repositoryCollectionsPath: string;
  /** URL of the instance, only used for log output and the notification text. */
  directusInstanceUrl: string;
  /** Pulls the given collections from the live instance into `dumpPath`. */
  pullInstanceCollections: (dumpPath: string, collections: string[]) => Promise<void>;
  notificationHelper?: DirectusNotificationHelper;
};

/**
 * Compares the live instance with the repository before a push and decides whether the
 * protected collections may be overwritten.
 *
 * Default: they may not. The push then runs without those collections, so the rest of the
 * schema is still deployed while the dashboards of the customer stay untouched. A backup and
 * a notification make sure the change is visible and can be taken over into the repository.
 */
export class ProtectedCollectionsGuard {
  private readonly options: ProtectedCollectionsGuardOptions;

  constructor(options: ProtectedCollectionsGuardOptions) {
    this.options = options;
  }

  public async run(): Promise<ProtectedCollectionsGuardResult> {
    const { collections, mode } = this.options.config;
    if (collections.length === 0 || mode === 'off') {
      console.log(`ℹ️  Schutz für Dashboard-Kollektionen ist deaktiviert (${ENV_PROTECTION_MODE}=${mode}, ${ENV_PROTECTED_COLLECTIONS}=${collections.join(',')}).`);
      return { collectionsToExcludeFromPush: [], drifts: [] };
    }

    console.log(`🛡️  Prüfe geschützte Kollektionen vor dem Push: ${collections.join(', ')}`);
    const temporaryDumpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'directus-sync-guard-'));
    try {
      let drifts: CollectionDrift[];
      try {
        await this.options.pullInstanceCollections(temporaryDumpPath, collections);
        drifts = this.compareWithRepository(temporaryDumpPath, collections);
      } catch (error) {
        return this.handlePullFailure(error);
      }

      if (!hasDataLoss(drifts)) {
        console.log('✅ Keine lokalen Änderungen an den geschützten Kollektionen gefunden - der Push kann sie gefahrlos aktualisieren.');
        return { collectionsToExcludeFromPush: [], drifts };
      }

      return await this.handleDrift(drifts, temporaryDumpPath);
    } finally {
      fs.rmSync(temporaryDumpPath, { recursive: true, force: true });
    }
  }

  /**
   * Without a comparison state we cannot tell whether the instance has local changes, so the
   * guard fails closed and leaves the protected collections alone.
   */
  private shouldOverwriteAnyway(): boolean {
    return this.options.config.forceOverwrite || this.options.config.mode === 'report';
  }

  private handlePullFailure(error: unknown): ProtectedCollectionsGuardResult {
    console.error('❌ Der Vergleichs-Pull der geschützten Kollektionen ist fehlgeschlagen:', error);
    if (this.shouldOverwriteAnyway()) {
      console.warn('⚠️  Überschreiben ist erlaubt (Force-Override bzw. Modus "report") - die geschützten Kollektionen werden trotzdem gepusht.');
      return { collectionsToExcludeFromPush: [], drifts: [] };
    }
    console.warn(`⚠️  Sicherheitshalber werden ${this.options.config.collections.join(', ')} NICHT gepusht, damit keine Änderungen im Backend verloren gehen.`);
    return { collectionsToExcludeFromPush: [...this.options.config.collections], drifts: [] };
  }

  private compareWithRepository(temporaryDumpPath: string, collections: string[]): CollectionDrift[] {
    const drifts: CollectionDrift[] = [];
    for (const collection of collections) {
      const repositoryEntries = ProtectedCollectionsGuard.readCollectionFile(path.join(this.options.repositoryCollectionsPath, `${collection}.json`));
      const instanceEntries = ProtectedCollectionsGuard.readCollectionFile(path.join(temporaryDumpPath, 'collections', `${collection}.json`));
      drifts.push(compareCollection(collection, repositoryEntries, instanceEntries));
    }
    return drifts;
  }

  private static readCollectionFile(filePath: string): CollectionEntry[] {
    if (!fs.existsSync(filePath)) {
      // directus-sync omits the file when the collection is empty.
      return [];
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? (parsed as CollectionEntry[]) : [];
  }

  private async handleDrift(drifts: CollectionDrift[], temporaryDumpPath: string): Promise<ProtectedCollectionsGuardResult> {
    const { collections, notifyEmails } = this.options.config;
    const overwriteAnyway = this.shouldOverwriteAnyway();
    const deletedCount = countDriftItems(drifts, 'only-in-instance');
    const overwrittenCount = countDriftItems(drifts, 'changed-in-instance');

    console.warn('⚠️  Lokale Änderungen an geschützten Kollektionen gefunden:');
    console.warn(describeDrift(drifts));

    const backupPath = this.writeBackup(drifts, temporaryDumpPath);

    const result: ProtectedCollectionsGuardResult = overwriteAnyway
      ? { collectionsToExcludeFromPush: [], drifts }
      : // All protected collections are skipped together, not only the ones with changes:
        // panels reference dashboards, so pushing one half would delete the other half's parent.
        { collectionsToExcludeFromPush: [...collections], drifts };

    if (overwriteAnyway) {
      console.warn(`⚠️  Überschreiben ist erlaubt - ${deletedCount} nur im Backend vorhandene und ${overwrittenCount} geänderte Einträge werden jetzt überschrieben.`);
    } else {
      console.warn(`🛡️  Der Push überspringt ${collections.join(', ')}. Alle anderen Schema-Änderungen werden normal übernommen.`);
    }

    await this.sendNotification(drifts, backupPath, overwriteAnyway, deletedCount, overwrittenCount, notifyEmails);
    return result;
  }

  /** Writes the pulled state plus a report, so the local changes can be taken over into the repository. */
  private writeBackup(drifts: CollectionDrift[], temporaryDumpPath: string): string | undefined {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const targetPath = path.join(this.options.config.backupPath, timestamp);
      fs.mkdirSync(targetPath, { recursive: true });

      for (const drift of drifts) {
        if (drift.items.length === 0) {
          continue;
        }
        fs.writeFileSync(path.join(targetPath, `${drift.collection}.drift.json`), JSON.stringify(drift, null, 2));
        // Full state of the live instance: this is the only copy if it is overwritten later on,
        // and it is what has to be committed to keep the changes permanently.
        const pulledFile = path.join(temporaryDumpPath, 'collections', `${drift.collection}.json`);
        if (fs.existsSync(pulledFile)) {
          fs.copyFileSync(pulledFile, path.join(targetPath, `${drift.collection}.json`));
        }
      }
      fs.writeFileSync(path.join(targetPath, 'report.txt'), describeDrift(drifts));

      console.log(`💾 Backup der Abweichungen geschrieben: ${targetPath}`);
      return targetPath;
    } catch (error) {
      console.warn('⚠️  Backup der Abweichungen konnte nicht geschrieben werden:', error);
      return undefined;
    }
  }

  private async sendNotification(drifts: CollectionDrift[], backupPath: string | undefined, overwriteAnyway: boolean, deletedCount: number, overwrittenCount: number, notifyEmails: string[]): Promise<void> {
    const notificationHelper = this.options.notificationHelper;
    if (!notificationHelper) {
      return;
    }

    const subject = overwriteAnyway ? '⚠️ Dashboard-Änderungen wurden vom Sync überschrieben' : '⚠️ Dashboard-Änderungen im Backend gefunden - Sync übersprungen';

    const messageLines = [
      `Beim Deployment auf ${this.options.directusInstanceUrl} wollte der Schema-Sync die Kollektionen ${this.options.config.collections.join(', ')} aus dem Repository schreiben.`,
      '',
      `Dabei wurden ${deletedCount} Einträge gefunden, die es nur im Backend gibt (z. B. selbst angelegte Auswertungen), und ${overwrittenCount} Einträge, die im Backend geändert wurden.`,
      '',
      describeDrift(drifts),
      '',
      overwriteAnyway
        ? 'Ergebnis: Überschreiben war erlaubt (Force-Override bzw. Modus "report"), diese Änderungen wurden ÜBERSCHRIEBEN. Der Stand vor dem Überschreiben liegt im Backup auf dem Server.'
        : 'Ergebnis: Der Sync hat diese Kollektionen ÜBERSPRUNGEN, die Änderungen im Backend bleiben also erhalten. Alle anderen Schema-Änderungen wurden normal übernommen.',
      backupPath ? `Backup auf dem Server: ${backupPath}` : 'Es konnte kein Backup geschrieben werden (siehe Logs).',
      '',
      'Damit die Änderungen dauerhaft erhalten bleiben und alle Instanzen sie bekommen, sollten sie mit dem Workflow "Backend Schema Sync Pull" ins Repository übernommen werden.',
    ];

    try {
      const created = await notificationHelper.notify(notifyEmails, subject, messageLines.join('\n'));
      console.log(`📧 ${created} Benachrichtigung(en) über die Abweichungen erstellt.`);
    } catch (error) {
      console.warn('⚠️  Benachrichtigung über die Abweichungen fehlgeschlagen:', error);
    }
  }
}
