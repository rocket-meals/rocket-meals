/**
 * Yarn Constraints — dependency governance for this monorepo.
 *
 *   Check:    yarn constraints
 *   Auto-fix: yarn constraints --fix
 *
 * Background: the Expo apps (rocket-meals, geonexia, score-tracker) each produce
 * their own native binary, but share one yarn.lock and the common-ui package.
 * Native modules that are merely hoisted from a sibling workspace instead of
 * being declared by the app itself get linked "by accident" — which caused a
 * TestFlight-only avatar-editor bug in score-tracker (react-native-svg and
 * react-native-worklets were never declared there). These rules make that class
 * of drift impossible to reintroduce silently:
 *
 *   1. Any dependency declared by more than one Expo app must use the exact
 *      same version range everywhere (native code exists once per binary — two
 *      apps silently resolving different versions from hoisting is never OK).
 *   2. Every Expo app that consumes repo-depkit-common-ui must itself declare
 *      all of common-ui's non-optional peerDependencies. Optional feature peers
 *      (webview, qrcode, location, ...) are marked via peerDependenciesMeta in
 *      common-ui and are only required if the app actually uses that feature.
 *   3. Companion packages: some native modules require a sibling native package
 *      (react-native-reanimated 4 → react-native-worklets). Declaring one
 *      without the other links the companion from hoisting luck only.
 *
 * Scope: only the Expo app workspaces. Backend/tooling workspaces are exempt —
 * they don't share a native runtime, and forcing e.g. one TypeScript version on
 * the Directus extension would be churn without a corresponding risk.
 */

/** Workspace names (manifest "name") of the Expo apps sharing native modules. */
const EXPO_APP_WORKSPACE_NAMES = new Set([
	'rocket-meals-dev', // apps/frontend/app
	'geonexia', // apps/geonexia/frontend
	'score-tracker', // apps/score-tracker/frontend
]);

/** Native modules that must be declared together (rule 3). */
const REQUIRED_COMPANIONS = {
	'react-native-reanimated': ['react-native-worklets'],
};

/** Extracts a comparable [major, minor, patch] tuple from a range like "~29.0.16" / "^9.2.0". */
function versionTuple(range) {
	const match = /(\d+)\.(\d+)\.(\d+)/.exec(range);
	if (!match) return null;
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareTuples(a, b) {
	for (let i = 0; i < 3; i++) {
		if (a[i] !== b[i]) return a[i] - b[i];
	}
	return 0;
}

/** True for ranges that intentionally match anything and should never drive or trip rule 1. */
function isWildcardRange(range) {
	return range === '*' || range.startsWith('workspace:');
}

module.exports = {
	async constraints({ Yarn }) {
		const expoApps = Yarn.workspaces().filter((w) => EXPO_APP_WORKSPACE_NAMES.has(w.manifest.name));

		// ── Collect every dependency declared by the Expo apps, grouped by package ──
		/** @type {Map<string, {dependency: any, range: string}[]>} */
		const byIdent = new Map();
		for (const dependency of Yarn.dependencies()) {
			if (dependency.type === 'peerDependencies') continue;
			if (!EXPO_APP_WORKSPACE_NAMES.has(dependency.workspace.manifest.name)) continue;
			if (isWildcardRange(dependency.range)) continue;
			const list = byIdent.get(dependency.ident) ?? [];
			list.push({ dependency, range: dependency.range });
			byIdent.set(dependency.ident, list);
		}

		/** Canonical range per package = the declared range with the highest version number. */
		const canonicalRange = new Map();
		for (const [ident, entries] of byIdent) {
			let best = null;
			for (const { range } of entries) {
				const tuple = versionTuple(range);
				if (!tuple) continue;
				if (!best || compareTuples(tuple, best.tuple) > 0) best = { range, tuple };
			}
			if (best) canonicalRange.set(ident, best.range);
		}

		// ── Rule 1: identical version ranges across all Expo apps ──
		for (const [ident, entries] of byIdent) {
			const canonical = canonicalRange.get(ident);
			if (!canonical) continue;
			for (const { dependency } of entries) {
				if (dependency.range !== canonical) {
					dependency.update(canonical);
				}
			}
		}

		// ── Rule 2: Expo apps must declare all non-optional peers of common-ui ──
		const commonUi = Yarn.workspaces().find((w) => w.manifest.name === 'repo-depkit-common-ui');
		if (commonUi) {
			const peers = commonUi.manifest.peerDependencies ?? {};
			const peersMeta = commonUi.manifest.peerDependenciesMeta ?? {};
			const requiredPeers = Object.keys(peers).filter((ident) => !peersMeta[ident]?.optional);
			for (const app of expoApps) {
				if (!(app.manifest.dependencies ?? {})['repo-depkit-common-ui']) continue;
				for (const ident of requiredPeers) {
					if ((app.manifest.dependencies ?? {})[ident]) continue;
					const canonical = canonicalRange.get(ident);
					if (canonical) {
						// Fixable: adopt the range the other apps already use.
						app.set(['dependencies', ident], canonical);
					} else {
						app.error(
							`${app.manifest.name} uses repo-depkit-common-ui but does not declare its required peer "${ident}" ` +
							`(and no other Expo app declares a version to adopt). Native modules must be declared per app - ` +
							`hoisting from a sibling workspace is not reliable in EAS/standalone builds.`,
						);
					}
				}
			}
		}

		// ── Rule 3: companion native packages must be declared together ──
		for (const app of expoApps) {
			const deps = app.manifest.dependencies ?? {};
			for (const [ident, companions] of Object.entries(REQUIRED_COMPANIONS)) {
				if (!deps[ident]) continue;
				for (const companion of companions) {
					if (deps[companion]) continue;
					const canonical = canonicalRange.get(companion);
					if (canonical) {
						app.set(['dependencies', companion], canonical);
					} else {
						app.error(
							`${app.manifest.name} declares "${ident}" but not its required native companion "${companion}".`,
						);
					}
				}
			}
		}
	},
};
