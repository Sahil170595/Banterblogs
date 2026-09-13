import 'highlight.js/styles/github-dark.css';
import { createElement } from 'react';
import { Reveal } from '@/components/motion/Reveal';
import type { ReportBlock, ReportSection } from '@/lib/reports/content';

/** The wrapper a code block or figure rises inside; a table rises as its own scroll box. */
export const REVEAL_WRAPPER_CLASS = 'report-reveal';

// elements that take no content (a thematic break is the one that reaches the top level)
const VOID_TAGS = new Set(['hr', 'br', 'img', 'input', 'wbr']);

// Each top-level block is its own element, exactly as the pipeline wrote it, so
// typography's sibling rules see the same siblings. Tables, code blocks and
// figures reveal as they scroll into view; prose, lists and headings never move.
function Block({ block }: { block: ReportBlock }) {
  const element = VOID_TAGS.has(block.tag)
    ? createElement(block.tag, block.props)
    : createElement(block.tag, { ...block.props, dangerouslySetInnerHTML: { __html: block.html } });
  if (block.reveal === 'table') return <Reveal className="table-scroll">{element}</Reveal>;
  if (block.reveal) return <Reveal className={REVEAL_WRAPPER_CLASS}>{element}</Reveal>;
  return element;
}

export function ReportMarkdown({ sections }: { sections: ReportSection[] }) {
  if (!sections.length) return null;

  return (
    <div className="min-w-0">
      {sections.map((section) => (
        <article key={section.originKey} id={section.id}>
          <div className="report-prose prose prose-invert">
            {section.blocks.map((block, index) => (
              <Block key={index} block={block} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
