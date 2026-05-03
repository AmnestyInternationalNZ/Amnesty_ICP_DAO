import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BlockRenderer, renderMarkedText } from '../../../frontend/src/components/workspace/BlockRenderer';
import { isBlockHiddenByCollapsedToggle } from '../../../frontend/src/components/workspace/DocumentEditor';
import { SelectionFormatMenu } from '../../../frontend/src/components/workspace/SelectionFormatMenu';
import type { WorkspaceBlock } from '../../../frontend/src/workspace/types';

function block(overrides: Partial<WorkspaceBlock> = {}): WorkspaceBlock {
  return {
    id: 'block-1',
    text: 'Hello workspace',
    type: 'paragraph',
    ...overrides,
  };
}

const noop = () => {};
const blockRendererProps = {
  canEdit: false,
  commentsCount: 0,
  index: 0,
  isSlashOpen: false,
  totalBlocks: 1,
  onBackspaceAtBoundary: noop,
  onCheckedChange: noop,
  onCloseSlash: noop,
  onDelete: noop,
  onDuplicate: noop,
  onEnter: noop,
  onFocusNext: noop,
  onFocusPrevious: noop,
  onIndentChange: noop,
  onInsertAfter: noop,
  onInsertBefore: noop,
  onMarkdownShortcut: noop,
  onMediaChange: noop,
  onMoveBlock: noop,
  onNumberingChange: noop,
  onOpenComments: noop,
  onOpenSlash: noop,
  onSelectionChange: noop,
  onTextChange: noop,
  onToggleCollapsed: noop,
  onToggleLink: noop,
  onTypeChange: noop,
};

describe('workspace rendering', () => {
  it('renders linked text in read-only linked mode', () => {
    const html = renderToStaticMarkup(
      <BlockRenderer {...blockRendererProps} block={block({ text: 'Open https://example.com' })} />,
    );

    expect(html).toContain('data-render-mode="linked"');
    expect(html).toContain('href="https://example.com/"');
    expect(html).not.toContain('contenteditable="true"');
  });

  it('renders inline marks without entering edit mode', () => {
    const html = renderToStaticMarkup(
      <span>
        {renderMarkedText('Bold note', [
          { id: 'm1', type: 'bold', start: 0, end: 4 },
          { id: 'm2', type: 'highlight', start: 5, end: 9, color: 'yellow' },
          { id: 'm3', type: 'comment', start: 5, end: 9, commentId: 'c1' },
        ])}
      </span>,
    );

    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('data-highlight-color="yellow"');
    expect(html).toContain('data-comment-id="c1"');
  });

  it('renders editable contentEditable blocks and slash commands', () => {
    const html = renderToStaticMarkup(
      <BlockRenderer {...blockRendererProps} block={block({ text: '/' })} canEdit isSlashOpen />,
    );

    expect(html).toContain('contenteditable="true"');
    expect(html).toContain('data-render-mode="editable"');
    expect(html).toContain('/commands');
    expect(html).toContain('Heading 1');
  });

  it('renders selection formatting controls for DOMRange selections', () => {
    const html = renderToStaticMarkup(
      <SelectionFormatMenu
        onClose={noop}
        onComment={noop}
        onFormat={noop}
        onIndent={noop}
        onTypeChange={noop}
        position={{ x: 240, y: 120 }}
        selection={{ blockId: 'block-1', end: 5, start: 0, text: 'Hello' }}
      />,
    );

    expect(html).toContain('Selected text formatting');
    expect(html).toContain('Bold');
    expect(html).toContain('Outdent');
    expect(html).toContain('Comment');
  });

  it('keeps collapsed toggle visibility scoped to true ancestors only', () => {
    const blocks = [
      block({ id: 'parent', text: 'Toggle', type: 'toggle', collapsed: true, indent: 0 }),
      block({ id: 'child', text: 'Hidden child', indent: 1 }),
      block({ id: 'sibling', text: 'Sibling heading', type: 'heading2', indent: 0 }),
      block({ id: 'sibling-child', text: 'Visible child', indent: 1 }),
    ];

    expect(isBlockHiddenByCollapsedToggle(blocks, 1)).toBe(true);
    expect(isBlockHiddenByCollapsedToggle(blocks, 3)).toBe(false);
  });

  it('shows block comment pills without replacing content rendering', () => {
    const onOpenComments = vi.fn();
    const html = renderToStaticMarkup(
      <BlockRenderer {...blockRendererProps} block={block()} commentsCount={2} onOpenComments={onOpenComments} />,
    );

    expect(html).toContain('comment-pill');
    expect(html).toContain('2');
  });
});
