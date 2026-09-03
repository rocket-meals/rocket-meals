#!/usr/bin/env node
/**
 * Publishes ./dist to the gh-pages branch.
 *
 * Why this exists instead of a plain `gh-pages -d dist` call:
 * the gh-pages CLI deletes everything below its target directory before it
 * copies the new build in (`--remove` defaults to `.`, which expands to every
 * file below the target). For the root deploy of master that also deleted the
 * `pr-<number>/` preview directories, so every master deploy took down the web
 * previews of all currently open pull requests.
 *
 * The root deploy therefore keeps the PR preview directories, while a preview
 * deploy (`--dest pr-<number>`) still fully replaces its own directory - it
 * only ever touches files below that directory.
 *
 * Usage:
 *   node ./scripts/deploy-gh-pages.js                  # deploy the site to the branch root
 *   node ./scripts/deploy-gh-pages.js --dest pr-1234   # deploy a PR preview
 */
const path = require('path');
const ghpages = require('gh-pages');

// Matches the preview directories created by the "PR Expo Preview" workflow
// (pr-4386, pr-4390, ...) and nothing the exported web app itself creates.
const PREVIEW_DIR_GLOB = 'pr-+([0-9])';

function parseDest(argv) {
  const index = argv.indexOf('--dest');
  if (index === -1) {
    return '.';
  }
  const dest = argv[index + 1];
  if (!dest) {
    console.error('Missing value for --dest');
    process.exit(1);
  }
  return dest;
}

const dest = parseDest(process.argv.slice(2));
const isRootDeploy = dest === '.';

const options = {
  dest,
  nojekyll: true,
  // Root deploy: replace the site, but leave the PR previews alone.
  // Preview deploy: the default, which is scoped to `dest` anyway.
  remove: isRootDeploy ? ['**/*', `!${PREVIEW_DIR_GLOB}/**`] : '.',
  message: isRootDeploy ? 'Updates' : `Deploy web preview for ${dest}`,
};

ghpages.publish(path.resolve(__dirname, '..', 'dist'), options, (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
  console.log(`Published dist to gh-pages (${isRootDeploy ? 'site root' : dest}).`);
});
