import { useEffect, useRef, useState } from 'react';
import { Principal } from '@dfinity/principal';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Copy,
  Download,
  FolderTree,
  Italic,
  Link,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Redo2,
  Save,
  Share2,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CommunityDocumentPayload, CommunityDocumentSummary, CommunityMember } from '../../backend';
import { WorkspaceRole } from '../../backend';
import { blocksToMarkdown } from '../../workspace/markdownExport';
import { nextBlockTypeAfterEnter, isTextEditableBlock, type MarkdownShortcutResult } from '../../workspace/editorCommands';
import { computeNumberedListMarkers } from '../../workspace/numberedLists';
import type {
  WorkspaceBlock,
  WorkspaceBlockType,
  WorkspaceComment,
  WorkspaceHighlightColor,
  WorkspaceNumberedListMode,
  WorkspaceTextMarkType,
} from '../../workspace/types';
import {
  canEditWorkspaceRole,
  canOwnWorkspaceRole,
  compactPrincipal,
  readableDate,
  roleName,
} from '../../workspace/workspaceApi';
import LoadingSpinner from '../LoadingSpinner';
import { BlockRenderer, type BlockFocusRequest } from './BlockRenderer';
import { SelectionFormatMenu, type SelectionFormatState } from './SelectionFormatMenu';

export type EditorSelectionState = {
  blockId: string;
  start: number;
  end: number;
  text: string;
  markedRanges?: Array<{ blockId: string; selectedText?: string; selectionStart: number; selectionEnd: number }>;
};

function sortMembers(members: CommunityMember[] | undefined): CommunityMember[] {
  return [...(members ?? [])].sort((a, b) => {
    const left = a.profile?.name ?? a.principal.toText();
    const right = b.profile?.name ?? b.principal.toText();
    return left.localeCompare(right);
  });
}

function selectedRoleLabel(role: WorkspaceRole, t: ReturnType<typeof useTranslation>['t']): string {
  return t(`workspace.roles.${roleName(role)}`);
}

function selectedShareLabel(role: WorkspaceRole | null, t: ReturnType<typeof useTranslation>['t']): string {
  if (role === null) return t('workspace.share.private');
  if (role === WorkspaceRole.editor) return t('workspace.share.communityEditor');
  return t('workspace.share.communityViewer');
}

function plainBlockText(block: WorkspaceBlock): string {
  return [block.text, block.caption, block.url].filter(Boolean).join(' ');
}

export function isBlockHiddenByCollapsedToggle(blocks: WorkspaceBlock[], index: number): boolean {
  const block = blocks[index];
  if (!block) return false;

  let ancestorIndent = block.indent ?? 0;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = blocks[cursor];
    const candidateIndent = candidate.indent ?? 0;
    if (candidateIndent >= ancestorIndent) continue;

    if (candidate.type === 'toggle' && candidate.collapsed) return true;
    ancestorIndent = candidateIndent;
  }

  return false;
}

