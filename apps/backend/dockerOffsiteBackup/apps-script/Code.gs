/**
 * Rocket Meals offsite backup: archive keeper.
 *
 * Runs in the owner's Google account (not on the server) and is the only place that ever moves or
 * trashes backup files. The server can only upload into the shared drive "Backup Eingang", where its
 * service account is "Contributor". This script moves everything from there into the shared drive
 * "Backup Archiv", which the service account can not see at all.
 *
 *   Eingang/<server>/db/*.sql.gz   -> Archiv/<server>/db/
 *   Eingang/<server>/uploads/*     -> Archiv/<server>/uploads/
 *   Eingang/<server>/manifest.txt  -> images in Archiv/<server>/uploads that are not listed any more
 *                                     are moved to the trash (kept there 30 days by Google)
 *
 * Safety:
 *   - Database dumps older than DB_RETENTION_DAYS go to the trash, but the newest DB_MIN_KEEP always stay.
 *   - If a manifest would trash more than MAX_TRASH_RATIO of the images (at least MAX_TRASH_ALWAYS_OK),
 *     nothing is trashed and an alert mail is sent. An attacker uploading an empty manifest only causes a mail.
 *   - If no new dump arrived for MAX_DUMP_AGE_HOURS, an alert mail is sent.
 *
 * Setup: see apps/backend/OFFSITE_BACKUP.md. Run setup() once, it installs the hourly trigger.
 */

const CONFIG = {
  // Folder IDs: for the root of a shared drive, the shared drive ID is the folder ID.
  INBOX_FOLDER_ID: 'PUT_ID_OF_SHARED_DRIVE_BACKUP_EINGANG_HERE',
  ARCHIVE_FOLDER_ID: 'PUT_ID_OF_SHARED_DRIVE_BACKUP_ARCHIV_HERE',
  DB_RETENTION_DAYS: 7,
  DB_MIN_KEEP: 3,
  MAX_TRASH_RATIO: 0.05,
  MAX_TRASH_ALWAYS_OK: 20,
  MAX_DUMP_AGE_HOURS: 48,
  // Apps Script stops a run after 6 minutes. Stop moving files a bit earlier, the next run continues.
  TIME_BUDGET_MS: 4.5 * 60 * 1000,
  ALERT_EMAIL: '', // empty: the account that runs the script
};

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const MANIFEST_NAME = 'manifest.txt';
const MANIFEST_MARKER = '# rocket-meals-offsite-manifest';

function setup() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'run')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('run').timeBased().everyHours(1).create();
  run();
}

function run() {
  const startedAt = Date.now();
  const servers = listChildren(CONFIG.INBOX_FOLDER_ID).filter(file => file.mimeType === FOLDER_MIME);
  servers.forEach(serverFolder => processServer(serverFolder, startedAt));

  // Retention and the "no new dump" alert also cover servers whose inbox folder is gone.
  listChildren(CONFIG.ARCHIVE_FOLDER_ID)
    .filter(file => file.mimeType === FOLDER_MIME)
    .forEach(archiveServer => {
      const archiveDb = getOrCreateFolder(archiveServer.id, 'db');
      applyDbRetention(archiveServer.name, archiveDb);
      checkDumpAge(archiveServer.name, archiveDb);
    });
}

function processServer(serverFolder, startedAt) {
  const name = serverFolder.name;
  const archiveServer = getOrCreateFolder(CONFIG.ARCHIVE_FOLDER_ID, name);
  const inboxChildren = listChildren(serverFolder.id);
  const inboxDb = inboxChildren.find(file => file.name === 'db' && file.mimeType === FOLDER_MIME);
  const inboxUploads = inboxChildren.find(file => file.name === 'uploads' && file.mimeType === FOLDER_MIME);
  const manifest = inboxChildren.find(file => file.name === MANIFEST_NAME && file.mimeType !== FOLDER_MIME);

  const dbDone = !inboxDb || moveAll(inboxDb.id, getOrCreateFolder(archiveServer, 'db'), startedAt);
  const uploadsDone = !inboxUploads || moveAll(inboxUploads.id, getOrCreateFolder(archiveServer, 'uploads'), startedAt);

  // The manifest is only applied once every image of this run has reached the archive.
  if (manifest && dbDone && uploadsDone) {
    applyManifest(name, manifest, getOrCreateFolder(archiveServer, 'uploads'));
  }
}

/** Moves all files of a folder into the archive folder. Returns false if the time budget ran out. */
function moveAll(fromFolderId, toFolderId, startedAt) {
  const files = listChildren(fromFolderId).filter(file => file.mimeType !== FOLDER_MIME);
  if (files.length === 0) {
    return true;
  }
  const existingNames = new Set(listChildren(toFolderId).map(file => file.name));
  for (const file of files) {
    if (Date.now() - startedAt > CONFIG.TIME_BUDGET_MS) {
      return false;
    }
    if (existingNames.has(file.name)) {
      // Uploaded twice (e.g. the server lost its state). The archived copy stays, the duplicate goes.
      trash(file.id);
    } else {
      Drive.Files.update({}, file.id, null, {
        addParents: toFolderId,
        removeParents: fromFolderId,
        supportsAllDrives: true,
      });
      existingNames.add(file.name);
    }
  }
  return true;
}

