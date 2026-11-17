import { defineEndpoint } from '@directus/extensions-sdk';
import ms from 'ms';
import crypto from 'node:crypto';
import { Knex } from 'knex';
import { RedirectWhitelistHelper } from '../helpers/RedirectWhitelistHelper';
import { ApiContext } from '../helpers/ApiContext'; // Use Node.js crypto module for secure comparisons
import { EnvVariableHelper } from '../helpers/EnvVariableHelper';
import { NanoidHelper } from '../helpers/NanoidHelper';
import { KeyValueStore, SharedStore } from '../helpers/RedisHelper';

const env = process.env;
const PUBLIC_URL = env.PUBLIC_URL || ''; // e.g. http://rocket-meals.de/rocket-meals/api or empty string

function getUrlToProviderLogin(providerName: string, redirectURL: string) {
  return `${PUBLIC_URL}/auth/login/${providerName}?redirect=${redirectURL}`;
}

// https://www.rfc-editor.org/rfc/rfc7636

function mylog(...message: any) {
  //console.log(EndpointTopName+": "+JSON.stringify(message, null, 2));
}

type AuthorizationCodeAndRedirectType = {
  authorization_code: string;
  redirect_url: string;
};

class MyKvStorage {
  static readonly prefix_code_challenge = 'pkce_code_challenge_';
  static readonly prefix_save_session = 'pkce_save_session_';

  private readonly kvImplementation: KeyValueStore;
  private readonly ttlMs: number;

  constructor(store: KeyValueStore, maxTtl?: number) {
    const defaultDuration = 300; // max Time To Live (TTL) to 300s = 5min
    const duration = maxTtl || defaultDuration;

    this.kvImplementation = store;
    this.ttlMs = duration * 1000;
  }

  async setCodeChallenge(authorization_code: string, code_challenge: CodeChallengeRedisEntryType) {
    mylog('associateCodeChallengeWithCode: state: ' + authorization_code);
    mylog(JSON.stringify(code_challenge, null, 2));
    mylog('-----');
    await this.kvImplementation.set({ key: MyKvStorage.prefix_code_challenge + authorization_code, value: JSON.stringify(code_challenge), ttlMs: this.ttlMs });
  }

  async getCodeChallenge(authorization_code: string) {
    let savedKey = await this.kvImplementation.get(MyKvStorage.prefix_code_challenge + authorization_code);
    mylog('getAssociatedCodeChallengeFromCode: authorization_code: ' + authorization_code);
    mylog(savedKey);
    if (savedKey) {
      let obj = JSON.parse(savedKey) as CodeChallengeRedisEntryType;
      mylog(JSON.stringify(obj, null, 2));
      return obj;
    }
    return null;
  }

  async setStateInformation(state: string, authCodeAndRedirect: AuthorizationCodeAndRedirectType) {
    mylog('setStateInformation: state: ' + state);
    mylog(JSON.stringify(authCodeAndRedirect, null, 2));
    mylog('-----');
    await this.kvImplementation.set({ key: MyKvStorage.prefix_save_session + state, value: JSON.stringify(authCodeAndRedirect), ttlMs: this.ttlMs });
  }

  async getStateInformation(state: string): Promise<AuthorizationCodeAndRedirectType | null> {
    let savedKey = await this.kvImplementation.get(MyKvStorage.prefix_save_session + state);
    mylog('getStateInformation: state: ' + state);
    mylog(savedKey);
    if (savedKey) {
      let obj = JSON.parse(savedKey) as AuthorizationCodeAndRedirectType;
      mylog(JSON.stringify(obj, null, 2));
      mylog('-----');
      return obj;
    }
    return null;
  }

  async clearStateInformation(state: string) {
    await this.kvImplementation.del(MyKvStorage.prefix_save_session + state);
  }

  async clearAssociatedCodeChallengeFromCode(authorization_code: string) {
    await this.kvImplementation.del(MyKvStorage.prefix_code_challenge + authorization_code);
  }
}

type CodeChallengeRedisEntryType = {
  code_challenge: string;
  code_challenge_method: string;
  directus_refresh_token: string | null;
  //directus_session_token: string | null
};

