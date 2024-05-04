# rocket-meals


# Setup for new customer

- Fork the repo
- Enable github actions
- Add github secrets
  - EXPO_TOKEN: https://docs.expo.dev/distribution/security/
- Create new Expo project:
  - https://expo.dev/accounts/baumgartner-software/projects
  - Update app.json
    - name
    - slug
    - projectId
- Update the server url
  - You need to have the backend setup
  - in /rocket-meals-dev/constants/ServerConfiguration.ts
- Enable Github Pages
  - Set the homepage in package.json: "homepage": "/rocket-meals" to specify the sub-path
  - After the first deployment, set the to be hosted by branch gh-pages


## Update/Upgrade

https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/

1. Upgrade the Expo SDK
```npm install expo@latest```
2. Upgrade dependencies
```npx expo install --fix```


## Created:

- Expo 50 // https://blog.expo.dev/expo-router-v3-beta-is-now-available-eab52baf1e3e
- ``npx create-expo-app --template tabs@beta``

## TODO

- Github Pages with sub-path - baseUrl
  - https://docs.expo.dev/more/expo-cli/#hosting-with-sub-paths
  - SDK 50 and above


## Leaflet

### Web Problem:
As Expo 50 makes i think Server Side Rendering (SSR) `window` is not defined. But luckily it is not required to function correctly.
So to fix the error we just need to check if `window` is defined.

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