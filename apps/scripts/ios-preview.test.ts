import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import easBuildOutputSample from './__fixtures__/eas-build-output.sample.json';
import { extractIosBuildPageUrl, updateReadmeIosPreviewLink } from './ios-preview';

describe('extractIosBuildPageUrl', () => {
  it('builds the EAS build details page URL from a real eas build --json response', () => {
    const tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ios-preview-')), 'eas-build-output-ios.json');
    fs.writeFileSync(tmpFile, JSON.stringify(easBuildOutputSample));
    expect(extractIosBuildPageUrl(tmpFile)).toBe('https://expo.dev/accounts/baumgartner-software/projects/rocket-meals-dev/builds/0f3fcc30-1ae1-4155-ad0c-78f0bcf2d084');
  });

  it('returns an empty string for missing files', () => {
    expect(extractIosBuildPageUrl('/does/not/exist.json')).toBe('');
  });
});

describe('updateReadmeIosPreviewLink', () => {
  const readme = ['# Rocket Meals', '', '<!-- ios-preview:frontend:start -->', 'Wird nach dem nächsten iOS-Preview-Build auf `master` automatisch aktualisiert.', '<!-- ios-preview:frontend:end -->', '', '<!-- ios-preview:geonexia:start -->', 'alt', '<!-- ios-preview:geonexia:end -->'].join('\n');

  it('replaces the content between the app-specific markers', () => {
    const updated = updateReadmeIosPreviewLink(readme, 'frontend', 'Rocket Meals (Frontend)', 'https://expo.dev/accounts/a/projects/b/builds/c');
    expect(updated).not.toBeNull();
    expect(updated).toContain('**Rocket Meals (Frontend):** 🍏 [Neueste iOS Preview installieren (Ad-hoc)](https://expo.dev/accounts/a/projects/b/builds/c)');
    expect(updated).not.toContain('Wird nach dem nächsten iOS-Preview-Build');
  });

  it('leaves markers for other apps untouched', () => {
    const updated = updateReadmeIosPreviewLink(readme, 'frontend', 'Rocket Meals (Frontend)', 'https://example.com');
    expect(updated).toContain('<!-- ios-preview:geonexia:start -->\nalt\n<!-- ios-preview:geonexia:end -->');
  });

  it('returns null when the markers are missing', () => {
    expect(updateReadmeIosPreviewLink(readme, 'score-tracker', 'Score Tracker', 'https://example.com')).toBeNull();
  });
});
