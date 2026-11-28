import type { Element, ElementContent, Root } from 'hast';

// A report body's h2 and h3 each end in a link to themselves. The step runs
// on the rendered tree, after rehype-slug has set the ids and after the
// contents have been read, so the link is in the server HTML and no reader
// of a heading's text meets it. The link holds no text: reading.css draws
// its "#", and HeadingAnchorCopy copies its URL when it is followed.
// Imports types only, so that client helper can share the names below
// without bundling the markdown pipeline.

export const HEADING_ANCHOR_CLASS = 'heading-anchor';
/**
 * The anchor's accessible name. It is read as part of its heading's name
 * (the anchor must sit inside the heading: the contents scroll-spy reads
 * headings as direct children of the body), so it is short and never repeats
 * the heading; the contents list links every section by name.
 */
export const HEADING_ANCHOR_LABEL = 'Link to this section';
// the levels readers link to; h4 and below are detail
const ANCHORED_TAGS = new Set(['h2', 'h3']);

function isAnchor(node: ElementContent): boolean {
  if (node.type !== 'element' || node.tagName !== 'a') return false;
  const classes = node.properties.className;
  return Array.isArray(classes) && classes.includes(HEADING_ANCHOR_CLASS);
}

function anchorFor(id: string): Element {
  return {
    type: 'element',
    tagName: 'a',
    properties: { className: [HEADING_ANCHOR_CLASS], href: `#${id}`, ariaLabel: HEADING_ANCHOR_LABEL },
    children: [],
  };
}

/** Appends a self-link to every h2 and h3 that has an id; a heading already linked is left as it is. */
export function addHeadingAnchors(tree: Root): void {
  const visit = (parent: Root | Element) => {
    for (const child of parent.children) {
      if (child.type !== 'element') continue;
      if (ANCHORED_TAGS.has(child.tagName)) {
        const id = child.properties.id;
        if (typeof id === 'string' && id && !child.children.some(isAnchor)) child.children.push(anchorFor(id));
        continue;
      }
      visit(child);
    }
  };
  visit(tree);
}
