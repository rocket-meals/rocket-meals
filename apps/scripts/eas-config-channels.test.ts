import * as fs from 'node:fs';
import * as path from 'node:path';

// EAS channel names must match this pattern (see eas-cli validation). Profile
// names may be camelCase, channels may NOT - and `eas update:configure`
// auto-adds "channel": "<profileName>" to build profiles without an explicit
// channel, which our *-expo-update actions then commit. A camelCase profile
// like "previewIos" therefore silently breaks every eas command for the app
// unless the profile declares an explicit, valid channel. This test guards
// all committed eas.json / eas.template.json files against that trap.
const CHANNEL_PATTERN = /^[a-z\d][a-z\d._-]*$/;

const REPO_ROOT = path.resolve(__dirname, '../..');

const EAS_CONFIG_FILES = [
  'apps/frontend/app/eas.template.json',
  'apps/geonexia/frontend/eas.json',
  'apps/score-tracker/frontend/eas.json',
  'apps/score-tracker/frontend/eas.template.json',
  'apps/tag-und-jahr/frontend/eas.json',
];

type BuildProfile = { channel?: string } & Record<string, unknown>;
type EasConfig = { build?: Record<string, BuildProfile> };

describe.each(EAS_CONFIG_FILES)('%s', (relativePath) => {
  const fullPath = path.join(REPO_ROOT, relativePath);

  it('exists', () => {
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  it('contains only valid EAS channel names', () => {
    const config: EasConfig = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    const invalid = Object.entries(config.build ?? {})
      .filter(([, profile]) => profile.channel !== undefined && !CHANNEL_PATTERN.test(profile.channel))
      .map(([name, profile]) => `${name}: "${profile.channel}"`);

    expect(invalid).toEqual([]);
  });

  it('declares an explicit channel on every internal-distribution profile so `eas update:configure` cannot inject the (camelCase) profile name as channel', () => {
    const config: EasConfig = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    const missing = Object.entries(config.build ?? {})
      .filter(([name, profile]) => !CHANNEL_PATTERN.test(name) && profile.channel === undefined)
      .map(([name]) => name);

    expect(missing).toEqual([]);
  });
});
