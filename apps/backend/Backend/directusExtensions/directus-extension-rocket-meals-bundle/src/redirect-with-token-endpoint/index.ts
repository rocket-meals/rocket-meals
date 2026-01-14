import { defineEndpoint } from '@directus/extensions-sdk';
import ms from 'ms';
import { DatabaseInitializedCheck } from '../helpers/DatabaseInitializedCheck';
import { StringHelper } from 'repo-depkit-common';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { NanoidHelper } from '../helpers/NanoidHelper';
import { AccountabilityHelper } from '../helpers/AccountabilityHelper';

const SCHEDULE_NAME = 'redirect_with_token';
const env = process.env;
const PUBLIC_URL = env.PUBLIC_URL; // e.g. http://rocket-meals.de/rocket-meals/api or empty string

const WILDCARD = '\\*'; // we need to escape the * as it is a special character in regex
const WILDCARD_REPLACEMENT = 'WILDCARD_REPLACEMENT';

/**
 * Check if a string starts with the portion of a whitelist entry before the wildcard.
 *
 * @param inputStr                       String to test
 * @param whitelistStrWithWildcardReplacement  Whitelist entry with wildcards replaced
 * @returns True if the input starts with the expected part of the whitelist entry
 */
function startsWithUntilWildcardReplacement(inputStr: string, whitelistStrWithWildcardReplacement: string): boolean {
  // redirectUrl could be "/rocket-meals/login/.../"
  // redirect_whitelist_entry_with_possible_wildcard_replacement could be "/rocket-meals/WILDCARD_REPLACEMENT/.../"
  // we need to check if the redirectUrl starts with the redirect_whitelist_entry_with_possible_wildcard_replacement
  let split = whitelistStrWithWildcardReplacement.split(WILDCARD_REPLACEMENT);
  let first_part: string = split.length > 1 ? (split[0] as string) : whitelistStrWithWildcardReplacement;
  // so /rocket-meals/ is the first part and the rest is the second part
  // remove the last char if it is a slash
  if (first_part.endsWith('/')) {
    first_part = first_part.slice(0, -1);
  }
  // check if the redirectUrl starts with the first part
  return inputStr.startsWith(first_part);
}

/**
 * Check if a redirect URL matches a given whitelist entry.
 *
 * @param redirect_whitelist_entry Whitelist pattern that may contain wildcards
 * @param redirectUrl              Parsed redirect URL
 * @returns True when the URL is permitted
 */
