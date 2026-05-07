import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Link,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';
import { Fragment, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import type { NumberedListMarker } from '../../workspace/numberedLists';
import {
  commandForBlockType,
  filterSlashCommands,
  firstValidHyperlink,
  isTextEditableBlock,
  linkifyText,
  markdownShortcutForText,
  shouldOpenSlashMenu,
  slashQueryForText,
  type MarkdownShortcutResult,
} from '../../workspace/editorCommands';
import { blockCommandHint, blockCommandLabel, blockTypeLabel } from '../../workspace/localizedEditorCommands';
import type {
  WorkspaceBlock,
  WorkspaceBlockType,
  WorkspaceNumberedListMode,
  WorkspaceTextMark,
} from '../../workspace/types';
import { SlashCommandMenu } from './SlashCommandMenu';

export interface BlockFocusRequest {
  id: string;
  nonce: number;
}

function readEditableText(element: HTMLElement | null): string {
  return element?.textContent?.replace(/\n$/, '') ?? '';
}

function caretOffset(element: HTMLElement | null): number {
  if (!element) return 0;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  const clone = range.cloneRange();
  clone.selectNodeContents(element);
  clone.setEnd(range.endContainer, range.endOffset);
  return clone.toString().length;
}

function offsetForRangePoint(element: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(element);
  setRangeEndSafely(range, element, container, offset);
  return range.toString().length;
}

function setRangeEndSafely(range: Range, element: HTMLElement, container: Node, offset: number) {
  try {
    range.setEnd(container, offset);
  } catch {
    range.setEnd(element, element.childNodes.length);
  }
}

function setCaretToEnd(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function blockClassName(type: WorkspaceBlockType): string {
  return `notion-block block-${type}`;
}

function activeMarksForRange(marks: WorkspaceTextMark[], start: number, end: number): WorkspaceTextMark[] {
  return marks.filter((mark) => mark.start < end && mark.end > start);
}

export function renderMarkedText(text: string, marks: WorkspaceTextMark[] = []): ReactNode[] {
  if (marks.length === 0) return [text];

  const boundaries = new Set<number>([0, text.length]);
  for (const mark of marks) {
    boundaries.add(Math.max(0, Math.min(text.length, mark.start)));
    boundaries.add(Math.max(0, Math.min(text.length, mark.end)));
  }

  const sorted = [...boundaries].sort((a, b) => a - b);
  return sorted.flatMap((start, index) => {
    const end = sorted[index + 1];
    if (end === undefined || end <= start) return [];
    let node: ReactNode = text.slice(start, end);
    for (const mark of activeMarksForRange(marks, start, end)) {
      if (mark.type === 'bold') node = <strong key={`${mark.id}-bold-${start}`}>{node}</strong>;
      if (mark.type === 'italic') node = <em key={`${mark.id}-italic-${start}`}>{node}</em>;
      if (mark.type === 'highlight') {
        node = (
          <mark data-highlight-color={mark.color ?? 'yellow'} key={`${mark.id}-highlight-${start}`}>
            {node}
          </mark>
        );
      }
      if (mark.type === 'comment') {
        node = (
          <span className="inline-comment-mark" data-comment-id={mark.commentId} key={`${mark.id}-comment-${start}`}>
            {node}
          </span>
        );
      }
    }
    return <Fragment key={`${start}-${end}`}>{node}</Fragment>;
  });
}

export function BlockRenderer({
  block,
  canEdit,
  commentsCount,
  commentPillVariant = 'inline',
  focusRequest,
  index,
  isSlashOpen,
  numberedMarker,
  selectionMode = false,
  totalBlocks,
  onBackspaceAtBoundary,
  onCheckedChange,
  onCloseSlash,
  onDelete,
  onDuplicate,
  onEnter,
  onFocusNext,
  onFocusPrevious,
  onIndentChange,
  onInsertAfter,
  onInsertBefore,
  onMarkdownShortcut,
  onMediaChange,
  onMoveBlock,
  onNumberingChange,
  onOpenComments,
  onOpenSlash,
  onSelectionChange,
  onTextChange,
  onToggleCollapsed,
  onToggleLink,
  onTypeChange,
}: {
  block: WorkspaceBlock;
  canEdit: boolean;
  commentsCount: number;
  commentPillVariant?: 'inline' | 'block';
  focusRequest?: BlockFocusRequest;
  index: number;
  isSlashOpen: boolean;
  numberedMarker?: NumberedListMarker;
  selectionMode?: boolean;
  totalBlocks: number;
  onBackspaceAtBoundary: (blockId: string, index: number, mode: 'empty' | 'start') => void;
  onCheckedChange: (blockId: string, checked: boolean) => void;
  onCloseSlash: () => void;
  onDelete: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
  onEnter: (block: WorkspaceBlock, index: number) => void;
  onFocusNext: (index: number) => void;
  onFocusPrevious: (index: number) => void;
  onIndentChange: (blockId: string, delta: -1 | 1) => void;
  onInsertAfter: (index: number) => void;
  onInsertBefore: (index: number) => void;
  onMarkdownShortcut: (blockId: string, shortcut: MarkdownShortcutResult) => void;
  onMediaChange: (blockId: string, fields: { url?: string; caption?: string; text?: string }) => void;
  onMoveBlock: (blockId: string, targetIndex: number) => void;
  onNumberingChange: (blockId: string, mode?: WorkspaceNumberedListMode) => void;
  onOpenComments: (blockId: string) => void;
  onOpenSlash: (blockId: string) => void;
  onSelectionChange: (selection?: { blockId: string; selectedText: string; start: number; end: number; rect: DOMRect }) => void;
  onTextChange: (blockId: string, text: string) => void;
  onToggleCollapsed: (blockId: string, collapsed: boolean) => void;
  onToggleLink: (blockId: string, disabled: boolean) => void;
  onTypeChange: (blockId: string, type: WorkspaceBlockType) => void;
}) {
  const { t } = useTranslation();
  const blockRef = useRef<HTMLDivElement | null>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: !canEdit || selectionMode,
  });
  const command = commandForBlockType(block.type);
  const editable = canEdit && isTextEditableBlock(block.type);
  const detectedHref = isTextEditableBlock(block.type) ? firstValidHyperlink(block.text) : undefined;
  const linkActive = Boolean(detectedHref) && !block.linkDisabled;
  const hasInlineMarks = (block.inlineMarks?.length ?? 0) > 0;
  const renderLinkedText = !hasInlineMarks && linkActive && !focused && block.text.length > 0;
  const slashQuery = slashQueryForText(block.text);
  const slashCommands = filterSlashCommands(slashQuery);
  const mediaHref = block.url?.trim() || firstValidHyperlink(block.text) || '';

  useEffect(() => {
    const element = editableRef.current;
    if (!element) return;
    if (hasInlineMarks) return;
    if (element.childElementCount > 0 || element.textContent !== block.text) {
      element.textContent = block.text;
    }
  }, [block.text, focused, hasInlineMarks]);

  useEffect(() => {
    if (!menuOpen) return;

    function closeMenuOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (blockRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    }

    document.addEventListener('pointerdown', closeMenuOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeMenuOnOutsidePointer, true);
  }, [menuOpen]);

  useEffect(() => {
    if (selectionMode) setMenuOpen(false);
  }, [selectionMode]);

  useEffect(() => {
    if (focusRequest?.id !== block.id || !editable) return;
    setFocused(true);
    window.requestAnimationFrame(() => {
      const element = editableRef.current;
      if (!element) return;
      element.focus();
      setCaretToEnd(element);
    });
  }, [block.id, editable, focusRequest?.id, focusRequest?.nonce]);

  useEffect(() => {
    setSlashSelectedIndex(0);
  }, [slashQuery]);

  useEffect(() => {
    if (slashSelectedIndex < slashCommands.length) return;
    setSlashSelectedIndex(Math.max(0, slashCommands.length - 1));
  }, [slashCommands.length, slashSelectedIndex]);

  function enterEditMode() {
    if (!editable) return;
    setFocused(true);
    window.requestAnimationFrame(() => {
      const element = editableRef.current;
      if (!element) return;
      if (element.childElementCount > 0 || element.textContent !== block.text) {
        element.textContent = block.text;
      }
      element.focus();
      setCaretToEnd(element);
    });
  }

  function handleInput() {
    const nextText = readEditableText(editableRef.current);
    onSelectionChange(undefined);
    setMenuOpen(false);
    if (isSlashOpen && !nextText.startsWith('/')) onCloseSlash();
    const shortcut = markdownShortcutForText(nextText);
    if (shortcut) {
      onCloseSlash();
      onMarkdownShortcut(block.id, shortcut);
      if (editableRef.current) editableRef.current.textContent = shortcut.text;
      return;
    }
    onTextChange(block.id, nextText);
  }

  function setBlockNodeRef(node: HTMLDivElement | null) {
    blockRef.current = node;
    setNodeRef(node);
  }

  function updateSelectionMenu() {
    if (!editableRef.current || !editable) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      onSelectionChange(undefined);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editableRef.current.contains(range.commonAncestorContainer)) {
      onSelectionChange(undefined);
      return;
    }

    const start = offsetForRangePoint(editableRef.current, range.startContainer, range.startOffset);
    const end = offsetForRangePoint(editableRef.current, range.endContainer, range.endOffset);
    const selectedText = selection.toString().trim();
    const rect = range.getBoundingClientRect();
    if (!selectedText || end <= start || (rect.width === 0 && rect.height === 0)) {
      onSelectionChange(undefined);
      return;
    }

    onSelectionChange({ blockId: block.id, selectedText, start, end, rect });
  }

  function selectSlashCommand(type: WorkspaceBlockType) {
    if (editableRef.current) editableRef.current.textContent = '';
    onTextChange(block.id, '');
    onTypeChange(block.id, type);
    onCloseSlash();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const text = readEditableText(editableRef.current);

    if (isSlashOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseSlash();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSlashSelectedIndex((value) => (slashCommands.length === 0 ? 0 : (value + 1) % slashCommands.length));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSlashSelectedIndex((value) => (slashCommands.length === 0 ? 0 : (value - 1 + slashCommands.length) % slashCommands.length));
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const selected = slashCommands[slashSelectedIndex] ?? slashCommands[0];
        if (selected) selectSlashCommand(selected.type);
        return;
      }
    }

    if (event.key === 'Escape') {
      setMenuOpen(false);
      onCloseSlash();
      return;
    }

    if (shouldOpenSlashMenu(event.key, text)) {
      event.preventDefault();
      if (editableRef.current) {
        editableRef.current.textContent = '/';
        setCaretToEnd(editableRef.current);
      }
      onTextChange(block.id, '/');
      setMenuOpen(false);
      onOpenSlash(block.id);
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      setMenuOpen(false);
      onCloseSlash();
      onIndentChange(block.id, event.shiftKey ? -1 : 1);
      return;
    }

    if (event.key === 'ArrowUp' && caretOffset(editableRef.current) === 0) {
      event.preventDefault();
      setMenuOpen(false);
      onCloseSlash();
      onFocusPrevious(index);
      return;
    }

    if (event.key === 'ArrowDown' && caretOffset(editableRef.current) >= text.length) {
      event.preventDefault();
      setMenuOpen(false);
      onCloseSlash();
      onFocusNext(index);
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      setMenuOpen(false);
      onCloseSlash();
      onEnter(block, index);
      return;
    }

    if (event.key === 'Backspace') {
      if (text.length === 0 && totalBlocks > 1) {
        event.preventDefault();
        setMenuOpen(false);
        onCloseSlash();
        onBackspaceAtBoundary(block.id, index, 'empty');
        return;
      }

      if (text.length > 0 && index > 0 && caretOffset(editableRef.current) === 0) {
        event.preventDefault();
        setMenuOpen(false);
        onCloseSlash();
        onBackspaceAtBoundary(block.id, index, 'start');
      }
    }
  }

  const blockBody =
    block.type === 'divider' ? (
      <button aria-label={t('workspace.blockRenderer.dividerBlock')} className="divider-block" disabled={!canEdit} onClick={() => onOpenSlash(block.id)} type="button" />
    ) : block.type === 'image' ? (
      <div className="media-block image-block">
        {mediaHref ? (
          <img alt={block.caption || block.text || t('workspace.blockRenderer.workspaceImage')} src={mediaHref} />
        ) : (
          <div className="media-placeholder">
            <ImageIcon size={18} />
            {t('workspace.blockRenderer.pasteImageUrl')}
          </div>
        )}
        {canEdit ? (
          <>
            <input
              aria-label={t('workspace.blockRenderer.imageUrl')}
              className="media-url-field"
              onChange={(event) => onMediaChange(block.id, { url: event.currentTarget.value })}
              placeholder="https://example.com/image.jpg"
              value={block.url ?? ''}
            />
            <input
              aria-label={t('workspace.blockRenderer.imageCaption')}
              className="media-caption-field"
              onChange={(event) => onMediaChange(block.id, { caption: event.currentTarget.value })}
              placeholder={t('workspace.blockRenderer.addCaption')}
              value={block.caption ?? ''}
            />
          </>
        ) : block.caption ? (
          <p className="media-caption">{block.caption}</p>
        ) : null}
      </div>
    ) : block.type === 'fileLink' ? (
      <div className="media-block file-link-block">
        {mediaHref ? (
          <a href={mediaHref} rel="noopener noreferrer" target="_blank">
            <FileText size={18} />
            <span>{block.text || block.caption || mediaHref}</span>
          </a>
        ) : (
          <div className="media-placeholder">
            <FileText size={18} />
            {t('workspace.blockRenderer.pasteFileUrl')}
          </div>
        )}
        {canEdit ? (
          <>
            <input
              aria-label={t('workspace.blockRenderer.fileUrl')}
              className="media-url-field"
              onChange={(event) => onMediaChange(block.id, { url: event.currentTarget.value })}
              placeholder="https://example.com/file.pdf"
              value={block.url ?? ''}
            />
            <input
              aria-label={t('workspace.blockRenderer.fileLabel')}
              className="media-caption-field"
              onChange={(event) => onMediaChange(block.id, { text: event.currentTarget.value })}
              placeholder={t('workspace.blockRenderer.fileLabel')}
              value={block.text}
            />
          </>
        ) : null}
      </div>
    ) : (
      <>
        {block.type === 'toggle' ? (
          <button
            aria-label={block.collapsed ? t('workspace.blockRenderer.expandToggle') : t('workspace.blockRenderer.collapseToggle')}
            className="toggle-button"
            disabled={!canEdit}
            onClick={() => onToggleCollapsed(block.id, !block.collapsed)}
            type="button"
          >
            {block.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </button>
        ) : null}
        {block.type === 'checklist' ? (
          <button
            aria-label={block.checked ? t('workspace.blockRenderer.markUnchecked') : t('workspace.blockRenderer.markChecked')}
            className={block.checked ? 'check-toggle checked' : 'check-toggle'}
            disabled={!canEdit}
            onClick={() => onCheckedChange(block.id, !block.checked)}
            type="button"
          >
            {block.checked ? <Check size={14} /> : null}
          </button>
        ) : null}
        {block.type === 'bullet' ? <span className="list-marker">{'\u2022'}</span> : null}
        {block.type === 'numbered' ? (
          <span className="list-marker" data-number-style={numberedMarker?.style ?? 'decimal'}>
            {numberedMarker?.label ?? '1.'}
          </span>
        ) : null}
        {renderLinkedText ? (
          <div
            aria-label={t('workspace.blockRenderer.blockAria', { index: index + 1, label: blockCommandLabel(command, t) })}
            className="editable-block-text linked-block-text"
            data-block-text={block.text}
            data-render-mode="linked"
            key={`${block.id}-linked`}
            onClick={(event) => {
              const target = event.target;
              if (target instanceof Element && target.closest('a')) return;
              enterEditMode();
            }}
            role="textbox"
          >
            {linkifyText(block.text).map((segment, segmentIndex) =>
              segment.href ? (
                <a href={segment.href} key={`${segment.text}-${segmentIndex}`} rel="noopener noreferrer" target="_blank">
                  {segment.text}
                </a>
              ) : (
                <span key={`${segment.text}-${segmentIndex}`}>{segment.text}</span>
              ),
            )}
          </div>
        ) : hasInlineMarks && !focused ? (
          <div
            aria-label={t('workspace.blockRenderer.blockAria', { index: index + 1, label: blockCommandLabel(command, t) })}
            className="editable-block-text marked-block-text"
            data-block-text={block.text}
            data-render-mode="marked"
            key={`${block.id}-marked`}
            onClick={() => {
              const selection = window.getSelection();
              if (selection?.toString().trim()) return;
              enterEditMode();
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              enterEditMode();
            }}
            onKeyUp={updateSelectionMenu}
            onMouseUp={updateSelectionMenu}
            ref={editableRef}
            role="textbox"
            tabIndex={canEdit ? 0 : undefined}
          >
            {renderMarkedText(block.text, block.inlineMarks)}
          </div>
        ) : (
          <div
            aria-label={t('workspace.blockRenderer.blockAria', { index: index + 1, label: blockCommandLabel(command, t) })}
            className="editable-block-text"
            contentEditable={editable}
            data-block-text={block.text}
            data-placeholder={focused && block.text.length === 0 ? t('workspace.blockRenderer.typeForCommands') : undefined}
            data-render-mode="editable"
            key={`${block.id}-editable`}
            onBlur={() => setFocused(false)}
            onFocus={() => setFocused(true)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onKeyUp={updateSelectionMenu}
            onMouseUp={updateSelectionMenu}
            ref={editableRef}
            role="textbox"
            spellCheck
            suppressContentEditableWarning
          />
        )}
      </>
    );

  return (
    <div
      className={blockClassName(block.type)}
      id={`block-${block.id}`}
      ref={setBlockNodeRef}
      style={
        {
          '--block-indent': `${(block.indent ?? 0) * 28}px`,
          opacity: isDragging ? 0.58 : undefined,
          transform: CSS.Transform.toString(transform),
          transition,
        } as CSSProperties
      }
      data-editable={canEdit ? 'true' : 'false'}
      data-focused={focused ? 'true' : undefined}
      data-selection-mode={selectionMode ? 'true' : undefined}
    >
      {canEdit && !selectionMode ? (
        <div className="block-hover-controls" aria-label={t('workspace.blockRenderer.blockControls')}>
          <button aria-label={t('workspace.blockRenderer.dragBlock')} className="icon-button subtle drag-handle" title={t('workspace.blockRenderer.dragToReorder')} type="button" {...attributes} {...listeners}>
            <GripVertical size={15} />
          </button>
          <button aria-label={t('workspace.blockRenderer.blockMenu')} className="icon-button subtle" onClick={() => setMenuOpen((value) => !value)} type="button">
            <MoreHorizontal size={15} />
          </button>
        </div>
      ) : null}

      <div className="block-content">{blockBody}</div>

      {commentsCount > 0 ? (
        <button className={commentPillVariant === 'block' ? 'comment-pill block-comment-pill' : 'comment-pill'} onClick={() => onOpenComments(block.id)} type="button">
          <MessageCircle size={13} />
          {commentsCount}
        </button>
      ) : null}

      {menuOpen ? (
        <div className="block-popover" ref={menuRef}>
          <div className="block-popover-head">{t('workspace.blockMenu.formatBlock')}</div>
          <button onClick={() => onDuplicate(block.id)} type="button">
            <Copy size={14} />
            {t('workspace.blockMenu.duplicate')}
          </button>
          <button
            onClick={() => {
              onInsertBefore(index);
              setMenuOpen(false);
            }}
            type="button"
          >
            <Plus size={14} />
            {t('workspace.blockMenu.insertAbove')}
          </button>
          <button
            onClick={() => {
              onInsertAfter(index);
              setMenuOpen(false);
            }}
            type="button"
          >
            <Plus size={14} />
            {t('workspace.blockMenu.insertBelow')}
          </button>
          <button
            disabled={index <= 0}
            onClick={() => {
              onMoveBlock(block.id, index - 1);
              setMenuOpen(false);
            }}
            type="button"
          >
            <ArrowUp size={14} />
            {t('workspace.blockMenu.moveUp')}
          </button>
          <button
            disabled={index >= totalBlocks - 1}
            onClick={() => {
              onMoveBlock(block.id, index + 2);
              setMenuOpen(false);
            }}
            type="button"
          >
            <ArrowDown size={14} />
            {t('workspace.blockMenu.moveDown')}
          </button>
          {block.type === 'numbered' ? (
            <>
              <div className="block-popover-divider" />
              <div className="block-popover-head">{t('workspace.blockMenu.listNumbering')}</div>
              <button className={block.numbering === undefined ? 'selected' : undefined} onClick={() => onNumberingChange(block.id, undefined)} type="button">
                {t('workspace.blockMenu.autoListNumbering')}
              </button>
              <button className={block.numbering === 'continue' ? 'selected' : undefined} onClick={() => onNumberingChange(block.id, 'continue')} type="button">
                {t('workspace.blockMenu.continuePreviousList')}
              </button>
              <button className={block.numbering === 'restart' ? 'selected' : undefined} onClick={() => onNumberingChange(block.id, 'restart')} type="button">
                {t('workspace.blockMenu.restartAtOne')}
              </button>
            </>
          ) : null}
          {detectedHref ? (
            <button onClick={() => onToggleLink(block.id, !block.linkDisabled)} type="button">
              <Link size={14} />
              {block.linkDisabled ? t('workspace.blockMenu.enableHyperlink') : t('workspace.blockMenu.disableHyperlink')}
            </button>
          ) : null}
          <button onClick={() => onOpenComments(block.id)} type="button">
            <MessageCircle size={14} />
            {t('workspace.comments.add')}
          </button>
          <button
            onClick={() => {
              const url = `${window.location.href.split('#')[0]}#block-${block.id}`;
              void navigator.clipboard?.writeText(url);
              setMenuOpen(false);
            }}
            type="button"
          >
            <Link size={14} />
            {t('workspace.blockMenu.copyBlockLink')}
          </button>
          <button disabled={totalBlocks <= 1} onClick={() => onDelete(block.id)} type="button">
            <Trash2 size={14} />
            {t('common.actions.delete')}
          </button>
          <div className="block-popover-divider" />
          <div className="block-popover-head">{t('workspace.blockMenu.turnInto')}</div>
          {filterSlashCommands('').map((slashCommand) => (
            <button
              className={block.type === slashCommand.type ? 'selected' : undefined}
              key={slashCommand.type}
              onClick={() => {
                onTypeChange(block.id, slashCommand.type);
                setMenuOpen(false);
              }}
              type="button"
            >
              {blockCommandLabel(slashCommand, t)}
            </button>
          ))}
        </div>
      ) : null}

      {isSlashOpen ? (
        <SlashCommandMenu
          commands={slashCommands}
          onClose={onCloseSlash}
          onHighlight={setSlashSelectedIndex}
          onSelect={(type) => selectSlashCommand(type)}
          query={slashQuery}
          selectedIndex={slashSelectedIndex}
        />
      ) : null}
    </div>
  );
}