class CodeChallengeMethods {
  static readonly METHOD_S256 = 'S256';
  static readonly METHOD_plain = 'plain';
}

async function generateRefreshToken(directus_session_token: string, accountability: any, userId: string, database: Knex<any, any[]>) {
  // we need to obtain the directus_refresh_token from the directus_session_token
  mylog('Redirect with token endpoint: directus_session_token: ' + directus_session_token);
  mylog('Redirect with token endpoint: userId: ' + userId);
  if (!userId) {
    throw new Error('No user Id given');
  }

  const knex = database;

  /**
   * Start of copy: https://github.com/directus/directus/blob/main/api/src/services/authentication.ts Login
   */
  const refreshToken = await NanoidHelper.getNanoid(64);
  const msRefreshTokenTTL: number = ms(String(EnvVariableHelper.getRefreshTTL())) || 0;
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
  return refreshToken;
}

const EndpointTopName = 'proof-key-code-exchange';

function getEnvVarNameAuthProviderRedirectAllowList(provider: string) {
  const providerCaps = provider.toUpperCase(); // makes from "google" --> "GOOGLE"
  return `AUTH_${providerCaps}_REDIRECT_ALLOW_LIST`;
}

function getProviderRedirectAllowList(provider: string): string[] {
  let allowed_redirect_urls_raw = env?.[getEnvVarNameAuthProviderRedirectAllowList(provider)] as string[] | string;
  mylog('allowed_redirect_urls_raw');
  mylog(allowed_redirect_urls_raw);
  mylog('type of: ' + typeof allowed_redirect_urls_raw);
  let allowed_redirect_urls: string[] = [];
  if (allowed_redirect_urls_raw) {
    if (typeof allowed_redirect_urls_raw === 'string') {
      allowed_redirect_urls = allowed_redirect_urls_raw?.split(',');
    } else {
      allowed_redirect_urls = allowed_redirect_urls_raw;
    }
  }
  mylog('allowed_redirect_urls');
  mylog(allowed_redirect_urls);
  return allowed_redirect_urls;
}

function isRedirectUrlWhitelisted(redirect_url_as_url: URL, provider: string, apiContext: ApiContext) {
  const allowed_redirect_urls = getProviderRedirectAllowList(provider);
  // We always allow the redirect to a page of this server. Compared as URL and not as string prefix,
  // otherwise "https://server.attacker.example" would pass for "https://server" - and an empty
  // PUBLIC_URL would allow every redirect.
  if (RedirectWhitelistHelper.isRedirectUrlBelowBaseUrl(PUBLIC_URL, redirect_url_as_url)) {
    return true;
  } else {
    return RedirectWhitelistHelper.isRedirectUrlAllowedForWhitelistEntriesWithSimpleWildcards(allowed_redirect_urls, redirect_url_as_url);
  }
}

function getRegisteredAuthProviderList() {
  const configured_auth_providers_raw = env?.['AUTH_PROVIDERS'];
  mylog('configured_auth_providers_raw:');
  mylog(configured_auth_providers_raw);
  mylog('type of: ' + typeof configured_auth_providers_raw);
  let configured_auth_providers: string[] = [];
  if (Array.isArray(configured_auth_providers_raw)) {
    configured_auth_providers = configured_auth_providers_raw;
  } else if (configured_auth_providers_raw) {
    configured_auth_providers = configured_auth_providers_raw?.split(',');
  }
  return configured_auth_providers;
}

function checkIfProviderRegistered(provider: string) {
  let configured_auth_providers = getRegisteredAuthProviderList();
  mylog('configured_auth_providers');
  mylog(configured_auth_providers);
  return configured_auth_providers.includes(provider);
}

function generateAuthorizationCode(amountBytes?: number) {
  const bytesMinAmount = 32;
  const usedAmountBytes = amountBytes || bytesMinAmount;
  const authorization_code = crypto.randomBytes(usedAmountBytes).toString('hex');
  return authorization_code;
}

