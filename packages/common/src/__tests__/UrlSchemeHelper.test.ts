import { UrlSchemeHelper } from '../UrlSchemeHelper';

describe('UrlSchemeHelper.isDangerousUrl', () => {
	it('allows normal web and app schemes', () => {
		expect(UrlSchemeHelper.isDangerousUrl('https://example.com/path?q=1')).toBe(false);
		expect(UrlSchemeHelper.isDangerousUrl('http://localhost:8081/login')).toBe(false);
		expect(UrlSchemeHelper.isDangerousUrl('mailto:info@rocket-meals.de')).toBe(false);
		expect(UrlSchemeHelper.isDangerousUrl('tel:+49123')).toBe(false);
		expect(UrlSchemeHelper.isDangerousUrl('geo:52.5,13.4')).toBe(false);
		expect(UrlSchemeHelper.isDangerousUrl('rocketmeals://login')).toBe(false);
	});

	it('blocks javascript and data urls', () => {
		expect(UrlSchemeHelper.isDangerousUrl('javascript:alert(1)')).toBe(true);
		expect(UrlSchemeHelper.isDangerousUrl('data:text/html,<script>alert(1)</script>')).toBe(true);
		expect(UrlSchemeHelper.isDangerousUrl('vbscript:msgbox(1)')).toBe(true);
		expect(UrlSchemeHelper.isDangerousUrl('file:///etc/passwd')).toBe(true);
	});

	it('is case insensitive', () => {
		expect(UrlSchemeHelper.isDangerousUrl('JavaScript:alert(1)')).toBe(true);
		expect(UrlSchemeHelper.isDangerousUrl('DATA:text/html,x')).toBe(true);
	});

	it('ignores leading whitespace and control characters that browsers strip', () => {
		expect(UrlSchemeHelper.isDangerousUrl('   javascript:alert(1)')).toBe(true);
		expect(UrlSchemeHelper.isDangerousUrl('java\tscript:alert(1)')).toBe(true);
		expect(UrlSchemeHelper.isDangerousUrl('java\nscript:alert(1)')).toBe(true);
		expect(UrlSchemeHelper.isDangerousUrl('\u0000javascript:alert(1)')).toBe(true);
	});

	it('treats empty or missing input as not dangerous', () => {
		expect(UrlSchemeHelper.isDangerousUrl('')).toBe(false);
		expect(UrlSchemeHelper.isDangerousUrl(null)).toBe(false);
		expect(UrlSchemeHelper.isDangerousUrl(undefined)).toBe(false);
	});
});
