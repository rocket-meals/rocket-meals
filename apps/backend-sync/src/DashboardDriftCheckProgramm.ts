import { Command } from 'commander';
import { checkDashboardDriftOnAllBackends } from './DashboardDriftCheck';

const program = new Command();

program.name('backend-sync-dashboard-check').description('Prüft, ob sich die Dashboards (und Panels) auf den Backends gegenüber diesem Repository verändert haben').version('1.0.0');

program.option('--servers <servers>', 'Kommaseparierte Liste der zu prüfenden Backends (Default: alle)').option('--collections <collections>', 'Kommaseparierte Liste der zu prüfenden directus-sync Sammlungen (Default: dashboards,panels)').option('--ping-retries <count>', 'Anzahl der Ping-Versuche, bevor ein Server als "läuft nicht" gilt', '2').option('--path-to-data-directus-sync <path>', 'Pfad zu data/directus-sync-data').option('--allow-unverified', 'Nicht prüfbare Backends nur als Warnung behandeln');

async function main() {
  program.parse();
  const options = program.opts();

  const success = await checkDashboardDriftOnAllBackends({
    servers: options.servers,
    collections: options.collections,
    pingRetries: Number.parseInt(options.pingRetries, 10),
    pathToDataDirectusSync: options.pathToDataDirectusSync,
    allowUnverified: options.allowUnverified,
  });

  if (!success) {
    process.exitCode = 1; // let callers (e.g. CI) notice that a deploy would overwrite changes
  }
}

main();
