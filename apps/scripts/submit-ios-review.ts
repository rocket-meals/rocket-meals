import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { base64url } from './base64url';

const API_BASE = 'https://api.appstoreconnect.apple.com/v1';

// https://developer.apple.com/documentation/appstoreconnectapi/appstoreversionstate
const SUBMITTABLE_APP_VERSION_STATES = new Set(['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY']);
const REJECTED_APP_VERSION_STATES = new Set(['DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY']);

// https://developer.apple.com/documentation/appstoreconnectapi/reviewsubmission
const NON_TERMINAL_REVIEW_SUBMISSION_STATES = new Set(['READY_FOR_REVIEW', 'WAITING_FOR_REVIEW', 'IN_REVIEW', 'UNRESOLVED_ISSUES', 'CANCELING', 'COMPLETING']);

// Zustände, in denen es gerade nichts einzureichen gibt. Im automatisierten Modus
// (IOS_SUBMIT_AUTOMATED=true, z.B. täglicher Cron oder nach einem Build) beenden
// sie den Lauf erfolgreich als "übersprungen"; bei manuellem Start bleiben sie Fehler.
class SkipSubmission extends Error {}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

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

type TokenProvider = () => string;

function createTokenProvider(keyId: string, issuerId: string, privateKeyPath: string): TokenProvider {
  let token: string | undefined;
  let issuedAt = 0;
  return () => {
    // Tokens sind 15 Minuten gültig; nach 10 Minuten erneuern, damit auch lange
    // Wartephasen (Apple-Build-Verarbeitung) nie mit einem abgelaufenen Token arbeiten.
    if (!token || Date.now() - issuedAt > 10 * 60 * 1000) {
      token = createAppStoreConnectToken(keyId, issuerId, privateKeyPath);
      issuedAt = Date.now();
    }
    return token;
  };
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

async function ascRequest(getToken: TokenProvider, method: string, path: string, body?: unknown): Promise<JsonApiDocument> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
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

async function findAppId(getToken: TokenProvider, bundleId: string): Promise<string> {
  const query = new URLSearchParams({ 'filter[bundleId]': bundleId });
  const result = await ascRequest(getToken, 'GET', `/apps?${query}`);
  const app = asArray(result.data)[0];
  if (!app) {
    throw new Error(`Keine App mit bundleId "${bundleId}" in App Store Connect gefunden.`);
  }
  return app.id;
}

type LatestBuild = { buildId: string; version: string | undefined; processingState: string };

async function findLatestBuild(getToken: TokenProvider, appId: string): Promise<LatestBuild | undefined> {
  const query = new URLSearchParams({
    'filter[app]': appId,
    'filter[buildAudienceType]': 'APP_STORE_ELIGIBLE',
    sort: '-uploadedDate',
    limit: '1',
    include: 'preReleaseVersion',
  });
  const result = await ascRequest(getToken, 'GET', `/builds?${query}`);
  const build = asArray(result.data)[0];
  if (!build) return undefined;

  const preReleaseVersionId = build.relationships?.preReleaseVersion?.data?.id;
  const preReleaseVersion = (result.included ?? []).find(item => item.type === 'preReleaseVersions' && item.id === preReleaseVersionId);

  return {
    buildId: build.id,
    version: preReleaseVersion?.attributes?.version as string | undefined,
    processingState: build.attributes?.processingState as string,
  };
}

// Absichtlich der NEUESTE Build (nicht der neueste VALID-Build): direkt nach einem
// Upload soll auf dessen Verarbeitung gewartet werden statt versehentlich einen
// älteren, bereits verarbeiteten Build einzureichen.
async function waitForLatestValidBuild(getToken: TokenProvider, appId: string, waitMinutes: number): Promise<{ buildId: string; version: string }> {
  const deadline = Date.now() + waitMinutes * 60 * 1000;
  let build = await findLatestBuild(getToken, appId);

  while (build?.processingState === 'PROCESSING' && Date.now() < deadline) {
    console.log(`   ⏳ Build ${build.buildId} wird noch von Apple verarbeitet - nächste Prüfung in 60 Sekunden ...`);
    await sleep(60 * 1000);
    build = await findLatestBuild(getToken, appId);
  }

  if (!build) {
    throw new SkipSubmission(`Kein Build für App ${appId} gefunden. Wurde bereits ein Build hochgeladen?`);
  }
  if (build.processingState === 'PROCESSING') {
    throw new SkipSubmission(`Der neueste Build ${build.buildId} wird noch von Apple verarbeitet. Bitte später erneut versuchen.`);
  }
  if (build.processingState !== 'VALID') {
    throw new SkipSubmission(
      `Der neueste Build ${build.buildId} hat den Verarbeitungsstatus "${build.processingState}" und kann nicht eingereicht werden. Bitte in App Store Connect prüfen.`
    );
  }
  if (!build.version) {
    throw new Error(`Konnte die Versionsnummer für Build ${build.buildId} nicht ermitteln.`);
  }

  return { buildId: build.buildId, version: build.version };
}

async function findOrCreateAppStoreVersion(
  getToken: TokenProvider,
  appId: string,
  versionString: string,
  latestBuildId: string,
  automated: boolean
): Promise<string> {
  // Apple only ever allows a single non-released ("editable") version per platform at a time.
  // A brand new app already has one (created automatically, often with a placeholder versionString
  // like "1.0"), so we must reuse and rename that one instead of creating a second one - creating a
  // second one fails with 409 ENTITY_ERROR.RELATIONSHIP.INVALID ("... in the current state").
  const query = new URLSearchParams({ 'filter[platform]': 'IOS', include: 'build' });
  const result = await ascRequest(getToken, 'GET', `/apps/${appId}/appStoreVersions?${query}`);
  const versions = asArray(result.data);

  const versionsSummary = versions.map(v => `${v.attributes?.versionString}=${v.attributes?.appStoreState}`).join(', ') || '(keine)';
  console.log(`   Vorhandene App Store Versions (${versions.length}): ${versionsSummary}`);

  const exactMatch = versions.find(v => v.attributes?.versionString === versionString);
  if (exactMatch) {
    const state = exactMatch.attributes?.appStoreState as string;
    if (!SUBMITTABLE_APP_VERSION_STATES.has(state)) {
      throw new SkipSubmission(
        `App Store Version ${versionString} existiert bereits mit Status "${state}" und kann nicht automatisch eingereicht werden. Bitte manuell in App Store Connect prüfen.`
      );
    }
    // Automatisiert niemals denselben abgelehnten Build erneut einreichen - sonst würde
    // der tägliche Lauf eine von Apple abgelehnte Version endlos wieder einreichen.
    // Manuell gestartet bleibt das erlaubt (z.B. nach Korrektur der Metadaten).
    const attachedBuildId = exactMatch.relationships?.build?.data?.id;
    if (automated && REJECTED_APP_VERSION_STATES.has(state) && attachedBuildId === latestBuildId) {
      throw new SkipSubmission(
        `App Store Version ${versionString} wurde mit dem neuesten Build bereits eingereicht und hat den Status "${state}". Bitte manuell prüfen oder einen neuen Build hochladen.`
      );
    }
    return exactMatch.id;
  }

  const editableVersion = versions.find(v => SUBMITTABLE_APP_VERSION_STATES.has(v.attributes?.appStoreState as string));
  if (editableVersion) {
    console.log(`   Benenne vorhandene Entwurfsversion "${editableVersion.attributes?.versionString}" (${editableVersion.id}) zu "${versionString}" um ...`);
    await ascRequest(getToken, 'PATCH', `/appStoreVersions/${editableVersion.id}`, {
      data: {
        type: 'appStoreVersions',
        id: editableVersion.id,
        attributes: { versionString },
      },
    });
    return editableVersion.id;
  }

  const created = await ascRequest(getToken, 'POST', '/appStoreVersions', {
    data: {
      type: 'appStoreVersions',
      attributes: { platform: 'IOS', versionString, releaseType: 'MANUAL' },
      relationships: { app: { data: { type: 'apps', id: appId } } },
    },
  });

  return (created.data as JsonApiResource).id;
}

async function attachBuild(getToken: TokenProvider, appStoreVersionId: string, buildId: string): Promise<void> {
  await ascRequest(getToken, 'PATCH', `/appStoreVersions/${appStoreVersionId}/relationships/build`, {
    data: { type: 'builds', id: buildId },
  });
}

async function updateReleaseNotes(getToken: TokenProvider, appStoreVersionId: string, releaseNotes: string): Promise<void> {
  const result = await ascRequest(getToken, 'GET', `/appStoreVersions/${appStoreVersionId}/appStoreVersionLocalizations`);
  const localizations = asArray(result.data);

  if (localizations.length === 0) {
    throw new Error(
      `Keine appStoreVersionLocalizations für Version ${appStoreVersionId} gefunden. Bitte einmalig Titel/Beschreibung in App Store Connect für die gewünschten Sprachen anlegen.`
    );
  }

  for (const localization of localizations) {
    try {
      await ascRequest(getToken, 'PATCH', `/appStoreVersionLocalizations/${localization.id}`, {
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

async function findReusableReviewSubmission(getToken: TokenProvider, appId: string): Promise<string | undefined> {
  const query = new URLSearchParams({ 'filter[app]': appId, 'filter[platform]': 'IOS' });
  const result = await ascRequest(getToken, 'GET', `/reviewSubmissions?${query}`);
  const submissions = asArray(result.data);

  const active = submissions.find(submission => NON_TERMINAL_REVIEW_SUBMISSION_STATES.has(submission.attributes?.state as string));
  if (!active) return undefined;

  const state = active.attributes?.state as string;
  if (state !== 'READY_FOR_REVIEW') {
    throw new SkipSubmission(
      `Für diese App läuft bereits eine Review-Einreichung (Status "${state}"). Bitte in App Store Connect prüfen, bevor eine neue Einreichung gestartet wird.`
    );
  }

  return active.id;
}

async function createReviewSubmission(getToken: TokenProvider, appId: string): Promise<string> {
  const created = await ascRequest(getToken, 'POST', '/reviewSubmissions', {
    data: {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: appId } } },
    },
  });
  return (created.data as JsonApiResource).id;
}

async function addAppStoreVersionToSubmission(getToken: TokenProvider, reviewSubmissionId: string, appStoreVersionId: string): Promise<void> {
  await ascRequest(getToken, 'POST', '/reviewSubmissionItems', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: reviewSubmissionId } },
        appStoreVersion: { data: { type: 'appStoreVersions', id: appStoreVersionId } },
      },
    },
  });
}

