import { TRenderEngine } from '@native-html/transient-render-engine';
import MarkdownIt from 'markdown-it';
import { isStandaloneLinkNode } from '../components/CustomMarkdown/MarkdownLinkHelper';

// Same markdown-it options as parseMarkdownToBlocks in repo-depkit-common.
const md = new MarkdownIt({ html: true, breaks: true });
const engine = new TRenderEngine();

function findLinks(node: any, found: any[] = []): any[] {
  if (node.tagName === 'a') found.push(node);
  for (const child of node.children ?? []) findLinks(child, found);
  return found;
}

function linkStandaloneFlags(markdown: string): boolean[] {
  const document = engine.buildTTree(md.render(markdown));
  return findLinks(document).map(isStandaloneLinkNode);
}

// A link inside running text must never become a button: on Android a View inside Text
// is laid out off screen and tears the sentence apart (the popup in Hannover, Nov 2026).
describe('isStandaloneLinkNode', () => {
  it('keeps a link that is the whole paragraph a button', () => {
    expect(linkStandaloneFlags('Intro\n\n[Mehr erfahren](https://example.com)')).toEqual([true]);
  });

  it('keeps a bold link on its own line a button', () => {
    expect(linkStandaloneFlags('**[Mehr erfahren](https://example.com)**')).toEqual([true]);
  });

  it('keeps a list item that only holds a link a button', () => {
    expect(linkStandaloneFlags('- [A](https://a.example)\n- [B](https://b.example)')).toEqual([true, true]);
  });

  it('renders a link inside a sentence inline', () => {
    expect(linkStandaloneFlags('Wenn es dir schmeckt, [stimme hier ab](https://example.com) und gib deine Stimme!')).toEqual([false]);
  });

  it('renders a link at the end of a list item text inline', () => {
    expect(linkStandaloneFlags('- 3. November: Pasta von Charlotte. [Jetzt abstimmen](https://example.com)\n- 4. November: Curry von Aron')).toEqual([false]);
  });

  it('renders a link after a soft line break inline', () => {
    expect(linkStandaloneFlags('Pasta von Charlotte.\n[Jetzt abstimmen](https://example.com)')).toEqual([false]);
  });
});
