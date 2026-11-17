// import child_process for execSync
import {execSync} from 'node:child_process';
import fs from 'node:fs';
import {AppleClientSecretCredentials} from './types';

/**
 * Generate Apple SSO JWT token
 */
export function generateAppleJWTShell(params: AppleClientSecretCredentials) {
  const { teamId, clientId, keyId, privateKey } = params;

  // Validate required parameters
  const missingParams: string[] = [];

  if (!teamId) missingParams.push('teamId');
  if (!clientId) missingParams.push('clientId');
  if (!keyId) missingParams.push('keyId');
  if (!privateKey) {
    missingParams.push('keyFileContent or keyFilePath');
  }

  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
  }

  // Generate timestamps
  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = currentTime + (86400 * 180); // 180 days

  try {
    // List the directory via fs instead of spawning `ls`, so no binary is resolved through PATH
    const directoryEntries = fs.readdirSync('/directus/sso').filter(entry => !entry.startsWith('.')).sort();
    console.log(directoryEntries.join('\n'));
  } catch (error) {
    throw new Error(`Failed: ${error}`);
  }

  const source = '/directus/sso/genSSO_Apple.sh';
  const target = '/directus/sso_runtime/genSSO_Apple.sh';

  // Stelle sicher, dass der Zielordner existiert
  fs.mkdirSync('/directus/sso_runtime', { recursive: true });

  // Kopiere die Datei ins beschreibbare Verzeichnis
  execSync(`cp ${source} ${target}`);

  // Mache sie ausführbar
  execSync(`chmod +x ${target}`);

  // Execute the shell script with parameters
  let command = `${target} --team_id "${teamId}" --client_id "${clientId}" --key_id "${keyId}" --key_file_content '${privateKey}'`;

  let token: string;
  try {
    let tokenRaw = execSync(command, { encoding: 'utf-8' });
    token = tokenRaw.trim();
    // The token is a secret, only its creation is logged.
    console.log('Generated Apple JWT token successfully.');
  } catch (error) {
    throw new Error(`Failed to generate Apple JWT: ${error}`);
  }

  return {
    token: token,
    exp: expirationTime
  }
}

