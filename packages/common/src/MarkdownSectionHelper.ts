import MarkdownIt from 'markdown-it';
import { StringHelper } from './StringHelper';

type MarkdownItInstance = InstanceType<typeof MarkdownIt>;

// Derived from MarkdownIt's own public API instead of importing the
// `markdown-it/lib/token` subpath directly - that subpath isn't declared in
// the package's `exports` map and can fail to resolve depending on the
// bundler/module-resolution settings of the consuming app.
type Token = ReturnType<MarkdownItInstance['parse']>[number];

export type MarkdownBlockNode =
	| { type: 'html'; html: string }
	| { type: 'heading'; text: string; level: number }
	| { type: 'section'; header: string; level: number; children: MarkdownBlockNode[] };

export type ParseMarkdownOptions = {
	/**
	 * When true, `##`/`###`/... headings (level >= 2) open a nested,
	 * collapsible section instead of rendering as a plain heading - the
	 * consuming UI decides how to render a 'section' node (e.g. as an
	 * accordion). Level-1 headings (`#`) are always plain headings, matching
	 * how a document title reads. Defaults to false (every heading is plain).
	 */
	collapsibleSections?: boolean;
};

function createMarkdownIt(): MarkdownItInstance {
	const md = new MarkdownIt({ html: true, breaks: true });
	// Authored content (WYSIWYG fields, copy-pasted documents) regularly carries
	// tab/4-space indentation that CommonMark would turn into an indented code
	// block - swallowing links, formatting and line breaks into one literal
	// blob (e.g. the privacy policy "Kontakt" section). Content authors never
	// mean indentation as code, so indented code blocks are disabled; fenced
	// ``` blocks still work for intentional code.
	md.disable('code');
	md.core.ruler.push('list_item_trailing_links_own_line', moveTrailingListItemLinksToOwnLine);
	return md;
}

type MarkdownCoreState = Parameters<Parameters<MarkdownItInstance['core']['ruler']['push']>[1]>[0];

function isBlankInlineToken(token: Token): boolean {
	return token.type === 'softbreak' || token.type === 'hardbreak' || (token.type === 'text' && token.content.trim() === '');
}

/**
 * Splits the links at the end of a list item's text off that text, e.g. the "Jetzt abstimmen"
 * in `- 3. November: Pasta von Charlotte. [Jetzt abstimmen](https://...)`. Returns null when
 * there is nothing to split: no trailing link, or the item holds nothing but links anyway.
 */
export function splitTrailingLinks(children: Token[]): { text: Token[]; links: Token[][] } | null {
	const links: Token[][] = [];
	let end = children.length;
	while (end > 0) {
		while (end > 0 && isBlankInlineToken(children[end - 1])) end--;
		if (end === 0 || children[end - 1].type !== 'link_close') break;
		let start = end - 1;
		while (start >= 0 && children[start].type !== 'link_open') start--;
		if (start < 0) break;
		links.unshift(children.slice(start, end));
		end = start;
	}
	if (links.length === 0) return null;

	const text = children.slice(0, end);
	while (text.length > 0 && isBlankInlineToken(text[text.length - 1])) text.pop();
	if (text.length === 0) return null;
	const last = text[text.length - 1];
	if (last.type === 'text') last.content = last.content.replace(/\s+$/, '');
	return { text, links };
}

/**
 * Links at the end of a list item get their own paragraph, so the renderer shows them as a
 * button on a new line below the item's text instead of squeezing a button into the running
 * text (which Android can't lay out). Done here and not in the content, because editors write
 * `- Gericht von Charlotte. [Jetzt abstimmen](...)` again and again. Links inside a sentence stay
 * inline: moving them would tear words out of the sentence.
 */
