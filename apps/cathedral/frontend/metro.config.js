const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const monorepoRoot = path.resolve(__dirname, '../../..');

module.exports = (() => {
	const config = getDefaultConfig(__dirname);

	// Ensure Metro watches the entire monorepo so workspace packages
	// (e.g. packages/common-ui) and their assets are picked up correctly.
	config.watchFolders = [monorepoRoot];

	return config;
})();
