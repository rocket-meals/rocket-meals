import { DockerDirectusPingHelper } from './DockerDirectusPingHelper';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { CookieJar } from 'cookiejar';
import FormData from 'form-data';

import { createRequire } from 'node:module';
import { FetchIgnoreSelfSignedCertHelper } from './FetchIgnoreSelfSignedCertHelper';
import { DirectusConnectionOptions } from './DirectusConnectionOptions';
import { ProtectedCollectionsGuard, resolveProtectedCollectionsConfig } from './ProtectedCollectionsGuard';
import { DirectusNotificationHelper } from './DirectusNotificationHelper';

const require = createRequire(import.meta.url);

const pkgPath = require.resolve('directus-sync/package.json');
const { version } = require(pkgPath);

console.log('Directus Sync Version:', version);

export interface DirectusDatabaseSyncOptions extends DirectusConnectionOptions {
  pathToDataDirectusSyncData: string;
  /**
   * Overwrite the protected collections (dashboards, panels, ...) even when the live instance
   * has local changes. Only meant for an explicit, manual "force" deployment.
   */
  forceOverwriteProtectedCollections?: boolean;
}

const DirectusSyncVersion = version;

const requiredModules = new Set(['flow-manager', 'schema-management-module', 'generate-types']);
const collectionsToSkip = new Set(['2-wikis.json']);

export class DirectusDatabaseSync {
  private readonly config: DirectusDatabaseSyncOptions;
  private readonly directusConfigOverwriteCollectionsPath: string;
  private readonly directusConfigCollectionsPath: string;
  private readonly configurationPathCollections: string;
  private readonly dumpPath: string;
  private readonly defaultDriftBackupPath: string;

  constructor(config: DirectusDatabaseSyncOptions) {
    this.config = config;
    // pathToDataDirectusSyncData originates from a CLI argument (--path-to-data-directus-sync).
    // Canonicalize and validate it stays within the repository root before it is used to build
    // every other path this class reads from / writes to. The repo root (not process.cwd()) is
    // used as the base because this class always runs with cwd = apps/backend-sync (locally via
    // `yarn workspace backend-sync sync`, and in Docker via WORKDIR), while the legitimate sync
    // data directory lives at "<repo-root>/data/directus-sync-data", a sibling of apps/.
    const validatedRoot = DirectusDatabaseSync.validatePathWithinBase(this.config.pathToDataDirectusSyncData, DirectusDatabaseSync.findRepoRoot());
    this.directusConfigCollectionsPath = path.resolve(validatedRoot, 'configuration/directus-config/collections');
    this.directusConfigOverwriteCollectionsPath = path.resolve(validatedRoot, 'configuration/directus-config-overwrite/collections');
    this.configurationPathCollections = path.resolve(validatedRoot, 'configuration/collections');
    this.dumpPath = path.resolve(validatedRoot, 'configuration/directus-config');
    // Sibling of the sync data ("<repo>/data/directus-sync-backups"), mounted from the host in
    // Docker so a backup of local dashboard changes survives a container rebuild.
    this.defaultDriftBackupPath = path.resolve(validatedRoot, '..', 'directus-sync-backups');
  }

