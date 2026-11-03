import { convertHtmlHeadingsToMarkdown, normalizeLinebreaks, parseMarkdownToBlocks, sanitizeLinkDestinationGap, sanitizeLocationLinkWhitespace } from 'repo-depkit-common';

describe('sanitizeLocationLinkWhitespace', () => {
	it('strips whitespace from geo/maps/latlon link destinations', () => {
		expect(sanitizeLocationLinkWhitespace('[Meeting point](geo:52.5, 13.4)')).toBe('[Meeting point](geo:52.5,13.4)');
		expect(sanitizeLocationLinkWhitespace('[Spot](maps:52.5,  13.4)')).toBe('[Spot](maps:52.5,13.4)');
		expect(sanitizeLocationLinkWhitespace('[Spot](latlon:52.5, 13.4)')).toBe('[Spot](latlon:52.5,13.4)');
	});

	it('leaves unrelated links untouched', () => {
		expect(sanitizeLocationLinkWhitespace('[Website](https://example.com/a b)')).toBe('[Website](https://example.com/a b)');
	});
});

describe('convertHtmlHeadingsToMarkdown', () => {
	it('converts an html heading (with attributes) to a markdown heading', () => {
		expect(convertHtmlHeadingsToMarkdown('<h1>Impressum</h1>').trim()).toBe('# Impressum');
		expect(convertHtmlHeadingsToMarkdown('<h2 style="color: red">Herausgeber:</h2>').trim()).toBe('## Herausgeber:');
	});

	it('collapses inner whitespace of a multi-line heading', () => {
		expect(convertHtmlHeadingsToMarkdown('<h3>Multi\n  line</h3>').trim()).toBe('### Multi line');
	});

	it('leaves content without html headings untouched', () => {
		expect(convertHtmlHeadingsToMarkdown('Just **markdown** text.')).toBe('Just **markdown** text.');
	});
});

describe('sanitizeLinkDestinationGap', () => {
	it('closes a space or line break between link text and a known-scheme destination', () => {
		expect(sanitizeLinkDestinationGap('[mail] (mailto:a@b.de)')).toBe('[mail](mailto:a@b.de)');
		expect(sanitizeLinkDestinationGap('[site]\n(https://example.com)')).toBe('[site](https://example.com)');
	});

	it('leaves ordinary text with brackets and parentheses untouched', () => {
		expect(sanitizeLinkDestinationGap('siehe [1] (Anmerkung)')).toBe('siehe [1] (Anmerkung)');
	});
});

describe('normalizeLinebreaks', () => {
	it('turns literal backslash-n into a real newline', () => {
		expect(normalizeLinebreaks('line one\\nline two')).toBe('line one\nline two');
	});

	it('turns <br> variants into real newlines', () => {
		expect(normalizeLinebreaks('a<br>b<br/>c</br>d')).toBe('a\nb\nc\nd');
	});

	it('turns <p> tags into real newlines', () => {
		expect(normalizeLinebreaks('<p>a</p><p>b</p>')).toBe('\na\n\nb\n');
	});
});

describe('parseMarkdownToBlocks - flat mode (collapsibleSections: false)', () => {
	it('renders a heading as a plain heading block, not a section', () => {
		const blocks = parseMarkdownToBlocks('## Kurz gesagt\n\nSome text.');
		expect(blocks).toEqual([
			{ type: 'heading', text: 'Kurz gesagt', level: 2 },
			{ type: 'html', html: expect.stringContaining('Some text.') },
		]);
	});

	it('renders a table as html', () => {
		const blocks = parseMarkdownToBlocks('| a | b |\n| - | - |\n| 1 | 2 |');
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toMatchObject({ type: 'html' });
		expect((blocks[0] as { html: string }).html).toContain('<table>');
	});

	it('renders an image as html', () => {
		const blocks = parseMarkdownToBlocks('![alt text](https://example.com/img.png)');
		const html = (blocks[0] as { html: string }).html;
		expect(html).toContain('<img');
		expect(html).toContain('src="https://example.com/img.png"');
		expect(html).toContain('alt="alt text"');
	});

	it('renders a mailto link as html', () => {
		const blocks = parseMarkdownToBlocks('[Contact us](mailto:test@example.com)');
		const html = (blocks[0] as { html: string }).html;
		expect(html).toContain('href="mailto:test@example.com"');
	});
});

describe('parseMarkdownToBlocks - collapsible sections', () => {
	it('nests a lower heading level under its parent section', () => {
		const blocks = parseMarkdownToBlocks('## A\n\nA text.\n\n### A.1\n\nNested text.\n\n## B\n\nB text.', { collapsibleSections: true });

		expect(blocks).toHaveLength(2);
		const sectionA = blocks[0] as { type: 'section'; header: string; level: number; children: unknown[] };
		expect(sectionA.type).toBe('section');
		expect(sectionA.header).toBe('A');
		expect(sectionA.level).toBe(2);
		// A's own "A text." html block, plus the nested A.1 section.
		expect(sectionA.children).toHaveLength(2);
		expect(sectionA.children[1]).toMatchObject({ type: 'section', header: 'A.1', level: 3 });

		const sectionB = blocks[1] as { type: 'section'; header: string };
		expect(sectionB.type).toBe('section');
		expect(sectionB.header).toBe('B');
	});

	it('keeps a level-1 heading as a plain heading even with collapsibleSections enabled', () => {
		const blocks = parseMarkdownToBlocks('# Title\n\n## Section', { collapsibleSections: true });
		expect(blocks[0]).toEqual({ type: 'heading', text: 'Title', level: 1 });
		expect(blocks[1]).toMatchObject({ type: 'section', header: 'Section', level: 2 });
	});

	it('a level-1 heading closes any open sections', () => {
		const blocks = parseMarkdownToBlocks('## A\n\ntext\n\n# Title\n\n## B\n\ntext', { collapsibleSections: true });
		expect(blocks.map((b) => b.type)).toEqual(['section', 'heading', 'section']);
	});
});

