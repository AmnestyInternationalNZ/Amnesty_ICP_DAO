import React from 'react';

function safeHref(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}

function safeImageSrc(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}

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
        const src = safeImageSrc(href);
        nodes.push(src ? <img alt={label} key={key} src={src} /> : label);
      } else {
        const linkHref = safeHref(href);
        nodes.push(
          linkHref ? (
            <a href={linkHref} key={key} rel="noreferrer" target={linkHref.startsWith('#') || linkHref.startsWith('/') ? undefined : '_blank'}>
              {label}
            </a>
          ) : (
            label
          ),
        );
      }
    } else if (token.startsWith('http')) {
      const linkHref = safeHref(token);
      nodes.push(
        linkHref ? (
          <a href={linkHref} key={key} rel="noreferrer" target="_blank">
            {token}
          </a>
        ) : (
          token
        ),
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

type TableAlignment = 'left' | 'center' | 'right' | undefined;

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes('|') && splitTableRow(trimmed).length > 1;
}

function tableDividerAlignment(cell: string): TableAlignment | null {
  const normalized = cell.replace(/\s+/g, '');
  if (!/^:?-{3,}:?$/.test(normalized)) return null;
  if (normalized.startsWith(':') && normalized.endsWith(':')) return 'center';
  if (normalized.endsWith(':')) return 'right';
  return 'left';
}

function tableDividerAlignments(line: string): TableAlignment[] | null {
  if (!isTableRow(line)) return null;
  const alignments = splitTableRow(line).map(tableDividerAlignment);
  if (alignments.some((alignment) => alignment === null)) return null;
  return alignments as TableAlignment[];
}

export default function MarkdownContent({
  checklistItemClassName = 'markdown-checklist-item',
  className = 'markdown-content',
  text,
}: {
  checklistItemClassName?: string;
  className?: string;
  text: string;
}) {
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
          <MarkdownContent checklistItemClassName={checklistItemClassName} className={className} text={detailsBody.join('\n')} />
        </details>,
      );
      detailsSummary = null;
      detailsBody = [];
    }
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
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

    const nextLine = lines[lineIndex + 1];
    const tableAlignments = nextLine === undefined ? null : tableDividerAlignments(nextLine);
    if (isTableRow(line) && tableAlignments) {
      flushLists();
      flushQuote();
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      lineIndex += 2;
      while (lineIndex < lines.length && lines[lineIndex].trim() && isTableRow(lines[lineIndex])) {
        rows.push(splitTableRow(lines[lineIndex]));
        lineIndex += 1;
      }
      lineIndex -= 1;
      blocks.push(
        <div className="markdown-table-scroll" key={`table-${blocks.length}`}>
          <table>
            <thead>
              <tr>
                {headers.map((header, cellIndex) => (
                  <th key={`th-${cellIndex}`} style={{ textAlign: tableAlignments[cellIndex] ?? 'left' }}>
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`tr-${rowIndex}`}>
                  {headers.map((_, cellIndex) => (
                    <td key={`td-${rowIndex}-${cellIndex}`} style={{ textAlign: tableAlignments[cellIndex] ?? 'left' }}>
                      {renderInline(row[cellIndex] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const checklist = checklistLine(line);
    if (checklist) {
      flushQuote();
      listItems.push(
        <li className={checklistItemClassName} key={`li-${blocks.length}-${listItems.length}`}>
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

  return <div className={className}>{blocks}</div>;
}
