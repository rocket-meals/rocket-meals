import React, { useMemo, useState } from 'react';
import { DimensionValue, Image, Linking, Text, View, useWindowDimensions } from 'react-native';
import RenderHtml, { CustomBlockRenderer, HTMLContentModel, HTMLElementModel, defaultSystemFonts } from 'react-native-render-html';
import { MarkdownBlockNode, UrlSchemeHelper, parseMarkdownToBlocks } from 'repo-depkit-common';
import { useTheme } from '../../context/ThemeContext';
import { myContrastColor } from '../../helpers/ColorHelper';
import { FontHelper } from '../../helpers/FontHelper';
import CollapsibleSection from '../Collapsible/CollapsibleSection';
import MarkdownRedirectButton from './MarkdownRedirectButton';
import { resolveLocationHref } from './MarkdownLinkHelper';
import styles from './styles';
import { CustomMarkdownProps, MarkdownLinkKind } from './types';

export type { CustomMarkdownProps, MarkdownLinkKind, MarkdownLinkRenderProps, MarkdownImageRenderProps, MarkdownTextRenderProps } from './types';

function openLinkSafely(url: string) {
	// Links in markdown come from user-/server-supplied content, so refuse
	// dangerous schemes (javascript:, data:, ...) before handing the url to the
	// platform, which would otherwise run them as script on web.
	if (UrlSchemeHelper.isDangerousUrl(url)) {
		console.warn('Blocked opening of unsafe URL:', url);
		return;
	}
	Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
}

function detectLinkKind(href: string): MarkdownLinkKind {
	const lower = href.toLowerCase();
	if (lower.startsWith('mailto:')) return 'email';
	if (lower.startsWith('tel:')) return 'tel';
	if (lower.startsWith('geo:') || lower.startsWith('maps:') || lower.startsWith('latlon:')) return 'location';
	return 'link';
}

// `latlon:52.5,13.4` isn't a scheme resolveLocationHref (geo:/maps:) understands -
// it's specific to this renderer's link detection, so resolved separately here.
function resolveFinalHref(href: string, kind: MarkdownLinkKind): string {
	if (kind !== 'location') return href;
	if (href.toLowerCase().startsWith('latlon:')) {
		const [latitudeRaw, longitudeRaw] = href.slice('latlon:'.length).split(',');
		const latitude = Number.parseFloat(latitudeRaw?.trim() ?? '');
		const longitude = Number.parseFloat(longitudeRaw?.trim() ?? '');
		if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
			return `https://www.google.com/maps?q=${latitude},${longitude}`;
		}
		return href;
	}
	return resolveLocationHref(href).resolvedHref ?? href;
}

function makeLinkRenderer(backgroundColor: string, color: string, renderLink: CustomMarkdownProps['renderLink']): CustomBlockRenderer {
	return function LinkRenderer(props: any) {
		const href: string = props.tnode.attributes.href ?? '';
		const text: string = props.tnode.data || props.children[0]?.data || href;
		const kind = detectLinkKind(href);
		const finalHref = resolveFinalHref(href, kind);
		const onPress = () => finalHref && openLinkSafely(finalHref);

		if (renderLink) {
			return <>{renderLink({ kind, href: finalHref, text, backgroundColor, color, onPress })}</>;
		}
		return <MarkdownRedirectButton type={kind} label={text} onClick={onPress} backgroundColor={backgroundColor} color={color} />;
	};
}

const DefaultMarkdownImage: React.FC<{ url: string; altText: string; textColor: string; width?: string | number; height?: string | number }> = ({ url, altText, textColor, width, height }) => {
	const [error, setError] = useState(false);
	const resolvedWidth = (width || '100%') as DimensionValue;
	const resolvedHeight = (height || 400) as DimensionValue;

	if (error) {
		return (
			<View style={[styles.imageErrorBox, { borderColor: textColor }]}>
				<Text selectable style={[styles.imageErrorText, { color: textColor }]}>{altText}</Text>
			</View>
		);
	}

	return (
		<View style={styles.imageWrapper}>
			<Image source={{ uri: url }} style={{ width: resolvedWidth, height: resolvedHeight, resizeMode: 'cover', borderRadius: 8 }} onError={() => setError(true)} />
		</View>
	);
};

function makeImageRenderer(renderImage: CustomMarkdownProps['renderImage'], textColor: string, width: string | number | undefined, height: string | number | undefined): CustomBlockRenderer {
	return function ImageRenderer(props: any) {
		const src: string = props.tnode.attributes.src ?? '';
		const alt: string = props.tnode.attributes.alt ?? '';
		if (renderImage) {
			return <>{renderImage({ src, alt, width, height })}</>;
		}
		return <DefaultMarkdownImage url={src} altText={alt} textColor={textColor} width={width} height={height} />;
	};
}

// Only intercepts a paragraph with pure text content (no nested <a>/<img>/<strong>/...) -
// anything richer keeps using react-native-render-html's own default renderer so links,
// bold text, etc. inside a paragraph never break because of a custom text renderer.
function makeParagraphRenderer(renderText: CustomMarkdownProps['renderText'], textColor: string): CustomBlockRenderer {
	return function ParagraphRenderer(props: any) {
		const { TDefaultRenderer, tnode } = props;
		const children = tnode?.children ?? [];
		const isPlainText = children.every((child: any) => !child.tagName);
		if (!renderText || !isPlainText) {
			return <TDefaultRenderer {...props} />;
		}
		const text = children.map((child: any) => child.data ?? '').join('');
		return <>{renderText({ text, style: { color: textColor, fontSize: 16 } })}</>;
	};
}

