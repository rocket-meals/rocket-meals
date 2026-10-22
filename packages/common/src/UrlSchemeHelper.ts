/**
 * Guards against dangerous URL schemes before a link is opened.
 *
 * `Linking.openURL` / `window.open` will happily navigate to `javascript:` and
 * `data:` URLs on web, so a link coming from user- or server-supplied content
 * (chat messages, wikis, news feeds, markdown fields) could run script on the
 * app origin. We therefore refuse those schemes before opening a link.
 *
 * The check is a deny list of known-dangerous schemes. Browsers ignore leading
 * whitespace and embedded control characters when they parse a scheme
 * (`java\tscript:` or ` javascript:` still run), so those are stripped before
 * the comparison. Everything the app actually opens (http(s), mailto, tel,
 * geo/maps, the app deep-link scheme) stays allowed.
 */

import { StringHelper } from './StringHelper';

const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];

export class UrlSchemeHelper {
  /**
   * Whether the url uses a scheme that must never be opened from content.
   *
   * @param url The raw href to check.
   * @returns True when the url is unsafe to open.
   */
  static isDangerousUrl(url: string | null | undefined): boolean {
    if (!url) {
      return false;
    }
    // Remove all whitespace and control characters (anywhere), so neither
    // leading spaces nor an embedded tab/newline inside the scheme can hide a
    // dangerous scheme from the comparison.
    const normalized = StringHelper.replaceAllWithOptions({ str: url, find: '[\\u0000-\\u0020]+', replace: '', flags: 'g' }).toLowerCase();
    return DANGEROUS_SCHEMES.some((scheme) => normalized.startsWith(scheme));
  }
}
