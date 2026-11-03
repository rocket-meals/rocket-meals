import type { TextStyle } from 'react-native';

export type MarkdownLinkKind = 'email' | 'tel' | 'location' | 'link';

export type MarkdownLinkRenderProps = {
	kind: MarkdownLinkKind;
	/** Already resolved - e.g. a `geo:`/`maps:`/`latlon:` link is turned into a Google Maps https URL. */
	href: string;
	text: string;
	/** The accent color (the markdown's `accentColor` or the theme's primary color). */
	backgroundColor: string;
	/** Contrast color matching `backgroundColor`, for text/icons rendered on top of it. */
	color: string;
	onPress: () => void;
};

export type MarkdownImageRenderProps = {
	src: string;
	alt: string;
	width?: string | number;
	height?: string | number;
};

export type MarkdownTextRenderProps = {
	text: string;
	style: TextStyle;
};

export interface CustomMarkdownProps {
	content: string;
	/** Accent color for buttons and (if enabled) collapsible section headers. Defaults to the theme's primary color. */
	accentColor?: string;
	/** Base text color. Defaults to theme.screen.text. */
	textColor?: string;
	/**
	 * `##`+ headings open a nested, collapsible section instead of rendering
	 * as a plain heading. Off by default so short, dynamic content (a popup
	 * event, a chat message, a food item description) never surprises with an
	 * accordion just because its author happened to use a `##`. Turn it on
	 * for longer, structured content such as a wiki page.
	 */
	collapsibleSections?: boolean;
	/**
	 * Whether collapsible sections start closed. Defaults to false (expanded):
	 * legal/accessibility-sensitive content (privacy policy, imprint, wiki
	 * pages) must be readable without any interaction, so only opt into
	 * collapsed sections for content where that is not a concern.
	 */
	sectionsStartCollapsed?: boolean;
	imageWidth?: string | number;
	imageHeight?: string | number;
	/**
	 * Renders `<a>` tags (email/phone/location/plain links) that stand on their own line.
	 * Default: a themed button (repo-depkit-common-ui's MarkdownRedirectButton). Links inside
	 * running text always render as underlined inline text, since Android can't lay out a
	 * button (a View) inside a Text.
	 */
	renderLink?: (props: MarkdownLinkRenderProps) => React.ReactNode;
	/** Renders `<img>` tags. Default: a bordered image that falls back to its alt text on load error. */
	renderImage?: (props: MarkdownImageRenderProps) => React.ReactNode;
	/**
	 * Renders plain-prose paragraphs (`<p>` with no nested links/images/etc.).
	 * Default: undefined, which leaves rendering to the platform's own Text
	 * component (via react-native-render-html's default renderer) - paragraphs
	 * that DO contain inline links/images/formatting always keep using the
	 * default renderer regardless of this prop, so overriding it can't break them.
	 */
	renderText?: (props: MarkdownTextRenderProps) => React.ReactNode;
}
