import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  closestCenter,
  type CollisionDetection,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Copy, Link2, Pin, Plus, RefreshCw, Search, Share2, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

function dragKind(event: DragEndEvent): 'card' | 'column' | undefined {
  const kind = event.active.data.current?.kind;
  return kind === 'card' || kind === 'column' ? kind : undefined;
}

export const kanbanCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length === 0) {
    return closestCenter(args);
  }

  const activeKind = args.active.data.current?.kind;
  if (activeKind === 'card') {
    const cardCollisions = pointerCollisions.filter((collision) => parseCardKey(String(collision.id)) !== undefined);
    if (cardCollisions.length > 0) return cardCollisions;

    const columnDropCollisions = pointerCollisions.filter((collision) => parseColumnDropKey(String(collision.id)) !== undefined);
    if (columnDropCollisions.length > 0) return columnDropCollisions;

    const columnCollisions = pointerCollisions.filter((collision) => parseColumnKey(String(collision.id)) !== undefined);
    if (columnCollisions.length > 0) return columnCollisions;
  }

  if (activeKind === 'column') {
    const columnCollisions = pointerCollisions.filter((collision) => parseColumnKey(String(collision.id)) !== undefined);
    if (columnCollisions.length > 0) return columnCollisions;

    const columnDropCollisions = pointerCollisions.filter((collision) => parseColumnDropKey(String(collision.id)) !== undefined);
    if (columnDropCollisions.length > 0) return columnDropCollisions;
  }

  return pointerCollisions;
};

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
  const { t } = useTranslation();
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
  const memberDatalistId = useId();
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

  useEffect(() => {
    if (!shareOpen) return undefined;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShareOpen(false);
      }
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [shareOpen]);

  useEffect(() => {
    if (!canManage) {
      setShareOpen(false);
    }
  }, [canManage]);

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
    setShareOpen(false);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(undefined);
    if (!event.over || !canEdit) return;
    const kind = dragKind(event);
    const activeId = String(event.active.id);
    const overId = String(event.over.id);

    if (kind === 'column') {
      const activeColumnId = parseColumnKey(activeId);
      const overColumnId = columnIdForDragTarget(board, overId);
      if (activeColumnId === undefined || overColumnId === undefined || activeColumnId === overColumnId) return;
      const nextColumnIds = moveColumnIds(board, activeColumnId, overColumnId);
      if (nextColumnIds.every((columnId, index) => columnId === board.columns[index]?.id)) return;
      onReorderColumns(nextColumnIds);
      return;
    }

    if (kind === 'card') {
      const cardId = parseCardKey(activeId);
      if (cardId === undefined) return;
      const overCardId = parseCardKey(overId);
      if (overCardId !== undefined) {
        const target = findCardLocation(board, overCardId);
        if (!target) return;
        const source = findCardLocation(board, cardId);
        const targetIndex = source?.columnId === target.columnId && source.index < target.index ? target.index - 1 : target.index;
        onMoveCard(cardId, target.columnId, targetIndex);
        return;
      }

      const toColumnId = parseColumnKey(overId) ?? parseColumnDropKey(overId);
      if (toColumnId === undefined) return;
      const targetCards = cardsForColumn(board, toColumnId);
      onMoveCard(cardId, toColumnId, targetCards.length);
    }
  }

  const filteredCardCount = board.cards.filter((card) => cardMatchesQuery(card, normalizedSearch)).length;
  const cardCountLabel = normalizedSearch
    ? t('boards.labels.filteredCardsCount', { count: filteredCardCount, total: board.cards.length })
    : board.cards.length.toString();

  return (
    <section className="kanban-board">
      <div className="kanban-board-head">
        <div>
          <input
            aria-label={t('boards.board.title')}
            disabled={!canEdit}
            onBlur={commitBoardTitle}
            onChange={(event) => setTitle(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            value={title}
          />
          <div className="kanban-board-meta">
            <span>{t('common.labels.byPrefix')}</span>
            <span className="kanban-avatar">{memberLabel(memberOptions, board.owner).slice(0, 1).toUpperCase()}</span>
            <strong>{memberLabel(memberOptions, board.owner)}</strong>
            <span>·</span>
            <span>{t(`workspace.roles.${roleName(board.role)}`)}</span>
            <span>·</span>
            <span>{t('boards.labels.columnsCount', { count: board.columns.length })}</span>
            <span>·</span>
            <span>{t('boards.labels.cardsCountWithValue', { value: cardCountLabel })}</span>
          </div>
        </div>
        <div className="kanban-board-actions">
          <label className="kanban-card-search">
            <Search size={16} />
            <input aria-label={t('boards.board.searchCards')} onChange={(event) => onSearchQueryChange(event.currentTarget.value)} placeholder={t('boards.board.searchCards')} value={searchQuery} />
          </label>
          {canPinDefault ? (
            <button className={isPinned ? 'ghost-button selected' : 'ghost-button'} onClick={onTogglePinned} type="button">
              <Pin size={16} />
              {isPinned ? t('boards.actions.pinned') : t('boards.actions.pin')}
            </button>
          ) : null}
          {canManage ? (
            <button className="ghost-button selected" onClick={() => setShareOpen((value) => !value)} type="button">
              <Share2 size={16} />
              {t('common.actions.share')}
            </button>
          ) : null}
          <button className="ghost-button" onClick={onReload} type="button">
            <RefreshCw size={16} />
            {t('workspace.actions.sync')}
          </button>
          {canManage ? (
            <button className="ghost-button danger" onClick={onDeleteBoard} type="button">
              <Trash2 size={16} />
              {t('common.actions.delete')}
            </button>
          ) : null}
        </div>
      </div>

      {shareOpen ? (
        <div aria-label={t('boards.share.title')} className="share-popover kanban-share-popover" role="dialog">
          <div className="share-popover-heading">
            <div>
              <h3>{t('boards.share.title')}</h3>
              <p>{t('boards.share.description')}</p>
            </div>
            <button aria-label={t('boards.share.close')} className="icon-button subtle" onClick={() => setShareOpen(false)} type="button">
              <X size={18} />
            </button>
          </div>
          <label>
            {t('boards.share.directMember')}
            <input
              aria-label={t('boards.share.principalToGrant')}
              list={memberDatalistId}
              onChange={(event) => setGrantPrincipal(event.currentTarget.value)}
              placeholder={t('boards.share.principalPlaceholder')}
              value={grantPrincipal}
            />
            <datalist id={memberDatalistId}>
              {memberOptions.map((member) => (
                <option key={member.principal.toText()} label={memberLabel(memberOptions, member.principal)} value={member.principal.toText()} />
              ))}
            </datalist>
          </label>
          <select aria-label={t('boards.share.directGrantRole')} onChange={(event) => setGrantRole(roleVariant(event.currentTarget.value as 'viewer' | 'editor'))} value={roleName(grantRole)}>
            <option value="viewer">{t('workspace.roles.viewer')}</option>
            <option value="editor">{t('workspace.roles.editor')}</option>
          </select>
          <button className="btn-secondary rounded-full px-4 py-2 text-sm" disabled={!canManage || !grantPrincipal.trim()} onClick={submitGrant} type="button">{t('workspace.actions.grant')}</button>

          <div className="share-public">
            <strong>{t('boards.share.communityWorkspace')}</strong>
            <p>{t('boards.share.workspaceVisibility')}</p>
            <select aria-label={t('boards.share.communityBoardRole')} onChange={(event) => setCommunityRole(event.currentTarget.value === 'private' ? 'private' : roleVariant(event.currentTarget.value as 'viewer' | 'editor'))} value={communityRole === 'private' ? 'private' : roleName(communityRole)}>
              <option value="private">{t('workspace.share.private')}</option>
              <option value="viewer">{t('workspace.roles.viewer')}</option>
              <option value="editor">{t('workspace.roles.editor')}</option>
            </select>
            <button
              className="ghost-button"
              disabled={!canManage}
              onClick={() => {
                onSetCommunityShare(communityRole === 'private' ? null : communityRole);
                setShareOpen(false);
              }}
              type="button"
            >
              {t('boards.share.updateCommunityShare')}
            </button>
          </div>

          <div className="share-public">
            <strong>{t('boards.share.anyoneWithLink')}</strong>
            <p>
              {t('boards.share.publicLinksBody')}
              {canManagePublicLink ? '' : ` ${t('boards.share.ownerOnlyPublicLink')}`}
            </p>
            {publicShareUrl ? (
              <>
                <input aria-label={t('boards.share.publicBoardUrl')} readOnly value={publicShareUrl} />
                <div className="share-public-actions">
                  <button
                    className="ghost-button"
                    onClick={() => {
                      void copyText(publicShareUrl);
                      setShareOpen(false);
                    }}
                    type="button"
                  >
                    <Copy size={16} />
                    {t('boards.share.copyLink')}
                  </button>
                  <button
                    className="ghost-button danger"
                    disabled={!canManagePublicLink}
                    onClick={() => {
                      onDisablePublicLink();
                      setShareOpen(false);
                    }}
                    type="button"
                  >
                    {t('boards.share.disable')}
                  </button>
                </div>
              </>
            ) : (
              <button
                className="ghost-button"
                disabled={!canManagePublicLink}
                onClick={async () => {
                  const url = await onCreatePublicLink(createPublicShareToken());
                  if (url) void copyText(url);
                  if (url) setShareOpen(false);
                }}
                type="button"
              >
                <Link2 size={16} />
                {t('boards.share.createPublicLink')}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {message ? <p className="notice document-notice">{message}</p> : null}

      <DndContext collisionDetection={kanbanCollisionDetection} onDragCancel={() => setActiveDragId(undefined)} onDragEnd={handleDragEnd} onDragStart={handleDragStart} sensors={sensors}>
        <SortableContext items={columnItems} strategy={horizontalListSortingStrategy}>
          <div aria-label={t('boards.board.columns')} className="kanban-columns">
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
                  aria-label={t('boards.board.newColumnTitle')}
                  onChange={(event) => setNewColumnTitle(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addColumn();
                  }}
                  placeholder={t('boards.board.newColumn')}
                  value={newColumnTitle}
                />
                <button disabled={!newColumnTitle.trim()} onClick={addColumn} type="button">
                  <Plus size={16} />
                  {t('boards.actions.addColumn')}
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
