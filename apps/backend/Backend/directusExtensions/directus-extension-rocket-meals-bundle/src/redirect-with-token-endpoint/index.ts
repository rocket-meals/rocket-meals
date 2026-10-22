import { defineEndpoint } from '@directus/extensions-sdk';
import ms from 'ms';
import { DatabaseInitializedCheck } from '../helpers/DatabaseInitializedCheck';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { NanoidHelper } from '../helpers/NanoidHelper';
import { AccountabilityHelper } from '../helpers/AccountabilityHelper';
import { RedirectWhitelistHelper } from '../helpers/RedirectWhitelistHelper';

const SCHEDULE_NAME = 'redirect_with_token';
const env = process.env;
const PUBLIC_URL = env.PUBLIC_URL; // e.g. http://rocket-meals.de/rocket-meals/api or empty string


/**
 * Validate a URL string and return a URL object or null.
 *
 * @param url Raw URL string
 * @returns Parsed URL or null when invalid
 */
function getValidUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch (e) {
    return null;
  }
}

/**
 * Check if the request referer is one of the allowed OAuth provider referers.
 *
 * @param referer The referer header value (already stringified)
 * @returns True if the referer is allowed
 */
function isValidReferer(referer: string): boolean {
  console.log('REFERER: ' + referer);
  const validReferers = ['https://accounts.google.com/', 'https://appleid.apple.com/'];

  if (validReferers.includes(referer)) {
    console.log('redirect comes from valid referer');
    return true;
  }
  return false;
}

/**
 * Determine whether the requested redirect target is allowed, based on the configured redirect whitelist.
 *
 * @param redirect        The raw redirect query parameter
 * @param myDatabaseHelper Helper used to load the redirect whitelist app setting
 * @returns True if the redirect is valid/allowed
 */
async function resolveRedirectUrlValidity(redirect: unknown, myDatabaseHelper: MyDatabaseHelper): Promise<boolean> {
  if (!redirect || typeof redirect !== 'string') {
    return false; // no redirect URL found
  }

  const redirectUrl = getValidUrl(redirect);
  if (!redirectUrl) {
    return false; // no valid redirect URL found
  }

  const redirect_whitelist = await myDatabaseHelper.getAppSettingsHelper().getRedirectWhitelist();
  if (!redirect_whitelist) {
    return true; // no whitelist configured means all redirects are allowed
  }
  if (redirect_whitelist.length === 0) {
    return true; // no whitelist means all redirects are allowed
  }

  return RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirect_whitelist, redirectUrl);
}

/**
 * Attempt to redirect using the directus_refresh_token cookie (cookie auth mode).
 *
 * @param req      The incoming request
 * @param res      The response used to perform the redirect
 * @param redirect The validated redirect target (without token)
 * @returns True if the request was handled (a response was already sent)
 */
function tryRedirectWithCookieRefreshToken(req: any, res: any, redirect: any): boolean {
  const directus_refresh_token = req.cookies.directus_refresh_token;

  if (directus_refresh_token) {
    // this means the auth provider is using "cookie" mode.
    //console.log("directus_refresh_token found");

    const redirectURL = redirect + directus_refresh_token;
    //console.log("Redirect with token endpoint: redirectURL: " + redirectURL)
    res.redirect(redirectURL);
    return true;
  }
  return false;
}

/**
 * Attempt to redirect using the directus_session_token cookie (session auth mode), creating a new
 * directus_sessions row and exchanging it for a refresh token.
 *
 * @param req      The incoming request
 * @param res      The response used to send errors or perform the redirect
 * @param redirect The validated redirect target (without token)
 * @param database The Directus database (knex) instance
 * @param env      The Directus environment configuration
 * @returns True if the request was handled (a response was already sent)
 */
async function tryRedirectWithSessionToken(req: any, res: any, redirect: any, database: any, env: any): Promise<boolean> {
  const directus_session_token = req.cookies.directus_session_token;
  if (!directus_session_token) {
    return false;
  }
  // this means the auth provider is using "session" mode.
  // we need to obtain the directus_refresh_token from the directus_session_token
  //console.log("Redirect with token endpoint: directus_session_token: " + directus_session_token)
  const accountability = AccountabilityHelper.getAccountabilityFromRequest(req);
  const userId = accountability?.user;
  //console.log("Redirect with token endpoint: userId: " + userId)
  if (!userId) {
    res.status(400).send('No user found');
    return true;
  }

  const knex = database;

  /**
   * Start of copy: https://github.com/directus/directus/blob/main/api/src/services/authentication.ts Login
   */
  const refreshToken = await NanoidHelper.getNanoid(64);
  const msRefreshTokenTTL: number = ms(String(env['REFRESH_TOKEN_TTL'])) || 0;
  const refreshTokenExpiration = new Date(Date.now() + msRefreshTokenTTL);

  await knex('directus_sessions').insert({
    token: refreshToken,
    user: userId,
    expires: refreshTokenExpiration,
    ip: accountability?.ip,
    user_agent: accountability?.userAgent,
    origin: accountability?.origin,
  });

  await knex('directus_sessions').delete().where('expires', '<', new Date());

  // End of copy

  const redirectURL = redirect + refreshToken;
  //console.log("Redirect with token endpoint: redirectURL: " + redirectURL)
  res.redirect(redirectURL);
  return true;
}

// TO Test this Endpoint:
// 1. Login with a user in the Directus Admin UI
// 2. Go to the URL: http://127.0.0.1/rocket-meals/api/redirect-with-token?redirect=http://localhost:8081/login?directus_refresh_token=
// Where http://127.0.0.1/rocket-meals/api is the URL of the Directus API
export default defineEndpoint({
  id: 'redirect-with-token', // this will be the URL at which this endpoint is accessible
  handler: (router, apiContext) => {
    router.get('/', async (req, res) => {
      let allTablesExist = await DatabaseInitializedCheck.checkAllTablesExistWithApiContext(SCHEDULE_NAME, apiContext);
      if (!allTablesExist) {
        return;
      }

      const referer = req.headers.referer + '';

      if (!isValidReferer(referer)) {
        res.status(400).send('Invalid referer URL (' + referer + '). Please contact the administrator: info@rocket-meals.de');
        return;
      }
      // REFERER: https://accounts.google.com/

      const { database, env } = apiContext;

      const myDatabaseHelper = new MyDatabaseHelper(apiContext);

      //console.log("#################################")
      //console.log("Redirect with token endpoint: settings")
      let redirect = req.query.redirect;

      const redirectUrlIsValid = await resolveRedirectUrlValidity(redirect, myDatabaseHelper);

      if (!redirectUrlIsValid) {
        res.status(400).send('Invalid redirect URL (' + redirect + '). Please contact the administrator: info@rocket-meals.de');
        return;
      }

      //console.log("Cookies")
      //console.log(JSON.stringify(req.cookies, null, 2))

      const handledByCookieRefreshToken = tryRedirectWithCookieRefreshToken(req, res, redirect);
      if (handledByCookieRefreshToken) {
        return;
      }

      const handledBySessionToken = await tryRedirectWithSessionToken(req, res, redirect, database, env);
      if (handledBySessionToken) {
        return;
      }

      // no token found
      res.status(400).send('No token found');
    });
  },
});
