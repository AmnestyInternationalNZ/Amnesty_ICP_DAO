import React, { useEffect, useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Copy, Link2, Pin, Plus, RefreshCw, Search, Share2, Trash2 } from 'lucide-react';
import type { CommunityBoardPayload, CommunityDocumentSummary, CommunityEventPayload, CommunityMember, KanbanCard, WorkspaceRole } from '../../backend';
import { WorkspaceRole as WorkspaceRoleValue } from '../../backend';
import { compactPrincipal, readableDate, roleName, roleVariant } from '../../workspace/workspaceApi';
import KanbanColumn, { columnDropKey, columnKey, parseColumnDropKey, parseColumnKey } from './KanbanColumn';
import { cardKey, parseCardKey, type KanbanCardUpdateFields } from './KanbanCard';

export function cardMatchesQuery(card: KanbanCard, query: string): boolean {
  if (!query) return true;
  return `${card.title} ${card.description ?? ''}`.toLowerCase().includes(query.toLowerCase());
}

export function cardsForColumn(board: CommunityBoardPayload, columnId: bigint, query = ''): KanbanCard[] {
  const column = board.columns.find((item) => item.id === columnId);
  if (!column) return [];
  return column.cardIds
    .map((cardId) => board.cards.find((card) => card.id === cardId))
    .filter((card): card is KanbanCard => Boolean(card))
    .filter((card) => cardMatchesQuery(card, query));
}

export function findCardLocation(board: CommunityBoardPayload, cardId: bigint): { columnId: bigint; index: number } | undefined {
  for (const column of board.columns) {
    const index = column.cardIds.findIndex((candidate) => candidate === cardId);
    if (index >= 0) return { columnId: column.id, index };
  }
  return undefined;
}

export function columnIdForDragTarget(board: CommunityBoardPayload, targetId: string): bigint | undefined {
  const directColumnId = parseColumnKey(targetId) ?? parseColumnDropKey(targetId);
  if (directColumnId !== undefined) return directColumnId;
  const cardId = parseCardKey(targetId);
  if (cardId === undefined) return undefined;
  return findCardLocation(board, cardId)?.columnId;
}