describe('parseMarkdownToBlocks - html headings mixed with markdown', () => {
	// Regression: markdown-it (html: true) swallows all lines after a raw
	// block-level tag (until a blank line) into one raw HTML block, so links
	// on the lines after `<h2>...</h2>` stayed literal `[text](url)` text.
	it('parses markdown links on the lines directly after an html heading', () => {
		const content = '<h2>Kontakt</h2>\nE-Mail: [info@example.com](mailto:info@example.com)\nWebsite: [example.com](https://example.com)';
		const blocks = parseMarkdownToBlocks(content);
		expect(blocks[0]).toEqual({ type: 'heading', text: 'Kontakt', level: 2 });
		const html = (blocks[1] as { html: string }).html;
		expect(html).toContain('href="mailto:info@example.com"');
		expect(html).toContain('href="https://example.com"');
	});

	it('turns html headings into collapsible sections when enabled', () => {
		const blocks = parseMarkdownToBlocks('<h2>Herausgeber:</h2>\nText mit [Link](https://example.com)', { collapsibleSections: true });
		expect(blocks[0]).toMatchObject({ type: 'section', header: 'Herausgeber:', level: 2 });
	});

	it('parses a link whose destination is separated by a line break from its text', () => {
		const blocks = parseMarkdownToBlocks('E-Mail: [info@example.com]\n(mailto:info@example.com)');
		const html = (blocks[0] as { html: string }).html;
		expect(html).toContain('href="mailto:info@example.com"');
	});
});

describe('parseMarkdownToBlocks - tab/space-indented content', () => {
	// Regression: the privacy policy "Kontakt" section was authored with every
	// line tab-indented. CommonMark turns indented lines into an indented code
	// block, so the whole section rendered as one literal blob - markdown links
	// stayed `[text](url)` text and no contact buttons appeared.
	it('parses links in tab-indented content instead of treating it as a code block', () => {
		const content = '## Kontakt\n\n\tWende dich bitte an unsere Datenschutzbeauftragte.\n\n\tE-Mail:\n\n\t[info@example.com](mailto:info@example.com)\n\n\tWebsite:\n\n\t[https://example.com](https://example.com)';
		const blocks = parseMarkdownToBlocks(content, { collapsibleSections: true });

		expect(blocks[0]).toMatchObject({ type: 'section', header: 'Kontakt', level: 2 });
		const section = blocks[0] as { children: { type: string; html?: string }[] };
		const html = section.children.map((child) => child.html ?? '').join('');
		expect(html).not.toContain('<pre>');
		expect(html).toContain('href="mailto:info@example.com"');
		expect(html).toContain('href="https://example.com"');
	});

	it('keeps fenced code blocks as code', () => {
		const blocks = parseMarkdownToBlocks('```\nconst a = 1;\n```');
		const html = (blocks[0] as { html: string }).html;
		expect(html).toContain('<pre>');
		expect(html).toContain('const a = 1;');
	});
});

describe('parseMarkdownToBlocks - reference-style links resolve across chunks', () => {
	it('resolves a reference link even when split across separate rendered html chunks by a heading', () => {
		const blocks = parseMarkdownToBlocks('[link][ref]\n\n## Heading\n\ntext\n\n[ref]: https://example.com', { collapsibleSections: true });
		const firstHtml = (blocks[0] as { html: string }).html;
		expect(firstHtml).toContain('href="https://example.com"');
	});
});

// A link at the end of a list item used to be squeezed into the item's line as a button, which
// Android can't lay out (recipe contest popup in Hannover). It now gets its own line.
describe('parseMarkdownToBlocks: trailing links in list items', () => {
	const html = (markdown: string) => (parseMarkdownToBlocks(markdown)[0] as { html: string }).html;

	it('moves a trailing link into its own paragraph', () => {
		expect(html('- **3. November:** Pasta von Charlotte. [Jetzt abstimmen](https://example.com)')).toBe(
			'<ul>\n<li><strong>3. November:</strong> Pasta von Charlotte.\n<p><a href="https://example.com">Jetzt abstimmen</a></p>\n</li>\n</ul>\n',
		);
	});

	it('gives every trailing link its own paragraph', () => {
		expect(html('- Dann [Info](https://a.example) [Mehr](https://b.example)')).toContain('Dann\n<p><a href="https://a.example">Info</a></p>\n<p><a href="https://b.example">Mehr</a></p>');
	});

	it('keeps a link inside a sentence where it is', () => {
		expect(html('- Wenn es schmeckt, [stimme ab](https://example.com) und gib deine Stimme!')).toBe('<ul>\n<li>Wenn es schmeckt, <a href="https://example.com">stimme ab</a> und gib deine Stimme!</li>\n</ul>\n');
	});

	it('leaves list items that only hold a link alone', () => {
		expect(html('- [A](https://a.example)')).toBe('<ul>\n<li><a href="https://a.example">A</a></li>\n</ul>\n');
	});

	it('does not touch links at the end of a plain paragraph', () => {
		expect(html('Absatz mit [Link](https://example.com)')).toBe('<p>Absatz mit <a href="https://example.com">Link</a></p>\n');
	});
});
