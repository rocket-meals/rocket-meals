import { AscApiError, JsonApiResource, asArray, ascRequest, createAppStoreConnectToken, findAppId, readRequiredEnv } from './asc-api';
import { applyApplePush, planApplePush, pullAppleMetadata } from './store-metadata-apple';
import { loadStoreMetadataModule } from './store-metadata-load';
import { syncAppleScreenshots } from './store-screenshots-apple';
import { loadLocalScreenshotSets, loadStoreScreenshotTenants } from './store-screenshots-load';

// https://developer.apple.com/documentation/appstoreconnectapi/appstoreversionstate
const SUBMITTABLE_APP_VERSION_STATES = new Set(['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY']);

// https://developer.apple.com/documentation/appstoreconnectapi/reviewsubmission
const NON_TERMINAL_REVIEW_SUBMISSION_STATES = new Set(['READY_FOR_REVIEW', 'WAITING_FOR_REVIEW', 'IN_REVIEW', 'UNRESOLVED_ISSUES', 'CANCELING', 'COMPLETING']);

// Automated (post-CI) runs must never blindly re-submit a version Apple has
// rejected - that needs a human to look at the rejection first. Only untouched drafts
// are submitted without a human in the loop.
const AUTO_SUBMITTABLE_APP_VERSION_STATES = new Set(['PREPARE_FOR_SUBMISSION']);

// IOS_SUBMIT_AUTO=true turns "nothing to submit" situations into a graceful exit 0
// instead of a hard error, so scheduled runs don't show up as failures.
const AUTO_MODE = process.env.IOS_SUBMIT_AUTO === 'true';

// While a freshly uploaded build is still being processed by Apple, wait up to this many
// minutes for it to become VALID before giving up (used by the post-CI trigger).
const MAX_WAIT_MINUTES = Number(process.env.IOS_SUBMIT_MAX_WAIT_MINUTES ?? '0');
const POLL_INTERVAL_MINUTES = 5;
// Grace period in which we also retry when no processing build is visible yet - the
// upload from CI may not have arrived at Apple at the moment this script starts.
const INITIAL_GRACE_MINUTES = 15;

// Thrown in auto mode when there is nothing that can (or should) be submitted right now.
class SkipSubmission extends Error {
  constructor(
    message: string,
    public readonly retryWhileProcessing: boolean = false
  ) {
    super(message);
  }
}

// Error messages can carry text straight from an App Store Connect response, so
// strip line breaks and other control characters before logging them: they would
// otherwise let the response forge extra lines in the CI log.
function sanitizeForLog(message: string): string {
  let sanitized = '';
  for (const char of message) {
    const code = char.codePointAt(0) as number;
    sanitized += code < 0x20 || code === 0x7f ? ' ' : char;
  }
  return sanitized;
}

