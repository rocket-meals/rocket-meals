/**
 * generate.ts – discovers all `MaestroTestCase` files in `src/tests/` and
 * writes one Maestro YAML per test into `generated/`.
 *
 * Usage (from `apps/frontend/app/`):
 *   yarn maestro:generate
 *
 * The generated YAML files are gitignored; only `generated/.keep` is tracked.
 */

import * as fs from 'fs';
import * as path from 'path';

import { MaestroTestCase } from './MaestroTestCase';

const testsDir = path.join(__dirname, '..', 'tests');
const generatedDir = path.join(__dirname, '..', '..', 'generated');

async function generate(): Promise<void> {
	fs.mkdirSync(generatedDir, { recursive: true });

	const testFiles = fs
		.readdirSync(testsDir)
		.filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));

	if (testFiles.length === 0) {
		console.log('No test files found in', testsDir);
		return;
	}

	for (const testFile of testFiles) {
		const modulePath = path.join(testsDir, testFile);
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const testModule = require(modulePath) as { default?: unknown };
		const exported = testModule.default;

		// A test file exports either a single MaestroTestCase or an array of them.
		// Arrays exist because a Maestro web flow can only launch one URL (the YAML
		// header url is reused for every launchApp), so covering many URLs from one
		// file requires one flow per URL.
		const testCases = Array.isArray(exported) ? exported : [exported];
		let valid = 0;
		for (const testCase of testCases) {
			if (!(testCase instanceof MaestroTestCase)) {
				console.warn(
					`Skipping entry in ${testFile}: not a MaestroTestCase instance.`,
				);
				continue;
			}
			const outputName = `${testCase.outputFileName}.yaml`;
			const outputPath = path.join(generatedDir, outputName);
			fs.writeFileSync(outputPath, testCase.toYaml(), 'utf-8');
			console.log(`Generated: ${outputPath}`);
			valid++;
		}
		if (valid === 0) {
			console.warn(`Skipping ${testFile}: no MaestroTestCase instances exported.`);
		}
	}
}

generate().catch((err) => {
	console.error(err);
	process.exit(1);
});