function moveTrailingListItemLinksToOwnLine(state: MarkdownCoreState): void {
	const tokens = state.tokens;
	let listItemDepth = 0;
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token.type === 'list_item_open') listItemDepth++;
		if (token.type === 'list_item_close') listItemDepth--;
		if (listItemDepth === 0 || token.type !== 'inline' || !token.children) continue;
		const paragraphClose = tokens[i + 1];
		if (paragraphClose?.type !== 'paragraph_close') continue;
		const split = splitTrailingLinks(token.children);
		if (!split) continue;

		token.children = split.text;
		const linkParagraphs = split.links.flatMap((linkChildren) => {
			const open = new state.Token('paragraph_open', 'p', 1);
			open.block = true;
			open.level = paragraphClose.level;
			const inline = new state.Token('inline', '', 0);
			inline.level = paragraphClose.level + 1;
			inline.content = '';
			inline.children = linkChildren;
			const close = new state.Token('paragraph_close', 'p', -1);
			close.block = true;
			close.level = paragraphClose.level;
			return [open, inline, close];
		});
		tokens.splice(i + 2, 0, ...linkParagraphs);
		i += 1 + linkParagraphs.length;
	}
}

// CommonMark link destinations can't contain a raw, unescaped space, so a
// `[text](geo:52.1, 8.0)`-style link (space after the comma) silently fails to
// parse as a link and falls through as literal text. Location links are the
// only ones content authors realistically write with a space in the
// coordinates, so strip whitespace from just those destinations before parsing.
const LOCATION_LINK_DESTINATION_PATTERN = /\((geo:|maps:|latlon:)([^)]*)\)/gi;

export function sanitizeLocationLinkWhitespace(sourceContent: string): string {
	return sourceContent.replace(LOCATION_LINK_DESTINATION_PATTERN, (_match, scheme, coordinates) => `(${scheme}${coordinates.replace(/\s+/g, '')})`);
}

// Authored content (e.g. a Directus WYSIWYG field) may mix raw HTML headings
// with markdown syntax. markdown-it (html: true) treats everything from a
// block-level HTML tag until the next blank line as one raw HTML block, so
// markdown on the lines after `<h2>...</h2>` (links, bold, line breaks, ...)
// silently stays literal text. Converting HTML headings to markdown headings
// keeps the heading, lets the surrounding markdown parse again, and makes
// `collapsibleSections` work for such content too.
const HTML_HEADING_PATTERN = /<h([1-6])(?:\s[^>]*)?>([\s\S]*?)<\/h\1\s*>/gi;

export function convertHtmlHeadingsToMarkdown(sourceContent: string): string {
	return sourceContent.replace(HTML_HEADING_PATTERN, (_match, level, text) => {
		const headingText = String(text).replace(/\s+/g, ' ').trim();
		return `\n\n${'#'.repeat(Number(level))} ${headingText}\n\n`;
	});
}

