import { StringHelper } from 'repo-depkit-common';

const WILDCARD = String.raw`\*`; // we need to escape the * as it is a special character in regex
const WILDCARD_REPLACEMENT = 'WILDCARD_REPLACEMENT';

export class RedirectWhitelistHelper {
  static isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirect_whitelist_entries: string[], redirect_url: URL) {
    for (const redirect_whitelist_entry of redirect_whitelist_entries) {
      // iterate over the whitelist as long as we haven't found a valid redirect
      try {
        if (RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntry(redirect_whitelist_entry, redirect_url)) {
          return true;
        }
      } catch (e) {
        console.log('Error in redirect with token endpoint');
        console.log('redirectUrl: ' + redirect_url);
        console.log('redirect_whitelist_entry: ' + redirect_whitelist_entry);
        console.log(e);
      }
    }
    return false;
  }

  // function to check if a url is allowed/matches a whitelist entry
  private static isRedirectUrlAllowedForWhitelistEntry(redirect_whitelist_entry: string | undefined, redirectUrl: URL): boolean {
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
      // No request is made here: the string is only a pattern to compare the redirect URL against. A whitelist entry without protocol (e.g. "localhost:8081" for local app development) must keep matching http URLs, as before.
      let redirect_whitelist_entry_http = 'http://' + redirect_whitelist_entry; // NOSONAR S5332 - only a whitelist pattern for matching, no connection, see comment above
      let redirect_whitelist_entry_https = 'https://' + redirect_whitelist_entry;
      // then we recursively call this function with the new URLs
      let redirect_allowed_http = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntry(redirect_whitelist_entry_http, redirectUrl);
      let redirect_allowed_https = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntry(redirect_whitelist_entry_https, redirectUrl);
      return redirect_allowed_http || redirect_allowed_https;
    } else if (redirectUrlProtocol.includes(WILDCARD_REPLACEMENT)) {
      // okay we have a protocol which could be http, https, myapp, or a wildcard like *
      // we need to check if the protocol matches
      // if the redirectURL contains our WILDCARD_REPLACEMENT, then we reject it
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

      // Protocol and host must match exactly (unless the whitelist entry uses a
      // wildcard in that very component). A bare prefix match on the host would
      // let `https://myapp.com/*` also accept `https://myapp.com.attacker.de`,
      // because that host still starts with `myapp.com`.
      const protocolMatches = RedirectWhitelistHelper.componentMatches(redirectUrlProtocol, replacedRedirect_whitelist_entry_URLProtocol, false);
      if (!protocolMatches) {
        return false;
      }

      const hostMatches = RedirectWhitelistHelper.componentMatches(redirectUrlHost, replacedRedirect_whitelist_entry_URLHost, false);
      if (!hostMatches) {
        return false;
      }

      // Path and query keep the looser behaviour: an empty whitelist component
      // (e.g. `myapp://*`, which puts the wildcard in the host and leaves path
      // and query empty) means "no constraint" and matches anything. A
      // non-empty component without a wildcard must match exactly.
      const pathnameMatches = RedirectWhitelistHelper.componentMatches(redirectUrlPathname, replacedRedirect_whitelist_entry_URLPathname, true);
      if (!pathnameMatches) {
        return false;
      }

      const searchMatches = RedirectWhitelistHelper.componentMatches(redirectUrlSearch, replacedRedirect_whitelist_entry_URLSearch, true);
      if (!searchMatches) {
        return false;
      }

      // if all checks passed, then the redirect URL is allowed
      return true;
    }
  }

  /**
   * Match a single URL component (protocol, host, path or query) of the redirect
   * URL against the same component of a whitelist entry.
   *
   * - A component that contains a wildcard matches when the input starts with
   *   the part before the wildcard and ends with the part after it.
   * - A component without a wildcard must match exactly, so a prefix like
   *   `myapp.com` can never accept `myapp.com.attacker.de`.
   * - `emptyMatchesAny` keeps the previous "no constraint" behaviour for the
   *   path and query (an empty whitelist component then matches anything),
   *   which is needed for host-only wildcards such as `myapp://*`.
   *
   * @param inputStr The redirect URL's component.
   * @param whitelistStrWithWildcardReplacement The whitelist entry's component, wildcards already replaced.
   * @param emptyMatchesAny Whether an empty whitelist component matches any input.
   * @returns True when the component matches.
   */
  private static componentMatches(inputStr: string, whitelistStrWithWildcardReplacement: string, emptyMatchesAny: boolean): boolean {
    const wildcardIndex = whitelistStrWithWildcardReplacement.indexOf(WILDCARD_REPLACEMENT);
    if (wildcardIndex !== -1) {
      const before = whitelistStrWithWildcardReplacement.slice(0, wildcardIndex);
      const after = whitelistStrWithWildcardReplacement.slice(wildcardIndex + WILDCARD_REPLACEMENT.length);
      return inputStr.length >= before.length + after.length && inputStr.startsWith(before) && inputStr.endsWith(after);
    }

    if (whitelistStrWithWildcardReplacement === '' && emptyMatchesAny) {
      return true;
    }

    return inputStr === whitelistStrWithWildcardReplacement;
  }

  static getUrlFromString(url: string): URL | null {
    try {
      return new URL(url);
    } catch (e) {
      return null;
    }
  }
}
