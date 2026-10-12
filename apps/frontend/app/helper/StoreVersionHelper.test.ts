import { StoreVersionHelper } from './StoreVersionHelper';

describe('StoreVersionHelper', () => {
	it('reads version and store url from the App Store lookup', () => {
		const json = { resultCount: 1, results: [{ version: '21.210.0', trackViewUrl: 'https://apps.apple.com/de/app/id1' }] };
		expect(StoreVersionHelper.parseAppStoreLookup(json)).toEqual({ version: '21.210.0', storeUrl: 'https://apps.apple.com/de/app/id1' });
		expect(StoreVersionHelper.parseAppStoreLookup({ resultCount: 0, results: [] })).toEqual({ version: null, storeUrl: null });
		expect(StoreVersionHelper.parseAppStoreLookup(null)).toEqual({ version: null, storeUrl: null });
	});

	it('reads the version out of the Google Play page', () => {
		const html = '<script>AF_initDataCallback({data:[null,[[["Mensa"]],[[["21.210.0"]],[[[34,"14"]]]]]});</script>';
		expect(StoreVersionHelper.parseGooglePlayHtml(html)).toBe('21.210.0');
		expect(StoreVersionHelper.parseGooglePlayHtml('<html></html>')).toBeNull();
	});

	it('compares major and build number only, never the patch', () => {
		expect(StoreVersionHelper.compare('21.210.140', '21.210.0')).toBe('up_to_date');
		expect(StoreVersionHelper.compare('21.210.140', '21.211.0')).toBe('newer_in_store');
		expect(StoreVersionHelper.compare('21.210.140', '22.1.0')).toBe('newer_in_store');
		expect(StoreVersionHelper.compare('21.210.140', '21.209.0')).toBe('older_in_store');
		expect(StoreVersionHelper.compare('21.210.140', null)).toBe('unknown');
		expect(StoreVersionHelper.compare('21.210.140', 'Varies with device')).toBe('unknown');
	});

	it('takes the installed app ids from the embedded app config, not from the selected customer', () => {
		const buildTime = { bundleIdIos: 'de.build.ios', bundleIdAndroid: 'de.build.android' };
		expect(StoreVersionHelper.getInstalledAppIds({ ios: { bundleIdentifier: 'de.embedded.ios' }, android: { package: 'de.embedded.android' } }, buildTime)).toEqual({
			bundleIdIos: 'de.embedded.ios',
			bundleIdAndroid: 'de.embedded.android',
		});
		expect(StoreVersionHelper.getInstalledAppIds(null, buildTime)).toEqual(buildTime);
	});

	it('finds the customer config the installed app was built for', () => {
		const configs = [
			{ projectName: 'A', bundleIdIos: 'de.a', bundleIdAndroid: 'de.a.android' },
			{ projectName: 'B', bundleIdIos: 'de.b', bundleIdAndroid: 'de.b.android' },
		];
		expect(StoreVersionHelper.findConfigForInstalledApp(configs, { bundleIdIos: undefined, bundleIdAndroid: 'de.b.android' })?.projectName).toBe('B');
		expect(StoreVersionHelper.findConfigForInstalledApp(configs, { bundleIdIos: 'de.a', bundleIdAndroid: undefined })?.projectName).toBe('A');
		expect(StoreVersionHelper.findConfigForInstalledApp(configs, { bundleIdIos: 'de.x', bundleIdAndroid: undefined })).toBeUndefined();
	});

	it('reads the linked apps out of the store urls in the app settings', () => {
		expect(StoreVersionHelper.getStoreAppRefFromStoreUrls('https://apps.apple.com/de/app/swosy/id6667117575?uo=4', 'https://play.google.com/store/apps/details?id=de.baumgartnersoftware.swosy&hl=de')).toEqual({
			appleAppId: '6667117575',
			bundleIdAndroid: 'de.baumgartnersoftware.swosy',
		});
		expect(StoreVersionHelper.getStoreAppRefFromStoreUrls(null, undefined)).toEqual({ appleAppId: undefined, bundleIdAndroid: undefined });
	});

	it('looks an app up by bundle id first, else by Apple id', () => {
		expect(StoreVersionHelper.getAppStoreLookupUrl({ bundleIdIos: 'de.a', appleAppId: '1' })).toContain('bundleId=de.a');
		expect(StoreVersionHelper.getAppStoreLookupUrl({ appleAppId: '1' })).toContain('id=1');
		expect(StoreVersionHelper.getAppStoreLookupUrl({})).toBeNull();
	});
});
