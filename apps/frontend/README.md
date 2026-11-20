# rocket-meals

# Setup for new customer

- Fork the repo
- Enable github actions
  - Visit "Actions" tab in your forked repository
  - Click "Enable workflows"
- Add github secrets
  - EXPO_TOKEN: https://docs.expo.dev/distribution/security/
    - https://expo.dev/accounts/baumgartner-software/settings/access-tokens
- Create new Expo project:
  - https://expo.dev/accounts/baumgartner-software/projects
  - Update `app.json`
    - `name`
    - `slug`
    - `projectId` (At Overview copy "ID" field, looks short but is longer)
- Update in apps/frontend/config.ts
  - Create a new tenant configuration and set the new fields "name", "slug", "projectId"
  - "<bundleIdAndroid>" can be configured freely, but should be unique
  - "<bundleIdIOS>" will be created in the next step
- iOS:
  - Create new app
    - Before creating the app, create a new bundle id in Apple Developer account
      - https://developer.apple.com/account/resources/identifiers/bundleId/add/bundle
      - Bundle ID: `de.baumgartner-software.<project-slug>`
      - Enable
        - "Sign in with Apple"
        - "Push Notifications"
        - "NFC"
    - Return to create new app, reload page if needed
    - Select the new bundle id
      - Platform iOS
      - Name: '<Project Name>'
      - Bundle ID: `de.baumgartner-software.<project-slug>`
      - Primary Language: German (or as needed)
      - SKU: 'de.baumgartner-software.<project-slug>'
      - User Access: Admins Only
      - Create
    - Copy "Bundle ID" to `config.ts` under the new tenant configuration `iosBundleId`
    - !ONLY PER REPOSITORY! Copy "Apple ID" to `eas.json` only in the respective repository
- Android / Google Play
  - https://play.google.com/console/u/1/developers/7617423695463895237/create-new-app
  - Create new app
    - App name: '<Project Name>'
    - Default language: German (or as needed)
    - App or game: App
    - Free or paid: Free
    - Check "I accept the Developer Distribution Agreement" etc.
    - Create app
- Enable Github Pages
  - Trigger a deployment by "Actions" -> "CI" workflow -> "Run workflow"
  - After the first deployment, set to be hosted by branch gh-pages
    - Select "Pages" deploy from branch `gh-pages`

## Update/Upgrade

### Update from fork

ATTENTION: Please check the README in the top level directory of this repository.

### Update Expo or dependencies

https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/

1. Upgrade the Expo SDK `npm install expo@latest`
2. Upgrade dependencies `npx expo install --fix`

## Tenants als Unterpfad im zentralen Repo

Zusätzlich zu den Fork-Repos (z. B. `rocket-meals/swosy` unter `https://rocket-meals.de/swosy/foodoffers`)
liefert das zentrale Repo `rocket-meals/rocket-meals` jeden Tenant auch als Web-App unter einem eigenen Unterpfad aus:

- `https://rocket-meals.de/rocket-meals/swosy/foodoffers`
- `https://rocket-meals.de/rocket-meals/studi-futter/foodoffers`
- `https://rocket-meals.de/rocket-meals/darmstadt/foodoffers`

So funktioniert es:

- Der GitHub-Pages-Deploy (`yarn deploy:gh:pages`) exportiert zuerst die normale App nach `dist/` und danach mit
  `scripts/export-web-tenants.js` jeden Tenant aus `ConfigCustomerEnum` (außer `test`) nach `dist/<tenant>/`.
- Pro Tenant werden `CUSTOMER`, `EXPO_PUBLIC_CUSTOMER` und `EXPO_PUBLIC_WEB_TENANT_SUBPATH=true` gesetzt. Dadurch wird
  der Router-Basispfad zu `/rocket-meals/<tenant>` (`getWebBaseUrl()` in `config.ts`). Ohne die Variable bleibt alles wie bisher.
- In den Forks (dort ist `CUSTOMER` z. B. `swosy`) überspringt das Skript die Tenants, die Forks bauen weiterhin nur ihre eigene App.
- Einzelnen Tenant lokal bauen: `yarn export:web && yarn export:web:tenants --tenant darmstadt`.

Darmstadt ist ein reiner Web-Tenant ohne Fork und ohne native App. Das Backend läuft unter
`https://darmstadt.rocket-meals.de/rocket-meals/api` (`ServerHelper.DARMSTADT_SERVER_CONFIG`).
Web-Tenants ohne Bundle-IDs werden bei den Store-Screenshots übersprungen (`isWebOnlyCustomerConfig`).

## Created:

- Expo 50 // https://blog.expo.dev/expo-router-v3-beta-is-now-available-eab52baf1e3e
- `npx create-expo-app --template tabs@beta`

## TODO

- Github Pages with sub-path - baseUrl
  - https://docs.expo.dev/more/expo-cli/#hosting-with-sub-paths
  - SDK 50 and above

## Leaflet

### Web Problem:

As Expo 50 makes i think Server Side Rendering (SSR) `window` is not defined. But luckily it is not
required to function correctly. So to fix the error we just need to check if `window` is defined.

https://github.com/Leaflet/Leaflet/pull/6332

In `/node_modules/leaflet/dist/leaflet-src.js` around line 177 we need to add the following code:

```javascript
  	return ((!existingUrl || existingUrl.indexOf('?') === -1) ? '?' : '&') + params.join('&');
  }

  var templateRe = /\{ *([\w_ -]+) *\}/g;

  // TODO: ADD THIS 3 LINES
	if (typeof window == 'undefined'){
		return;
	}

  // @function template(str: String, data: Object): String
  // Simple templating facility, accepts a template string of the form `'Hello {a}, {b}'`
  // and a data object like `{a: 'foo', b: 'bar'}`, returns evaluated string
  // `('Hello foo, bar')`. You can also specify functions instead of strings for
```
