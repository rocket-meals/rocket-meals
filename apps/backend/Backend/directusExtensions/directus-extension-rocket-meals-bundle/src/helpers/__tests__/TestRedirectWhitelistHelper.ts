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

  // Whoever controls an allowed redirect URL receives the login of the person who followed the link.
  // A prefix match on the host let "<allowed host>.attacker.example" pass.
  const isAllowed = (whitelist: string[], redirectUrl: string) => RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(whitelist, new URL(redirectUrl));

  it('Host that only starts with an allowed host is not allowed', async () => {
    expect(isAllowed(['https://rocket-meals.github.io'], 'https://rocket-meals.github.io.attacker.example/x')).toBe(false);
    expect(isAllowed(['https://rocket-meals.github.io/*'], 'https://rocket-meals.github.io.attacker.example/x')).toBe(false);
    expect(isAllowed(['https://myapp.com/*'], 'https://myapp.community/login')).toBe(false);
    expect(isAllowed(['localhost'], 'http://localhost.attacker.example/x')).toBe(false);
    expect(isAllowed(['127.0.0.1'], 'http://127.0.0.1.attacker.example/x')).toBe(false);
  });

  it('Allowed host stays allowed with every path', async () => {
    expect(isAllowed(['https://rocket-meals.github.io'], 'https://rocket-meals.github.io/rocket-meals/login')).toBe(true);
    expect(isAllowed(['https://rocket-meals.github.io/*'], 'https://rocket-meals.github.io/rocket-meals/login')).toBe(true);
  });

  it('Host is compared case-insensitively', async () => {
    expect(isAllowed(['https://Rocket-Meals.github.io'], 'https://rocket-meals.GITHUB.io/login')).toBe(true);
  });

  it('Disguising the host with user info is not allowed', async () => {
    expect(isAllowed(['https://myapp.com'], 'https://myapp.com@attacker.example/x')).toBe(false);
    expect(isAllowed(['https://myapp.com'], 'https://user:pw@myapp.com/x')).toBe(false);
  });

  it('Entry without port allows every port, entry with port only that one', async () => {
    expect(isAllowed(['localhost'], 'http://localhost:8081/login')).toBe(true);
    expect(isAllowed(['http://localhost:8081/*'], 'http://localhost:8081/login')).toBe(true);
    expect(isAllowed(['http://localhost:8081/*'], 'http://localhost:8082/login')).toBe(false);
    expect(isAllowed(['http://localhost:8081'], 'http://localhost:9000/login')).toBe(false);
  });

  it('Protocol has to be equal', async () => {
    expect(isAllowed(['https://myapp.com'], 'http://myapp.com/login')).toBe(false);
    expect(isAllowed(['myapp://*'], 'myapp.attacker://login')).toBe(false);
    expect(isAllowed(['exp://'], 'exploit://login')).toBe(false);
  });

  it('Path has to be equal or below the allowed path', async () => {
    expect(isAllowed(['https://myapp.com/app'], 'https://myapp.com/app')).toBe(true);
    expect(isAllowed(['https://myapp.com/app'], 'https://myapp.com/app/login')).toBe(true);
    expect(isAllowed(['https://myapp.com/app'], 'https://myapp.com/application')).toBe(false);
    expect(isAllowed(['https://myapp.com/app/*'], 'https://myapp.com/app/../other')).toBe(false);
  });

  it('Subdomain wildcard allows the domain and its subdomains only', async () => {
    expect(isAllowed(['https://*.myapp.com'], 'https://web.myapp.com/login')).toBe(true);
    expect(isAllowed(['https://*.myapp.com'], 'https://myapp.com/login')).toBe(true);
    expect(isAllowed(['https://*.myapp.com'], 'https://attackermyapp.com/login')).toBe(false);
    expect(isAllowed(['https://*.myapp.com'], 'https://myapp.com.attacker.example/login')).toBe(false);
    expect(isAllowed(['https://myapp.*'], 'https://myapp.attacker.example/login')).toBe(false);
  });

  it('App schemes with and without wildcard allow every route of the app', async () => {
    expect(isAllowed(['exp://'], 'exp://192.168.0.2:8081/--/login')).toBe(true);
    expect(isAllowed(['exp://*'], 'exp://192.168.0.2:8081/--/login')).toBe(true);
    expect(isAllowed(['app-rocket-meals://*'], 'app-rocket-meals:///login')).toBe(true);
    expect(isAllowed(['app-rocket-meals://'], 'app-rocket-meals://login')).toBe(true);
  });

  it('Script and data URLs are never allowed', async () => {
    expect(isAllowed(['*'], 'javascript:alert(1)')).toBe(false);
    expect(isAllowed(['*'], 'data:text/html,hello')).toBe(false);
    expect(isAllowed(['*'], 'https://myapp.com/login')).toBe(true);
  });

  it('Invalid whitelist entries allow nothing', async () => {
    expect(isAllowed(['', 'https://'], 'https://myapp.com/login')).toBe(false);
  });

  it('Base url allows only itself and what lies below', async () => {
    const base = 'https://test.rocket-meals.de/rocket-meals/api';
    const isBelow = (baseUrl: string | undefined, redirectUrl: string) => RedirectWhitelistHelper.isRedirectUrlBelowBaseUrl(baseUrl, new URL(redirectUrl));
    expect(isBelow(base, 'https://test.rocket-meals.de/rocket-meals/api/admin')).toBe(true);
    expect(isBelow(base, 'https://test.rocket-meals.de/rocket-meals/apix')).toBe(false);
    expect(isBelow(base, 'https://test.rocket-meals.de.attacker.example/rocket-meals/api')).toBe(false);
    expect(isBelow('https://test.rocket-meals.de', 'https://test.rocket-meals.de.attacker.example/x')).toBe(false);
    expect(isBelow('', 'https://attacker.example/x')).toBe(false);
    expect(isBelow(undefined, 'https://attacker.example/x')).toBe(false);
  });
});