export function moveColumnIds(board: CommunityBoardPayload, activeColumnId: bigint, overColumnId: bigint): bigint[] {
  const columnIds = board.columns.map((column) => column.id);
  const fromIndex = columnIds.findIndex((columnId) => columnId === activeColumnId);
  const toIndex = columnIds.findIndex((columnId) => columnId === overColumnId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return columnIds;
  const nextColumnIds = [...columnIds];
  const [moved] = nextColumnIds.splice(fromIndex, 1);
  nextColumnIds.splice(toIndex, 0, moved);
  return nextColumnIds;
}

export function moveCardInBoard(board: CommunityBoardPayload, cardId: bigint, toColumnId: bigint, toIndex: number): CommunityBoardPayload {
  let fromColumnId: bigint | undefined;
  const nextColumns = board.columns.map((column) => {
    if (column.cardIds.some((id) => id === cardId)) {
      fromColumnId = column.id;
      return { ...column, cardIds: column.cardIds.filter((id) => id !== cardId) };
    }
    return { ...column, cardIds: [...column.cardIds] };
  });
  if (fromColumnId === undefined) return board;
  const target = nextColumns.find((column) => column.id === toColumnId);
  if (!target) return board;
  const clampedIndex = Math.max(0, Math.min(toIndex, target.cardIds.length));
  target.cardIds.splice(clampedIndex, 0, cardId);
  return { ...board, columns: nextColumns };
}

export function reorderColumnsInBoard(board: CommunityBoardPayload, columnIds: bigint[]): CommunityBoardPayload {
  const byId = new Map(board.columns.map((column) => [column.id.toString(), column]));
  const nextColumns = columnIds.map((id) => byId.get(id.toString())).filter((column): column is CommunityBoardPayload['columns'][number] => Boolean(column));
  return nextColumns.length === board.columns.length ? { ...board, columns: nextColumns } : board;
}

function memberLabel(members: CommunityMember[], principal: unknown): string {
  const text = typeof (principal as { toText?: unknown })?.toText === 'function' ? (principal as { toText: () => string }).toText() : String(principal);
  return members.find((member) => member.principal.toText() === text)?.profile?.name ?? compactPrincipal(principal);
}

function isEditable(role: WorkspaceRole): boolean {
  return role === WorkspaceRoleValue.owner || role === WorkspaceRoleValue.editor;
}

function createPublicShareToken(): string {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function copyText(value: string) {
  await navigator.clipboard?.writeText(value);
}

export default function KanbanBoard({
  board,
  canManageCommunityWorkspace,
  canPinDefault,
  documents,
  events,
  isPinned,
  memberOptions,
  message,
  onAddCard,
  onAddColumn,
  onCreatePublicLink,
  onDeleteBoard,
  onDeleteCard,
  onDeleteColumn,
  onDisablePublicLink,
  onGrantAccess,
  onMoveCard,
  onReload,
  onRenameBoard,
  onRenameColumn,
  onReorderColumns,
  onSearchQueryChange,
  onSetCommunityShare,
  onTogglePinned,
  onUpdateCard,
  publicShareUrl,
  searchQuery,
}: {
  board: CommunityBoardPayload;
  canManageCommunityWorkspace: boolean;
  canPinDefault: boolean;
  documents: CommunityDocumentSummary[];
  events: CommunityEventPayload[];
  isPinned: boolean;
  memberOptions: CommunityMember[];
  message?: string;
  onAddCard: (columnId: bigint, title: string) => void;
  onAddColumn: (title: string) => void;
  onCreatePublicLink: (token: string) => Promise<string | undefined>;
  onDeleteBoard: () => void;
  onDeleteCard: (cardId: bigint) => void;
  onDeleteColumn: (columnId: bigint) => void;
  onDisablePublicLink: () => void;
  onGrantAccess: (principalText: string, role: WorkspaceRole) => void;
  onMoveCard: (cardId: bigint, columnId: bigint, index: number) => void;
  onReload: () => void;
  onRenameBoard: (title: string) => void;
  onRenameColumn: (columnId: bigint, title: string) => void;
  onReorderColumns: (columnIds: bigint[]) => void;
  onSearchQueryChange: (query: string) => void;
  onSetCommunityShare: (role: WorkspaceRole | null) => void;
  onTogglePinned: () => void;
  onUpdateCard: (cardId: bigint, fields: KanbanCardUpdateFields) => Promise<boolean | void> | boolean | void;
  publicShareUrl?: string;
  searchQuery: string;
}) {
  const canEdit = isEditable(board.role);
  const canManage = board.role === WorkspaceRoleValue.owner || canManageCommunityWorkspace;
  const canManagePublicLink = board.role === WorkspaceRoleValue.owner;
  const [activeDragId, setActiveDragId] = useState<string | undefined>();
  const [title, setTitle] = useState(board.title);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [grantPrincipal, setGrantPrincipal] = useState('');
  const [grantRole, setGrantRole] = useState<WorkspaceRole>(WorkspaceRoleValue.viewer);
  const [communityRole, setCommunityRole] = useState<WorkspaceRole | 'private'>(board.communityShare ?? 'private');
  const activeCard = activeDragId ? board.cards.find((card) => cardKey(card.id) === activeDragId) : undefined;
  const activeColumn = activeDragId ? board.columns.find((column) => columnKey(column.id) === activeDragId) : undefined;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const columnItems = useMemo(() => board.columns.map((column) => columnKey(column.id)), [board.columns]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setTitle(board.title);
    setCommunityRole(board.communityShare ?? 'private');
  }, [board.id, board.title, board.communityShare]);

  function addColumn() {
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    onAddColumn(trimmed);
    setNewColumnTitle('');
  }

  function commitBoardTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(board.title);
      return;
    }
    if (trimmed !== board.title) {
      onRenameBoard(trimmed);
    }
  }

  function submitGrant() {
    if (!grantPrincipal.trim()) return;
    onGrantAccess(grantPrincipal.trim(), grantRole);
    setGrantPrincipal('');
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(undefined);
    if (!event.over) return;
    const kind = event.active.data.current?.kind;
    const activeId = String(event.active.id);
    const overId = String(event.over.id);

    if (kind === 'column') {
      const activeColumnId = parseColumnKey(activeId);
      const overColumnId = parseColumnKey(overId) ?? parseColumnDropKey(overId);
      if (activeColumnId === undefined || overColumnId === undefined || activeColumnId === overColumnId) return;
      const nextColumnIds = moveColumnIds(board, activeColumnId, overColumnId);
      onReorderColumns(nextColumnIds);
      return;
    }

    if (kind === 'card') {
      const cardId = parseCardKey(activeId);
      const toColumnId = columnIdForDragTarget(board, overId);
      if (cardId === undefined || toColumnId === undefined) return;
      const overCardId = parseCardKey(overId);
      const targetCards = cardsForColumn(board, toColumnId);
      const overIndex = overCardId === undefined ? targetCards.length : Math.max(0, targetCards.findIndex((card) => card.id === overCardId));
      onMoveCard(cardId, toColumnId, overIndex < 0 ? targetCards.length : overIndex);
    }
  }

  const filteredCardCount = board.cards.filter((card) => cardMatchesQuery(card, normalizedSearch)).length;

  return (
    <section className="kanban-board">
      <div className="kanban-board-head">
        <div>
          <input
            aria-label="Board title"
            disabled={!canEdit}
            onBlur={commitBoardTitle}
            onChange={(event) => setTitle(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            value={title}
          />
          <div className="kanban-board-meta">
            <span>By</span>
            <span className="kanban-avatar">{memberLabel(memberOptions, board.owner).slice(0, 1).toUpperCase()}</span>
            <strong>{memberLabel(memberOptions, board.owner)}</strong>
            <span>·</span>
            <span>{roleName(board.role)}</span>
            <span>·</span>
            <span>{board.columns.length} columns</span>
            <span>·</span>
            <span>{filteredCardCount} cards</span>
          </div>
        </div>
        <div className="kanban-board-actions">
          <label className="kanban-card-search">
            <Search size={16} />
            <input aria-label="Search cards" onChange={(event) => onSearchQueryChange(event.currentTarget.value)} placeholder="Search cards" value={searchQuery} />
          </label>
          <button className={isPinned ? 'ghost-button selected' : 'ghost-button'} disabled={!canPinDefault} onClick={onTogglePinned} type="button">
            <Pin size={16} />
            {isPinned ? 'Pinned' : 'Pin'}
          </button>
          <button className="ghost-button selected" disabled={!canManage} onClick={() => setShareOpen((value) => !value)} type="button">
            <Share2 size={16} />
            Share
          </button>
          <button className="ghost-button" onClick={onReload} type="button">
            <RefreshCw size={16} />
            Sync
          </button>
          {canManage ? (
            <button className="ghost-button danger" onClick={onDeleteBoard} type="button">
              <Trash2 size={16} />
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {shareOpen ? (
        <div className="share-popover kanban-share-popover">
          <h3>Share board</h3>
          <p>Grant direct access, share with community workspace members, or create a public read-only link.</p>
          <label>
            Direct member
            <select onChange={(event) => setGrantPrincipal(event.currentTarget.value)} value={grantPrincipal}>
              <option value="">Choose a member</option>
              {memberOptions.map((member) => (
                <option key={member.principal.toText()} value={member.principal.toText()}>{memberLabel(memberOptions, member.principal)}</option>
              ))}
            </select>
          </label>
          <select aria-label="Direct board grant role" onChange={(event) => setGrantRole(roleVariant(event.currentTarget.value as 'viewer' | 'editor'))} value={roleName(grantRole)}>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button className="btn-secondary rounded-full px-4 py-2 text-sm" disabled={!canManage || !grantPrincipal} onClick={submitGrant} type="button">Grant</button>

          <div className="share-public">
            <strong>Community workspace</strong>
            <p>Workspace sharing is visible to signed-in members of this community.</p>
            <select aria-label="Community board access role" onChange={(event) => setCommunityRole(event.currentTarget.value === 'private' ? 'private' : roleVariant(event.currentTarget.value as 'viewer' | 'editor'))} value={communityRole === 'private' ? 'private' : roleName(communityRole)}>
              <option value="private">Private</option>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button className="ghost-button" disabled={!canManage} onClick={() => onSetCommunityShare(communityRole === 'private' ? null : communityRole)} type="button">Update community share</button>
          </div>

          <div className="share-public">
            <strong>Anyone with link</strong>
            <p>
              Public board links are read-only and expose only this board.
              {canManagePublicLink ? '' : ' Only the board owner can manage this link.'}
            </p>
            {publicShareUrl ? (
              <>
                <input aria-label="Public board URL" readOnly value={publicShareUrl} />
                <div className="share-public-actions">
                  <button className="ghost-button" onClick={() => void copyText(publicShareUrl)} type="button">
                    <Copy size={16} />
                    Copy link
                  </button>
                  <button className="ghost-button danger" disabled={!canManagePublicLink} onClick={onDisablePublicLink} type="button">Disable</button>
                </div>
              </>
            ) : (
              <button
                className="ghost-button"
                disabled={!canManagePublicLink}
                onClick={async () => {
                  const url = await onCreatePublicLink(createPublicShareToken());
                  if (url) void copyText(url);
                }}
                type="button"
              >
                <Link2 size={16} />
                Create public link
              </button>
            )}
          </div>
        </div>
      ) : null}

      {message ? <p className="notice document-notice">{message}</p> : null}

      <DndContext collisionDetection={closestCenter} onDragCancel={() => setActiveDragId(undefined)} onDragEnd={handleDragEnd} onDragStart={handleDragStart} sensors={sensors}>
        <SortableContext items={columnItems} strategy={horizontalListSortingStrategy}>
          <div aria-label="Board columns" className="kanban-columns">
            {board.columns.map((column) => (
              <KanbanColumn
                canEdit={canEdit}
                cards={cardsForColumn(board, column.id, normalizedSearch)}
                column={column}
                communityId={board.communityId}
                documents={documents}
                events={events}
                key={column.id.toString()}
                memberOptions={memberOptions}
                onAddCard={onAddCard}
                onDeleteCard={onDeleteCard}
                onDeleteColumn={onDeleteColumn}
                onRenameColumn={onRenameColumn}
                onUpdateCard={onUpdateCard}
              />
            ))}
            {canEdit ? (
              <section className="kanban-column kanban-new-column">
                <input
                  aria-label="New column title"
                  onChange={(event) => setNewColumnTitle(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addColumn();
                  }}
                  placeholder="New column"
                  value={newColumnTitle}
                />
                <button onClick={addColumn} type="button">
                  <Plus size={16} />
                  Add column
                </button>
              </section>
            ) : null}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeCard ? (
            <article className="kanban-card drag-overlay">
              <strong>{activeCard.title}</strong>
            </article>
          ) : activeColumn ? (
            <section className="kanban-column drag-overlay">
              <strong>{activeColumn.title}</strong>
            </section>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
