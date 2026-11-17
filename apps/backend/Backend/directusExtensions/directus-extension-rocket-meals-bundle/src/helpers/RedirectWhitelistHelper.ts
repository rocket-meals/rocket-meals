const WILDCARD = '*';

/**
 * Protocols a redirect must never use, whatever the whitelist says: a browser that follows them
 * would run or show content in the origin of the server.
 */
const FORBIDDEN_PROTOCOLS = new Set(['javascript:', 'data:', 'vbscript:', 'file:', 'blob:', 'about:']);

/**
 * Decides whether the server may send a login result (authorization code, refresh token) to a
 * redirect URL. Whoever controls an allowed URL can log in as the person who followed the link, so
 * every part of the URL is compared on its own and never as a plain string prefix:
 *
 * - **Protocol**: has to be equal.
 * - **Host**: has to be equal. `*.example.com` allows `example.com` and its subdomains, `*` or no
 *   host (`myapp://`, `myapp://*`) allows every host. A plain prefix is not enough:
 *   `https://example.com` does not allow `https://example.com.attacker.net`.
 * - **Port**: has to be equal when the entry names one, otherwise every port of that host is fine
 *   (`localhost` allows `localhost:8081`).
 * - **Path**: an entry without path allows every path. Otherwise the path has to be equal or lie
 *   below it (`/app` allows `/app/login`, not `/application`). With a wildcard the part in front
 *   of it has to match (`/login/*`).
 * - **Query**: has to start with the query of the entry, up to its wildcard.
 *
 * An entry without protocol (`localhost`, `127.0.0.1`) stands for http and https.
 */
export class RedirectWhitelistHelper {
  static isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirect_whitelist_entries: string[], redirect_url: URL) {
    for (const redirect_whitelist_entry of redirect_whitelist_entries) {
      // iterate over the whitelist as long as we haven't found a valid redirect
      try {
        if (RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntry(redirect_whitelist_entry, redirect_url)) {
          return true;
        }
      } catch (e) {
        // An entry that is no valid URL allows nothing.
        console.log('RedirectWhitelistHelper: cannot read whitelist entry: ' + redirect_whitelist_entry);
        console.log(e);
      }
    }
    return false;
  }

  /**
   * Whether the redirect URL points to `baseUrl` itself or to something below it, e.g. a page of
   * this server for `PUBLIC_URL`. An empty or invalid base allows nothing.
   */
  static isRedirectUrlBelowBaseUrl(baseUrl: string | undefined | null, redirectUrl: URL): boolean {
    const base = typeof baseUrl === 'string' ? baseUrl.trim() : '';
    if (!base?.includes('://') || base.includes(WILDCARD)) {
      return false;
    }
    const baseAsUrl = RedirectWhitelistHelper.getUrlFromString(base);
    if (!baseAsUrl?.hostname) {
      return false;
    }
    return RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards([base], redirectUrl);
  }

  // function to check if a url is allowed/matches a whitelist entry
  private static isRedirectUrlAllowedForWhitelistEntry(redirect_whitelist_entry: string | undefined, redirectUrl: URL): boolean {
    const entry = typeof redirect_whitelist_entry === 'string' ? redirect_whitelist_entry.trim() : '';
    if (!entry) {
      return false;
    }
    if (FORBIDDEN_PROTOCOLS.has(redirectUrl.protocol.toLowerCase())) {
      return false;
    }
    // "user:password@host" has no place in a redirect and only serves to disguise the real host.
    if (redirectUrl.username || redirectUrl.password) {
      return false;
    }
    if (entry === WILDCARD) {
      return true;
    }

    // An entry without protocol like "localhost" or "127.0.0.1" stands for http and https.
    // No request is made here: the string is only a pattern to compare the redirect URL against.
    if (!entry.includes('://')) {
      const entryHttp = 'http://' + entry; // NOSONAR S5332 - only a whitelist pattern for matching, no connection
      const entryHttps = 'https://' + entry;
      return RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntry(entryHttp, redirectUrl) || RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntry(entryHttps, redirectUrl);
    }

    const entryUrl = new URL(entry);

    return (
      entryUrl.protocol.toLowerCase() === redirectUrl.protocol.toLowerCase() &&
      RedirectWhitelistHelper.hostMatches(entryUrl, redirectUrl) &&
      RedirectWhitelistHelper.pathMatches(entryUrl.pathname, redirectUrl.pathname) &&
      RedirectWhitelistHelper.searchMatches(entryUrl.search, redirectUrl.search)
    );
  }

  private static hostMatches(entryUrl: URL, redirectUrl: URL): boolean {
    const entryHostname = entryUrl.hostname.toLowerCase();
    const redirectHostname = redirectUrl.hostname.toLowerCase();

    if (entryUrl.port && entryUrl.port !== redirectUrl.port) {
      return false;
    }
    // "myapp://" and "myapp://*": the scheme belongs to the app, whatever follows is a route.
    if (entryHostname === '' || entryHostname === WILDCARD) {
      return true;
    }
    if (entryHostname.startsWith(WILDCARD + '.')) {
      const domain = entryHostname.slice(2);
      if (!domain || domain.includes(WILDCARD)) {
        return false;
      }
      return redirectHostname === domain || redirectHostname.endsWith('.' + domain);
    }
    // A wildcard anywhere else in the host ("example.*", "exa*mple.com") is not supported.
    if (entryHostname.includes(WILDCARD)) {
      return false;
    }
    return redirectHostname === entryHostname;
  }

  private static pathMatches(entryPathname: string, redirectPathname: string): boolean {
    const wildcardIndex = entryPathname.indexOf(WILDCARD);
    if (wildcardIndex >= 0) {
      const prefix = entryPathname.slice(0, wildcardIndex);
      const prefixWithoutSlash = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
      return redirectPathname.startsWith(prefix) || redirectPathname === prefixWithoutSlash;
    }

    const entryPath = entryPathname.endsWith('/') ? entryPathname.slice(0, -1) : entryPathname;
    if (entryPath === '') {
      return true; // no path in the entry: the whole host is allowed
    }
    return redirectPathname === entryPath || redirectPathname.startsWith(entryPath + '/');
  }

  private static searchMatches(entrySearch: string, redirectSearch: string): boolean {
    const wildcardIndex = entrySearch.indexOf(WILDCARD);
    const prefix = wildcardIndex >= 0 ? entrySearch.slice(0, wildcardIndex) : entrySearch;
    return redirectSearch.startsWith(prefix);
  }

  static getUrlFromString(url: string): URL | null {
    try {
      return new URL(url);
    } catch (e) {
      return null;
    }
  }
}
