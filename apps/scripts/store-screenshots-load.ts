import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { REPO_ROOT } from './store-metadata-load';

// Reads the committed store screenshots (store-screenshots/<tenant>/, written by
// apps/screenshotGenerator "store") together with the ground truth module
// (apps/frontend/app/store-screenshots.ts). See docs/STORE_SCREENSHOTS.md.

export const DEFAULT_STORE_SCREENSHOTS_MODULE = 'apps/frontend/app/store-screenshots.ts';
export const STORE_SCREENSHOTS_DIR = path.join(REPO_ROOT, 'store-screenshots');

export type StoreScreenshotTenantEntry = {
  tenant: string;
  displayName: string;
  bundleIdIos?: string;
  packageNameAndroid?: string;
  autoUpload?: boolean;
};

type ManifestDevice = { key: string; store: 'apple' | 'google'; storeType: string };
type Manifest = { tenant: string; appVersion: string; screens: { position: number; route: string; file: string }[]; devices: ManifestDevice[] };

export type LocalScreenshot = {
  fileName: string;
  filePath: string;
  size: number;
  md5: string;
  sha256: string;
};

/** All screenshots of one store slot (Apple display type / Google image type), in store order. */
export type LocalScreenshotSet = {
  store: 'apple' | 'google';
  storeType: string;
  screenshots: LocalScreenshot[];
};

export function loadStoreScreenshotTenants(modulePath: string = DEFAULT_STORE_SCREENSHOTS_MODULE): StoreScreenshotTenantEntry[] {
  const absolutePath = path.isAbsolute(modulePath) ? modulePath : path.resolve(REPO_ROOT, modulePath);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loaded = require(absolutePath) as { getStoreScreenshotTenants?: () => StoreScreenshotTenantEntry[] };
  if (typeof loaded.getStoreScreenshotTenants !== 'function') {
    throw new TypeError(`${absolutePath} exportiert keine Funktion getStoreScreenshotTenants()`);
  }
  return loaded.getStoreScreenshotTenants();
}

function describeFile(filePath: string): LocalScreenshot {
  const content = fs.readFileSync(filePath);
  return {
    fileName: path.basename(filePath),
    filePath,
    size: content.length,
    md5: crypto.createHash('md5').update(content).digest('hex'),
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
  };
}

/** Undefined when nothing has been rendered for the tenant yet. */
export function loadLocalScreenshotSets(tenant: string, store: 'apple' | 'google', baseDir: string = STORE_SCREENSHOTS_DIR): LocalScreenshotSet[] | undefined {
  const tenantDir = path.join(baseDir, tenant);
  const manifestPath = path.join(tenantDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return undefined;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
  const screens = [...manifest.screens].sort((a, b) => a.position - b.position);
  return manifest.devices
    .filter(device => device.store === store)
    .map(device => ({
      store,
      storeType: device.storeType,
      screenshots: screens.map(screen => describeFile(path.join(tenantDir, device.key, screen.file))),
    }));
}

/**
 * True when the store already holds exactly these files in exactly this order. Both
 * stores hand back a hash per image (Apple: the md5 we sent as sourceFileChecksum,
 * Google: sha256), so nothing is uploaded twice.
 */
export function isSameScreenshotList(localHashes: string[], remoteHashes: (string | undefined | null)[]): boolean {
  if (localHashes.length !== remoteHashes.length) return false;
  return localHashes.every((hash, index) => hash.toLowerCase() === (remoteHashes[index] ?? '').toLowerCase());
}
