import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import MarkdownContent from '../../../frontend/src/components/MarkdownContent';

describe('fundraising markdown content', () => {
  it('renders formatted campaign body copy', () => {
    const html = renderToStaticMarkup(
      <MarkdownContent
        className="fundraising-markdown-content"
        text={'## About\n**Urgent** support\n- Textbooks\n> Every child can learn\n[Read more](https://example.org)'}
      />,
    );

    expect(html).toContain('<h3>About</h3>');
    expect(html).toContain('<strong>Urgent</strong>');
    expect(html).toContain('<li>Textbooks</li>');
    expect(html).toContain('<blockquote>Every child can learn</blockquote>');
    expect(html).toContain('href="https://example.org"');
  });

  it('renders markdown pipe tables as tables', () => {
    const html = renderToStaticMarkup(
      <MarkdownContent
        className="fundraising-markdown-content"
        text={'| Item | Cost |\n| --- | ---: |\n| Textbooks | $500 |\n| Classroom materials | $300 |'}
      />,
    );

    expect(html).toContain('<table>');
    expect(html).toContain('<th style="text-align:left">Item</th>');
    expect(html).toContain('<th style="text-align:right">Cost</th>');
    expect(html).toContain('<td style="text-align:left">Textbooks</td>');
    expect(html).toContain('<td style="text-align:right">$500</td>');
  });
});