  // Walks up from cwd to find the repository root. Looks for ".git" (present in a local
  // checkout) or ".yarnrc.yml" (present in the Docker image, which doesn't include .git),
  // falling back to cwd if neither marker is found.
  private static findRepoRoot(): string {
    let current = process.cwd();
    while (true) {
      if (fs.existsSync(path.join(current, '.git')) || fs.existsSync(path.join(current, '.yarnrc.yml'))) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) return process.cwd();
      current = parent;
    }
  }

  // Ensures a CLI-controlled path canonicalizes to somewhere inside `basePath`, preventing
  // path traversal (e.g. "--path-to-data-directus-sync ../../etc") from escaping the project.
  private static validatePathWithinBase(candidatePath: string, basePath: string): string {
    const resolvedBase = path.resolve(basePath);
    const resolvedCandidate = path.resolve(resolvedBase, candidatePath);
    const relative = path.relative(resolvedBase, resolvedCandidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Invalid --path-to-data-directus-sync: "${candidatePath}" resolves outside of "${resolvedBase}".`);
    }
    return resolvedCandidate;
  }

  public get syncConfig(): DirectusDatabaseSyncOptions {
    return this.config;
  }

  public async push() {
    console.log('Starting Push Sync');
    const headers = await this.setupDirectusConnectionAndGetHeaders();
    await this.copyFromDirectusConfigOverwriteFolderIntoDirectusConfigFolder();
    await this.enableRequiredSettings(headers);
    // Never overwrite dashboards/panels that were edited in the live instance without saying so.
    const guardResult = await this.runProtectedCollectionsGuard(headers);
    await this.pushDirectusSyncSchemas(guardResult.collectionsToExcludeFromPush);
    await this.uploadSchemas(headers);
  }

  public async pull() {
    console.log('Waiting for Directus to be ready...');
    const headers = await this.setupDirectusConnectionAndGetHeaders();
    console.log('NOW saving collections');
    await this.saveCollections(headers);
    console.log('NOW pulling directus sync schema');
    await this.pullDirectusSyncSchema();
    console.log('NOW copying overwrite files');
    await this.copyFromDirectusConfigOverwriteFolderIntoDirectusConfigFolder();
  }

  private async runProtectedCollectionsGuard(headers: Headers) {
    const config = resolveProtectedCollectionsConfig({
      defaultBackupPath: this.defaultDriftBackupPath,
      forceOverwrite: this.config.forceOverwriteProtectedCollections,
    });
    const guard = new ProtectedCollectionsGuard({
      config,
      repositoryCollectionsPath: path.resolve(this.dumpPath, 'collections'),
      directusInstanceUrl: this.config.directusInstanceUrl,
      pullInstanceCollections: (dumpPath, collections) => this.pullCollectionsIntoDumpPath(dumpPath, collections),
      notificationHelper: new DirectusNotificationHelper(this.config.directusInstanceUrl, headers),
    });
    return await guard.run();
  }

  /**
   * Pulls only the given collections of the live instance into a separate dump folder. Used by
   * the guard to compare the instance with the repository; the schema snapshot and the API
   * specs are not needed for that and are therefore skipped.
   */
  private async pullCollectionsIntoDumpPath(dumpPath: string, collections: string[]) {
    const args = ['pull', ...this.getDirectusSyncArgs(dumpPath), '--only-collections', DirectusDatabaseSync.requireSafeCollectionList(collections), '--no-snapshot', '--no-specs'];
    if (!(await this.execDirectusSync(args))) {
      throw new Error('Error during comparison pull of the protected collections');
    }
  }

  private async pullDirectusSyncSchema() {
    await this.execDirectusSyncMethod('pull', 'Pulling schema changes');
  }

  private async saveCollections(headers: any) {
    console.log('Saving collections...');
    let collections = fs.readdirSync(`${this.configurationPathCollections}`);
    // remove files that are not collections like .DS_Store
    // if file ends with .DS_Store it is not a collection
    collections = collections.filter(file => !file.endsWith('.DS_Store'));

    for (const collectionFilePath of collections) {
      if (collectionsToSkip.has(collectionFilePath)) {
        console.log(` -  Skipping ignored collection: ${collectionFilePath}`);
        continue;
      }

      const data = await this.getCollection(headers, collectionFilePath);
      console.log(data);
      const jsonData = JSON.stringify(data, null, 4);
      console.log(` -  Fetched ${collectionFilePath} (${data.length} items)`);
      console.log(jsonData);

      // Save the collection data to file
      fs.writeFileSync(`${this.configurationPathCollections}/${collectionFilePath}`, jsonData);
    }

    console.log(' -  Saved collections');
  }

  private async copyFromDirectusConfigOverwriteFolderIntoDirectusConfigFolder() {
    // copy all files except .DS_Store from directusConfigOverwriteCollectionsPath to directusConfigCollectionsPath

    const absolutePathCollections = path.resolve(__dirname, this.directusConfigOverwriteCollectionsPath);
    const files = fs.readdirSync(absolutePathCollections);
    for (const file of files) {
      if (file.endsWith('.DS_Store')) {
        continue;
      }
      const source = path.resolve(absolutePathCollections, file);
      const destination = path.resolve(__dirname, this.directusConfigCollectionsPath, file);
      fs.copyFileSync(source, destination);
    }
  }

  private async setupDirectusConnectionAndGetHeaders() {
    console.log('Setting up Directus connection...');
    await DockerDirectusPingHelper.waitForDirectusHealthy(this.config.directusInstanceUrl);
    return await this.login();
  }

  // Function to handle login and return headers with cookies
  private async login() {
    console.log('Logging into Directus...');
    const cookieJar = new CookieJar();
    const headers = new Headers();
    const origin = new URL(this.config.directusInstanceUrl).origin;

    const response = await FetchIgnoreSelfSignedCertHelper.fetch(`${this.config.directusInstanceUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.config.adminEmail,
        password: this.config.adminPassword,
        mode: 'session',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Save the cookies to the jar
    const cookies = response.headers.get('set-cookie') as string;
    cookieJar.setCookie(cookies, origin);

    headers.set(
      'cookie',
      cookieJar
        .getCookies({
          domain: origin,
          path: '/',
          secure: true,
          script: false,
        })
        .toValueString()
    );

    return headers;
  }

  private getUrlSettings() {
    return `${this.config.directusInstanceUrl}/settings`;
  }

  private fetchGetOptions(headers: any, method: string) {
    return {
      method: method,
      headers: headers,
    };
  }

  private async fetchGetResponse(url: string, headers: any) {
    let headersObject = undefined;
    if (headers) {
      headersObject = { Cookie: headers.get('cookie') };
    }

    return await FetchIgnoreSelfSignedCertHelper.fetch(url, this.fetchGetOptions(headersObject, 'GET'));
  }

  private async fetchGetResponseJson(url: string, headers: any) {
    const response = await this.fetchGetResponse(url, headers);
    return await response.json();
  }

  // Function to enable required settings
  private async enableRequiredSettings(headers: any) {
    console.log('Enabling required settings...');

    // Patch settings with an empty object
    console.log(' -  Patching with empty');
    await FetchIgnoreSelfSignedCertHelper.fetch(`${this.getUrlSettings()}`, {
      method: 'PATCH',
      headers: {
        Cookie: headers.get('cookie'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ module_bar: [] }),
    });

    // Fetch the current settings
    console.log(' -  Fetching settings');
    const settings = await this.fetchGetResponseJson(`${this.getUrlSettings()}`, headers);

    const modules = settings.data.module_bar;
    if (!modules) throw new Error('Failed to fetch modules!');

    // Enable required modules
    for (const moduleIndex in modules) {
      const module = modules[moduleIndex];
      // module.id comes from the Directus API response; strip control/newline characters
      // before logging so it can't be used to forge fake log lines (log injection).
      const safeModuleId = String(module.id).replace(/[\x00-\x1f]/g, '');
      if (requiredModules.has(module.id)) {
        if (module.enabled) {
          console.log(` -  ${safeModuleId} already enabled`);
        } else {
          console.log(` -  Enabling ${safeModuleId}`);
          modules[moduleIndex].enabled = true;
        }
      } else {
        console.log(` -  ${safeModuleId} not required`);
      }
    }

    // Patch updated settings
    const response = await FetchIgnoreSelfSignedCertHelper.fetch(`${this.getUrlSettings()}`, {
      method: 'PATCH',
      headers: {
        Cookie: headers.get('cookie'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ module_bar: modules }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} message: ${response.statusText}`);
    }

    console.log(' -  Enabled required settings');
  }

  // Validates a CLI-controlled value against an anchored allowlist pattern before it is
  // passed to an OS command, so faulty or malicious CLI arguments cannot smuggle in
  // unexpected content (see SonarCloud S8705).
  private static requireSafeCliValue(name: string, value: string, pattern: RegExp): string {
    if (!pattern.test(value)) {
      throw new Error(`Refusing to pass unsafe value for "${name}" to the directus-sync CLI`);
    }
    return value;
  }

  // Collection names end up on the directus-sync command line, so they are validated against
  // the same anchored allowlist approach as the other CLI values.
  private static requireSafeCollectionList(collections: string[]): string {
    return DirectusDatabaseSync.requireSafeCliValue('collections', collections.join(','), /^[a-z_]+(?:,[a-z_]+)*$/);
  }

  private getDirectusSyncArgs(dumpPath: string = this.dumpPath): string[] {
    const preserveIds = 'dashboards,operations,panels,policies,roles,translations';
    return [
      '--directus-url', DirectusDatabaseSync.requireSafeCliValue('directus-url', this.config.directusInstanceUrl, /^https?:\/\/[\w.-]+(?::\d+)?(?:\/[\w./-]*)?$/),
      '--directus-email', DirectusDatabaseSync.requireSafeCliValue('directus-email', this.config.adminEmail, /^[^\s@]+@[^\s@]+$/),
      '--directus-password', DirectusDatabaseSync.requireSafeCliValue('directus-password', this.config.adminPassword, /^[\x20-\x7e]+$/),
      '--dump-path', DirectusDatabaseSync.requireSafeCliValue('dump-path', dumpPath, /^[\w./ -]+$/),
      '--preserve-ids', preserveIds,
    ];
  }

  // Executes a command as an argument vector (no shell) so that CLI-controlled values
  // (URL, email, password, paths) can never be interpreted as shell syntax.
  private async execWithOutput(cmd: string, args: string[]) {
    console.log(' -  Executing command:', cmd, args.map(arg => (arg === this.config.adminPassword ? '***' : arg)).join(' '));

    const child = spawn(cmd, args, {
      env: { NODE_TLS_REJECT_UNAUTHORIZED: '0', ...process.env },
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let output = '';

    child.stdout.on('data', data => {
      process.stdout.write(data); // Print the output to the console
      output += data.toString(); // Capture the output
    });

    child.stderr.on('data', data => {
      process.stderr.write(data); // Print error output to the console
      output += data.toString(); // Capture the error output
    });

    await new Promise((resolve, reject) => {
      child.on('close', code => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });
    });

    return output;
  }

  private async execDirectusSync(args: string[]) {
    const output = await this.execWithOutput('npx', ['directus-sync@' + DirectusSyncVersion, ...args]);
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('✅  Done!')) {
        return true;
      }
    }
    console.error('Error during execution of directus-sync');
    console.error(output);
    return false;
  }

  private async execDirectusSyncMethod(method: string, logText: string, additionalArgs: string[] = []) {
    console.log(' - Directus Sync: ' + logText);
    const args = [method, ...this.getDirectusSyncArgs(), ...additionalArgs];
    let success = await this.execDirectusSync(args);
    if (success) {
      console.log(' -  Success: ' + logText);
    } else {
      console.log(' -  No success: ' + logText);
      throw new Error('Error during execution of directus-sync');
    }
  }

  private async pushDirectusSyncSchemas(collectionsToExclude: string[] = []) {
    const additionalArgs = collectionsToExclude.length > 0 ? ['--exclude-collections', DirectusDatabaseSync.requireSafeCollectionList(collectionsToExclude)] : [];
    await this.execDirectusSyncMethod('push', 'Pushing schema changes', additionalArgs);
  }

  private async uploadSchemas(headers: any) {
    console.log('Uploading schemas...');
    let files = fs.readdirSync(`${this.configurationPathCollections}`).sort();
    // remove files that are not collections like .DS_Store
    // if file ends with .DS_Store it is not a collection
    files = files.filter(file => !file.endsWith('.DS_Store'));
    for (const file of files) {
      await this.uploadSchema(headers, `${this.configurationPathCollections}/${file}`);
    }
  }

  private getUrlItems() {
    return `${this.config.directusInstanceUrl}/items`; // as directus_url can change we need to use a function here
  }

  // Function to import a schema file into Directus
  private async uploadSchema(headers: any, file: string) {
    console.log('Uploading schema... file: ' + file);
    const fileSplit = file.split('/') || [];
    if (fileSplit.length === 0) {
      console.error(' -  Error: Invalid file path');
      return;
    }
    let fileName = fileSplit.pop();
    if (!fileName) {
      console.error(' -  Error: Invalid file name');
      return;
    }
    const name = fileName.split('.').shift();
    if (!name) {
      console.error(' -  Error: Invalid file name');
      return;
    }
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file));
    const displayName = name.split('-').pop();

    // Check if collection already exists
    const firstElement = await this.fetchGetResponseJson(`${this.getUrlItems()}/${displayName}?limit=1`, headers);

    if (firstElement.data.length > 0) {
      console.log(` -  ${displayName} already exists`);
      return;
    }

    // Import collection into Directus
    console.log(` -  Importing ${displayName}`);
    const response = await FetchIgnoreSelfSignedCertHelper.fetch(`${this.config.directusInstanceUrl}/utils/import/${displayName}`, {
      method: 'POST',
      headers: { Cookie: headers.get('cookie'), ...formData.getHeaders() },
      body: formData as any,
    });

    if (!response.ok) {
      console.error(` -  HTTP error! status: ${response.status} message: ${response.statusText} at ${file}`);
    }
  }

  // Function to fetch data for a collection
  private async getCollection(headers: any, collectionFilePath: string) {
    console.log('Fetching collection... name: ' + collectionFilePath);
    let fileName = collectionFilePath.split('/').pop();
    if (!fileName) {
      throw new Error('Invalid file name');
    }
    const name = fileName.split('.').shift();
    if (!name) {
      throw new Error('Invalid file name');
    }

    const displayName = name.split('-').pop();
    console.log(` -  Fetching ${displayName}`);

    // Retrieve collection data
    console.log(' -  Fetching collection data');
    const data = await this.fetchGetResponseJson(`${this.getUrlItems()}/${displayName}?limit=-1`, headers);

    return data.data;
  }
}
