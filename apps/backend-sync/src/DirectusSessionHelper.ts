import { CookieJar } from 'cookiejar';
import { FetchIgnoreSelfSignedCertHelper } from './FetchIgnoreSelfSignedCertHelper';
import { DirectusConnectionOptions } from './DirectusConnectionOptions';

/**
 * Logs into a Directus instance and provides the session cookie as headers.
 * Shared by every helper that talks to the Directus REST API (sync + drift check).
 */
export class DirectusSessionHelper {
  public static async login(config: DirectusConnectionOptions): Promise<Headers> {
    const cookieJar = new CookieJar();
    const headers = new Headers();
    const origin = new URL(config.directusInstanceUrl).origin;

    const response = await FetchIgnoreSelfSignedCertHelper.fetch(`${config.directusInstanceUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: config.adminEmail,
        password: config.adminPassword,
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
}