function makeSubRenderer(fontSize: number, textColor: string) {
	return (props: any) => {
		const text = props.tnode.data || props.children[0]?.data;
		return <Text selectable style={{ fontSize: fontSize * 0.8, lineHeight: fontSize, textAlignVertical: 'bottom', color: textColor }}>{text}</Text>;
	};
}

function makeSupRenderer(fontSize: number, textColor: string) {
	return (props: any) => {
		const text = props.tnode.data || props.children[0]?.data;
		return <Text selectable style={{ fontSize: fontSize * 0.8, lineHeight: fontSize * 1.5, textAlignVertical: 'top', color: textColor }}>{text}</Text>;
	};
}

/**
 * Font for `code` (inline `backticks` and code blocks). react-native-render-html drops every
 * font that is not in `systemFonts`, so the monospace font has to be registered there.
 */
const MONOSPACE_FONT = FontHelper.getMonospaceFontFamily();
const SYSTEM_FONTS = [...defaultSystemFonts, MONOSPACE_FONT];

const HTML_ELEMENT_MODELS = {
	sub: HTMLElementModel.fromCustomModel({ tagName: 'sub', contentModel: HTMLContentModel.textual }),
	sup: HTMLElementModel.fromCustomModel({ tagName: 'sup', contentModel: HTMLContentModel.textual }),
};

/**
 * Single markdown renderer shared by rocket-meals, Score Tracker and
 * Geonexia: markdown-it (full CommonMark - tables, images, nested lists,
 * inline formatting) via react-native-render-html, plus two things plain
 * CommonMark doesn't have - buttonized links (email/phone/location/plain,
 * see MarkdownRedirectButton) and, opt-in via `collapsibleSections`, nested
 * accordion sections for `##`+ headings (see CollapsibleSection).
 *
 * `renderLink`/`renderImage`/`renderText` let a caller swap in its own
 * rendering for those three node kinds; left unset, links/images use this
 * component's own defaults and plain text uses the platform's native Text
 * component (react-native-render-html's default renderer).
 */
const CustomMarkdown: React.FC<CustomMarkdownProps> = ({
	content,
	accentColor,
	textColor,
	collapsibleSections = false,
	sectionsStartCollapsed = false,
	imageWidth,
	imageHeight,
	renderLink,
	renderImage,
	renderText,
}) => {
	const { theme, isDark } = useTheme();
	const { width: windowWidth } = useWindowDimensions();

	const accent = accentColor || theme.primary;
	const resolvedTextColor = textColor || theme.screen.text;
	const contrastColor = myContrastColor(accent, theme, isDark);

	const blocks = useMemo<MarkdownBlockNode[]>(() => parseMarkdownToBlocks(content || '', { collapsibleSections }), [content, collapsibleSections]);

	const baseStyle = useMemo(() => ({ color: resolvedTextColor, fontSize: 16, fontStyle: 'normal' as const }), [resolvedTextColor]);
	const defaultTextProps = useMemo(() => ({ selectable: true }), []);
	const tagsStyles = useMemo(
		() => ({
			blockquote: { fontStyle: 'italic' as const },
			td: { borderColor: theme.screen.border, borderWidth: 1 },
			th: { borderColor: theme.screen.border, borderWidth: 1 },
			a: { color: accent },
			code: { fontFamily: MONOSPACE_FONT },
		}),
		[theme.screen.border, accent],
	);
	const customRenderers = useMemo(
		() => ({
			a: makeLinkRenderer(accent, contrastColor, renderLink),
			img: makeImageRenderer(renderImage, resolvedTextColor, imageWidth, imageHeight),
			p: makeParagraphRenderer(renderText, resolvedTextColor),
			sub: makeSubRenderer(16, resolvedTextColor),
			sup: makeSupRenderer(16, resolvedTextColor),
		}),
		[accent, contrastColor, renderLink, renderImage, resolvedTextColor, imageWidth, imageHeight, renderText],
	);

	const renderBlocks = (nodes: MarkdownBlockNode[], keyPrefix: string): React.ReactNode[] =>
		nodes.map((block, index) => {
			const key = `${keyPrefix}-${index}`;
			switch (block.type) {
				case 'heading':
					return (
						<Text key={key} selectable style={[styles.heading, block.level === 1 ? styles.headingLevel1 : styles.headingLevelOther, { color: resolvedTextColor }]}>
							{block.text}
						</Text>
					);
				case 'section':
					return (
						<View key={key} style={styles.section}>
							<CollapsibleSection headerText={block.header} customColor={accent} startCollapsed={sectionsStartCollapsed}>
								{renderBlocks(block.children, key)}
							</CollapsibleSection>
						</View>
					);
				case 'html':
					return (
						<RenderHtml
							key={key}
							contentWidth={windowWidth}
							baseStyle={baseStyle}
							renderers={customRenderers}
							defaultTextProps={defaultTextProps}
							customHTMLElementModels={HTML_ELEMENT_MODELS}
							systemFonts={SYSTEM_FONTS}
							tagsStyles={tagsStyles}
							source={{ html: block.html }}
						/>
					);
				default:
					return null;
			}
		});

	return <View style={styles.container}>{renderBlocks(blocks, 'md')}</View>;
};

export default CustomMarkdown;
