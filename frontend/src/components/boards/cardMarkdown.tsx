import React from 'react';

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(!?\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token}`;
    const markdownLink = token.match(/^(!?)\[([^\]]+)\]\(([^)]+)\)$/);
    if (markdownLink) {
      const [, imageMarker, label, href] = markdownLink;
      if (imageMarker) {
        nodes.push(<img alt={label} key={key} src={href} />);
      } else {
        nodes.push(
          <a href={href} key={key} rel="noreferrer" target="_blank">
            {label}
          </a>,
        );
      }
    } else if (token.startsWith('http')) {
      nodes.push(
        <a href={token} key={key} rel="noreferrer" target="_blank">
          {token}
        </a>,
      );
    } else if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function checklistLine(line: string) {
  const match = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/);
  if (!match) return null;
  return {
    checked: match[1].toLowerCase() === 'x',
    text: match[2],
  };
}

export default function CardMarkdown({ compact = false, text }: { compact?: boolean; text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let orderedItems: React.ReactNode[] = [];
  let quoteLines: string[] = [];
  let detailsSummary: string | null = null;
  let detailsBody: string[] = [];

  function flushLists() {
    if (listItems.length > 0) {
      blocks.push(<ul key={`ul-${blocks.length}`}>{listItems}</ul>);
      listItems = [];
    }
    if (orderedItems.length > 0) {
      blocks.push(<ol key={`ol-${blocks.length}`}>{orderedItems}</ol>);
      orderedItems = [];
    }
  }

  function flushQuote() {
    if (quoteLines.length > 0) {
      blocks.push(<blockquote key={`quote-${blocks.length}`}>{quoteLines.join('\n')}</blockquote>);
      quoteLines = [];
    }
  }

  function flushDetails() {
    if (detailsSummary !== null) {
      blocks.push(
        <details key={`details-${blocks.length}`} open>
          <summary>{detailsSummary}</summary>
          <CardMarkdown text={detailsBody.join('\n')} />
        </details>,
      );
      detailsSummary = null;
      detailsBody = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (detailsSummary !== null && trimmed !== '</details>') {
      detailsBody.push(line);
      continue;
    }

    const detailsMatch = trimmed.match(/^<details><summary>(.*)<\/summary>$/i);
    if (detailsMatch) {
      flushLists();
      flushQuote();
      detailsSummary = detailsMatch[1];
      detailsBody = [];
      continue;
    }

    if (trimmed === '</details>') {
      flushDetails();
      continue;
    }

    if (!trimmed) {
      flushLists();
      flushQuote();
      continue;
    }

    if (trimmed === '---') {
      flushLists();
      flushQuote();
      blocks.push(<hr key={`hr-${blocks.length}`} />);
      continue;
    }

    const checklist = checklistLine(line);
    if (checklist) {
      flushQuote();
      listItems.push(
        <li className="kanban-checklist-item" key={`li-${blocks.length}-${listItems.length}`}>
          <input checked={checklist.checked} readOnly type="checkbox" />
          <span>{renderInline(checklist.text)}</span>
        </li>,
      );
      continue;
    }

    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushQuote();
      listItems.push(<li key={`li-${blocks.length}-${listItems.length}`}>{renderInline(bulletMatch[1])}</li>);
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (orderedMatch) {
      flushQuote();
      orderedItems.push(<li key={`ol-li-${blocks.length}-${orderedItems.length}`}>{renderInline(orderedMatch[1])}</li>);
      continue;
    }

    if (trimmed.startsWith('>')) {
      flushLists();
      quoteLines.push(trimmed.replace(/^>\s?/, ''));
      continue;
    }

    flushLists();
    flushQuote();
    if (trimmed.startsWith('### ')) {
      blocks.push(<h4 key={`h4-${blocks.length}`}>{renderInline(trimmed.slice(4))}</h4>);
    } else if (trimmed.startsWith('## ')) {
      blocks.push(<h3 key={`h3-${blocks.length}`}>{renderInline(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith('# ')) {
      blocks.push(<h2 key={`h2-${blocks.length}`}>{renderInline(trimmed.slice(2))}</h2>);
    } else {
      blocks.push(<p key={`p-${blocks.length}`}>{renderInline(line)}</p>);
    }
  }

  flushLists();
  flushQuote();
  flushDetails();

  return <div className={compact ? 'kanban-markdown compact' : 'kanban-markdown'}>{blocks}</div>;
}
