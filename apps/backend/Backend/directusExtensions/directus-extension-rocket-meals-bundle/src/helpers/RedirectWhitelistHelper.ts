import { StringHelper } from 'repo-depkit-common';

const WILDCARD = '\\*'; // we need to escape the * as it is a special character in regex
const WILDCARD_REPLACEMENT = 'WILDCARD_REPLACEMENT';

export class RedirectWhitelistHelper {
  static isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirect_whitelist_entries: string[], redirect_url: URL) {
    for (let i = 0; i < redirect_whitelist_entries.length; i++) {
      // iterate over the whitelist as long as we haven't found a valid redirect
      let redirect_whitelist_entry = redirect_whitelist_entries[i];
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
      let redirect_whitelist_entry_http = 'http://' + redirect_whitelist_entry;
      let redirect_whitelist_entry_https = 'https://' + redirect_whitelist_entry;
      // then we recursively call this function with the new URLs
      let redirect_allowed_http = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntry(redirect_whitelist_entry_http, redirectUrl);
      let redirect_allowed_https = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntry(redirect_whitelist_entry_https, redirectUrl);
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
        const protocolMatches = RedirectWhitelistHelper.startsWithUntilWildcardReplacement(redirectUrlProtocol, replacedRedirect_whitelist_entry_URLProtocol);
        if (!protocolMatches) {
          return false;
        }

        // check if the host matches
        const hostMatches = RedirectWhitelistHelper.startsWithUntilWildcardReplacement(redirectUrlHost, replacedRedirect_whitelist_entry_URLHost);
        if (!hostMatches) {
          return false;
        }

        // check if the pathname matches
        const pathnameMatches = RedirectWhitelistHelper.startsWithUntilWildcardReplacement(redirectUrlPathname, replacedRedirect_whitelist_entry_URLPathname);
        if (!pathnameMatches) {
          return false;
        }

        // check if the search matches
        const searchMatches = RedirectWhitelistHelper.startsWithUntilWildcardReplacement(redirectUrlSearch, replacedRedirect_whitelist_entry_URLSearch);
        if (!searchMatches) {
          return false;
        }

        // if all checks passed, then the redirect URL is allowed
        return true;
      }
    }
  }

  private static startsWithUntilWildcardReplacement(inputStr: string, whitelistStrWithWildcardReplacement: string): boolean {
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

  static getUrlFromString(url: string): URL | null {
    try {
      return new URL(url);
    } catch (e) {
      return null;
    }
  }
}
