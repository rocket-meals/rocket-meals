import easBuildOutputSample from './__fixtures__/eas-build-output.sample.json';
import { getAndroidInstallUrl, getIosBuildPageUrl, renderDevClientBlock, updateReadmeDevClientLink } from './dev-client-readme';

const sampleBuild = easBuildOutputSample[0];

describe('getAndroidInstallUrl', () => {
  it('extracts the artifact URL from a real eas build --json response', () => {
    expect(getAndroidInstallUrl(sampleBuild)).toBe('https://expo.dev/artifacts/eas/agNvd7IersQRJKvRJ-dk6Qltyz--qSooN4s1aC0ouPo.apk');
  });

  it('falls back to artifacts.buildUrl when applicationArchiveUrl is missing', () => {
    expect(getAndroidInstallUrl({ artifacts: { buildUrl: 'https://expo.dev/artifacts/eas/fallback.apk' } })).toBe('https://expo.dev/artifacts/eas/fallback.apk');
  });

  it('returns an empty string for missing builds or artifacts', () => {
    expect(getAndroidInstallUrl(null)).toBe('');
    expect(getAndroidInstallUrl({})).toBe('');
  });
});

describe('getIosBuildPageUrl', () => {
  it('builds the EAS build details page URL from account, slug and build id', () => {
    expect(getIosBuildPageUrl(sampleBuild)).toBe('https://expo.dev/accounts/baumgartner-software/projects/rocket-meals-dev/builds/0f3fcc30-1ae1-4155-ad0c-78f0bcf2d084');
  });

  it('returns an empty string when project info or id is missing', () => {
    expect(getIosBuildPageUrl(null)).toBe('');
    expect(getIosBuildPageUrl({ id: 'abc' })).toBe('');
  });
});

describe('renderDevClientBlock', () => {
  it('renders both platform links with the app version', () => {
    const block = renderDevClientBlock('Rocket Meals (Frontend)', sampleBuild, sampleBuild);
    expect(block).toContain('**Rocket Meals (Frontend) Dev Client v21.200.0:**');
    expect(block).toContain('🤖 [Android APK](https://expo.dev/artifacts/eas/agNvd7IersQRJKvRJ-dk6Qltyz--qSooN4s1aC0ouPo.apk)');
    expect(block).toContain('🍏 [iOS (Ad-hoc Install)](https://expo.dev/accounts/baumgartner-software/projects/rocket-meals-dev/builds/0f3fcc30-1ae1-4155-ad0c-78f0bcf2d084)');
  });

  it('renders only the available platform', () => {
    const block = renderDevClientBlock('Score Tracker', sampleBuild, null);
    expect(block).toContain('🤖 [Android APK]');
    expect(block).not.toContain('🍏');
  });

  it('returns null when no build produced a link', () => {
    expect(renderDevClientBlock('Score Tracker', null, null)).toBeNull();
    expect(renderDevClientBlock('Score Tracker', {}, {})).toBeNull();
  });
});

describe('updateReadmeDevClientLink', () => {
  const readme = ['# Rocket Meals', '', '<!-- dev-client:frontend:start -->', 'Wird nach dem nächsten Dev-Client-Build auf `master` automatisch aktualisiert.', '<!-- dev-client:frontend:end -->', '', '<!-- dev-client:score-tracker:start -->', 'alt', '<!-- dev-client:score-tracker:end -->'].join('\n');

  it('replaces the content between the app-specific markers', () => {
    const updated = updateReadmeDevClientLink(readme, 'frontend', '**Rocket Meals (Frontend) Dev Client v1.2.3:** 🤖 [Android APK](https://example.com)');
    expect(updated).not.toBeNull();
    expect(updated).toContain('**Rocket Meals (Frontend) Dev Client v1.2.3:**');
    expect(updated).not.toContain('Wird nach dem nächsten Dev-Client-Build');
  });

  it('leaves markers for other apps untouched', () => {
    const updated = updateReadmeDevClientLink(readme, 'frontend', 'neu');
    expect(updated).toContain('<!-- dev-client:score-tracker:start -->\nalt\n<!-- dev-client:score-tracker:end -->');
  });

  it('returns null when the markers are missing', () => {
    expect(updateReadmeDevClientLink(readme, 'geonexia', 'block')).toBeNull();
  });
});
