// Where the LibGodot Android artifacts land after `yarn download-prebuilt`.
//
// react-native-godot ships the prebuilt LibGodot packages separately from the
// npm package: `download-prebuilt` unpacks them into the library's own
// android/libs/<name>/<version> folder, which Gradle then consumes as a local
// Maven repository. The version is read from the library's package.json so a
// library upgrade does not silently keep pointing at the old folder.
const PREBUILT_NAME = 'libgodot-android';

// Relative to the Gradle module (android/app), which is where
// expo-build-properties writes the extra repository entries. With
// `installConfig.hoistingLimits: workspaces` the package always lives in this
// app's own node_modules, so the path is stable in the monorepo as well.
const NODE_MODULES_PREFIX = '../../node_modules/@borndotcom/react-native-godot/android/libs';

function getGodotAndroidPrebuiltVersion() {
	const packageJson = require('@borndotcom/react-native-godot/package.json');
	const prebuilt = (packageJson.prebuiltFiles || []).find((entry) => entry.name === PREBUILT_NAME);
	if (!prebuilt) {
		throw new Error(`@borndotcom/react-native-godot does not declare a prebuilt file named "${PREBUILT_NAME}"`);
	}
	return prebuilt.version;
}

function getGodotAndroidMavenRepo() {
	return `${NODE_MODULES_PREFIX}/${PREBUILT_NAME}/${getGodotAndroidPrebuiltVersion()}`;
}

module.exports = { getGodotAndroidMavenRepo, getGodotAndroidPrebuiltVersion };
