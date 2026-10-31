// Renders the app store screenshots of every rocket-meals tenant into
// store-screenshots/<tenant>/ (see docs/STORE_SCREENSHOTS.md).
//
//   yarn workspace screenshotgenerator store [--tenant swosy] [--force]
//
// A tenant is only rendered again when its store version (config.ts getVersion()) or its
// selection of screens (app_settings flags of its backend) differs from the committed
// manifest.json, or with --force. Everything of one tenant is rendered into a temporary
// folder first and only replaces the committed files when every screenshot succeeded,
// so a half rendered set never ends up in the repository.
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import puppeteer, { Browser } from 'puppeteer';
import { StringHelper } from 'repo-depkit-common';
import sharp from 'sharp';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { StoreScreenshotDevice, StoreScreenshotScreen, StoreScreenshotTenant } from '../../../frontend/app/store-screenshots';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const DEFAULT_MODULE = 'apps/frontend/app/store-screenshots.ts';
const DEFAULT_OUT_DIR = 'store-screenshots';
const TIME_ZONE = 'Europe/Berlin';

export type StoreScreenshotManifest = {
  tenant: string;
  displayName: string;
  appVersion: string;
  webUrl: string;
  /** Day the app believed it was while rendering (weekday, so the canteens are open). */
  simulatedDate: string;
  screens: { position: number; route: string; file: string }[];
  skippedScreens: { route: string; reason: string }[];
  devices: { key: string; store: string; storeType: string; width: number; height: number }[];
};

const argv = yargs(hideBin(process.argv))
  .option('tenant', { type: 'string', array: true, description: 'Only these tenants (e.g. swosy studi-futter)' })
  .option('force', { type: 'boolean', default: false, description: 'Render even if version and screens are unchanged' })
  .option('module', { type: 'string', default: DEFAULT_MODULE, description: 'Ground truth module' })
  .option('outDir', { type: 'string', default: DEFAULT_OUT_DIR, description: 'Output folder (relative to the repository root)' })
  .help()
  .parseSync();

function resolveInRepo(relativeOrAbsolute: string): string {
  const resolved = path.resolve(REPO_ROOT, relativeOrAbsolute);
  if (!resolved.startsWith(REPO_ROOT + path.sep)) {
    throw new Error(`Refusing to work outside the repository: ${resolved}`);
  }
  return resolved;
}

function loadTenants(modulePath: string): StoreScreenshotTenant[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loaded = require(resolveInRepo(modulePath)) as { getStoreScreenshotTenants?: () => StoreScreenshotTenant[] };
  if (typeof loaded.getStoreScreenshotTenants !== 'function') {
    throw new TypeError(`${modulePath} exportiert keine Funktion getStoreScreenshotTenants()`);
  }
  return loaded.getStoreScreenshotTenants();
}

function loadDevices(modulePath: string): StoreScreenshotDevice[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const devices = (require(resolveInRepo(modulePath)) as { STORE_SCREENSHOT_DEVICES?: StoreScreenshotDevice[] }).STORE_SCREENSHOT_DEVICES;
  if (!Array.isArray(devices) || devices.length === 0) {
    throw new TypeError(`${modulePath} exportiert keine STORE_SCREENSHOT_DEVICES`);
  }
  return devices;
}

