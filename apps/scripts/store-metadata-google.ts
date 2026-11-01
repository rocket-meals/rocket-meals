import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import type { GooglePlayAppMetadata, GooglePlayListing, GoogleServiceAccountKey } from 'repo-depkit-common';
import { GOOGLE_OAUTH_TOKEN_URL } from 'repo-depkit-common';
import { base64url } from './base64url';
import { AttributeChange, computeAttributeChanges, formatChanges } from './store-metadata-diff';

// Reads and writes the store listing ("Store-Eintrag") and app details of an app in the
// Google Play Console via the Play Developer API (androidpublisher v3).
//
// Authentication uses a Google Cloud service account that is linked to the Play Console
// (Setup -> API access). Provide the key via one of:
//   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH - path to the service-account .json file
//   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON      - the .json content itself (for CI secrets)
//
// Note: The content rating questionnaire ("Altersfreigabe") and the data safety form
// have NO public API - those stay manual in the Play Console. Listings, contact details
// and default language are fully automatable and handled here.

export const API_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

function readServiceAccount(): GoogleServiceAccountKey {
  const path = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH;
  const content = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  const json = content ?? (path ? fs.readFileSync(path, 'utf8') : undefined);
  if (!json) {
    throw new Error('Weder GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH noch GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ist gesetzt.');
  }
  const account = JSON.parse(json) as Partial<GoogleServiceAccountKey>;
  if (!account.client_email || !account.private_key) {
    throw new Error('Service-Account-JSON enthält kein client_email/private_key.');
  }
  // token_uri may be missing in hand-written keys - fall back to the well-known endpoint,
  // so the rest of the file can rely on it being set.
  return {
    ...account,
    client_email: account.client_email,
    private_key: account.private_key,
    token_uri: account.token_uri ?? GOOGLE_OAUTH_TOKEN_URL,
  };
}

export function hasGooglePlayCredentials(): boolean {
  return Boolean(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH || process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
}

export async function createGooglePlayAccessToken(): Promise<string> {
  const account = readServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: account.client_email, scope: SCOPE, aud: account.token_uri, iat: now, exp: now + 3600 };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.sign('sha256', Buffer.from(unsigned), account.private_key);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetch(account.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Google OAuth Token Fehler (${response.status}):\n${text}`);
  }
  return (JSON.parse(text) as { access_token: string }).access_token;
}

export async function googleRequest(accessToken: string, method: string, path: string, body?: unknown): Promise<any> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Google Play API Fehler (${response.status} ${method} ${path}):\n${text}`);
  }
  return text ? JSON.parse(text) : {};
}

/** A store listing as returned by the Play API - the shared listing fields plus its language. */
export type GooglePlayListingSnapshot = GooglePlayListing & {
  language: string;
};

export type GooglePullResult = {
  packageName: string;
  details: {
    defaultLanguage?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactWebsite?: string;
  };
  listings: GooglePlayListingSnapshot[];
};

export async function createEdit(accessToken: string, packageName: string): Promise<string> {
  const edit = await googleRequest(accessToken, 'POST', `/applications/${packageName}/edits`, {});
  return edit.id as string;
}

export async function deleteEdit(accessToken: string, packageName: string, editId: string): Promise<void> {
  try {
    await googleRequest(accessToken, 'DELETE', `/applications/${packageName}/edits/${editId}`);
  } catch {
    // Abandoned edits expire on their own - deletion failures are not worth failing the run.
  }
}

export async function pullGoogleMetadata(accessToken: string, metadata: GooglePlayAppMetadata): Promise<GooglePullResult> {
  const packageName = metadata.packageName;
  const editId = await createEdit(accessToken, packageName);
  try {
    const details = await googleRequest(accessToken, 'GET', `/applications/${packageName}/edits/${editId}/details`);
    const listingsResult = await googleRequest(accessToken, 'GET', `/applications/${packageName}/edits/${editId}/listings`);
    const listings: GooglePlayListingSnapshot[] = ((listingsResult.listings ?? []) as any[]).map(listing => ({
      language: listing.language,
      title: listing.title,
      shortDescription: listing.shortDescription,
      fullDescription: listing.fullDescription,
      video: listing.video,
    }));
    return {
      packageName,
      details: {
        defaultLanguage: details.defaultLanguage,
        contactEmail: details.contactEmail,
        contactPhone: details.contactPhone,
        contactWebsite: details.contactWebsite,
      },
      listings,
    };
  } finally {
    await deleteEdit(accessToken, packageName, editId);
  }
}