export function DocumentEditor({
  blocks,
  canManageCommunityWorkspace,
  comments,
  communityName,
  focusRequest,
  isPinned,
  loading,
  locale,
  members,
  message,
  onAddBlock,
  onArchive,
  onBlockChecked,
  onBlockCollapsed,
  onBlockIndent,
  onBlockLinkToggle,
  onBlockMedia,
  onBlockMove,
  onBlockNumbering,
  onBlockRemove,
  onBlockText,
  onBlockType,
  onComment,
  onCompact,
  onDuplicateBlock,
  onExportJson,
  onExportMarkdown,
  onGrantAccess,
  onImportMarkdown,
  onInlineFormat,
  onMarkdownShortcut,
  onMergeBlock,
  onParentChange,
  onRedo,
  onRename,
  onRequestBlockFocus,
  onResolveComment,
  onSetShare,
  onSync,
  onTogglePinned,
  onUndo,
  parentOptions,
  requestedDocumentId,
  selectedDocument,
  syncStatus,
  undoState,
}: {
  blocks: WorkspaceBlock[];
  canManageCommunityWorkspace: boolean;
  comments: WorkspaceComment[];
  communityName: string;
  focusRequest?: BlockFocusRequest;
  isPinned: boolean;
  loading: boolean;
  locale: string;
  members: CommunityMember[] | undefined;
  message: string | null;
  onAddBlock: (afterIndex?: number, type?: WorkspaceBlockType, options?: { indent?: number; url?: string; caption?: string; text?: string }) => string | undefined;
  onArchive: () => Promise<void>;
  onBlockChecked: (blockId: string, checked: boolean) => void;
  onBlockCollapsed: (blockId: string, collapsed: boolean) => void;
  onBlockIndent: (blockId: string, delta: -1 | 1) => void;
  onBlockLinkToggle: (blockId: string, disabled: boolean) => void;
  onBlockMedia: (blockId: string, fields: { url?: string; caption?: string; text?: string }) => void;
  onBlockMove: (blockId: string, targetIndex: number) => void;
  onBlockNumbering: (blockId: string, mode?: WorkspaceNumberedListMode) => void;
  onBlockRemove: (blockId: string) => void;
  onBlockText: (blockId: string, text: string) => void;
  onBlockType: (blockId: string, type: WorkspaceBlockType) => void;
  onComment: (blockId: string, text: string, selection?: EditorSelectionState) => void;
  onCompact: () => void;
  onDuplicateBlock: (blockId: string) => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onGrantAccess: (user: Principal, role: WorkspaceRole | null) => Promise<void>;
  onImportMarkdown: (file: File) => void;
  onInlineFormat: (blockId: string, type: Exclude<WorkspaceTextMarkType, 'comment'>, start: number, end: number, color?: WorkspaceHighlightColor) => void;
  onMarkdownShortcut: (blockId: string, shortcut: MarkdownShortcutResult) => void;
  onMergeBlock: (blockId: string) => string | undefined;
  onParentChange: (parentId: bigint | null) => void;
  onRedo: () => void;
  onRename: (title: string) => void;
  onRequestBlockFocus: (blockId: string) => void;
  onResolveComment: (commentId: string, resolved: boolean) => void;
  onSetShare: (role: WorkspaceRole | null) => Promise<void>;
  onSync: () => void;
  onTogglePinned: () => void;
  onUndo: () => void;
  parentOptions: CommunityDocumentSummary[];
  requestedDocumentId?: bigint | null;
  selectedDocument: CommunityDocumentPayload | null | undefined;
  syncStatus: string;
  undoState: { canUndo: boolean; canRedo: boolean };
}) {
  const { t } = useTranslation();
  const [titleDraft, setTitleDraft] = useState(selectedDocument?.title ?? '');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [nestOpen, setNestOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareRole, setShareRole] = useState<WorkspaceRole | 'private'>(selectedDocument?.communityShare ?? 'private');
  const [grantPrincipal, setGrantPrincipal] = useState('');
  const [grantRole, setGrantRole] = useState<WorkspaceRole>(WorkspaceRole.viewer);
  const [commentBlockId, setCommentBlockId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSelection, setCommentSelection] = useState<EditorSelectionState | undefined>();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(() => new Set());
  const [selectionFormat, setSelectionFormat] = useState<SelectionFormatState | undefined>();
  const [slashBlockId, setSlashBlockId] = useState<string | undefined>();
  const [multiSelectStatus, setMultiSelectStatus] = useState('');
  const markdownInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const sharePopoverRef = useRef<HTMLDivElement>(null);
  const nestPopoverRef = useRef<HTMLDivElement>(null);
  const canEdit = canEditWorkspaceRole(selectedDocument?.role);
  const canManage = canOwnWorkspaceRole(selectedDocument?.role) || canManageCommunityWorkspace;
  const openComments = comments.filter((comment) => !comment.resolved);
  const visibleBlockEntries = blocks
    .map((block, index) => ({ block, index, hidden: isBlockHiddenByCollapsedToggle(blocks, index) }))
    .filter((entry) => !entry.hidden);
  const numberedMarkers = computeNumberedListMarkers(visibleBlockEntries.map(({ block }) => block));
  const sortableBlockIds = visibleBlockEntries.map(({ block }) => block.id);
  const selectedBlocks = blocks.filter((block) => selectedBlockIds.has(block.id));
  const selectedBlockType = selectedBlocks.length === 1 ? selectedBlocks[0].type : undefined;
  const textBlockTypes: WorkspaceBlockType[] = ['paragraph', 'heading1', 'heading2', 'heading3', 'bullet', 'numbered', 'checklist', 'quote'];
  const blockDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setTitleDraft(selectedDocument?.title ?? '');
    setShareRole(selectedDocument?.communityShare ?? 'private');
    setSelectedBlockIds(new Set());
    setSelectionFormat(undefined);
    setSelectionMode(false);
    setCommentBlockId(null);
    setShareOpen(false);
    setNestOpen(false);
    setCommentsOpen(false);
    setSlashBlockId(undefined);
  }, [selectedDocument?.id, selectedDocument?.title, selectedDocument?.communityShare]);

  useEffect(() => {
    if (titleRef.current && document.activeElement !== titleRef.current && titleRef.current.innerText !== titleDraft) {
      titleRef.current.innerText = titleDraft;
    }
  }, [titleDraft]);

  useEffect(() => {
    if (selectedBlockIds.size === 0) return;
    const liveIds = new Set(blocks.map((block) => block.id));
    const next = new Set([...selectedBlockIds].filter((id) => liveIds.has(id)));
    if (next.size !== selectedBlockIds.size) {
      setSelectedBlockIds(next);
    }
  }, [blocks, selectedBlockIds]);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (shareOpen && !sharePopoverRef.current?.contains(target)) setShareOpen(false);
      if (nestOpen && !nestPopoverRef.current?.contains(target)) setNestOpen(false);
      if (actionsOpen && !actionsMenuRef.current?.contains(target) && !actionsButtonRef.current?.contains(target)) {
        setActionsOpen(false);
      }
      if (slashBlockId && target instanceof Element && !target.closest('.slash-menu')) {
        setSlashBlockId(undefined);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setShareOpen(false);
      setNestOpen(false);
      setActionsOpen(false);
      setSlashBlockId(undefined);
      setSelectionFormat(undefined);
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [actionsOpen, nestOpen, shareOpen, slashBlockId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!selectedDocument) {
    const requestedSpecificDocument = requestedDocumentId !== null && requestedDocumentId !== undefined;
    return (
      <main className="workspace-document-empty">
        <div className="locked-panel">
          <p className="amnesty-kicker">
            {requestedSpecificDocument ? t('workspace.kicker') : t('workspace.documents.emptyTitle')}
          </p>
          <h3>{requestedSpecificDocument ? 'Document unavailable' : t('workspace.documents.emptyBodyTitle')}</h3>
          <p>
            {requestedSpecificDocument
              ? 'This document may be private, archived, deleted, or shared with a different community.'
              : t('workspace.documents.emptyBody')}
          </p>
        </div>
      </main>
    );
  }

  const ownerLabel = members?.find((member) => member.principal.toText() === selectedDocument.owner.toText())?.profile?.name ?? compactPrincipal(selectedDocument.owner);

  const blockLabel = (blockId: string) => {
    const block = blocks.find((candidate) => candidate.id === blockId);
    if (!block) return 'Deleted block';
    return plainBlockText(block).trim().slice(0, 80) || `${block.type} block`;
  };

  const isBlockScaleComment = (comment: WorkspaceComment): boolean => {
    if (comment.commentScope === 'block') return true;
    if (comment.commentScope === 'inline') return false;
    return !comment.selectedText || comment.selectedText.includes('\n');
  };

  const commentMetaForBlock = (blockId: string): { count: number; variant: 'inline' | 'block' } => {
    const directComments = openComments.filter((comment) => comment.blockId === blockId);
    return {
      count: directComments.length,
      variant: directComments.some(isBlockScaleComment) ? 'block' : 'inline',
    };
  };

  const submitGrant = async () => {
    if (!canManage || !grantPrincipal) return;
    await onGrantAccess(Principal.fromText(grantPrincipal), grantRole);
    setGrantPrincipal('');
    setShareOpen(false);
  };

  const submitComment = () => {
    if (!commentBlockId || !commentDraft.trim()) return;
    onComment(commentBlockId, commentDraft.trim(), commentSelection);
    setCommentDraft('');
    setCommentBlockId(null);
    setCommentSelection(undefined);
  };

  const selectedBlocksMarkdown = () => blocksToMarkdown(selectedBlocks).trim();

  const copySelectedMarkdown = async () => {
    const markdown = selectedBlocksMarkdown();
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(`${markdown}\n`);
      setMultiSelectStatus(t('workspace.selection.copied', { defaultValue: 'Copied selected blocks as Markdown.' }));
    } catch {
      window.prompt(t('workspace.selection.copyFallback'), markdown);
      setMultiSelectStatus('');
    }
  };

  const commentOnSelectedBlocks = () => {
    const firstBlock = selectedBlocks[0];
    const markdown = selectedBlocksMarkdown();
    if (!firstBlock || !markdown) return;
    const markedRanges = selectedBlocks
      .filter((block) => block.text.length > 0)
      .map((block) => ({
        blockId: block.id,
        selectedText: block.text,
        selectionStart: 0,
        selectionEnd: block.text.length,
      }));
    setCommentBlockId(firstBlock.id);
    setCommentSelection({
      blockId: firstBlock.id,
      text: markdown,
      start: 0,
      end: firstBlock.text.length,
      markedRanges,
    });
    setCommentDraft('');
    setCommentsOpen(true);
    setSelectionFormat(undefined);
    setSlashBlockId(undefined);
    setShareOpen(false);
    setMultiSelectStatus('');
  };

  const updateSelectionFormat = (selection?: {
    blockId: string;
    selectedText: string;
    start: number;
    end: number;
    rect: DOMRect;
  }) => {
    if (!selection) {
      setSelectionFormat(undefined);
      return;
    }

    setSelectionFormat({
      blockId: selection.blockId,
      selectedText: selection.selectedText,
      start: selection.start,
      end: selection.end,
      left: Math.max(130, Math.min(window.innerWidth - 130, selection.rect.left + selection.rect.width / 2)),
      top: Math.max(76, selection.rect.top - 48),
    });
  };

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : undefined;
    if (!overId || activeId === overId) return;
    const activeEntry = visibleBlockEntries.find(({ block }) => block.id === activeId);
    const overEntry = visibleBlockEntries.find(({ block }) => block.id === overId);
    if (!activeEntry || !overEntry) return;
    const targetIndex = activeEntry.index < overEntry.index ? overEntry.index + 1 : overEntry.index;
    onBlockMove(activeId, targetIndex);
  };

  const requestEditableNeighborFocus = (currentIndex: number, direction: -1 | 1) => {
    const start = currentIndex + direction;
    for (let index = start; index >= 0 && index < blocks.length; index += direction) {
      if (!isBlockHiddenByCollapsedToggle(blocks, index) && isTextEditableBlock(blocks[index].type)) {
        onRequestBlockFocus(blocks[index].id);
        return;
      }
    }
  };

  return (
    <main className="document-stage" aria-label={t('workspace.documents.sidebarTitle')}>
      <div className="document-topbar">
        <div className="document-breadcrumb">
          <span>{t('app.nav.workspace')}</span>
          <b>/</b>
          <span>{communityName}</span>
          <b>|</b>
          <Lock size={13} />
          <span>{selectedRoleLabel(selectedDocument.role, t)}</span>
        </div>
        <div className="document-toolbar">
          {blocks.length > 0 ? (
            <button
              className={selectionMode ? 'toolbar-button active' : 'toolbar-button'}
              onClick={() => {
                setSelectionMode((current) => !current);
                setSelectedBlockIds(new Set());
                setMultiSelectStatus('');
              }}
              type="button"
            >
              <Copy size={16} />
              {selectionMode ? t('workspace.selection.done') : t('workspace.selection.selectBlocks')}
            </button>
          ) : null}
          <button className="toolbar-button document-actions-button" onClick={() => setActionsOpen((current) => !current)} ref={actionsButtonRef} type="button">
            <MoreHorizontal size={16} />
            {t('workspace.actions.menu')}
          </button>
          {actionsOpen ? (
            <div className="document-action-menu" ref={actionsMenuRef}>
              {canManage ? (
                <button onClick={() => { setShareOpen(true); setNestOpen(false); setActionsOpen(false); }} type="button">
                  <Share2 size={16} />
                  {t('workspace.share.title')}
                </button>
              ) : null}
              {canManage ? (
                <button onClick={() => { setNestOpen(true); setShareOpen(false); setActionsOpen(false); }} type="button">
                  <FolderTree size={16} />
                  {t('workspace.nesting.title')}
                </button>
              ) : null}
              <button onClick={() => { onTogglePinned(); setActionsOpen(false); }} type="button">
                <Pin size={16} />
                {isPinned ? t('workspace.actions.unpin') : t('workspace.actions.pin')}
              </button>
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(window.location.href.split('#')[0]);
                  setActionsOpen(false);
                }}
                type="button"
              >
                <Link size={16} />
                {t('workspace.actions.copyLink', { defaultValue: 'Copy document link' })}
              </button>
              <button disabled={!canEdit || !undoState.canUndo} onClick={() => { onUndo(); setActionsOpen(false); }} type="button">
                <Undo2 size={16} />
                {t('workspace.actions.undo')}
              </button>
              <button disabled={!canEdit || !undoState.canRedo} onClick={() => { onRedo(); setActionsOpen(false); }} type="button">
                <Redo2 size={16} />
                {t('workspace.actions.redo')}
              </button>
              <button disabled={!canEdit} onClick={() => { onSync(); setActionsOpen(false); }} type="button">
                <Save size={16} />
                {t('workspace.actions.sync')}
              </button>
              <button onClick={() => { onExportJson(); setActionsOpen(false); }} type="button">
                <Download size={16} />
                {t('workspace.actions.debugExport')}
              </button>
              <button onClick={() => { onExportMarkdown(); setActionsOpen(false); }} type="button">
                <Download size={16} />
                {t('workspace.actions.markdownExport')}
              </button>
              <button disabled={!canEdit} onClick={() => { markdownInputRef.current?.click(); setActionsOpen(false); }} type="button">
                <Upload size={16} />
                {t('workspace.actions.importMarkdown')}
              </button>
              <button disabled={!canEdit} onClick={() => { onCompact(); setActionsOpen(false); }} type="button">
                <MoreHorizontal size={16} />
                {t('workspace.actions.compact')}
              </button>
              <button disabled={!canManage} className="danger-button" onClick={() => { void onArchive(); setActionsOpen(false); }} type="button">
                <Trash2 size={16} />
                {t('workspace.actions.archive')}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {shareOpen ? (
        <div className="share-popover" ref={sharePopoverRef}>
          <div>
            <strong>{t('workspace.share.title')}</strong>
            <p>{selectedShareLabel(selectedDocument.communityShare, t)}</p>
          </div>
          <select value={shareRole} disabled={!canManage} onChange={(event) => setShareRole(event.currentTarget.value as WorkspaceRole | 'private')}>
            <option value="private">{t('workspace.share.private')}</option>
            <option value={WorkspaceRole.viewer}>{t('workspace.share.communityViewer')}</option>
            <option value={WorkspaceRole.editor}>{t('workspace.share.communityEditor')}</option>
          </select>
          <button className="ghost-button" disabled={!canManage} onClick={() => void onSetShare(shareRole === 'private' ? null : shareRole)} type="button">
            {t('workspace.actions.updateShare')}
          </button>
          <div className="share-public">
            <strong>{t('workspace.grants.title')}</strong>
            <p>{t('workspace.grants.selectMember')}</p>
            <select value={grantPrincipal} disabled={!canManage} onChange={(event) => setGrantPrincipal(event.currentTarget.value)}>
              <option value="">{t('workspace.grants.selectMember')}</option>
              {sortMembers(members).map((member) => (
                <option key={member.principal.toText()} value={member.principal.toText()}>
                  {member.profile?.name ?? compactPrincipal(member.principal)}
                </option>
              ))}
            </select>
            <select value={grantRole} disabled={!canManage} onChange={(event) => setGrantRole(event.currentTarget.value as WorkspaceRole)}>
              <option value={WorkspaceRole.viewer}>{t('workspace.roles.viewer')}</option>
              <option value={WorkspaceRole.editor}>{t('workspace.roles.editor')}</option>
            </select>
            <button className="cta small" disabled={!canManage || !grantPrincipal} onClick={() => void submitGrant()} type="button">
              {t('workspace.actions.grant')}
            </button>
          </div>
        </div>
      ) : null}

      {nestOpen ? (
        <div className="share-popover nest-popover" ref={nestPopoverRef}>
          <div>
            <strong>{t('workspace.nesting.title')}</strong>
            <p>{t('workspace.nesting.topLevel')}</p>
          </div>
          <select
            disabled={!canManage}
            value={selectedDocument.parentId?.toString() ?? ''}
            onChange={(event) => {
              onParentChange(event.currentTarget.value ? BigInt(event.currentTarget.value) : null);
              setNestOpen(false);
            }}
          >
            <option value="">{t('workspace.nesting.topLevel')}</option>
            {parentOptions.map((doc) => (
              <option key={doc.id.toString()} value={doc.id.toString()}>
                {doc.title}
              </option>
            ))}
          </select>
          {selectedDocument.parentId ? (
            <button
              className="ghost-button"
              onClick={() => {
                onParentChange(null);
                setNestOpen(false);
              }}
              type="button"
            >
              {t('workspace.nesting.topLevel')}
            </button>
          ) : null}
        </div>
      ) : null}

      <input
        ref={markdownInputRef}
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onImportMarkdown(file);
          event.currentTarget.value = '';
        }}
      />

      <article
        className="document-page"
        onClick={(event) => {
          if (event.target === event.currentTarget && canEdit) onAddBlock(blocks.length - 1, 'paragraph');
        }}
      >
        <header className="document-title-area">
          <h1
            aria-label="Document title"
            contentEditable={canEdit}
            onBlur={(event) => {
              const nextTitle = event.currentTarget.innerText.replace(/\n/g, ' ').trim() || 'Untitled';
              setTitleDraft(nextTitle);
              onRename(nextTitle);
            }}
            onInput={(event) => {
              setShareOpen(false);
              setSlashBlockId(undefined);
              setTitleDraft(event.currentTarget.innerText.replace(/\n/g, ' '));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              }
              if (event.key === 'Escape') {
                event.currentTarget.innerText = selectedDocument.title;
                setTitleDraft(selectedDocument.title);
                event.currentTarget.blur();
              }
            }}
            ref={titleRef}
            suppressContentEditableWarning
          />
          <p>
            <span className="avatar-dot">{ownerLabel.slice(0, 1).toUpperCase()}</span>
            <span className="status-dot" />
            <span>{ownerLabel}</span>
            <span>{'\u00b7'}</span>
            <span>{readableDate(selectedDocument.updatedAt, locale)}</span>
            <span>{'\u00b7'}</span>
            <span>{syncStatus}</span>
            <span>{'\u00b7'}</span>
            <span>{selectedShareLabel(selectedDocument.communityShare, t)}</span>
          </p>
        </header>

        {selectionMode ? (
          <div className="multi-block-toolbar" role="toolbar" aria-label="Selected block actions">
            <strong>{t('workspace.selection.selected', { count: selectedBlockIds.size })}</strong>
            <button disabled={selectedBlockIds.size === 0} onClick={() => void copySelectedMarkdown()} type="button">
              <Copy size={14} />
              {t('workspace.selection.copyMarkdown')}
            </button>
            <button disabled={!canEdit || selectedBlockIds.size === 0} onClick={commentOnSelectedBlocks} type="button">
              <MessageCircle size={14} />
              {t('workspace.comments.add')}
            </button>
            <button disabled={!canEdit || selectedBlockIds.size === 0} onClick={() => selectedBlocks.forEach((block) => onBlockIndent(block.id, -1))} type="button">
              {t('workspace.selection.outdent')}
            </button>
            <button disabled={!canEdit || selectedBlockIds.size === 0} onClick={() => selectedBlocks.forEach((block) => onBlockIndent(block.id, 1))} type="button">
              {t('workspace.selection.indent')}
            </button>
            <span className="multi-block-divider" />
            <span className="multi-block-label">Turn into</span>
            <div className="multi-block-transform">
              {textBlockTypes.map((type) => (
                <button
                  className={selectedBlockType === type ? 'active' : undefined}
                  disabled={!canEdit || selectedBlockIds.size === 0}
                  key={type}
                  onClick={() => selectedBlocks.forEach((block) => onBlockType(block.id, type))}
                  type="button"
                >
                  {type}
                </button>
              ))}
            </div>
            <button disabled={selectedBlockIds.size === 0} onClick={() => setSelectedBlockIds(new Set())} type="button">
              {t('workspace.selection.clear')}
            </button>
            <button onClick={() => { setSelectionMode(false); setSelectedBlockIds(new Set()); }} type="button">
              {t('workspace.selection.done')}
            </button>
            {multiSelectStatus ? <span>{multiSelectStatus}</span> : null}
          </div>
        ) : null}

        <DndContext collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd} sensors={blockDragSensors}>
          <SortableContext items={sortableBlockIds} strategy={verticalListSortingStrategy}>
            <div className="document-blocks">
              {visibleBlockEntries.map(({ block, index }) => {
                const commentMeta = commentMetaForBlock(block.id);
                const renderer = (
                  <BlockRenderer
                    block={block}
                    canEdit={canEdit}
                    commentPillVariant={commentMeta.variant}
                    commentsCount={commentMeta.count}
                    focusRequest={focusRequest}
                    index={index}
                    isSlashOpen={slashBlockId === block.id}
                    key={block.id}
                    numberedMarker={numberedMarkers[block.id]}
                    selectionMode={selectionMode}
                    totalBlocks={blocks.length}
                    onBackspaceAtBoundary={(blockId, _index, mode) => {
                      if (mode === 'empty') onBlockRemove(blockId);
                      if (mode === 'start') onMergeBlock(blockId);
                    }}
                    onCheckedChange={onBlockChecked}
                    onCloseSlash={() => setSlashBlockId(undefined)}
                    onDelete={onBlockRemove}
                    onDuplicate={onDuplicateBlock}
                    onEnter={(currentBlock, currentIndex) => {
                      setSlashBlockId(undefined);
                      setShareOpen(false);
                      onAddBlock(currentIndex, nextBlockTypeAfterEnter(currentBlock.type), {
                        indent: currentBlock.type === 'toggle' ? Math.min((currentBlock.indent ?? 0) + 1, 3) : currentBlock.indent ?? 0,
                      });
                    }}
                    onFocusNext={(currentIndex) => requestEditableNeighborFocus(currentIndex, 1)}
                    onFocusPrevious={(currentIndex) => requestEditableNeighborFocus(currentIndex, -1)}
                    onIndentChange={onBlockIndent}
                    onInsertAfter={(currentIndex) => {
                      setSlashBlockId(undefined);
                      setShareOpen(false);
                      onAddBlock(currentIndex);
                    }}
                    onInsertBefore={(currentIndex) => {
                      setSlashBlockId(undefined);
                      setShareOpen(false);
                      onAddBlock(currentIndex - 1);
                    }}
                    onMarkdownShortcut={onMarkdownShortcut}
                    onMediaChange={onBlockMedia}
                    onMoveBlock={onBlockMove}
                    onNumberingChange={onBlockNumbering}
                    onOpenComments={(blockId) => {
                      setCommentBlockId(blockId);
                      setCommentSelection(undefined);
                      setCommentDraft('');
                      setCommentsOpen(true);
                      setSlashBlockId(undefined);
                      setShareOpen(false);
                    }}
                    onOpenSlash={(blockId) => {
                      setShareOpen(false);
                      setSlashBlockId(blockId);
                    }}
                    onSelectionChange={updateSelectionFormat}
                    onTextChange={(blockId, text) => {
                      if (slashBlockId && (slashBlockId !== blockId || !text.startsWith('/'))) {
                        setSlashBlockId(undefined);
                      }
                      if (shareOpen) setShareOpen(false);
                      setSelectionFormat(undefined);
                      onBlockText(blockId, text);
                    }}
                    onToggleCollapsed={onBlockCollapsed}
                    onToggleLink={onBlockLinkToggle}
                    onTypeChange={onBlockType}
                  />
                );

                return selectionMode ? (
                  <div className="multi-block-row" data-selected={selectedBlockIds.has(block.id) ? 'true' : undefined} key={block.id}>
                    <label className="block-select-control">
                      <input
                        aria-label={`Select ${block.type} block`}
                        checked={selectedBlockIds.has(block.id)}
                        onChange={() => {
                          setSelectedBlockIds((current) => {
                            const next = new Set(current);
                            if (next.has(block.id)) next.delete(block.id);
                            else next.add(block.id);
                            return next;
                          });
                          setMultiSelectStatus('');
                        }}
                        type="checkbox"
                      />
                    </label>
                    {renderer}
                  </div>
                ) : (
                  renderer
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {canEdit ? (
          <button className="document-tail" onClick={() => { setSlashBlockId(undefined); setShareOpen(false); onAddBlock(blocks.length - 1, 'paragraph'); }} type="button">
            {t('workspace.editor.tailEditable')}
          </button>
        ) : (
          <p className="document-tail readonly">{t('workspace.editor.tailReadonly')}</p>
        )}
      </article>

      {selectionFormat && canEdit ? (
        <SelectionFormatMenu
          selection={selectionFormat}
          onComment={(blockId, selectedText, start, end) => {
            setCommentBlockId(blockId);
            setCommentSelection({ blockId, text: selectedText, start, end });
            setCommentDraft('');
            setCommentsOpen(true);
            setSelectionFormat(undefined);
          }}
          onFormat={(blockId, type) => {
            onBlockType(blockId, type);
            setSelectionFormat(undefined);
          }}
          onIndent={(blockId, delta) => {
            onBlockIndent(blockId, delta);
            setSelectionFormat(undefined);
          }}
          onInlineFormat={(blockId, type, start, end, color) => {
            onInlineFormat(blockId, type, start, end, color);
            setSelectionFormat(undefined);
          }}
        />
      ) : null}

      {(commentsOpen || commentBlockId) ? (
        <aside className="comment-panel" aria-label="Document comments">
          <div className="comment-panel-head">
            <div>
              <strong>{t('workspace.comments.openTitle')}</strong>
              <p>{openComments.length} open</p>
            </div>
            <button className="icon-button" onClick={() => { setCommentsOpen(false); setCommentBlockId(null); }} type="button">
              <X size={16} />
            </button>
          </div>
          {commentBlockId ? (
            <div className="comment-composer">
              <span className="comment-block-ref">{blockLabel(commentBlockId)}</span>
              {commentSelection?.text ? <blockquote className="comment-selection-preview">{commentSelection.text}</blockquote> : null}
              {canEdit ? (
                <>
                  <textarea
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitComment();
                    }}
                    placeholder={t('workspace.comments.placeholder')}
                  />
                  <button className="ghost-button" disabled={!commentDraft.trim()} onClick={submitComment} type="button">
                    <MessageCircle size={15} />
                    {t('workspace.comments.submit')}
                  </button>
                </>
              ) : (
                <p>{t('workspace.editor.tailReadonly')}</p>
              )}
            </div>
          ) : null}
          <div className="comment-list">
            {openComments.length === 0 ? <p className="sidebar-empty">{t('workspace.comments.empty')}</p> : null}
            {openComments.map((comment) => (
              <article className="comment-card" key={comment.id}>
                <button
                  className="comment-card-ref"
                  onClick={() => {
                    setCommentBlockId(comment.blockId);
                    onRequestBlockFocus(comment.blockId);
                  }}
                  type="button"
                >
                  {blockLabel(comment.blockId)}
                </button>
                <p>{comment.text}</p>
                {comment.selectedText ? <blockquote>{comment.selectedText}</blockquote> : null}
                <small>{comment.author} {'\u00b7'} {new Date(comment.createdAt).toLocaleString(locale)}</small>
                {canEdit ? (
                  <button className="comment-resolve" onClick={() => onResolveComment(comment.id, true)} type="button">
                    {t('workspace.comments.resolve')}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </aside>
      ) : null}

      {message ? <p className="notice document-notice">{message}</p> : null}
    </main>
  );
}
