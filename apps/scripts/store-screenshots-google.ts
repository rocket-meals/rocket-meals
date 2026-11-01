import * as fs from 'node:fs';
import { createEdit, deleteEdit, googleRequest } from './store-metadata-google';
import { LocalScreenshotSet, isSameScreenshotList } from './store-screenshots-load';

// Uploads the committed store screenshots to every store listing (language) of an app in
// the Google Play Console via the Play Developer API (edits.images). Unlike Apple, Google
// does not tie screenshots to a release, so this works at any time.

const UPLOAD_BASE = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3';

type PlayImage = { id: string; sha256?: string };

async function uploadImage(accessToken: string, path: string, filePath: string): Promise<void> {
  const response = await fetch(`${UPLOAD_BASE}${path}?uploadType=media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'image/jpeg' },
    body: fs.readFileSync(filePath),
  });
  if (!response.ok) {
    throw new Error(`Google Play Upload Fehler (${response.status} ${path}):\n${await response.text()}`);
  }
}

export async function syncGoogleScreenshots(accessToken: string, packageName: string, sets: LocalScreenshotSet[], dryRun: boolean): Promise<boolean> {
  const editId = await createEdit(accessToken, packageName);
  const state = { changed: false, committed: false };
  try {
    const editPath = `/applications/${packageName}/edits/${editId}`;
    const listings = ((await googleRequest(accessToken, 'GET', `${editPath}/listings`)).listings ?? []) as { language: string }[];
    for (const { language } of listings) {
      for (const set of sets) {
        const imagesPath = `${editPath}/listings/${language}/${set.storeType}`;
        const remote = ((await googleRequest(accessToken, 'GET', imagesPath)).images ?? []) as PlayImage[]; // NOSONAR S9382 - sequential on purpose
        if (isSameScreenshotList(set.screenshots.map(s => s.sha256), remote.map(image => image.sha256))) {
          console.log(`   ✅ ${language} ${set.storeType}: aktuell (${set.screenshots.length} Bilder)`);
          continue;
        }
        state.changed = true;
        console.log(`   🔄 ${language} ${set.storeType}: ${remote.length} alte Bilder werden durch ${set.screenshots.length} neue ersetzt${dryRun ? ' (Dry-Run)' : ''}`);
        if (dryRun) continue;
        await googleRequest(accessToken, 'DELETE', imagesPath); // NOSONAR S9382 - deleteall, then upload in store order
        for (const screenshot of set.screenshots) {
          await uploadImage(accessToken, imagesPath, screenshot.filePath); // NOSONAR S9382 - upload order is the order in the store
        }
      }
    }
    if (state.changed && !dryRun) {
      await googleRequest(accessToken, 'POST', `${editPath}:commit`);
      state.committed = true;
      console.log('   ✅ Google: Screenshots übertragen (Edit committed).');
    }
  } finally {
    if (!state.committed) {
      await deleteEdit(accessToken, packageName, editId);
    }
  }
  return state.changed;
}
