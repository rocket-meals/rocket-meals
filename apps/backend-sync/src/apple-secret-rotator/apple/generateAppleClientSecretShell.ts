// import child_process for execSync
import {execSync} from 'child_process';
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
    let commandResult = execSync("ls /directus/sso", { encoding: 'utf-8' }).trim();
    console.log(commandResult);
  } catch (error) {
    throw new Error(`Failed: ${error}`);
  }

  const source = '/directus/sso/genSSO_Apple.sh';
  const target = '/directus/sso_runtime/genSSO_Apple.sh';

  // Stelle sicher, dass der Zielordner existiert
  execSync('mkdir -p /directus/sso_runtime');

  // Kopiere die Datei ins beschreibbare Verzeichnis
  execSync(`cp ${source} ${target}`);

  // Mache sie ausführbar
  execSync(`chmod +x ${target}`);

  // Execute the shell script with parameters
  let command = `${target} --team_id "${teamId}" --client_id "${clientId}" --key_id "${keyId}" --key_file_content '${privateKey}'`;

  let token: string;
  try {
    let tokenRaw = execSync(command, { encoding: 'utf-8' });
    console.log("Raw token output: ", tokenRaw);
    token = tokenRaw.trim();
    console.log("Token: ", token);

    console.log('Generated Apple JWT token successfully: ', token);
  } catch (error) {
    throw new Error(`Failed to generate Apple JWT: ${error}`);
  }

  return {
    token: token,
    exp: expirationTime
  }
}