function isRedirectUrlAllowedForWhitelistEntry(redirect_whitelist_entry: string | undefined, redirectUrl: URL): boolean {
  if (!redirect_whitelist_entry) {
    return false;
  }
  //console.log("isRedirectUrlAllowedForWhitelistEntry")
  //console.log("redirect_whitelist_entry: " + redirect_whitelist_entry)
  //console.log("redirectUrl: " + redirectUrl)
  // redirect_whitelist_entry is * then return true
  if (redirect_whitelist_entry === '*') {
    return true;
  }
  // redirectUrl could be
  // 127.0.0.1
  // 127.0.0.1/login?directus_refresh_token=1234
  // localhost
  // localhost:8081
  // localhost:8081/login?directus_refresh_token=1234
  // myapp://login?directus_refresh_token=1234
  // http://localhost:8081/login?directus_refresh_token=1234
  // https://myapp.com/login?directus_refresh_token=1234
  // myapp://*
  // http://localhost:8081/*
  // https://myapp.com/*

  // check if the redirectUrl matches the whitelist entry
  const redirectUrlProtocol = redirectUrl.protocol;
  const redirectUrlHost = redirectUrl.host;
  const redirectUrlPathname = redirectUrl.pathname;
  const redirectUrlSearch = redirectUrl.search;

  // as the redirect_whitelist_entry is a string, we need to check if it is a valid URL otherwise like "localhost" or "127.0.0.1" we need first to convert it to a valid URL
  // if no protocol is given, we assume http and https
  const hasProtocol = redirect_whitelist_entry.includes('://');
  if (!hasProtocol) {
    //console.log("No protocol found in redirect_whitelist_entry: " + redirect_whitelist_entry)
    // if no protocol is given, we assume http and https
    let redirect_whitelist_entry_http = 'http://' + redirect_whitelist_entry;
    let redirect_whitelist_entry_https = 'https://' + redirect_whitelist_entry;
    // then we recursively call this function with the new URLs
    let redirect_allowed_http = isRedirectUrlAllowedForWhitelistEntry(redirect_whitelist_entry_http, redirectUrl);
    let redirect_allowed_https = isRedirectUrlAllowedForWhitelistEntry(redirect_whitelist_entry_https, redirectUrl);
    return redirect_allowed_http || redirect_allowed_https;
  } else {
    // okay we have a protocol which could be http, https, myapp, or a wildcard like *
    // we need to check if the protocol matches
    // if the redirectURL contains our WILDCARD_REPLACEMENT, then we reject it
    if (redirectUrlProtocol.includes(WILDCARD_REPLACEMENT)) {
      //console.log("redirectUrlProtocol contains WILDCARD_REPLACEMENT, this is not allowed")
      return false;
    } else {
      //console.log("redirectUrl seems to be valid")
      // replace all * with WILDCARD_REPLACEMENT
      //console.log("Replace whitelist entry all wildcards with WILDCARD_REPLACEMENT")
      let replacedRedirect_whitelist_entry = StringHelper.replaceAllWithOptions({
        str: redirect_whitelist_entry,
        find: WILDCARD,
        replace: WILDCARD_REPLACEMENT,
      });
      // create a new URL from the replaced string
      //console.log("replacedRedirect_whitelist_entry: " + replacedRedirect_whitelist_entry)
      let replacedRedirect_whitelist_entry_URL = new URL(replacedRedirect_whitelist_entry);
      //console.log("replacedRedirect_whitelist_entry_URL: " + replacedRedirect_whitelist_entry_URL)

      const replacedRedirect_whitelist_entry_URLProtocol = replacedRedirect_whitelist_entry_URL.protocol;
      const replacedRedirect_whitelist_entry_URLHost = replacedRedirect_whitelist_entry_URL.host;
      const replacedRedirect_whitelist_entry_URLPathname = replacedRedirect_whitelist_entry_URL.pathname;
      const replacedRedirect_whitelist_entry_URLSearch = replacedRedirect_whitelist_entry_URL.search;

      // check if the protocol matches
      const protocolMatches = startsWithUntilWildcardReplacement(redirectUrlProtocol, replacedRedirect_whitelist_entry_URLProtocol);
      if (!protocolMatches) {
        return false;
      }

      // check if the host matches
      const hostMatches = startsWithUntilWildcardReplacement(redirectUrlHost, replacedRedirect_whitelist_entry_URLHost);
      if (!hostMatches) {
        return false;
      }

      // check if the pathname matches
      const pathnameMatches = startsWithUntilWildcardReplacement(redirectUrlPathname, replacedRedirect_whitelist_entry_URLPathname);
      if (!pathnameMatches) {
        return false;
      }

      // check if the search matches
      const searchMatches = startsWithUntilWildcardReplacement(redirectUrlSearch, replacedRedirect_whitelist_entry_URLSearch);
      if (!searchMatches) {
        return false;
      }

      // if all checks passed, then the redirect URL is allowed
      return true;
    }
  }
}

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
      console.log('REFERER: ' + referer);
      const validReferers = ['https://accounts.google.com/', 'https://appleid.apple.com/'];

      if (validReferers.includes(referer)) {
        console.log('redirect comes from valid referer');
      } else {
        res.status(400).send('Invalid referer URL (' + referer + '). Please contact the administrator: info@rocket-meals.de');
        return;
      }
      // REFERER: https://accounts.google.com/

      const { services, database, getSchema, env, logger } = apiContext;

      const myDatabaseHelper = new MyDatabaseHelper(apiContext);

      //console.log("#################################")
      //console.log("Redirect with token endpoint: settings")
      let redirectUrlIsValid = true;

      let redirect = req.query.redirect;

      if (!!redirect && typeof redirect === 'string') {
        let redirectUrl = getValidUrl(redirect);

        if (!!redirectUrl) {
          const redirect_whitelist = await myDatabaseHelper.getAppSettingsHelper().getRedirectWhitelist();
          if (!!redirect_whitelist) {
            let foundValidRedirect = false;
            if (redirect_whitelist.length === 0) {
              foundValidRedirect = true; // no whitelist means all redirects are allowed
            }

            for (let i = 0; i < redirect_whitelist.length && !foundValidRedirect; i++) {
              // iterate over the whitelist as long as we haven't found a valid redirect
              let redirect_whitelist_entry = redirect_whitelist[i];
              try {
                if (isRedirectUrlAllowedForWhitelistEntry(redirect_whitelist_entry, redirectUrl)) {
                  foundValidRedirect = true;
                  break;
                }
              } catch (e) {
                console.log('Error in redirect with token endpoint');
                console.log('redirectUrl: ' + redirectUrl);
                console.log('redirect_whitelist_entry: ' + redirect_whitelist_entry);
                console.log(e);
              }
            }

            redirectUrlIsValid = foundValidRedirect;
          }
        } else {
          redirectUrlIsValid = false; // no valid redirect URL found
        }
      } else {
        redirectUrlIsValid = false; // no redirect URL found
      }

      if (!redirectUrlIsValid) {
        res.status(400).send('Invalid redirect URL (' + redirect + '). Please contact the administrator: info@rocket-meals.de');
        return;
      }

      //console.log("Cookies")
      //console.log(JSON.stringify(req.cookies, null, 2))

      const directus_refresh_token = req.cookies.directus_refresh_token;

      if (!!directus_refresh_token) {
        // this means the auth provider is using "cookie" mode.
        //console.log("directus_refresh_token found");

        const redirectURL = redirect + directus_refresh_token;
        //console.log("Redirect with token endpoint: redirectURL: " + redirectURL)
        res.redirect(redirectURL);
        return;
      }

      const directus_session_token = req.cookies.directus_session_token;
      if (!!directus_session_token) {
        // this means the auth provider is using "session" mode.
        // we need to obtain the directus_refresh_token from the directus_session_token
        //console.log("Redirect with token endpoint: directus_session_token: " + directus_session_token)
        const accountability = AccountabilityHelper.getAccountabilityFromRequest(req);
        const userId = accountability?.user;
        //console.log("Redirect with token endpoint: userId: " + userId)
        if (!userId) {
          res.status(400).send('No user found');
          return;
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
        return;
      }

      // no token found
      res.status(400).send('No token found');
    });
  },
});
