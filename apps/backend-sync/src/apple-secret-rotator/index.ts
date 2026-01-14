import fs from 'fs';
import {
  AppleClientSecretCredentials,
  decodeAppleClientSecretExpiry,
  generateAppleClientSecret,
  MAX_TOKEN_LIFETIME_SECONDS
} from './apple/generateAppleClientSecret';

const refreshIfExpiringWithinDays = 7; // Refresh if expiring within 7 days
const REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24 * refreshIfExpiringWithinDays;

const HOOK_NAME = 'apple-secret-rotator';

export function buildConfigFromEnv(hostEnvFilePath: string): AppleClientSecretCredentials | null {
  const teamId = getEnvValue(hostEnvFilePath, 'AUTH_APPLE_HOOK_APPLE_TEAM_ID');
  const clientId = getEnvValue(hostEnvFilePath, 'AUTH_APPLE_CLIENT_ID');
  const keyId = getEnvValue(hostEnvFilePath, 'AUTH_APPLE_HOOK_APPLE_KEY_ID');
  const privateKeyEscaped = getEnvValue(hostEnvFilePath, 'AUTH_APPLE_HOOK_APPLE_PRIVATE_KEY');

  const missing = [
    !clientId && 'AUTH_APPLE_CLIENT_ID',
    !teamId && 'AUTH_APPLE_HOOK_APPLE_TEAM_ID',
    !keyId && 'AUTH_APPLE_HOOK_APPLE_KEY_ID',
    !privateKeyEscaped && 'AUTH_APPLE_HOOK_APPLE_PRIVATE_KEY',
    !hostEnvFilePath && 'HOST_ENV_FILE_PATH',
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    console.warn('['+HOOK_NAME+'] Missing environment variables:', missing.join(', '));
    return null;
  }

  const privateKeyRaw = privateKeyEscaped || '';
  const privateKeyPem = privateKeyRaw.replace(/\\n/g, '\n');

  return {
    teamId: teamId!,
    clientId: clientId!,
    keyId: keyId!,
    privateKey: privateKeyPem!,
    lifetimeSeconds: MAX_TOKEN_LIFETIME_SECONDS,
  };
}

function getEnvValue(hostEnvFilePath: string, key: string): string | null {
  console.log("["+HOOK_NAME+"] Reading value from " + hostEnvFilePath);

  const ENV_VARS = fs.readFileSync(hostEnvFilePath, "utf8").split('\n');
  console.log("["+HOOK_NAME+"] Read " + ENV_VARS.length + " lines from " + hostEnvFilePath);

  const targetLine = ENV_VARS.find((line) => line.match(new RegExp(`^${key}=`)));
  if (targetLine) {
    const value = targetLine.split('=')[1] || '';
    console.log("["+HOOK_NAME+"] Found value for " + key + ": " + value.substring(0, 10) + "....");
    return value;
  } else {
    console.log("["+HOOK_NAME+"] No value found for " + key);
    return null;
  }
}

function setEnvValue(hostEnvFilePath: string, key: string, value: string) {
  console.log("["+HOOK_NAME+"] Writing new value to " + hostEnvFilePath);
  console.log("Setting " + key + " to " + value.substring(0, 10) + "....");

  const ENV_VARS = fs.readFileSync(hostEnvFilePath, "utf8").split('\n');
  console.log("["+HOOK_NAME+"] Read " + ENV_VARS.length + " lines from " + hostEnvFilePath);

  const targetIndex = ENV_VARS.findIndex((line) => line.match(new RegExp(`^${key}=`)));
  if (targetIndex >= 0) {
    ENV_VARS.splice(targetIndex, 1, `${key}=${value}`);
  } else {
    ENV_VARS.push(`${key}=${value}`);
  }

  fs.writeFileSync(hostEnvFilePath, ENV_VARS.join('\n'));

  console.log("["+HOOK_NAME+"] Updated " + key + " in " + hostEnvFilePath);
}

async function refreshSecret(config: AppleClientSecretCredentials, hostEnvFilePath: string) {
  try {
    const result = generateAppleClientSecret(config);
    let token = result.token;
    console.log('['+HOOK_NAME+'] Generated new Apple client secret. Expires at', new Date(result.expiresAt * 1000).toISOString());

    console.log("###############")
    console.log("NEW TOKEN:")
    console.log(token);
    console.log("###############")

    await setEnvValue(hostEnvFilePath, 'AUTH_APPLE_CLIENT_SECRET', token);
  } catch (error) {
    console.error('['+HOOK_NAME+'] Failed to generate Apple client secret:', error);
  }
}

export async function ensureAppleClientSecret(config: AppleClientSecretCredentials, hostEnvFilePath: string): Promise<{changed: boolean, reason?: string}> {
  if (!config) {
    console.warn('['+HOOK_NAME+'] Rotator disabled due to missing configuration.');
    return { changed: false, reason: 'missing_config' };
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    if (!hostEnvFilePath) {
      console.warn('['+HOOK_NAME+'] HOST_ENV_FILE_PATH not set.');
      return { changed: false, reason: 'missing_host_env' };
    }

    let token = getEnvValue(hostEnvFilePath, 'AUTH_APPLE_CLIENT_SECRET');

    if (token) {
      const expiresAt = decodeAppleClientSecretExpiry(token);
      if (expiresAt) {
        const secondsRemaining = expiresAt - now;
        if (secondsRemaining < REFRESH_THRESHOLD_SECONDS) {
          console.log('['+HOOK_NAME+'] Token is nearing expiry. Refreshing...');
          await refreshSecret(config, hostEnvFilePath);
          return { changed: true, reason: 'refreshed_near_expiry' };
        } else {
          console.log('['+HOOK_NAME+'] Token is valid. No action.');
          return { changed: false, reason: 'valid' };
        }
      } else {
        console.log('['+HOOK_NAME+'] Token found but expiry not parseable. Refreshing...');
        await refreshSecret(config, hostEnvFilePath);
        return { changed: true, reason: 'no_expiry' };
      }
    }

    console.log('['+HOOK_NAME+'] No token found. Generating new token...');
    await refreshSecret(config, hostEnvFilePath);
    return { changed: true, reason: 'created_new' };
  } catch (error) {
    console.error('['+HOOK_NAME+'] Failed to ensure Apple client secret:', error);
    return { changed: false, reason: 'error' };
  }
}