function applyManifest(serverName, manifest, archiveUploadsId) {
  const content = DriveApp.getFileById(manifest.id).getBlob().getDataAsString();
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0 || !lines[0].startsWith(MANIFEST_MARKER)) {
    alert(serverName, 'manifest', 'Manifest ohne Kennung',
      'Das Manifest von ' + serverName + ' hat nicht die erwartete erste Zeile. Es wurde nichts gelöscht.');
    trash(manifest.id);
    return;
  }
  const onServer = new Set(lines.slice(1));
  const archived = listChildren(archiveUploadsId).filter(file => file.mimeType !== FOLDER_MIME);
  const missing = archived.filter(file => !onServer.has(file.name));
  const allowed = Math.max(CONFIG.MAX_TRASH_ALWAYS_OK, Math.floor(archived.length * CONFIG.MAX_TRASH_RATIO));

  if (missing.length > allowed) {
    alert(serverName, 'manifest', 'Viele Bilder fehlen',
      'Auf ' + serverName + ' fehlen ' + missing.length + ' von ' + archived.length + ' Bildern, erlaubt sind ' +
      allowed + '. Es wurde nichts in den Papierkorb gelegt. Wenn das gewollt war, die Werte in CONFIG ' +
      'anpassen. Sonst bitte den Server prüfen.\n\nBeispiele: ' + missing.slice(0, 20).map(f => f.name).join(', '));
    trash(manifest.id);
    return;
  }
  missing.forEach(file => trash(file.id));
  if (missing.length > 0) {
    console.log(serverName + ': ' + missing.length + ' gelöschte Bilder in den Papierkorb gelegt.');
  }
  trash(manifest.id);
}

function applyDbRetention(serverName, archiveDbId) {
  const dumps = listChildren(archiveDbId)
    .filter(file => file.mimeType !== FOLDER_MIME)
    .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
  const cutoff = Date.now() - CONFIG.DB_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  dumps.slice(CONFIG.DB_MIN_KEEP)
    .filter(file => new Date(file.createdTime).getTime() < cutoff)
    .forEach(file => trash(file.id));
}

function checkDumpAge(serverName, archiveDbId) {
  const newest = listChildren(archiveDbId)
    .filter(file => file.mimeType !== FOLDER_MIME)
    .map(file => new Date(file.createdTime).getTime())
    .reduce((max, time) => Math.max(max, time), 0);
  const ageHours = (Date.now() - newest) / (60 * 60 * 1000);
  if (ageHours > CONFIG.MAX_DUMP_AGE_HOURS) {
    const since = newest === 0 ? 'noch nie' : 'seit ' + Math.round(ageHours) + ' Stunden nicht mehr';
    alert(serverName, 'dumpAge', 'Kein neues Backup',
      'Von ' + serverName + ' ist ' + since + ' ein Datenbank-Backup angekommen. Bitte den Container ' +
      'rocket-meals-offsite-backup auf dem Server prüfen.');
  }
}

/** Sends at most one mail per server and topic per day. */
function alert(serverName, topic, subject, body) {
  const key = 'alert_' + serverName + '_' + topic;
  const today = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd');
  const properties = PropertiesService.getScriptProperties();
  console.warn(serverName + ': ' + subject + '. ' + body);
  if (properties.getProperty(key) === today) {
    return;
  }
  const recipient = CONFIG.ALERT_EMAIL || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(recipient, 'Rocket Meals Backup ' + serverName + ': ' + subject, body);
  properties.setProperty(key, today);
}

function trash(fileId) {
  Drive.Files.update({ trashed: true }, fileId, null, { supportsAllDrives: true });
}

function listChildren(folderId) {
  const files = [];
  const state = { pageToken: undefined };
  do {
    const response = Drive.Files.list({
      q: "'" + folderId + "' in parents and trashed = false",
      corpora: 'allDrives',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: 1000,
      fields: 'nextPageToken, files(id, name, mimeType, createdTime)',
      pageToken: state.pageToken,
    });
    (response.files || []).forEach(file => files.push(file));
    state.pageToken = response.nextPageToken;
  } while (state.pageToken);
  return files;
}

/** Accepts a parent folder ID or a file object, returns the child folder ID. */
function getOrCreateFolder(parent, name) {
  const parentId = typeof parent === 'string' ? parent : parent.id;
  const existing = listChildren(parentId).find(file => file.name === name && file.mimeType === FOLDER_MIME);
  if (existing) {
    return existing.id;
  }
  return Drive.Files.create({ name: name, mimeType: FOLDER_MIME, parents: [parentId] }, null, {
    supportsAllDrives: true,
  }).id;
}
