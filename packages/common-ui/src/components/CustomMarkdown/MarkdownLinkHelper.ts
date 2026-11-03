// Bounded coordinate pattern: `-?\d+(?:\.\d+)?` cannot backtrack pathologically.
const COORDINATE_PATTERN = /-?\d+(?:\.\d+)?/g;

export enum UriScheme {
	HTTP = 'http:',
	HTTPS = 'https:',
	TEL = 'tel:',
	MAILTO = 'mailto:',
	GEO = 'geo:',
	MAPS = 'maps:',
}

export type ResolvedLocationHref = {
	resolvedHref?: string;
	scheme: UriScheme | null;
	coordinates: { latitude: number; longitude: number } | null;
};

/**
 * Trim commas and whitespace from both ends without a regex: the equivalent
 * `/^[,\s]+|[,\s]+$/g` has super-linear runtime due to backtracking.
 */
function trimCommasAndWhitespace(value: string): string {
	const isTrimmable = (char: string) => char === ',' || char.trim() === '';
	let start = 0;
	let end = value.length;
	while (start < end && isTrimmable(value[start] as string)) start++;
	while (end > start && isTrimmable(value[end - 1] as string)) end--;
	return value.slice(start, end);
}

function getGoogleMapsUrl(latitude: number, longitude: number): string {
	return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function parseCoordinatesFromUri(uri: string, scheme: UriScheme): { latitude: number; longitude: number } | null {
	if (!uri) {
		return null;
	}

	const trimmedUri = uri.trim();
	if (!trimmedUri.toLowerCase().startsWith(scheme)) {
		return null;
	}

	const coordinateString = trimmedUri.slice(scheme.length);
	const matches = coordinateString.match(COORDINATE_PATTERN);

	if (!matches || matches.length < 2) {
		return null;
	}

	const [latitudeRaw, longitudeRaw] = matches;
	const latitude = Number.parseFloat(latitudeRaw);
	const longitude = Number.parseFloat(longitudeRaw);

	if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
		return null;
	}

	return { latitude, longitude };
}

export function resolveLocationHref(href: string | null | undefined): ResolvedLocationHref {
	if (!href) {
		return { resolvedHref: undefined, scheme: null, coordinates: null };
	}

	const trimmedHref = href.trim();
	if (!trimmedHref) {
		return { resolvedHref: undefined, scheme: null, coordinates: null };
	}

	const normalizedHref = trimmedHref.toLowerCase();
	const isGeoLink = normalizedHref.startsWith(UriScheme.GEO);
	const isMapsLink = normalizedHref.startsWith(UriScheme.MAPS);

	let scheme: UriScheme | null = null;
	if (isGeoLink) {
		scheme = UriScheme.GEO;
	} else if (isMapsLink) {
		scheme = UriScheme.MAPS;
	}

	if (!scheme) {
		return { resolvedHref: trimmedHref, scheme: null, coordinates: null };
	}

	const coordinatePayload = trimmedHref.slice(scheme.length).trim();
	const coordinates = parseCoordinatesFromUri(trimmedHref, scheme);
	if (coordinates) {
		return { resolvedHref: getGoogleMapsUrl(coordinates.latitude, coordinates.longitude), scheme, coordinates };
	}

	if (coordinatePayload) {
		const fallbackQuery = trimCommasAndWhitespace(coordinatePayload);
		if (fallbackQuery) {
			return {
				resolvedHref: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery)}`,
				scheme,
				coordinates: null,
			};
		}
	}

	return { resolvedHref: trimmedHref, scheme, coordinates: null };
}

// Inline formatting a link may be wrapped in (`**[text](url)**`) without being part of a sentence.
const TRANSPARENT_WRAPPER_TAGS = new Set(['strong', 'b', 'em', 'i', 'u', 'span']);

// Anonymous nodes (no tagName) are wrappers react-native-render-html inserts around inline content.
function isTransparentWrapper(node: any): boolean {
	return !node.tagName || TRANSPARENT_WRAPPER_TAGS.has(node.tagName);
}

// Whether `node` holds anything besides links and line breaks: text, an image, an inline code span, ...
function hasContentBesidesLinks(node: any): boolean {
	if (node.tagName === 'a' || node.tagName === 'br') return false;
	if (!isTransparentWrapper(node)) return true;
	if (typeof node.data === 'string' && node.data.trim() !== '') return true;
	return (node.children ?? []).some(hasContentBesidesLinks);
}

/**
 * A link is shown as a button only when it stands on its own line (e.g. a paragraph or list item
 * that holds nothing but links). A link inside running text has to stay inline text: a button
 * is a View, and Android can't lay out Views nested in Text, which pushes the buttons out of the
 * line and off screen and breaks the surrounding sentence apart.
 */
export function isStandaloneLinkNode(tnode: any): boolean {
	let block = tnode?.parent;
	while (block && isTransparentWrapper(block) && block.parent) {
		block = block.parent;
	}
	if (!block) return true;
	return !(block.children ?? []).some(hasContentBesidesLinks);
}
