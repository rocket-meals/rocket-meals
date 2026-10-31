import { EXPO_ASC_ISSUER_ID, EXPO_ASC_KEY_ID } from 'repo-depkit-common';
import { createAppStoreConnectToken, findAppId } from './asc-api';
import { createGooglePlayAccessToken, hasGooglePlayCredentials } from './store-metadata-google';
import { findEditableAppStoreVersionId, syncAppleScreenshots } from './store-screenshots-apple';
import { syncGoogleScreenshots } from './store-screenshots-google';
import { DEFAULT_STORE_SCREENSHOTS_MODULE, loadLocalScreenshotSets, loadStoreScreenshotTenants } from './store-screenshots-load';

// Uploads the committed store screenshots (store-screenshots/<tenant>/) to App Store
// Connect and the Play Console. See docs/STORE_SCREENSHOTS.md.
//
//   yarn workspace rocket-meals-scripts store-screenshots push [--tenant swosy] [--store apple|google] [--dry-run] [--auto]
//
// --auto (automatic workflow runs) only uploads tenants with autoUpload: true in the
// ground truth, all others are skipped with a note.
//
// Only slots whose files differ from what the store holds are touched (hash compare).
// Apple needs an editable App Store version - without one Apple is skipped with a note,
// the iOS submit workflow uploads them right before the next submission anyway.
//
// Credentials as for store-metadata: EXPO_ASC_API_KEY_PATH (Apple) and
// GOOGLE_PLAY_SERVICE_ACCOUNT_JSON(_PATH) (Google). A store without credentials is
// skipped, unless it was requested explicitly with --store.

type CliOptions = {
  modulePath: string;
  tenants: string[];
  store: 'apple' | 'google' | 'all';
  dryRun: boolean;
  auto: boolean;
};

function parseCliOptions(argv: string[]): CliOptions {
  const [command, ...rest] = argv;
  if (command !== 'push') {
    throw new Error('Aufruf: store-screenshots push [--tenant <name>] [--store apple|google] [--dry-run] [--auto] [--module <pfad>]');
  }
  const options: CliOptions = { modulePath: DEFAULT_STORE_SCREENSHOTS_MODULE, tenants: [], store: 'all', dryRun: false, auto: false };
  const cursor = { index: 0 };
  const nextValue = (flag: string): string => {
    cursor.index++;
    const value = rest[cursor.index];
    if (value === undefined) throw new Error(`${flag} braucht einen Wert`);
    return value;
  };
  for (; cursor.index < rest.length; cursor.index++) {
    const arg = rest[cursor.index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--auto') options.auto = true;
    else if (arg === '--module') options.modulePath = nextValue(arg);
    else if (arg === '--tenant') options.tenants.push(...nextValue(arg).split(/[\s,]+/).filter(Boolean));
    else if (arg === '--store') {
      const store = nextValue(arg);
      if (store !== 'apple' && store !== 'google') throw new Error(`Unbekannter Store: ${store}`);
      options.store = store;
    } else throw new Error(`Unbekannte Option: ${arg}`);
  }
  return options;
}

function createAppleToken(): string | undefined {
  const keyPath = process.env.EXPO_ASC_API_KEY_PATH;
  if (!keyPath) return undefined;
  return createAppStoreConnectToken(process.env.EXPO_ASC_KEY_ID || EXPO_ASC_KEY_ID, process.env.EXPO_ASC_ISSUER_ID || EXPO_ASC_ISSUER_ID, keyPath);
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const tenants = loadStoreScreenshotTenants(options.modulePath).filter(tenant => options.tenants.length === 0 || options.tenants.includes(tenant.tenant));
  if (tenants.length === 0) throw new Error(`Kein Tenant passt zu ${options.tenants.join(', ')}`);

  const wantsApple = options.store !== 'google';
  const wantsGoogle = options.store !== 'apple';
  if (wantsApple && !process.env.EXPO_ASC_API_KEY_PATH) {
    if (options.store === 'apple') throw new Error('EXPO_ASC_API_KEY_PATH ist nicht gesetzt.');
    console.warn('⚠️ EXPO_ASC_API_KEY_PATH ist nicht gesetzt - Apple wird übersprungen.');
  }
  if (wantsGoogle && !hasGooglePlayCredentials()) {
    if (options.store === 'google') throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON(_PATH) ist nicht gesetzt.');
    console.warn('⚠️ Keine Google-Play-Zugangsdaten - Google wird übersprungen.');
  }
  const googleToken = wantsGoogle && hasGooglePlayCredentials() ? await createGooglePlayAccessToken() : undefined;

  const failures: string[] = [];
  for (const tenant of tenants) {
    console.log(`\n📱 ${tenant.displayName} (${tenant.tenant})`);
    if (options.auto && !tenant.autoUpload) {
      console.log('   ⏭️ autoUpload ist für diesen Tenant aus (store-screenshots.ts) - bitte die Bilder im Repo prüfen und manuell hochladen.');
      continue;
    }
    try {
      // The App Store Connect token lives 15 minutes - one per tenant.
      const appleToken = wantsApple ? createAppleToken() : undefined;
      const appleSets = loadLocalScreenshotSets(tenant.tenant, 'apple');
      if (appleToken && tenant.bundleIdIos) {
        if (!appleSets) {
          console.log('   ⏭️ Apple: keine Screenshots im Repo.');
        } else {
          const appId = await findAppId(appleToken, tenant.bundleIdIos); // NOSONAR S9382 - tenants one after another
          const versionId = await findEditableAppStoreVersionId(appleToken, appId); // NOSONAR S9382
          if (versionId) {
            await syncAppleScreenshots(appleToken, versionId, appleSets, options.dryRun); // NOSONAR S9382
          } else {
            console.log('   ⏭️ Apple: keine bearbeitbare App-Store-Version - der nächste iOS-Submit lädt die Screenshots hoch.');
          }
        }
      }
      const googleSets = loadLocalScreenshotSets(tenant.tenant, 'google');
      if (googleToken && tenant.packageNameAndroid) {
        if (!googleSets) {
          console.log('   ⏭️ Google: keine Screenshots im Repo.');
        } else {
          await syncGoogleScreenshots(googleToken, tenant.packageNameAndroid, googleSets, options.dryRun); // NOSONAR S9382
        }
      }
    } catch (error) {
      console.error(`   ❌ ${(error as Error).message}`);
      failures.push(tenant.tenant);
    }
  }
  if (failures.length > 0) {
    throw new Error(`Screenshot-Upload fehlgeschlagen für: ${failures.join(', ')}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
