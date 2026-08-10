/**
 * Custom Jest resolver for the rocket-meals app.
 *
 * Extends the React Native jest resolver (since RN 0.86 shipped in
 * @react-native/jest-preset) with the resolution rule that
 * react-native-worklets ships for Jest: for worklets modules the `.native`
 * extensions are filtered out so Jest picks the JS implementations instead
 * of the TurboModule-backed native ones, which cannot initialize in the
 * jest environment (reanimated 4 imports worklets at module load time).
 */

'use strict';

const rnResolver = require('@react-native/jest-preset/jest/resolver.js');

function customJestResolver(modulePath, options) {
	if (options.basedir.includes('react-native-worklets') || modulePath.includes('react-native-worklets')) {
		options = {
			...options,
			extensions: options.extensions?.filter(ext => !ext.includes('native')),
		};
	}

	return rnResolver(modulePath, options);
}

module.exports = customJestResolver;