async function submitReviewSubmission(getToken: TokenProvider, reviewSubmissionId: string): Promise<void> {
  await ascRequest(getToken, 'PATCH', `/reviewSubmissions/${reviewSubmissionId}`, {
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
  const automated = process.env.IOS_SUBMIT_AUTOMATED === 'true';
  const waitMinutes = Number.parseInt(process.env.IOS_SUBMIT_WAIT_FOR_PROCESSING_MINUTES ?? '0', 10) || 0;

  const getToken = createTokenProvider(keyId, issuerId, privateKeyPath);

  console.log(`🔍 Suche App mit bundleId "${bundleId}" ...`);
  const appId = await findAppId(getToken, bundleId);
  console.log(`✅ App gefunden (id: ${appId})`);

  // Vor allen schreibenden Schritten prüfen, damit ein automatisierter Lauf bei
  // laufender Review ohne Seiteneffekte (Version umbenennen etc.) übersprungen wird.
  console.log('🔍 Prüfe auf bereits laufende Review-Einreichung ...');
  const reusableSubmissionId = await findReusableReviewSubmission(getToken, appId);

  console.log(waitMinutes > 0 ? `🔍 Suche neuesten Build (warte bis zu ${waitMinutes} Minuten auf Apples Verarbeitung) ...` : '🔍 Suche neuesten Build ...');
  const { buildId, version } = await waitForLatestValidBuild(getToken, appId, waitMinutes);
  console.log(`✅ Build gefunden: ${buildId} (Version ${version})`);

  console.log(`🔍 Suche oder erstelle App Store Version ${version} ...`);
  const appStoreVersionId = await findOrCreateAppStoreVersion(getToken, appId, version, buildId, automated);
  console.log(`✅ App Store Version: ${appStoreVersionId}`);

  console.log('🔗 Verknüpfe Build mit Version ...');
  await attachBuild(getToken, appStoreVersionId, buildId);

  console.log('📝 Aktualisiere Changelog-Text (What\'s New) ...');
  await updateReleaseNotes(getToken, appStoreVersionId, releaseNotes);

  const reviewSubmissionId = reusableSubmissionId ?? (await createReviewSubmission(getToken, appId));
  console.log(`✅ Review-Einreichung: ${reviewSubmissionId}`);

  console.log('➕ Füge Version zur Einreichung hinzu ...');
  await addAppStoreVersionToSubmission(getToken, reviewSubmissionId, appStoreVersionId);

  console.log('🚀 Reiche zur Review ein ...');
  await submitReviewSubmission(getToken, reviewSubmissionId);

  console.log(`\n🎉 App Store Version ${version} (Build ${buildId}) wurde erfolgreich zur Review eingereicht.`);
}

main().catch(error => {
  if (error instanceof SkipSubmission && process.env.IOS_SUBMIT_AUTOMATED === 'true') {
    console.log(`\n⏭️  Einreichung übersprungen: ${error.message}`);
    return;
  }
  console.error(error);
  process.exit(1);
});
