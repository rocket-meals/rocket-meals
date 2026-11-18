/**
 * Custom Jest resolver for the Geonexia app.
 *
 * Extends the React Native jest resolver to also strip the `exports` field
 * from the `expo-modules-core` package.  This is required because jest-expo's
 * setup file accesses sub-paths such as `expo-modules-core/src/Refs` that are
 * not listed in the package's `exports` map, which causes resolution failures
 * under Node.js 24's strict package-exports mode.
 *
 * It runs inside the react-native-reanimated resolver, which makes Reanimated
 * (4.7+) and react-native-worklets load their web implementation in jest - the
 * native one registers handlers with a native module that does not exist here.
 */

'use strict';

const rnResolver = require('@react-native/jest-preset/jest/resolver.js');
const reanimatedResolver = require('react-native-reanimated/jest/resolver');

function customJestResolver(modulePath, options) {
    const originalPackageFilter = options.packageFilter;

    return reanimatedResolver(modulePath, {
        ...options,
        defaultResolver: (request, resolverOptions) =>
            rnResolver(request, {
                ...resolverOptions,
                defaultResolver: options.defaultResolver,
                packageFilter: (pkg) => {
                    const filtered = originalPackageFilter ? originalPackageFilter(pkg) : pkg;
                    if (filtered.name === 'expo-modules-core') {
                        delete filtered.exports;
                    }
                    return filtered;
                },
            }),
    });
}

module.exports = customJestResolver;
