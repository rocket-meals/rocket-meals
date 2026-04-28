import { DockerDirectusPingHelper } from './DockerDirectusPingHelper';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { CookieJar } from 'cookiejar';
import FormData from 'form-data';

import { createRequire } from 'node:module';
import { FetchIgnoreSelfSignedCertHelper } from './FetchIgnoreSelfSignedCertHelper';

const require = createRequire(import.meta.url);

const pkgPath = require.resolve('directus-sync/package.json');
const { version } = require(pkgPath);

console.log('Directus Sync Version:', version);

export interface DirectusDatabaseSyncOptions {
  directusInstanceUrl: string;
  adminEmail: string;
  adminPassword: string;
  pathToDataDirectusSyncData: string;
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

  constructor(config: DirectusDatabaseSyncOptions) {
    this.config = config;
    this.directusConfigCollectionsPath = path.resolve(this.config.pathToDataDirectusSyncData, 'configuration/directus-config/collections');
    this.directusConfigOverwriteCollectionsPath = path.resolve(this.config.pathToDataDirectusSyncData, 'configuration/directus-config-overwrite/collections');
    this.configurationPathCollections = path.resolve(this.config.pathToDataDirectusSyncData, 'configuration/collections');
    this.dumpPath = path.resolve(this.config.pathToDataDirectusSyncData, 'configuration/directus-config');
  }

  public get syncConfig(): DirectusDatabaseSyncOptions {
    return this.config;
  }

  public async push() {
    console.log('Starting Push Sync');
    const headers = await this.setupDirectusConnectionAndGetHeaders();
    await this.copyFromDirectusConfigOverwriteFolderIntoDirectusConfigFolder();
    await this.enableRequiredSettings(headers);
    await this.pushDirectusSyncSchemas();
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
      if (requiredModules.has(module.id)) {
        if (module.enabled) {
          console.log(` -  ${module.id} already enabled`);
        } else {
          console.log(` -  Enabling ${module.id}`);
          modules[moduleIndex].enabled = true;
        }
      } else {
        console.log(` -  ${module.id} not required`);
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

  private getDirectusSyncParams() {
    // Properly escape the password for shell command
    const preserverIds = 'dashboards,operations,panels,policies,roles,translations';
    const preserveOption = '--preserve-ids ' + preserverIds;
    return '--directus-url ' + this.config.directusInstanceUrl + ' --directus-email ' + this.config.adminEmail + ' --directus-password "' + this.config.adminPassword + '" --dump-path ' + this.dumpPath + ' ' + preserveOption;
  }

  private async execWithOutput(command: string) {
    // Split the command into arguments for spawn
    const [cmd, ...args] = command.split(' ');
    console.log(' -  Executing command:', cmd, args.join(' '));

    const child = spawn(cmd, args, {
      env: { NODE_TLS_REJECT_UNAUTHORIZED: '0', ...process.env },
      shell: true,
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

  private async execDirectusSync(params: string) {
    let command = 'npx directus-sync@' + DirectusSyncVersion + ' ' + params;
    // execWithOutput throws on non-zero exit code, so reaching this point means success
    await this.execWithOutput(command);
    return true;
  }

  private async execDirectusSyncMethod(method: string, logText: string) {
    console.log(' - Directus Sync: ' + logText);
    const directus_sync_params = this.getDirectusSyncParams();
    const params = method + ' ' + directus_sync_params;
    let success = await this.execDirectusSync(params);
    if (success) {
      console.log(' -  Success: ' + logText);
    } else {
      console.log(' -  No success: ' + logText);
      throw new Error('Error during execution of directus-sync');
    }
  }

  private async pushDirectusSyncSchemas() {
    await this.execDirectusSyncMethod('push', 'Pushing schema changes');
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