function generateStateCode() {
  const bytesDefaultAmount = 32;
  return crypto.randomBytes(bytesDefaultAmount).toString('hex');
}

export default defineEndpoint({
  id: EndpointTopName,
  handler: (router, apiContext) => {
    const { database, env } = apiContext;

    const myStorage = new MyKvStorage(new SharedStore(env), 300);

    // 4.1.  Client Creates a Code Verifier - Mobile App
    // 4.2.  Client Creates the Code Challenge - Mobile App

    // 4.3.  Client Sends the Code Challenge with the Authorization Request - Directus Extension
    router.post('/authorize', async (req, res) => {
      mylog('Authorize Called');
      const { provider, code_challenge, redirect_url, code_challenge_method } = req.body;
      mylog(req.body);

      //   The client sends the code challenge as part of the OAuth 2.0
      //    Authorization Request (Section 4.1.1 of [RFC6749]) using the
      //    following additional parameters:
      //
      //    code_challenge
      //       REQUIRED.  Code challenge.
      const code_challenge_app = code_challenge;
      if (!code_challenge_app || typeof code_challenge_app !== 'string' || typeof provider !== 'string' || typeof redirect_url !== 'string') {
        // 4.4.1.  Error Response
        //
        //    If the server requires Proof Key for Code Exchange (PKCE) by OAuth
        //    public clients and the client does not send the "code_challenge" in
        //    the request, the authorization endpoint MUST return the authorization
        //    error response with the "error" value set to "invalid_request".  The
        //    "error_description" or the response of "error_uri" SHOULD explain the
        //    nature of error, e.g., code challenge required.
        mylog('Missing required parameters code_challenge.');
        return res.status(400).json({ error: 'Missing required parameters code_challenge.' });
      }

      //
      //    code_challenge_method
      //       OPTIONAL, defaults to "plain" if not present in the request.  Code
      //       verifier transformation method is "S256" or "plain".
      let code_challenge_method_app = code_challenge_method || CodeChallengeMethods.METHOD_plain;

      // "plain" sends the secret itself as challenge, so it protects nothing once the first request
      // is read. The apps have always sent S256 (RFC 7636 4.2: "plain" only if S256 is impossible).
      if (code_challenge_method_app === CodeChallengeMethods.METHOD_plain) {
        return res.status(400).json({ error: `Code challenge method has to be "${CodeChallengeMethods.METHOD_S256}"` });
      }

      if (!(code_challenge_method_app === CodeChallengeMethods.METHOD_S256 || code_challenge_method_app === CodeChallengeMethods.METHOD_plain)) {
        // Clients are
        //    permitted to use "plain" only if they cannot support "S256" for some
        //    technical reason and know via out-of-band configuration that the
        //    server supports "plain".
        mylog('Code challenge method provided ' + code_challenge_method_app + ' method has to be either ' + CodeChallengeMethods.METHOD_S256 + ' or ' + CodeChallengeMethods.METHOD_plain);
        return res.status(400).json({
          error: `Code challenge method provided ${code_challenge_method_app} method has to be either "${CodeChallengeMethods.METHOD_S256}" or "${CodeChallengeMethods.METHOD_plain}"`,
        });
      }

      if (!provider) {
        mylog('Missing required parameter provider');
        return res.status(400).json({
          error: 'Missing required parameter provider. Has to be an auth provider configured in directus.',
        });
      }
      const providerIsRegistered = checkIfProviderRegistered(provider);
      if (!providerIsRegistered) {
        mylog(`Provider ${provider} not listed in AUTH_PROVIDERS`);
        return res.status(400).json({ error: `Provider ${provider} not listed in AUTH_PROVIDERS` });
      }

      if (!redirect_url) {
        mylog('Missing required parameter redirect_url');
        return res.status(400).json({ error: 'Missing required parameter redirect_url' });
      }
      let redirect_url_well_formed = RedirectWhitelistHelper.getUrlFromString(redirect_url);
      if (!redirect_url_well_formed) {
        mylog(`Parameter redirect_url is not a well formed url: ${redirect_url}`);
        return res.status(400).json({
          error: `Parameter redirect_url is not a well formed url: ${redirect_url}`,
        });
      }
      let redirect_url_is_allowed = isRedirectUrlWhitelisted(redirect_url_well_formed, provider, apiContext);
      if (!redirect_url_is_allowed) {
        mylog(`Redirect url ${redirect_url} is not included in the redirect allow list for the provider ${provider}`);
        return res.status(400).json({
          error: `Redirect url ${redirect_url} is not included in the redirect allow list for the provider ${provider}`,
        });
      }

      const authorization_code = generateAuthorizationCode();
      // Store the code_challenge_app with the state as key in Redis
      // When the server issues the authorization code in the authorization
      //    response, it MUST associate the "code_challenge" and
      //    "code_challenge_method" values with the authorization code so it can
      //    be verified later.
      // Typically, the "code_challenge" and "code_challenge_method" values
      //    are stored in encrypted form in the "code" itself but could
      //    alternatively be stored on the server associated with the code.  The
      //    server MUST NOT include the "code_challenge" value in client requests
      //    in a form that other entities can extract.
      await myStorage.setCodeChallenge(authorization_code, {
        code_challenge: code_challenge_app,
        code_challenge_method: code_challenge_method_app,
        //directus_session_token: null,
        directus_refresh_token: null, // currently we have not saved the directus_refresh_token. After the OAuth2 Flow we will add it there
      });

      // We will now use directus implemented OAuth2 Flow and just save the verified user then, so that the directus_refresh_token can be received when passing the authorization_code and code_verifier
      const state = generateStateCode(); // create a state, so that we know upon redirect which authorization code was in this session

      await myStorage.setStateInformation(state, {
        authorization_code: authorization_code,
        redirect_url: redirect_url_well_formed.toString(),
      });

      const redirectUrlToSaveSession = `${PUBLIC_URL}/${EndpointTopName}/save-session?state=${state}`;

      const urlToProviderLogin = getUrlToProviderLogin(provider, redirectUrlToSaveSession);
      return res.json({
        urlToProviderLogin: urlToProviderLogin,
      });
    });

    // Route to save the session using state after successful OAuth2 redirect
    router.get('/save-session', async (req, res) => {
      mylog('SAVE SESSION');
      mylog(req.cookies);

      const { state } = req.query;
      if (!state) {
        mylog('Missing required parameter state.');
        return res.status(400).json({ error: 'Missing required parameter state.' });
      }
      const stateAsString = state.toString();

      const directus_session_token = req.cookies.directus_session_token;
      if (!directus_session_token) {
        mylog('Missing directus_session_token in cookies.');
        return res.status(400).json({ error: 'Missing directus_session_token in cookies.' });
      }

      let saved_authorization_code_and_redirect = await myStorage.getStateInformation(stateAsString);
      if (!saved_authorization_code_and_redirect) {
        mylog('No information found for state. Might be too long');
        return res.status(400).json({ error: 'No information found for state. Might be too long' });
      }
      const redirect_url = saved_authorization_code_and_redirect.redirect_url;
      const authorization_code = saved_authorization_code_and_redirect.authorization_code;
      if (!authorization_code || !redirect_url) {
        mylog('No information found for state. Might be too long / outdated');
        return res.status(400).json({
          error: 'No information found for state. Might be too long / outdated',
        });
      }

      await myStorage.clearStateInformation(stateAsString); // clear state information, as we got all the information and they exist.

      const storedCodeChallenge = await myStorage.getCodeChallenge(authorization_code);
      if (!storedCodeChallenge?.code_challenge_method || !storedCodeChallenge.code_challenge) {
        mylog('No information found for saved authorization code. Might be too long');
        return res.status(400).json({
          error: 'No information found for saved authorization code. Might be too long',
        });
      }

      // @ts-ignore
      const accountability = req?.accountability;
      // @ts-ignore
      const userId = req?.accountability?.user;
      if (!accountability || !userId) {
        mylog('No accountability or userId found.');
        return res.status(400).json({ error: 'No accountability or userId found.' });
      }
      let knexDatabase = database as any as Knex<any, any[]>;
      let directus_refresh_token = await generateRefreshToken(directus_session_token, accountability, userId, knexDatabase);

      // Save the directus refresh token in the code challenge
      await myStorage.setCodeChallenge(saved_authorization_code_and_redirect.authorization_code, {
        code_challenge: storedCodeChallenge?.code_challenge,
        code_challenge_method: storedCodeChallenge?.code_challenge_method,
        directus_refresh_token: directus_refresh_token,
        //directus_session_token: directus_session_token, // currently we have not saved the directus_refresh_token. After the OAuth2 Flow we will add it there
      });

      // now redirect the user to the previously verified redirect url
      const redirect_url_with_authorization_code = redirect_url + '?code=' + authorization_code;
      mylog('Redirecting to: ' + redirect_url_with_authorization_code);
      return res.redirect(redirect_url_with_authorization_code); // The user in the native app (using Auth WebBrowser) or SPA, will get the authorization code
    });

    // 4.5.  Client Sends the Authorization Code and the Code Verifier to the Token Endpoint
    router.post('/token', async (req, res) => {
      mylog(EndpointTopName + ' Token Called');
      const { code, code_verifier } = req.body;
      //console.log(req.body);

      //    code_verifier
      //       REQUIRED.  Code verifier
      const code_verifier_app = code_verifier;
      if (!code_verifier_app || typeof code_verifier_app !== 'string' || typeof code !== 'string' || !code) {
        mylog('Missing required parameter code_verifier.');
        return res.status(400).json({ error: 'Missing required parameter: code_verifier.' });
      }

      const authorization_code = code;
      const storedCodeChallenge = await myStorage.getCodeChallenge(authorization_code);
      if (!storedCodeChallenge) {
        mylog('Invalid or expired state.');
        return res.status(400).json({ error: 'Invalid or expired state.' });
      }

      try {
        // Validate the code_verifier_app against the stored code_challenge_app
        let generatedChallenge = crypto.createHash('sha256').update(code_verifier_app).digest('base64url');

        if (storedCodeChallenge.code_challenge_method === CodeChallengeMethods.METHOD_plain) {
          mylog('Code Challenge Method is plain');
          // 4.6
          // If the "code_challenge_method" from Section 4.3 was "plain", they are
          //    compared directly, i.e.:
          //
          //    code_verifier == code_challenge.
          generatedChallenge = code_verifier_app;
        }

        mylog('Token Called: generatedChallenge: ' + generatedChallenge);
        // Secure comparison of the code challenge
        const generatedChallengeBuffer = Buffer.from(generatedChallenge);
        const storedChallengeBuffer = Buffer.from(String(storedCodeChallenge.code_challenge));
        // timingSafeEqual throws on different lengths, which is simply a wrong verifier.
        if (generatedChallengeBuffer.length !== storedChallengeBuffer.length || !crypto.timingSafeEqual(generatedChallengeBuffer, storedChallengeBuffer)) {
          mylog('Token Called: Invalid code verifier.');
          return res.status(400).json({ error: 'Invalid code verifier.' });
        }

        //const directus_session_token = storedCodeChallenge.directus_session_token;
        //if (!directus_session_token) {
        //	return res.status(400).json({ error: 'Session not found or expired. No directus_refresh_token found' });
        //}

        mylog('Token Called: Valid code verifier.');

        const directus_refresh_token = storedCodeChallenge.directus_refresh_token;

        // If valid, clear the stored state and session
        await myStorage.clearAssociatedCodeChallengeFromCode(authorization_code);

        mylog('Token Called: Returning directus_refresh_token: ' + directus_refresh_token);
        // Return the session or token associated with the validated request
        return res.json({
          message: 'Validation successful',
          directus_refresh_token: directus_refresh_token,
          //directus_session_token: directus_session_token // https://github.com/directus/directus/issues/21757#issuecomment-1992539944  https://github.com/directus/directus/issues/21757
        });
      } catch (error: any) {
        mylog('Error during validation:', error);
        return res.status(500).json({ error: 'Internal server error.' });
      }
    });
  },
});
