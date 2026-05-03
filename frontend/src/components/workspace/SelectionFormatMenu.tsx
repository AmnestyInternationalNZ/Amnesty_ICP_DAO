import {
  Bold,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  MessageCircle,
  Pilcrow,
  Quote,
} from 'lucide-react';
import type { WorkspaceBlockType, WorkspaceHighlightColor, WorkspaceTextMarkType } from '../../workspace/types';

export interface SelectionFormatState {
  blockId: string;
  selectedText: string;
  start: number;
  end: number;
  top: number;
  left: number;
}

const FORMAT_ACTIONS: Array<{ type: WorkspaceBlockType; label: string; icon: typeof Pilcrow }> = [
  { type: 'paragraph', label: 'Text', icon: Pilcrow },
  { type: 'heading1', label: 'H1', icon: Heading1 },
  { type: 'heading2', label: 'H2', icon: Heading2 },
  { type: 'heading3', label: 'H3', icon: Heading3 },
  { type: 'bullet', label: 'Bullet', icon: List },
  { type: 'checklist', label: 'Check', icon: CheckSquare },
  { type: 'quote', label: 'Quote', icon: Quote },
];

const HIGHLIGHT_COLORS: Array<{ color: WorkspaceHighlightColor; label: string }> = [
  { color: 'yellow', label: 'Yellow' },
  { color: 'green', label: 'Green' },
  { color: 'blue', label: 'Blue' },
  { color: 'pink', label: 'Pink' },
  { color: 'purple', label: 'Purple' },
];

export function SelectionFormatMenu({
  selection,
  onComment,
  onFormat,
  onIndent,
  onInlineFormat,
}: {
  selection: SelectionFormatState;
  onComment: (blockId: string, selectedText: string, start: number, end: number) => void;
  onFormat: (blockId: string, type: WorkspaceBlockType) => void;
  onIndent: (blockId: string, delta: -1 | 1) => void;
  onInlineFormat: (
    blockId: string,
    type: Exclude<WorkspaceTextMarkType, 'comment'>,
    start: number,
    end: number,
    color?: WorkspaceHighlightColor,
  ) => void;
}) {
  return (
    <div
      className="selection-format-menu"
      style={{ left: selection.left, top: selection.top }}
      onMouseDown={(event) => event.preventDefault()}
      role="toolbar"
      aria-label="Selected text formatting"
    >
      <button aria-label="Bold selected text" onClick={() => onInlineFormat(selection.blockId, 'bold', selection.start, selection.end)} type="button">
        <Bold size={15} />
        <span>Bold</span>
      </button>
      <button aria-label="Italicize selected text" onClick={() => onInlineFormat(selection.blockId, 'italic', selection.start, selection.end)} type="button">
        <Italic size={15} />
        <span>Italic</span>
      </button>
      <button aria-label="Highlight selected text" onClick={() => onInlineFormat(selection.blockId, 'highlight', selection.start, selection.end, 'yellow')} type="button">
        <Highlighter size={15} />
        <span>Highlight</span>
      </button>
      <div className="highlight-swatch-row" aria-label="Highlight colors">
        {HIGHLIGHT_COLORS.map((item) => (
          <button
            aria-label={`${item.label} highlight`}
            className="highlight-swatch"
            data-highlight-color={item.color}
            key={item.color}
            onClick={() => onInlineFormat(selection.blockId, 'highlight', selection.start, selection.end, item.color)}
            title={`${item.label} highlight`}
            type="button"
          />
        ))}
      </div>
      <span className="selection-menu-divider" />
      {FORMAT_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button aria-label={`Format block as ${action.label}`} key={action.type} onClick={() => onFormat(selection.blockId, action.type)} type="button">
            <Icon size={15} />
            <span>{action.label}</span>
          </button>
        );
      })}
      <span className="selection-menu-divider" />
      <button aria-label="Decrease block indent" onClick={() => onIndent(selection.blockId, -1)} type="button">
        <IndentDecrease size={15} />
        <span>Outdent</span>
      </button>
      <button aria-label="Increase block indent" onClick={() => onIndent(selection.blockId, 1)} type="button">
        <IndentIncrease size={15} />
        <span>Indent</span>
      </button>
      <span className="selection-menu-divider" />
      <button aria-label="Comment on selected text" onClick={() => onComment(selection.blockId, selection.selectedText, selection.start, selection.end)} type="button">
        <MessageCircle size={15} />
        <span>Comment</span>
      </button>
    </div>
  );
}