async function fetchAppSettings(serverUrl: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${serverUrl}/items/app_settings?fields=*`);
  if (!response.ok) {
    throw new Error(`app_settings von ${serverUrl} nicht lesbar (${response.status})`);
  }
  const json = (await response.json()) as { data?: Record<string, unknown> };
  if (!json.data) {
    throw new Error(`app_settings von ${serverUrl} sind leer`);
  }
  return json.data;
}

function selectScreens(screens: StoreScreenshotScreen[], appSettings: Record<string, unknown>) {
  const selected: StoreScreenshotScreen[] = [];
  const skipped: { route: string; reason: string }[] = [];
  for (const screen of screens) {
    if (screen.requiresAppSetting && appSettings[screen.requiresAppSetting] !== true) {
      skipped.push({ route: screen.route, reason: `app_settings.${screen.requiresAppSetting} ist nicht aktiv` });
    } else {
      selected.push(screen);
    }
  }
  return { selected, skipped };
}

/** Offset of the time zone at the given instant, e.g. "+01:00". */
function timeZoneOffset(instant: Date): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find(p => p.type === 'timeZoneName')?.value;
  const offset = part ? StringHelper.replaceAllLiteralWithOptions({ str: part, find: 'GMT', replace: '' }) : '';
  return offset === '' ? '+00:00' : offset;
}

/**
 * Today at 11:30 in Berlin, moved to the next Monday on weekends: canteens are closed on
 * weekends and a screenshot of an empty food plan sells nothing.
 */
export function getSimulatedLunchTime(now: Date = new Date()): Date {
  const weekdayOf = (date: Date) => new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short' }).format(date);
  const day = [0, 1, 2]
    .map(daysAhead => new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000))
    .find(candidate => weekdayOf(candidate) !== 'Sat' && weekdayOf(candidate) !== 'Sun')!;
  const isoDate = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(day);
  return new Date(`${isoDate}T11:30:00${timeZoneOffset(day)}`);
}

// Shifts the clock of the page (not freezes it - timers and animations keep running).
function clockShiftScript(targetTime: number): string {
  return `(() => {
    const offset = ${targetTime} - Date.now();
    const RealDate = Date;
    class ShiftedDate extends RealDate {
      constructor(...args) { if (args.length === 0) { super(RealDate.now() + offset); } else { super(...args); } }
      static now() { return RealDate.now() + offset; }
    }
    globalThis.Date = ShiftedDate;
  })();`;
}

function screenUrl(tenant: StoreScreenshotTenant, screen: StoreScreenshotScreen, device: StoreScreenshotDevice): string {
  const params = new URLSearchParams({ kioskMode: 'true' });
  if (device.iphoneStatusBar) {
    params.set('deviceMock', 'iphone');
  }
  return `${tenant.webUrl}/${screen.route}?${params}`;
}

function fileName(position: number, route: string): string {
  return `${String(position).padStart(2, '0')}-${StringHelper.replaceAllWithOptions({ str: route, find: '[^a-zA-Z0-9-]', replace: '_' })}.jpg`;
}

async function renderScreenshot(browser: Browser, url: string, device: StoreScreenshotDevice, targetTime: number, outFile: string): Promise<void> {
  // Every tenant lives on the same origin (rocket-meals.de/<tenant>), so their persisted
  // app state (selected canteen, cached news) would leak into each other through
  // localStorage. A fresh incognito context per screenshot starts from zero every time.
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  try {
    await page.emulateTimezone(TIME_ZONE);
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.evaluateOnNewDocument(clockShiftScript(targetTime));
    await page.setViewport({ width: device.viewportWidth, height: device.viewportHeight, deviceScaleFactor: device.deviceScaleFactor });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
    // React Native Web renders ActivityIndicator with role="progressbar" - wait until the
    // screen has finished loading its data, but never longer than 15 s
    // (image placeholders of the food plan may keep spinning).
    await page.waitForFunction(() => !document.querySelector('[role="progressbar"]'), { timeout: 15_000 }).catch(() => {
      console.warn(`   ⚠️ Ladeanzeige nach 15 s noch sichtbar: ${url}`);
    });
    // Error toasts of the kiosk session (e.g. a data request the demo user may not make)
    // vanish after a few seconds - wait them out.
    await new Promise(resolve => setTimeout(resolve, 7000));
    const png = await page.screenshot({ type: 'png' });
    // JPEG without alpha: accepted by both stores and a fraction of the size of a PNG with
    // food photos in it, which keeps the repository small.
    await sharp(png).flatten({ background: '#ffffff' }).jpeg({ quality: 88, mozjpeg: true }).toFile(outFile);
  } finally {
    await context.close();
  }
}

async function readManifest(file: string): Promise<StoreScreenshotManifest | undefined> {
  if (!existsSync(file)) return undefined;
  return JSON.parse(await fs.readFile(file, 'utf8')) as StoreScreenshotManifest;
}

async function renderTenant(browser: Browser, tenant: StoreScreenshotTenant, devices: StoreScreenshotDevice[], outDir: string, force: boolean): Promise<boolean> {
  console.log(`\n📱 ${tenant.displayName} (${tenant.tenant}) - Version ${tenant.appVersion}`);
  const appSettings = await fetchAppSettings(tenant.serverUrl);
  const { selected, skipped } = selectScreens(tenant.screens, appSettings);
  for (const skip of skipped) console.log(`   ⏭️ ${skip.route}: ${skip.reason}`);

  const tenantDir = path.join(outDir, tenant.tenant);
  const manifestFile = path.join(tenantDir, 'manifest.json');
  const previous = await readManifest(manifestFile);
  const routes = selected.map(screen => screen.route);
  const unchanged =
    previous?.appVersion === tenant.appVersion &&
    JSON.stringify(previous.screens.map(s => s.route)) === JSON.stringify(routes) &&
    JSON.stringify(previous.devices.map(d => d.key)) === JSON.stringify(devices.map(d => d.key));
  if (unchanged && !force) {
    console.log('   ✅ Version und Screens unverändert - nichts zu tun.');
    return false;
  }

  const simulated = getSimulatedLunchTime();
  const tmpDir = path.join(outDir, `.tmp-${tenant.tenant}`);
  await fs.rm(tmpDir, { recursive: true, force: true });

  const manifest: StoreScreenshotManifest = {
    tenant: tenant.tenant,
    displayName: tenant.displayName,
    appVersion: tenant.appVersion,
    webUrl: tenant.webUrl,
    simulatedDate: simulated.toISOString().slice(0, 10),
    screens: selected.map((screen, index) => ({ position: index + 1, route: screen.route, file: fileName(index + 1, screen.route) })),
    skippedScreens: skipped,
    devices: devices.map(d => ({
      key: d.key,
      store: d.store,
      storeType: d.storeType,
      width: Math.round(d.viewportWidth * d.deviceScaleFactor),
      height: Math.round(d.viewportHeight * d.deviceScaleFactor),
    })),
  };

  for (const device of devices) {
    const deviceDir = path.join(tmpDir, device.key);
    await fs.mkdir(deviceDir, { recursive: true }); // NOSONAR S9382 - sequential on purpose: one shared browser, stable timing
    for (const screen of manifest.screens) {
      const url = screenUrl(tenant, { route: screen.route }, device);
      console.log(`   📸 ${device.key} ${screen.file}  ${url}`);
      await renderScreenshot(browser, url, device, simulated.getTime(), path.join(deviceDir, screen.file)); // NOSONAR S9382 - sequential on purpose
    }
  }

  await fs.writeFile(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await fs.rm(tenantDir, { recursive: true, force: true });
  await fs.rename(tmpDir, tenantDir);
  console.log(`   ✅ ${manifest.screens.length} Screens x ${devices.length} Geräte nach ${path.relative(REPO_ROOT, tenantDir)}`);
  return true;
}

async function main(): Promise<void> {
  const outDir = resolveInRepo(argv.outDir);
  const devices = loadDevices(argv.module);
  const wanted = (argv.tenant ?? []).flatMap(t => t.split(/[\s,]+/)).filter(Boolean);
  const tenants = loadTenants(argv.module).filter(t => wanted.length === 0 || wanted.includes(t.tenant));
  if (tenants.length === 0) throw new Error(`Kein Tenant passt zu ${wanted.join(', ')}`);

  const browser = await puppeteer.launch({
    args: ['--lang=de-DE', '--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
  const failed: string[] = [];
  const rendered: string[] = [];
  try {
    for (const tenant of tenants) {
      try {
        if (await renderTenant(browser, tenant, devices, outDir, argv.force)) rendered.push(tenant.tenant); // NOSONAR S9382 - sequential on purpose
      } catch (error) {
        console.error(`   ❌ ${tenant.tenant}: ${(error as Error).message}`);
        failed.push(tenant.tenant);
        await fs.rm(path.join(outDir, `.tmp-${tenant.tenant}`), { recursive: true, force: true });
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nNeu gerendert: ${rendered.join(', ') || '-'}`);
  if (process.env.GITHUB_OUTPUT) {
    await fs.appendFile(process.env.GITHUB_OUTPUT, `rendered=${rendered.join(' ')}\n`);
  }
  if (failed.length > 0) {
    console.error(`Fehlgeschlagen: ${failed.join(', ')}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
