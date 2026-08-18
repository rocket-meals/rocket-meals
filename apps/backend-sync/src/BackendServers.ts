import { ServerHelper, StringHelper } from 'repo-depkit-common';

/**
 * A Directus backend that is deployed from this repository.
 */
export type BackendServer = {
  /** Short key, usable on the command line, e.g. "studi-futter". */
  key: string;
  /** Hostname as used by the deploy workflow, e.g. "studi-futter.rocket-meals.de". */
  host: string;
  /** Directus API url, e.g. "https://studi-futter.rocket-meals.de/rocket-meals/api". */
  directusInstanceUrl: string;
};

export type DirectusAdminCredentials = {
  adminEmail: string | undefined;
  adminPassword: string | undefined;
};

function createBackendServer(key: string, directusInstanceUrl: string): BackendServer {
  return {
    key,
    host: new URL(directusInstanceUrl).hostname,
    directusInstanceUrl,
  };
}

/**
 * Every backend that gets its Directus configuration pushed from this repository.
 * Keep in sync with the "server_preset" options of ".github/workflows/deploy-backend-manual.yml".
 */
export const ALL_BACKEND_SERVERS: BackendServer[] = [createBackendServer('test', ServerHelper.TEST_SERVER_CONFIG.server_url), createBackendServer('swosy', ServerHelper.SWOSY_SERVER_CONFIG.server_url), createBackendServer('studi-futter', ServerHelper.STUDI_FUTTER_SERVER_CONFIG.server_url), createBackendServer('muenster', ServerHelper.SERVER_CONFIG_MUENSTER.server_url)];

/**
 * Resolves a comma separated filter ("swosy, test" or "swosy.rocket-meals.de") to the
 * matching backends. Without a filter every known backend is returned.
 */
export function resolveBackendServers(filter?: string): BackendServer[] {
  if (!filter?.trim()) {
    return ALL_BACKEND_SERVERS;
  }

  const wantedNames = filter
    .split(',')
    .map(entry => entry.trim().toLowerCase())
    .filter(entry => entry.length > 0);

  return wantedNames.map(wantedName => {
    const server = ALL_BACKEND_SERVERS.find(candidate => candidate.key === wantedName || candidate.host === wantedName);
    if (!server) {
      const known = ALL_BACKEND_SERVERS.map(candidate => candidate.key).join(', ');
      throw new Error(`Unbekannter Backend-Server "${wantedName}". Bekannte Server: ${known}`);
    }
    return server;
  });
}

/** "studi-futter" -> "STUDI_FUTTER", used as suffix for server specific env variables. */
function getEnvSuffix(server: BackendServer): string {
  return StringHelper.replaceAllWithOptions({
    str: server.key.toUpperCase(),
    find: '[^A-Z0-9]',
    replace: '_',
  });
}

function readEnvValue(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

/**
 * Admin credentials for a backend. Server specific variables (e.g. ADMIN_EMAIL_SWOSY)
 * win over the generic ADMIN_EMAIL / ADMIN_PASSWORD, so instances with their own admin
 * account can be checked as well.
 */
export function getBackendServerCredentials(server: BackendServer): DirectusAdminCredentials {
  const suffix = getEnvSuffix(server);
  return {
    adminEmail: readEnvValue(`ADMIN_EMAIL_${suffix}`) ?? readEnvValue('ADMIN_EMAIL'),
    adminPassword: readEnvValue(`ADMIN_PASSWORD_${suffix}`) ?? readEnvValue('ADMIN_PASSWORD'),
  };
}
