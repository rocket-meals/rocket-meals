import * as fs from 'node:fs';

import { getIosBuildPageUrl, readBuildOutput } from './dev-client-readme';

// Ad-hoc iOS builds are installed from the EAS build details page (QR code /
// install button), so the README links there instead of to the raw .ipa.
export function extractIosBuildPageUrl(buildOutputPath: string): string {
  return getIosBuildPageUrl(readBuildOutput(buildOutputPath));
}

export function updateReadmeIosPreviewLink(readme: string, appKey: string, appLabel: string, buildPageUrl: string): string | null {
  const start = `<!-- ios-preview:${appKey}:start -->`;
  const end = `<!-- ios-preview:${appKey}:end -->`;
  const startIdx = readme.indexOf(start);
  const endIdx = readme.indexOf(end);

  if (startIdx === -1 || endIdx === -1) {
    return null;
  }

  const block = `${start}\n**${appLabel}:** 🍏 [Neueste iOS Preview installieren (Ad-hoc)](${buildPageUrl})\n`;
  return readme.slice(0, startIdx) + block + readme.slice(endIdx);
}

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}

function runExtract(): void {
  const buildOutputPath = readRequiredEnv('BUILD_OUTPUT_PATH');
  const githubOutput = readRequiredEnv('GITHUB_OUTPUT');

  if (!fs.existsSync(buildOutputPath)) {
    throw new Error(
      `EAS build output not found at "${buildOutputPath}" (cwd: "${process.cwd()}"). ` +
        'BUILD_OUTPUT_PATH must be absolute or relative to this script\'s working directory.'
    );
  }

  const buildPageUrl = extractIosBuildPageUrl(buildOutputPath);

  if (!buildPageUrl) {
    console.log('No iOS build page URL found in EAS build output.');
  }

  fs.appendFileSync(githubOutput, `ios-build-page-url=${buildPageUrl}\n`);
}

function runUpdateReadme(): void {
  const readmePath = readRequiredEnv('README_PATH');
  const appKey = readRequiredEnv('APP_KEY');
  const appLabel = readRequiredEnv('APP_LABEL');
  const buildPageUrl = readRequiredEnv('IOS_BUILD_PAGE_URL');

  const readme = fs.readFileSync(readmePath, 'utf-8');
  const updated = updateReadmeIosPreviewLink(readme, appKey, appLabel, buildPageUrl);

  if (updated === null) {
    console.log(`README markers for ios-preview "${appKey}" not found, skipping README update.`);
    return;
  }

  fs.writeFileSync(readmePath, updated);
  console.log(`Updated README (${appKey}) with iOS preview link: ${buildPageUrl}`);
}

function main(): void {
  const command = process.argv[2];

  if (command === 'extract') {
    runExtract();
  } else if (command === 'update-readme') {
    runUpdateReadme();
  } else {
    throw new Error(`Unknown command "${command}". Expected "extract" or "update-readme".`);
  }
}

if (require.main === module) {
  main();
}