export type GooglePushPlan = {
  current: GooglePullResult;
  detailsChanges: AttributeChange[];
  listingChanges: { language: string; changes: AttributeChange[] }[];
};

export function planGooglePush(current: GooglePullResult, metadata: GooglePlayAppMetadata): GooglePushPlan {
  const detailsChanges = computeAttributeChanges(
    {
      defaultLanguage: metadata.defaultLanguage,
      contactEmail: metadata.contactEmail,
      contactPhone: metadata.contactPhone,
      contactWebsite: metadata.contactWebsite,
    },
    current.details as Record<string, unknown>
  );

  const listingChanges: GooglePushPlan['listingChanges'] = [];
  for (const [language, desiredListing] of Object.entries(metadata.listings ?? {})) {
    const currentListing = current.listings.find(listing => listing.language === language) ?? { language };
    const changes = computeAttributeChanges(desiredListing as Record<string, unknown>, currentListing as unknown as Record<string, unknown>);
    if (changes.length > 0) {
      listingChanges.push({ language, changes });
    }
  }

  return { current, detailsChanges, listingChanges };
}

export async function applyGooglePush(accessToken: string, metadata: GooglePlayAppMetadata, plan: GooglePushPlan, dryRun: boolean): Promise<boolean> {
  const { current, detailsChanges, listingChanges } = plan;
  if (detailsChanges.length === 0 && listingChanges.length === 0) {
    console.log('   ✅ Google: Keine Abweichungen - nichts zu tun.');
    return false;
  }

  if (detailsChanges.length > 0) {
    console.log(`   📝 Google App-Details:\n${formatChanges(detailsChanges, '      ')}`);
  }
  for (const { language, changes } of listingChanges) {
    console.log(`   📝 Google Store-Eintrag (${language}):\n${formatChanges(changes, '      ')}`);
  }

  if (dryRun) {
    console.log('   🔍 Google: Dry-Run - nichts geschrieben.');
    return true;
  }

  const packageName = metadata.packageName;
  const editId = await createEdit(accessToken, packageName);
  try {
    if (detailsChanges.length > 0) {
      const patch: Record<string, unknown> = {};
      for (const change of detailsChanges) {
        patch[change.key] = change.to;
      }
      await googleRequest(accessToken, 'PATCH', `/applications/${packageName}/edits/${editId}/details`, patch);
    }

    for (const { language } of listingChanges) {
      const desiredListing = metadata.listings?.[language] ?? {};
      const currentListing = current.listings.find(listing => listing.language === language);
      // PUT replaces the whole listing, so keep unmanaged fields from the current state.
      await googleRequest(accessToken, 'PUT', `/applications/${packageName}/edits/${editId}/listings/${language}`, { // NOSONAR S9382 - sequential on purpose: writes into one shared Google Play edit, the API is rate limited and a failed PUT should stop before further listings are changed
        language,
        title: desiredListing.title ?? currentListing?.title,
        shortDescription: desiredListing.shortDescription ?? currentListing?.shortDescription,
        fullDescription: desiredListing.fullDescription ?? currentListing?.fullDescription,
        video: desiredListing.video ?? currentListing?.video,
      });
    }

    await googleRequest(accessToken, 'POST', `/applications/${packageName}/edits/${editId}:commit`);
    console.log('   ✅ Google: Änderungen übertragen (Edit committed).');
    return true;
  } catch (error) {
    await deleteEdit(accessToken, packageName, editId);
    throw error;
  }
}