// A link written as `[text] (https://...)` - or with a line break between the
// closing bracket and the destination - is not a CommonMark link and would
// fall through as literal text. When the destination starts with a known
// scheme the author clearly meant a link, so close the gap for just those.
const LINK_DESTINATION_GAP_PATTERN = /\]\s+\((?=https?:|mailto:|tel:|geo:|maps:|latlon:)/gi;

export function sanitizeLinkDestinationGap(sourceContent: string): string {
	return sourceContent.replace(LINK_DESTINATION_GAP_PATTERN, '](');
}

/**
 * Normalizes the various ways authored content ends up with a literal
 * backslash-n, a real CRLF, or raw `<br>`/`<p>` HTML into real newlines that
 * markdown-it's block parser understands. Order matters: the literal `\n`
 * replacement runs first, so it also consumes the `\n` half of a literal
 * `\r\n` sequence before the dedicated `\r\n` pass would otherwise see it -
 * kept as-is to match the pre-existing, already-shipped behavior.
 */
export function normalizeLinebreaks(sourceContent: string): string {
	let result = sourceContent;
	result = StringHelper.replaceAllLiteralWithOptions({ str: result, find: String.raw`\n`, replace: '\n' });
	result = StringHelper.replaceAllLiteralWithOptions({ str: result, find: String.raw`\r\n`, replace: '\n' });
	result = StringHelper.replaceAllLiteralWithOptions({ str: result, find: '<br/>', replace: '\n' });
	result = StringHelper.replaceAllLiteralWithOptions({ str: result, find: '</br>', replace: '\n' });
	result = StringHelper.replaceAllLiteralWithOptions({ str: result, find: '<br>', replace: '\n' });
	result = StringHelper.replaceAllLiteralWithOptions({ str: result, find: '<p/>', replace: '\n' });
	result = StringHelper.replaceAllLiteralWithOptions({ str: result, find: '</p>', replace: '\n' });
	result = StringHelper.replaceAllLiteralWithOptions({ str: result, find: '<p>', replace: '\n' });
	return result;
}

function headingLevel(token: Token): number {
	return Number(token.tag.slice(1)) || 1;
}

/**
 * Groups a flat markdown-it block token stream into a heading-based tree:
 * every heading at or below a section's own level closes that section (and
 * any of its still-open ancestors), matching how a reader would expect
 * `## A` / `### A.1` / `## B` to nest (`A.1` under `A`, `B` a sibling of `A`,
 * not a child). Returns the built blocks and the index just past what this
 * call consumed - the recursive call for a nested section stops as soon as it
 * sees a heading at or above its own level and hands control back up.
 */
function buildBlocks(tokens: Token[], md: MarkdownItInstance, env: unknown, collapsibleSections: boolean, startIdx: number, stopLevel: number | null): [MarkdownBlockNode[], number] {
	const blocks: MarkdownBlockNode[] = [];
	let htmlBuffer: Token[] = [];
	let idx = startIdx;

	const flushHtml = () => {
		if (htmlBuffer.length > 0) {
			blocks.push({ type: 'html', html: md.renderer.render(htmlBuffer, md.options, env) });
			htmlBuffer = [];
		}
	};

	while (idx < tokens.length) {
		// Guaranteed by the loop condition (idx < tokens.length); narrows past
		// noUncheckedIndexedAccess's `Token | undefined` for consumers of this package.
		const token = tokens[idx]!;

		if (token.type === 'heading_open') {
			const level = headingLevel(token);
			if (stopLevel !== null && level <= stopLevel) {
				break;
			}

			flushHtml();
			const headingText = (tokens[idx + 1]?.content ?? '').trim();
			idx += 3; // heading_open, inline, heading_close - always adjacent for ATX/Setext headings.

			if (collapsibleSections && level >= 2) {
				const [children, nextIdx] = buildBlocks(tokens, md, env, collapsibleSections, idx, level);
				blocks.push({ type: 'section', header: headingText, level, children });
				idx = nextIdx;
			} else {
				blocks.push({ type: 'heading', text: headingText, level });
			}
			continue;
		}

		htmlBuffer.push(token);
		idx += 1;
	}

	flushHtml();
	return [blocks, idx];
}

/**
 * Parses markdown content (CommonMark via markdown-it - tables, images,
 * nested lists, inline formatting all supported) into a small block tree a
 * UI layer can render: plain HTML chunks (as already-rendered HTML strings,
 * ready for an HTML-to-native renderer), plain headings, and - opt-in via
 * `collapsibleSections` - nested sections for `##`+ headings.
 */
export function parseMarkdownToBlocks(rawContent: string, options: ParseMarkdownOptions = {}): MarkdownBlockNode[] {
	const collapsibleSections = options.collapsibleSections ?? false;

	let content = rawContent || '';
	content = normalizeLinebreaks(content);
	content = convertHtmlHeadingsToMarkdown(content);
	content = sanitizeLinkDestinationGap(content);
	content = sanitizeLocationLinkWhitespace(content);

	const md = createMarkdownIt();
	const env = {};
	const tokens = md.parse(content, env);

	const [blocks] = buildBlocks(tokens, md, env, collapsibleSections, 0, null);
	return blocks;
}