// In manual mode blocked submissions are real errors (the user explicitly asked for a
// submission), in auto mode they are expected and just end the run gracefully.
function submissionBlocked(message: string, retryWhileProcessing = false): Error {
  return AUTO_MODE ? new SkipSubmission(message, retryWhileProcessing) : new Error(message);
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
    throw submissionBlocked(`Kein verarbeiteter (VALID) Build für App ${appId} gefunden. Wurde bereits ein Build hochgeladen und von Apple verarbeitet?`, true);
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

  const versionsSummary = versions.map(v => `${v.attributes?.versionString}=${v.attributes?.appStoreState}`).join(', ') || '(keine)';
  console.log(`   Vorhandene App Store Versions (${versions.length}): ${versionsSummary}`);

  const exactMatch = versions.find(v => v.attributes?.versionString === versionString);
  if (exactMatch) {
    const state = exactMatch.attributes?.appStoreState as string;
    if (!SUBMITTABLE_APP_VERSION_STATES.has(state)) {
      // e.g. WAITING_FOR_REVIEW, IN_REVIEW, PENDING_DEVELOPER_RELEASE, READY_FOR_SALE.
      // Retry-worthy in auto mode: a build that is still processing may carry a new
      // version number and change the situation.
      throw submissionBlocked(
        `App Store Version ${versionString} existiert bereits mit Status "${state}" und kann nicht automatisch eingereicht werden. Bitte manuell in App Store Connect prüfen.`,
        true
      );
    }
    if (AUTO_MODE && !AUTO_SUBMITTABLE_APP_VERSION_STATES.has(state)) {
      throw new SkipSubmission(
        `App Store Version ${versionString} hat den Status "${state}" (Ablehnung durch Apple?). Automatische Wieder-Einreichung ist deaktiviert - bitte prüfen und bei Bedarf manuell per workflow_dispatch einreichen.`
      );
    }
    await ensureAutomaticRelease(token, exactMatch);
    return exactMatch.id;
  }

  const editableVersion = versions.find(v => SUBMITTABLE_APP_VERSION_STATES.has(v.attributes?.appStoreState as string));
  if (editableVersion) {
    const editableState = editableVersion.attributes?.appStoreState as string;
    if (AUTO_MODE && !AUTO_SUBMITTABLE_APP_VERSION_STATES.has(editableState)) {
      throw new SkipSubmission(
        `Vorhandene Entwurfsversion "${editableVersion.attributes?.versionString}" hat den Status "${editableState}" (Ablehnung durch Apple?). Automatische Wieder-Einreichung ist deaktiviert - bitte prüfen und bei Bedarf manuell per workflow_dispatch einreichen.`
      );
    }
    console.log(`   Benenne vorhandene Entwurfsversion "${editableVersion.attributes?.versionString}" (${editableVersion.id}) zu "${versionString}" um ...`);
    await ascRequest(token, 'PATCH', `/appStoreVersions/${editableVersion.id}`, {
      data: {
        type: 'appStoreVersions',
        id: editableVersion.id,
        attributes: { versionString, releaseType: 'AFTER_APPROVAL' },
      },
    });
    return editableVersion.id;
  }

  try {
    const created = await ascRequest(token, 'POST', '/appStoreVersions', {
      data: {
        type: 'appStoreVersions',
        attributes: { platform: 'IOS', versionString, releaseType: 'AFTER_APPROVAL' },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    });
    return (created.data as JsonApiResource).id;
  } catch (error) {
    // Apple allows only one editable version at a time; e.g. while an approved version
    // (submitted before automatic releases) still waits for its release, creating the
    // next one fails with 409. In auto mode that just means "not now" - the next
    // automated or manual run will try again.
    if (AUTO_MODE && error instanceof AscApiError && error.status === 409) {
      throw new SkipSubmission(
        `Neue App Store Version ${versionString} kann aktuell nicht angelegt werden (409 von App Store Connect) - z. B. wurde eine freigegebene Version noch nicht veröffentlicht. Details: ${error.message}`
      );
    }
    throw error;
  }
}

// Versions are submitted with releaseType AFTER_APPROVAL so Apple publishes them right
// after a successful review. Pre-existing drafts (auto-created first versions, versions
// created before this default) may still carry MANUAL, so it is patched on reuse.
async function ensureAutomaticRelease(token: string, version: JsonApiResource): Promise<void> {
  if (version.attributes?.releaseType === 'AFTER_APPROVAL') return;
  console.log(`   Setze releaseType von "${version.attributes?.releaseType}" auf "AFTER_APPROVAL" ...`);
  await ascRequest(token, 'PATCH', `/appStoreVersions/${version.id}`, {
    data: {
      type: 'appStoreVersions',
      id: version.id,
      attributes: { releaseType: 'AFTER_APPROVAL' },
    },
  });
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
      await ascRequest(token, 'PATCH', `/appStoreVersionLocalizations/${localization.id}`, { // NOSONAR S9382 - sequential on purpose: one App Store Connect PATCH per localization, the API is rate limited
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

  const active = submissions.find(submission => NON_TERMINAL_REVIEW_SUBMISSION_STATES.has(submission.attributes?.state as string));
  if (!active) return undefined;

  const state = active.attributes?.state as string;
  if (state !== 'READY_FOR_REVIEW') {
    throw submissionBlocked(
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

async function hasProcessingBuild(token: string, appId: string): Promise<boolean> {
  const query = new URLSearchParams({
    'filter[app]': appId,
    'filter[processingState]': 'PROCESSING',
    sort: '-uploadedDate',
    limit: '1',
  });
  const result = await ascRequest(token, 'GET', `/builds?${query}`);
  return asArray(result.data).length > 0;
}

function sleepMinutes(minutes: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, minutes * 60 * 1000));
}

type Credentials = { keyId: string; issuerId: string; privateKeyPath: string };

// Before submitting, the "App-Informationen" (age rating declaration, categories,
// privacy urls) are aligned with the ground truth from STORE_METADATA_MODULE - see
// docs/STORE_METADATA.md. This runs after findOrCreateAppStoreVersion so an editable
// AppInfo is guaranteed to exist. A failed sync BLOCKS the submission: a version must
// not reach App Review with metadata that drifted from the ground truth. Only a run
// without STORE_METADATA_MODULE (sync not configured, e.g. local invocation) skips.
async function syncStoreMetadata(token: string, bundleId: string): Promise<void> {
  const modulePath = process.env.STORE_METADATA_MODULE;
  if (!modulePath) {
    console.log('   ⏭️ STORE_METADATA_MODULE ist nicht gesetzt - Metadaten-Sync wird übersprungen.');
    return;
  }
  const entry = loadStoreMetadataModule(modulePath).find(candidate => candidate.apple?.bundleId === bundleId);
  if (!entry?.apple) {
    throw new Error(`Keine Apple Ground Truth für "${bundleId}" in ${modulePath} - bitte einen Eintrag ergänzen (siehe docs/STORE_METADATA.md).`);
  }
  const current = await pullAppleMetadata(token, entry.apple);
  const plan = planApplePush(current, entry.apple);
  await applyApplePush(token, plan, false);
}

// The store screenshots committed under store-screenshots/<tenant>/ (see
// docs/STORE_SCREENSHOTS.md) are uploaded to the version right before it goes to review,
// because Apple only accepts new screenshots while a version is editable. Unlike the
// metadata sync a failure here does NOT block the submission: the screenshots already in
// App Store Connect stay valid, a release must not wait for a picture.
async function syncStoreScreenshots(token: string, bundleId: string, appStoreVersionId: string): Promise<void> {
  const modulePath = process.env.STORE_SCREENSHOTS_MODULE;
  if (!modulePath) {
    console.log('   ⏭️ STORE_SCREENSHOTS_MODULE ist nicht gesetzt - Screenshot-Sync wird übersprungen.');
    return;
  }
  try {
    const tenant = loadStoreScreenshotTenants(modulePath).find(candidate => candidate.bundleIdIos === bundleId);
    if (tenant && !tenant.autoUpload) {
      console.log(`   ⏭️ autoUpload ist für "${tenant.tenant}" aus (store-screenshots.ts) - Screenshot-Sync wird übersprungen.`);
      return;
    }
    const sets = tenant ? loadLocalScreenshotSets(tenant.tenant, 'apple') : undefined;
    if (!sets) {
      console.log(`   ⏭️ Keine Store-Screenshots für "${bundleId}" im Repo - Screenshot-Sync wird übersprungen.`);
      return;
    }
    await syncAppleScreenshots(token, appStoreVersionId, sets, false);
  } catch (error) {
    console.log(`::warning::Store-Screenshots konnten nicht hochgeladen werden, die Einreichung läuft trotzdem weiter: ${sanitizeForLog((error as Error).message)}`);
  }
}

async function attemptSubmission(bundleId: string, releaseNotes: string, credentials: Credentials): Promise<void> {
  // The App Store Connect JWT expires after 15 minutes, so every attempt of the
  // retry loop below needs a fresh one.
  const token = createAppStoreConnectToken(credentials.keyId, credentials.issuerId, credentials.privateKeyPath);

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

  console.log('📋 Gleiche App-Informationen (Altersfreigabe & Co) mit der Ground Truth ab ...');
  await syncStoreMetadata(token, bundleId);

  console.log('🖼️ Gleiche Store-Screenshots mit dem Repo ab ...');
  await syncStoreScreenshots(token, bundleId, appStoreVersionId);

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

/**
 * Whether a blocked submission is worth retrying: only while Apple is still
 * processing a freshly uploaded build (its version may become submittable once
 * the build turns VALID), or while the initial grace period is still running.
 */
async function shouldRetryBlockedSubmission(
  error: SkipSubmission,
  bundleId: string,
  credentials: Credentials,
  deadlines: { deadline: number; graceDeadline: number },
): Promise<boolean> {
  if (!error.retryWhileProcessing || Date.now() >= deadlines.deadline) return false;

  const token = createAppStoreConnectToken(credentials.keyId, credentials.issuerId, credentials.privateKeyPath);
  const appId = await findAppId(token, bundleId);
  const processing = await hasProcessingBuild(token, appId);
  if (processing) {
    console.log('⏳ Apple verarbeitet gerade einen hochgeladenen Build ...');
  }
  return processing || Date.now() < deadlines.graceDeadline;
}

async function main(): Promise<void> {
  const bundleId = readRequiredEnv('IOS_BUNDLE_ID');
  const releaseNotes = readRequiredEnv('IOS_RELEASE_NOTES');
  const credentials: Credentials = {
    keyId: readRequiredEnv('EXPO_ASC_KEY_ID'),
    issuerId: readRequiredEnv('EXPO_ASC_ISSUER_ID'),
    privateKeyPath: readRequiredEnv('EXPO_ASC_API_KEY_PATH'),
  };

  if (AUTO_MODE) {
    console.log(`🤖 Automatischer Modus aktiv (max. Wartezeit auf Apple-Verarbeitung: ${MAX_WAIT_MINUTES} Minuten).\n`);
  }

  const deadline = Date.now() + MAX_WAIT_MINUTES * 60 * 1000;
  const graceDeadline = Date.now() + Math.min(MAX_WAIT_MINUTES, INITIAL_GRACE_MINUTES) * 60 * 1000;

  // In auto mode a blocked submission is retried as long as Apple is still processing a
  // freshly uploaded build (its version may become submittable once it turns VALID).
  for (;;) {
    try {
      await attemptSubmission(bundleId, releaseNotes, credentials);
      return;
    } catch (error) {
      if (!(error instanceof SkipSubmission)) {
        throw error;
      }

      const retry = await shouldRetryBlockedSubmission(error, bundleId, credentials, { deadline, graceDeadline });
      if (!retry) {
        console.log(`\n⏭️ Keine Einreichung durchgeführt: ${sanitizeForLog(error.message)}`);
        return;
      }

      console.log(`   Nächster Versuch in ${POLL_INTERVAL_MINUTES} Minuten ...\n`);
      await sleepMinutes(POLL_INTERVAL_MINUTES); // NOSONAR S9382 - polling loop, each submission attempt must wait for the poll interval before retrying
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
