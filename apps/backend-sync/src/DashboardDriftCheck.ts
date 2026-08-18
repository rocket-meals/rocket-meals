import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { BackendServer, getBackendServerCredentials, resolveBackendServers } from './BackendServers';
import { DashboardDriftChecker, DriftResult, DriftStatus } from './DashboardDriftChecker';
import { DockerDirectusHelper } from './DockerDirectusHelper';
import { findEnvFile, findProjectRootFile } from './EnvFileFinder';

export type DashboardDriftCheckOptions = {
  /** Comma separated list of servers to check, e.g. "test,swosy". Default: all backends. */
  servers?: string;
  /** Comma separated list of directus-sync collections. Default: dashboards and panels. */
  collections?: string;
  /** How often a server is pinged before it counts as "not running". */
  pingRetries?: number;
  /** Path to "data/directus-sync-data". Default: resolved from the project root. */
  pathToDataDirectusSync?: string;
  /** Servers that could not be checked (login failed, ...) are only warned about. */
  allowUnverified?: boolean;
};

export type BackendDriftReport = {
  server: BackendServer;
  result: DriftResult;
};

/** A drifted backend can produce hundreds of lines, keep the log readable. */
const MAX_LISTED_DIFFERENCES = 25;

const STATUS_ICONS: Record<DriftStatus, string> = {
  [DriftStatus.UNCHANGED]: '✅',
  [DriftStatus.DRIFTED]: '❌',
  [DriftStatus.UNREACHABLE]: '⚠️',
  [DriftStatus.ERROR]: '❌',
};

function listDifferences(differences: string[]): string[] {
  if (differences.length <= MAX_LISTED_DIFFERENCES) {
    return differences;
  }
  const remaining = differences.length - MAX_LISTED_DIFFERENCES;
  return [...differences.slice(0, MAX_LISTED_DIFFERENCES), `… und ${remaining} weitere Änderung(en)`];
}

function parseCollections(collections?: string): string[] | undefined {
  const parsed = collections
    ?.split(',')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);
  return parsed && parsed.length > 0 ? parsed : undefined;
}

async function resolvePathToDataDirectusSync(options: DashboardDriftCheckOptions): Promise<string> {
  if (options.pathToDataDirectusSync) {
    return options.pathToDataDirectusSync;
  }
  const projectRootPath = await findProjectRootFile();
  if (!projectRootPath) {
    throw new Error('Projekt-Wurzel (PROJECT_ROOT.md) wurde nicht gefunden – bitte --path-to-data-directus-sync angeben');
  }
  return path.join(path.dirname(projectRootPath), DockerDirectusHelper.getRelativePathToDirectusSyncFromProjectRoot());
}

async function loadEnvFile(): Promise<void> {
  const envFilePath = await findEnvFile();
  if (envFilePath) {
    console.log(`🔍 Gefundene .env Datei: ${envFilePath}`);
    // does not override variables that are already set (e.g. secrets in the CI)
    dotenv.config({ path: envFilePath });
  }
}

async function checkSingleBackend(checker: DashboardDriftChecker, server: BackendServer): Promise<BackendDriftReport> {
  console.log(`\n🔄 Prüfe Backend "${server.key}" (${server.directusInstanceUrl}) ...`);
  const { adminEmail, adminPassword } = getBackendServerCredentials(server);
  if (!adminEmail || !adminPassword) {
    return {
      server,
      result: {
        status: DriftStatus.ERROR,
        differences: [],
        message: `Keine Zugangsdaten gefunden (ADMIN_EMAIL/ADMIN_PASSWORD oder ADMIN_EMAIL_${server.key.toUpperCase()}/ADMIN_PASSWORD_${server.key.toUpperCase()})`,
      },
    };
  }

  const result = await checker.check({
    directusInstanceUrl: server.directusInstanceUrl,
    adminEmail,
    adminPassword,
  });
  return { server, result };
}

function describeReport(report: BackendDriftReport): string {
  const { server, result } = report;
  switch (result.status) {
    case DriftStatus.UNCHANGED:
      return `${STATUS_ICONS[result.status]} ${server.host}: keine Änderungen – Deploy ist unbedenklich`;
    case DriftStatus.UNREACHABLE:
      return `${STATUS_ICONS[result.status]} ${server.host}: ${result.message} – wird übersprungen`;
    case DriftStatus.ERROR:
      return `${STATUS_ICONS[result.status]} ${server.host}: konnte nicht geprüft werden – ${result.message}`;
    case DriftStatus.DRIFTED:
      return `${STATUS_ICONS[result.status]} ${server.host}: ${result.differences.length} Änderung(en) gegenüber dem Repository`;
  }
}

