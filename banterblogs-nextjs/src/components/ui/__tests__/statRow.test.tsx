import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StatRow } from '../StatRow';

describe('StatRow', () => {
  it('sets each stat inline: a tabular value in the foreground, then its label, as one list', () => {
    const markup = renderToStaticMarkup(
      <StatRow
        label="The papers in numbers"
        items={[
          { value: '1', label: 'presented' },
          { value: '1.46M+', label: 'measurements' },
        ]}
      />,
    );
    expect(markup).toMatch(/^<ul aria-label="The papers in numbers" class="[^"]*text-label-13[^"]*text-muted-foreground/);
    expect(markup).toContain('<li><span class="font-semibold text-foreground">1</span> presented</li>');
    expect(markup).toContain('<li><span class="font-semibold text-foreground">1.46M+</span> measurements</li>');
    // tiles are gone: nothing boxed
    expect(markup).not.toMatch(/border|rounded|signal-panel/);
  });
});
