#!/usr/bin/env node
'use strict';

/**
 * generate-icons.js
 *
 * Generates app icons into ./assets/generated/ by calling
 * scripts/generateIcons.sh (ImageMagick-based). Intended to be called from
 * the eas-build-post-install hook (EAS Build) and can also be run manually.
 *
 * Behaviour:
 *  - On EAS Build (EAS_BUILD=true) or CI (CI=true): ImageMagick is auto-installed
 *    if not already present; failures are fatal.
 *  - On developer machines: if ImageMagick is missing the script exits 0 with a
 *    warning so that local installs are not broken.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const isEasBuild = process.env.EAS_BUILD === 'true';
const isCI = process.env.CI === 'true' || isEasBuild;

// The app root is one level above this script (apps/geonexia/frontend/)
const appRoot = path.resolve(__dirname, '..');

// Path to the shared generateIcons.sh at the repository root
const generateIconsScript = path.resolve(appRoot, '../../../scripts/generateIcons.sh');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasImageMagick() {
	return spawnSync('which', ['convert'], { stdio: 'ignore' }).status === 0;
}

function installImageMagick() {
	const platform = os.platform();
	console.log(`[generate-icons] Installing ImageMagick on ${platform}...`);
	if (platform === 'linux') {
		execSync('sudo apt-get update -y && sudo apt-get install -y imagemagick', {
			stdio: 'inherit',
			shell: true,
		});
	} else if (platform === 'darwin') {
		execSync('brew install imagemagick', { stdio: 'inherit' });
	} else {
		throw new Error(`Cannot auto-install ImageMagick on platform: ${platform}`);
	}
}

// ---------------------------------------------------------------------------
// Step 1: Ensure ImageMagick is available
// ---------------------------------------------------------------------------

if (!hasImageMagick()) {
	if (isCI) {
		try {
			installImageMagick();
		} catch (e) {
			console.error('[generate-icons] Failed to install ImageMagick:', e.message);
			process.exit(1);
		}
	} else {
		console.warn('[generate-icons] ImageMagick (convert) not found. Skipping icon generation.');
		console.warn('[generate-icons] Install ImageMagick to generate app icons locally.');
		process.exit(0);
	}
}

// ---------------------------------------------------------------------------
// Step 2: Verify generateIcons.sh exists
// ---------------------------------------------------------------------------

if (!fs.existsSync(generateIconsScript)) {
	console.error(`[generate-icons] generateIcons.sh not found at: ${generateIconsScript}`);
	process.exit(isCI ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Step 3: Load customer config (ts-node transpiles config.ts at runtime)
// ---------------------------------------------------------------------------

let config;
try {
	require('ts-node').register({
		transpileOnly: true,
		compilerOptions: { module: 'Node16', moduleResolution: 'node16' },
	});
	// config.ts lives one level above this script (apps/geonexia/frontend/config.ts)
	const { getCustomerConfig } = require('../config.ts');
	config = getCustomerConfig();
} catch (e) {
	console.error('[generate-icons] Failed to load customer config:', e.message);
	process.exit(isCI ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Step 4: Run generateIcons.sh
// ---------------------------------------------------------------------------

const iconPath = path.join(appRoot, config.images.icon_logo_source_path);
const companyPath = path.join(appRoot, config.images.company_logo_source_path);
const outputPath = path.join(appRoot, 'assets/generated/');

console.log('[generate-icons] Generating app icons...');
console.log(`  Icon source   : ${iconPath}`);
console.log(`  Company logo  : ${companyPath}`);
console.log(`  Output folder : ${outputPath}`);

try {
	execSync(
		`bash "${generateIconsScript}" "${iconPath}" "${companyPath}" "${outputPath}"`,
		{ stdio: 'inherit', env: { ...process.env, AUTO_INSTALL_IMAGEMAGICK: 'false' } }
	);
	console.log('[generate-icons] Icons generated successfully.');
} catch (e) {
	console.error('[generate-icons] Icon generation failed:', e.message);
	process.exit(1);
}