function printSummary(reports: BackendDriftReport[]): void {
  console.log('\n==================== Ergebnis der Dashboard-Prüfung ====================');
  for (const report of reports) {
    console.log(describeReport(report));
    for (const difference of listDifferences(report.result.differences)) {
      console.log(`   • ${difference}`);
    }
  }
  console.log('=======================================================================');
}

/** Makes the result visible in the GitHub Actions run summary, if we run inside a workflow. */
function writeGithubStepSummary(reports: BackendDriftReport[], success: boolean): void {
  const summaryFilePath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFilePath) {
    return;
  }
  const lines = ['## 🧐 Dashboard-Prüfung der Backends', ''];
  for (const report of reports) {
    lines.push(`- ${describeReport(report)}`);
    for (const difference of listDifferences(report.result.differences)) {
      lines.push(`  - ${difference}`);
    }
  }
  if (!success) {
    lines.push('', 'Änderungen zuerst mit dem Workflow **🗄️ Backend Schema Sync Pull** ins Repository holen,');
    lines.push('oder den Deploy bewusst mit **force_push** starten (die Änderungen auf den Servern gehen dabei verloren).');
  }
  fs.appendFileSync(summaryFilePath, `${lines.join('\n')}\n`);
}

/**
 * Pulls the Directus configuration of every backend and compares it with this repository.
 *
 * Returns false when at least one backend differs from the repository (a deploy would
 * overwrite those changes) or could not be checked. Backends that are not running are
 * skipped, they cannot lose anything.
 */
export async function checkDashboardDriftOnAllBackends(options: DashboardDriftCheckOptions = {}): Promise<boolean> {
  await loadEnvFile();

  const servers = resolveBackendServers(options.servers);
  const pathToDataDirectusSync = await resolvePathToDataDirectusSync(options);
  const checker = new DashboardDriftChecker({
    pathToDataDirectusSyncData: pathToDataDirectusSync,
    collections: parseCollections(options.collections),
    pingRetries: options.pingRetries,
  });

  console.log('🧐 Prüfe, ob sich die Dashboards auf den Backends verändert haben...');
  console.log(`📁 Repository-Stand: ${pathToDataDirectusSync}`);
  console.log(`📡 Zu prüfende Backends: ${servers.map(server => server.host).join(', ')}`);

  const reports: BackendDriftReport[] = [];
  for (const server of servers) {
    reports.push(await checkSingleBackend(checker, server));
  }

  printSummary(reports);

  const driftedReports = reports.filter(report => report.result.status === DriftStatus.DRIFTED);
  const failedReports = reports.filter(report => report.result.status === DriftStatus.ERROR);

  let success = driftedReports.length === 0;
  if (failedReports.length > 0 && !options.allowUnverified) {
    success = false;
  }

  if (driftedReports.length > 0) {
    console.error('\n❌ Auf mindestens einem Backend wurden Änderungen gefunden, die ein Deploy überschreiben würde.');
    console.error('   → Änderungen zuerst ins Repository holen (Workflow "🗄️ Backend Schema Sync Pull" bzw. "yarn workspace backend-sync sync:pull-from-test-system"),');
    console.error('   → oder den Deploy bewusst mit force_push starten. Die Änderungen auf den Servern gehen dabei verloren.');
  }
  if (failedReports.length > 0) {
    const message = '⚠️ Mindestens ein Backend konnte nicht geprüft werden.';
    if (options.allowUnverified) {
      console.warn(`\n${message} Es wird trotzdem fortgefahren (--allow-unverified).`);
    } else {
      console.error(`\n${message} Ohne Prüfung wird nicht deployed – bitte Zugangsdaten hinterlegen oder force_push nutzen.`);
    }
  }
  if (success) {
    console.log('\n✅ Kein Backend hat Änderungen, die durch den Deploy verloren gehen würden.');
  }

  writeGithubStepSummary(reports, success);
  return success;
}
