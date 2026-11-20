#!/usr/bin/env node
/**
 * Exports the web app of every tenant below ./dist/<tenant>, so that the central
 * repository rocket-meals/rocket-meals serves them on GitHub Pages under
 *   https://rocket-meals.de/rocket-meals/<tenant>/   (e.g. /rocket-meals/darmstadt/foodoffers)
 *
 * This is purely additional: the fork repositories (rocket-meals/swosy, ...) keep
 * deploying their own web app under their own base path (https://rocket-meals.de/swosy/).
 * The script therefore only runs for the central build (customer "test"). In a fork, where
 * CUSTOMER is set to the fork's tenant, it does nothing.
 *
 * Run it after `expo export -p web` (the root export clears ./dist) and before
 * scripts/deploy-gh-pages.js, which then publishes the root app and the tenants together.
 *
 * Usage:
 *   node ./scripts/export-web-tenants.js                     # all tenants except "test"
 *   node ./scripts/export-web-tenants.js --tenant darmstadt  # only the given tenant(s)
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

require('ts-node').register({
	transpileOnly: true,
	compilerOptions: { module: 'Node16', moduleResolution: 'node16' },
});

const APP_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(APP_ROOT, 'dist');
const TENANT_BUILD_DIR = path.join(APP_ROOT, 'dist-tenants');
const VECTOR_ICON_FONTS = path.join('assets', 'node_modules', '@expo', 'vector-icons', 'build', 'vendor', 'react-native-vector-icons', 'Fonts');

const { ConfigCustomerEnum, getCustomerEnvVariable } = require(path.join(APP_ROOT, 'config.ts'));

function parseTenants(argv) {
	return argv.flatMap((arg, index) => {
		if (arg !== '--tenant') {
			return [];
		}
		const value = argv[index + 1];
		if (!value) {
			console.error('Missing value for --tenant');
			process.exit(1);
		}
		return value.split(',').map(tenant => tenant.trim()).filter(Boolean);
	});
}

function resolveTenants(requested) {
	const all = Object.values(ConfigCustomerEnum).filter(tenant => tenant !== ConfigCustomerEnum.TEST);
	if (requested.length === 0) {
		return all;
	}
	const unknown = requested.filter(tenant => !all.includes(tenant));
	if (unknown.length > 0) {
		console.error(`Unknown tenant(s): ${unknown.join(', ')}. Known: ${all.join(', ')}`);
		process.exit(1);
	}
	return requested;
}

function exportTenant(tenant) {
	const outputDir = path.join(TENANT_BUILD_DIR, tenant);
	fs.rmSync(outputDir, { recursive: true, force: true });
	console.log(`\n🌍 Exporting web app of ${tenant} for /rocket-meals/${tenant}`);
	// --clear: the EXPO_PUBLIC_* values are inlined into the bundle, a warm Metro cache
	// from the previous tenant must not leak into this one.
	execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', outputDir, '--clear'], {
		cwd: APP_ROOT,
		stdio: 'inherit',
		env: {
			...process.env,
			CUSTOMER: tenant,
			EXPO_PUBLIC_CUSTOMER: tenant,
			EXPO_PUBLIC_WEB_TENANT_SUBPATH: 'true',
		},
	});

	// Same as the "copy-assets" script of the root export.
	const fontsSource = path.join(APP_ROOT, 'node_modules', '@expo', 'vector-icons', 'build', 'vendor', 'react-native-vector-icons', 'Fonts');
	if (fs.existsSync(fontsSource)) {
		fs.cpSync(fontsSource, path.join(outputDir, VECTOR_ICON_FONTS), { recursive: true });
	}

	const target = path.join(DIST_DIR, tenant);
	fs.rmSync(target, { recursive: true, force: true });
	fs.cpSync(outputDir, target, { recursive: true });
	console.log(`✅ ${tenant} -> dist/${tenant}`);
}

function main() {
	const buildCustomer = getCustomerEnvVariable() || ConfigCustomerEnum.TEST;
	if (buildCustomer !== ConfigCustomerEnum.TEST) {
		console.log(`ℹ️ Customer "${buildCustomer}" is a fork build, tenant sub paths are only served by the central repository. Skipping.`);
		return;
	}
	if (!fs.existsSync(DIST_DIR)) {
		console.error('No ./dist found. Run "expo export -p web" first.');
		process.exit(1);
	}
	const tenants = resolveTenants(parseTenants(process.argv.slice(2)));
	for (const tenant of tenants) {
		exportTenant(tenant);
	}
	fs.rmSync(TENANT_BUILD_DIR, { recursive: true, force: true });
}

main();
