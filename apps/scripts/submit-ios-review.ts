import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

const API_BASE = 'https://api.appstoreconnect.apple.com/v1';

// https://developer.apple.com/documentation/appstoreconnectapi/appstoreversionstate
const SUBMITTABLE_APP_VERSION_STATES = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY'];

// https://developer.apple.com/documentation/appstoreconnectapi/reviewsubmission
const NON_TERMINAL_REVIEW_SUBMISSION_STATES = ['READY_FOR_REVIEW', 'WAITING_FOR_REVIEW', 'IN_REVIEW', 'UNRESOLVED_ISSUES', 'CANCELING', 'COMPLETING'];

type JsonApiResource = {
  type: string;
  id: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { type: string; id: string } | null }>;
};

type JsonApiDocument = {
  data?: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
};

function base64url(input: Buffer | string): string {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input;
  // Base64 padding is at most two "=" characters, so the bounded quantifier
  // keeps the pattern linear-time (SonarCloud S5852).
  return buffer.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/={1,2}$/, '');
}

function createAppStoreConnectToken(keyId: string, issuerId: string, privateKeyPath: string): string {
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = { iss: issuerId, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  // App Store Connect expects the raw R||S signature (JOSE), not the DER encoding Node uses by default.
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${unsigned}.${base64url(signature)}`;
}

type AscApiErrorDetail = { code?: string; detail?: string };

class AscApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errors: AscApiErrorDetail[],
    rawText: string,
    method: string,
    path: string
  ) {
    super(`App Store Connect API Fehler (${status} ${method} ${path}):\n${rawText}`);
  }
}

async function ascRequest(token: string, method: string, path: string, body?: unknown): Promise<JsonApiDocument> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();

  if (!response.ok) {
    let errors: AscApiErrorDetail[] = [];
    try {
      errors = (JSON.parse(text) as { errors?: AscApiErrorDetail[] }).errors ?? [];
    } catch {
      // response body wasn't JSON - leave errors empty, raw text is still in the thrown error message
    }
    throw new AscApiError(response.status, errors, text, method, path);
  }

  return text ? JSON.parse(text) : {};
}

function asArray(data: JsonApiResource | JsonApiResource[] | undefined): JsonApiResource[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

async function findAppId(token: string, bundleId: string): Promise<string> {
  const query = new URLSearchParams({ 'filter[bundleId]': bundleId });
  const result = await ascRequest(token, 'GET', `/apps?${query}`);
  const app = asArray(result.data)[0];
  if (!app) {
    throw new Error(`Keine App mit bundleId "${bundleId}" in App Store Connect gefunden.`);
  }
  return app.id;
}

async function findLatestValidBuild(token: string, appId: string): Promise<{ buildId: string; version: string }> {
  const query = new URLSearchParams({
    'filter[app]': appId,
    'filter[processingState]': 'VALID',
    'filter[buildAudienceType]': 'APP_STORE_ELIGIBLE',
    sort: '-uploadedDate',
    limit: '1',
    include: 'preReleaseVersion',
  });
  const result = await ascRequest(token, 'GET', `/builds?${query}`);
  const build = asArray(result.data)[0];
  if (!build) {
    throw new Error(`Kein verarbeiteter (VALID) Build für App ${appId} gefunden. Wurde bereits ein Build hochgeladen und von Apple verarbeitet?`);
  }

  const preReleaseVersionId = build.relationships?.preReleaseVersion?.data?.id;
  const preReleaseVersion = (result.included ?? []).find(item => item.type === 'preReleaseVersions' && item.id === preReleaseVersionId);
  const version = preReleaseVersion?.attributes?.version as string | undefined;
  if (!version) {
    throw new Error(`Konnte die Versionsnummer für Build ${build.id} nicht ermitteln.`);
  }

  return { buildId: build.id, version };
}

async function findOrCreateAppStoreVersion(token: string, appId: string, versionString: string): Promise<string> {
  // Apple only ever allows a single non-released ("editable") version per platform at a time.
  // A brand new app already has one (created automatically, often with a placeholder versionString
  // like "1.0"), so we must reuse and rename that one instead of creating a second one - creating a
  // second one fails with 409 ENTITY_ERROR.RELATIONSHIP.INVALID ("... in the current state").
  const query = new URLSearchParams({ 'filter[platform]': 'IOS' });
  const result = await ascRequest(token, 'GET', `/apps/${appId}/appStoreVersions?${query}`);
  const versions = asArray(result.data);

  console.log(`   Vorhandene App Store Versions (${versions.length}): ${versions.map(v => `${v.attributes?.versionString}=${v.attributes?.appStoreState}`).join(', ') || '(keine)'}`);

  const exactMatch = versions.find(v => v.attributes?.versionString === versionString);
  if (exactMatch) {
    const state = exactMatch.attributes?.appStoreState as string;
    if (!SUBMITTABLE_APP_VERSION_STATES.includes(state)) {
      throw new Error(
        `App Store Version ${versionString} existiert bereits mit Status "${state}" und kann nicht automatisch eingereicht werden. Bitte manuell in App Store Connect prüfen.`
      );
    }
    return exactMatch.id;
  }

  const editableVersion = versions.find(v => SUBMITTABLE_APP_VERSION_STATES.includes(v.attributes?.appStoreState as string));
  if (editableVersion) {
    console.log(`   Benenne vorhandene Entwurfsversion "${editableVersion.attributes?.versionString}" (${editableVersion.id}) zu "${versionString}" um ...`);
    await ascRequest(token, 'PATCH', `/appStoreVersions/${editableVersion.id}`, {
      data: {
        type: 'appStoreVersions',
        id: editableVersion.id,
        attributes: { versionString },
      },
    });
    return editableVersion.id;
  }

  const created = await ascRequest(token, 'POST', '/appStoreVersions', {
    data: {
      type: 'appStoreVersions',
      attributes: { platform: 'IOS', versionString, releaseType: 'MANUAL' },
      relationships: { app: { data: { type: 'apps', id: appId } } },
    },
  });

  return (created.data as JsonApiResource).id;
}

async function attachBuild(token: string, appStoreVersionId: string, buildId: string): Promise<void> {
  await ascRequest(token, 'PATCH', `/appStoreVersions/${appStoreVersionId}/relationships/build`, {
    data: { type: 'builds', id: buildId },
  });
}

async function updateReleaseNotes(token: string, appStoreVersionId: string, releaseNotes: string): Promise<void> {
  const result = await ascRequest(token, 'GET', `/appStoreVersions/${appStoreVersionId}/appStoreVersionLocalizations`);
  const localizations = asArray(result.data);

  if (localizations.length === 0) {
    throw new Error(
      `Keine appStoreVersionLocalizations für Version ${appStoreVersionId} gefunden. Bitte einmalig Titel/Beschreibung in App Store Connect für die gewünschten Sprachen anlegen.`
    );
  }

  for (const localization of localizations) {
    try {
      await ascRequest(token, 'PATCH', `/appStoreVersionLocalizations/${localization.id}`, {
        data: {
          type: 'appStoreVersionLocalizations',
          id: localization.id,
          attributes: { whatsNew: releaseNotes },
        },
      });
    } catch (error) {
      // Apple doesn't allow "What's New" to be set on an app's very first ever version
      // (there's nothing to describe changes relative to). Once the first version is
      // approved and released, whatsNew becomes editable for all subsequent versions.
      const isWhatsNewLockedOnFirstVersion =
        error instanceof AscApiError &&
        error.status === 409 &&
        error.errors.some(e => e.code === 'STATE_ERROR' && e.detail?.includes("'whatsNew'"));

      if (!isWhatsNewLockedOnFirstVersion) {
        throw error;
      }

      console.log(
        `   ⚠️  "What's New" kann für Sprache ${localization.attributes?.locale} nicht gesetzt werden (vermutlich die allererste Version dieser App) - wird übersprungen.`
      );
    }
  }
}

async function findReusableReviewSubmission(token: string, appId: string): Promise<string | undefined> {
  const query = new URLSearchParams({ 'filter[app]': appId, 'filter[platform]': 'IOS' });
  const result = await ascRequest(token, 'GET', `/reviewSubmissions?${query}`);
  const submissions = asArray(result.data);

  const active = submissions.find(submission => NON_TERMINAL_REVIEW_SUBMISSION_STATES.includes(submission.attributes?.state as string));
  if (!active) return undefined;

  const state = active.attributes?.state as string;
  if (state !== 'READY_FOR_REVIEW') {
    throw new Error(
      `Für diese App läuft bereits eine Review-Einreichung (Status "${state}"). Bitte in App Store Connect prüfen, bevor eine neue Einreichung gestartet wird.`
    );
  }

  return active.id;
}

async function createReviewSubmission(token: string, appId: string): Promise<string> {
  const created = await ascRequest(token, 'POST', '/reviewSubmissions', {
    data: {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: appId } } },
    },
  });
  return (created.data as JsonApiResource).id;
}

async function addAppStoreVersionToSubmission(token: string, reviewSubmissionId: string, appStoreVersionId: string): Promise<void> {
  await ascRequest(token, 'POST', '/reviewSubmissionItems', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: reviewSubmissionId } },
        appStoreVersion: { data: { type: 'appStoreVersions', id: appStoreVersionId } },
      },
    },
  });
}

async function submitReviewSubmission(token: string, reviewSubmissionId: string): Promise<void> {
  await ascRequest(token, 'PATCH', `/reviewSubmissions/${reviewSubmissionId}`, {
    data: {
      type: 'reviewSubmissions',
      id: reviewSubmissionId,
      attributes: { submitted: true },
    },
  });
}

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}

async function main(): Promise<void> {
  const bundleId = readRequiredEnv('IOS_BUNDLE_ID');
  const releaseNotes = readRequiredEnv('IOS_RELEASE_NOTES');
  const keyId = readRequiredEnv('EXPO_ASC_KEY_ID');
  const issuerId = readRequiredEnv('EXPO_ASC_ISSUER_ID');
  const privateKeyPath = readRequiredEnv('EXPO_ASC_API_KEY_PATH');

  const token = createAppStoreConnectToken(keyId, issuerId, privateKeyPath);

  console.log(`🔍 Suche App mit bundleId "${bundleId}" ...`);
  const appId = await findAppId(token, bundleId);
  console.log(`✅ App gefunden (id: ${appId})`);

  console.log('🔍 Suche neuesten verarbeiteten Build ...');
  const { buildId, version } = await findLatestValidBuild(token, appId);
  console.log(`✅ Build gefunden: ${buildId} (Version ${version})`);

  console.log(`🔍 Suche oder erstelle App Store Version ${version} ...`);
  const appStoreVersionId = await findOrCreateAppStoreVersion(token, appId, version);
  console.log(`✅ App Store Version: ${appStoreVersionId}`);

  console.log('🔗 Verknüpfe Build mit Version ...');
  await attachBuild(token, appStoreVersionId, buildId);

  console.log('📝 Aktualisiere Changelog-Text (What\'s New) ...');
  await updateReleaseNotes(token, appStoreVersionId, releaseNotes);

  console.log('🔍 Prüfe auf bereits laufende Review-Einreichung ...');
  const reusableSubmissionId = await findReusableReviewSubmission(token, appId);
  const reviewSubmissionId = reusableSubmissionId ?? (await createReviewSubmission(token, appId));
  console.log(`✅ Review-Einreichung: ${reviewSubmissionId}`);

  console.log('➕ Füge Version zur Einreichung hinzu ...');
  await addAppStoreVersionToSubmission(token, reviewSubmissionId, appStoreVersionId);

  console.log('🚀 Reiche zur Review ein ...');
  await submitReviewSubmission(token, reviewSubmissionId);

  console.log(`\n🎉 App Store Version ${version} (Build ${buildId}) wurde erfolgreich zur Review eingereicht.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
