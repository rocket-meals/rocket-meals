// small jest test
import { describe, expect, it } from '@jest/globals';
import { RedirectWhitelistHelper } from '../RedirectWhitelistHelper';

describe('RedirectWhitelistHelper Test', () => {
  it('Redirect url in simple list', async () => {
    const redirectUrl = 'https://www.google.com';
    const redirectWhitelist = ['https://www.google.com'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(true);
  });

  it('Redirect url not in simple list', async () => {
    const redirectUrl = 'https://www.google.com';
    const redirectWhitelist = ['https://www.google.de'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(false);
  });

  it('Redirect to localhost', async () => {
    const redirectUrl = 'http://localhost';
    const redirectWhitelist = ['http://localhost'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(true);
  });

  it('Redirect to localhost and whitelist has no protocol', async () => {
    const redirectUrl = 'http://localhost';
    const redirectWhitelist = ['localhost'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(true);
  });

  it('Redirect to path', async () => {
    const redirectUrl = 'http://localhost/login?directus_refresh_token=1234';
    const redirectWhitelist = ['http://localhost/login?directus_refresh_token=1234'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(true);
  });

  it('Redirect to path with wildcard', async () => {
    const redirectUrl = 'http://localhost/login?directus_refresh_token=1234';
    const redirectWhitelist = ['http://localhost/login?directus_refresh_token=*'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(true);
  });

  it('Redirect to path with wildcard not allowed', async () => {
    const redirectUrl = 'http://localhost/login/?token=directus_refresh_token=1234';
    const redirectWhitelist = ['http://localhost/logout/*'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(false);
  });

  it('Redirect to path with completly wildcard', async () => {
    const redirectUrl = 'http://localhost/login?directus_refresh_token=1234';
    const redirectWhitelist = ['http://localhost/*'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(true);
  });

  it('Redirect to app schema', async () => {
    const redirectUrl = 'myapp://login?directus_refresh_token=1234';
    const redirectWhitelist = ['myapp://*'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(true);
  });

  it('Redirect to app schema not allowed', async () => {
    const redirectUrl = 'myapp://login?directus_refresh_token=1234';
    const redirectWhitelist = ['notmyapp://*'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(false);
  });

  it('Path wildcard allows a path under the same host', async () => {
    const redirectUrl = 'https://myapp.com/angreifer.de';
    const redirectWhitelist = ['https://myapp.com/*'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(true);
  });

  it('Path wildcard does not allow a look-alike host (suffix attack)', async () => {
    const redirectUrl = 'https://myapp.com.angreifer.de/login';
    const redirectWhitelist = ['https://myapp.com/*'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(false);
  });

  it('Exact host entry does not allow a subdomain-suffix host', async () => {
    const redirectUrl = 'https://www.google.com.angreifer.de';
    const redirectWhitelist = ['https://www.google.com'];
    const result = RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(redirectWhitelist, new URL(redirectUrl));
    expect(result).toBe(false);
  });
});
