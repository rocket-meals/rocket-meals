import * as fs from 'node:fs';
import { JsonApiResource, asArray, ascRequest } from './asc-api';
import { LocalScreenshotSet, isSameScreenshotList } from './store-screenshots-load';

// Uploads the committed store screenshots to an editable App Store version via the App
// Store Connect API (appScreenshotSets / appScreenshots). Screenshots belong to a version
// in App Store Connect, so they can only change while a version is editable - that is
// why the iOS submit workflow calls syncAppleScreenshots right before submitting.

// Version states in which App Store Connect accepts new screenshots.
const EDITABLE_VERSION_STATES = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY'];

type UploadOperation = {
  method: string;
  url: string;
  length: number;
  offset: number;
  requestHeaders?: { name: string; value: string }[];
};

export async function findEditableAppStoreVersionId(token: string, appId: string): Promise<string | undefined> {
  const query = new URLSearchParams({
    'filter[platform]': 'IOS',
    'filter[appStoreState]': EDITABLE_VERSION_STATES.join(','),
    limit: '1',
  });
  const result = await ascRequest(token, 'GET', `/apps/${appId}/appStoreVersions?${query}`);
  return asArray(result.data)[0]?.id;
}

async function listScreenshots(token: string, setId: string): Promise<JsonApiResource[]> {
  const result = await ascRequest(token, 'GET', `/appScreenshotSets/${setId}/appScreenshots?limit=50`);
  return asArray(result.data);
}

async function createScreenshotSet(token: string, localizationId: string, displayType: string): Promise<string> {
  const result = await ascRequest(token, 'POST', '/appScreenshotSets', {
    data: {
      type: 'appScreenshotSets',
      attributes: { screenshotDisplayType: displayType },
      relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: localizationId } } },
    },
  });
  return asArray(result.data)[0].id;
}

async function uploadScreenshot(token: string, setId: string, screenshot: LocalScreenshotSet['screenshots'][number]): Promise<void> {
  const reservation = await ascRequest(token, 'POST', '/appScreenshots', {
    data: {
      type: 'appScreenshots',
      attributes: { fileName: screenshot.fileName, fileSize: screenshot.size },
      relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
    },
  });
  const reserved = asArray(reservation.data)[0];
  const operations = (reserved.attributes?.uploadOperations ?? []) as UploadOperation[];
  const content = fs.readFileSync(screenshot.filePath);
  for (const operation of operations) {
    const headers = Object.fromEntries((operation.requestHeaders ?? []).map(header => [header.name, header.value]));
    const response = await fetch(operation.url, { // NOSONAR S9382 - upload parts are sent one after another on purpose
      method: operation.method,
      headers,
      body: content.subarray(operation.offset, operation.offset + operation.length),
    });
    if (!response.ok) {
      throw new Error(`Upload von ${screenshot.fileName} fehlgeschlagen (${response.status}): ${await response.text()}`);
    }
  }
  await ascRequest(token, 'PATCH', `/appScreenshots/${reserved.id}`, {
    data: { type: 'appScreenshots', id: reserved.id, attributes: { uploaded: true, sourceFileChecksum: screenshot.md5 } },
  });
}

async function syncSet(token: string, localizationId: string, locale: string, existingSets: JsonApiResource[], local: LocalScreenshotSet, dryRun: boolean): Promise<boolean> {
  const existing = existingSets.find(set => set.attributes?.screenshotDisplayType === local.storeType);
  const remote = existing ? await listScreenshots(token, existing.id) : [];
  const remoteHashes = remote.map(screenshot => screenshot.attributes?.sourceFileChecksum as string | undefined);
  if (isSameScreenshotList(local.screenshots.map(s => s.md5), remoteHashes)) {
    console.log(`   ✅ ${locale} ${local.storeType}: aktuell (${local.screenshots.length} Bilder)`);
    return false;
  }
  console.log(`   🔄 ${locale} ${local.storeType}: ${remote.length} alte Bilder werden durch ${local.screenshots.length} neue ersetzt${dryRun ? ' (Dry-Run)' : ''}`);
  if (dryRun) return true;

  for (const screenshot of remote) {
    await ascRequest(token, 'DELETE', `/appScreenshots/${screenshot.id}`); // NOSONAR S9382 - sequential keeps the store order stable
  }
  const setId = existing?.id ?? (await createScreenshotSet(token, localizationId, local.storeType));
  for (const screenshot of local.screenshots) {
    await uploadScreenshot(token, setId, screenshot); // NOSONAR S9382 - upload order is the order in the store
  }
  return true;
}

/**
 * Brings every localization of the version to the committed screenshots. All
 * localizations get the same (German) pictures - an empty localization would otherwise
 * keep showing whatever was uploaded there by hand years ago.
 */
export async function syncAppleScreenshots(token: string, appStoreVersionId: string, sets: LocalScreenshotSet[], dryRun: boolean): Promise<boolean> {
  const localizations = asArray((await ascRequest(token, 'GET', `/appStoreVersions/${appStoreVersionId}/appStoreVersionLocalizations?limit=50`)).data);
  const results: boolean[] = [];
  for (const localization of localizations) {
    const locale = String(localization.attributes?.locale ?? localization.id);
    const existingSets = asArray((await ascRequest(token, 'GET', `/appStoreVersionLocalizations/${localization.id}/appScreenshotSets?limit=50`)).data); // NOSONAR S9382 - sequential on purpose
    for (const set of sets) {
      results.push(await syncSet(token, localization.id, locale, existingSets, set, dryRun)); // NOSONAR S9382 - sequential on purpose
    }
  }
  return results.some(Boolean);
}
