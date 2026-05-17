import React, { useEffect, useMemo, useState } from 'react';
import { Principal } from '@dfinity/principal';
import { BarChart3, RefreshCw, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CommunityAccess,
  CommunityBoardPayload,
  CommunityRole,
  KanbanCardInput,
  WorkspaceRole,
} from '../../backend';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import {
  useAddCommunityBoardCard,
  useAddCommunityBoardColumn,
  useArchiveCommunityBoard,
  useCreateCommunityBoard,
  useDeleteCommunityBoardCard,
  useDeleteCommunityBoardColumn,
  useGetCommunityBoard,
  useListCommunityBoards,
  useListCommunityDocuments,
  useListCommunityEvents,
  useListCommunityMembers,
  useMoveCommunityBoardCard,
  useRenameCommunityBoard,
  useRenameCommunityBoardColumn,
  useReorderCommunityBoardColumns,
  useSetCommunityBoardGrant,
  useSetCommunityBoardPublicLink,
  useSetCommunityBoardShare,
  useUpdateCommunityBoardCard,
} from '../../hooks/useQueries';
import { routePaths } from '../../routing/appRoutes';
import { compactPrincipal, roleName } from '../../workspace/workspaceApi';
import LoadingSpinner from '../LoadingSpinner';
import BoardLibrarySidebar from './BoardLibrarySidebar';
import KanbanBoard, { moveCardInBoard, reorderColumnsInBoard } from './KanbanBoard';
import { inputForCard, type KanbanCardUpdateFields } from './KanbanCard';

interface CommunityBoardsWorkspaceProps {
  access: CommunityAccess;
  communityId: bigint;
  communityName: string;
  canManageCommunityWorkspace: boolean;
  initialBoardId?: bigint;
  onOpenBoardRoute?: (boardId: bigint) => void;
}

const PINNED_BOARD_PREFIX = 'amnesty.pinnedBoard';

function pinnedBoardKey(principal: string | null, communityId: bigint): string {
  return `${PINNED_BOARD_PREFIX}.${principal ?? 'anonymous'}.${communityId.toString()}`;
}

function readPinnedBoardId(principal: string | null, communityId: bigint): bigint | null {
  const value = window.localStorage.getItem(pinnedBoardKey(principal, communityId));
  if (!value || !/^\d+$/.test(value)) return null;
  return BigInt(value);
}

function writePinnedBoardId(principal: string | null, communityId: bigint, boardId: bigint | null) {
  const key = pinnedBoardKey(principal, communityId);
  if (boardId === null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, boardId.toString());
}

export function hasSelectedCommunityBoardId(boardId: bigint | null): boardId is bigint {
  return boardId !== null;
}

function sortByUpdated<T extends { updatedAt: bigint }>(items: T[]): T[] {
  return [...items].sort((left, right) => Number(right.updatedAt - left.updatedAt));
}

function memberNameFromPrincipal(principal: Principal | null, fallback = 'Community member'): string {
  return principal ? compactPrincipal(principal) : fallback;
}

function publicBoardUrl(token: string): string {
  return `${window.location.origin}${routePaths.publicBoard(token)}`;
}

function applyBoardPatch(
  board: CommunityBoardPayload | null,
  selectedBoardId: bigint | null,
  patch: (board: CommunityBoardPayload) => CommunityBoardPayload,
): CommunityBoardPayload | null {
  if (!board || selectedBoardId === null || board.id !== selectedBoardId) return board;
  return patch(board);
}

export default function CommunityBoardsWorkspace({
  access,
  communityId,
  communityName,
  canManageCommunityWorkspace,
  initialBoardId,
  onOpenBoardRoute,
}: CommunityBoardsWorkspaceProps) {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const currentPrincipal = identity?.getPrincipal().toText() ?? null;
  const canCreateBoard = access.isPlatformAdmin || access.communityRole !== null;
  const { data: boards = [], isLoading: boardsLoading, refetch: refetchBoards } = useListCommunityBoards(communityId);
  const { data: members = [] } = useListCommunityMembers(communityId);
  const { data: documents = [] } = useListCommunityDocuments(communityId);
  const { data: events = [] } = useListCommunityEvents(communityId);
  const [selectedBoardId, setSelectedBoardId] = useState<bigint | null>(initialBoardId ?? null);
  const [boardDraft, setBoardDraft] = useState<CommunityBoardPayload | null>(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [message, setMessage] = useState('');
  const { data: selectedBoard, error: selectedBoardError, isLoading: boardLoading, refetch: refetchSelectedBoard } = useGetCommunityBoard(communityId, selectedBoardId);

  const createBoard = useCreateCommunityBoard();
  const renameBoard = useRenameCommunityBoard();
  const addColumn = useAddCommunityBoardColumn();
  const renameColumn = useRenameCommunityBoardColumn();
  const deleteColumn = useDeleteCommunityBoardColumn();
  const reorderColumns = useReorderCommunityBoardColumns();
  const addCard = useAddCommunityBoardCard();
  const updateCard = useUpdateCommunityBoardCard();
  const deleteCard = useDeleteCommunityBoardCard();
  const moveCard = useMoveCommunityBoardCard();
  const archiveBoard = useArchiveCommunityBoard();
  const setGrant = useSetCommunityBoardGrant();
  const setShare = useSetCommunityBoardShare();
  const setPublicLink = useSetCommunityBoardPublicLink();

  const sortedBoards = useMemo(() => sortByUpdated(boards), [boards]);
  const pinnedBoardId = readPinnedBoardId(currentPrincipal, communityId);
  const memberOptions = useMemo(
    () => [...members].sort((left, right) => {
      const leftName = left.profile?.name ?? left.principal.toText();
      const rightName = right.profile?.name ?? right.principal.toText();
      return leftName.localeCompare(rightName);
    }),
    [members],
  );

  useEffect(() => {
    if (initialBoardId !== undefined) {
      setSelectedBoardId(initialBoardId);
    }
  }, [initialBoardId]);

  useEffect(() => {
    if (selectedBoardId !== null || sortedBoards.length === 0) return;
    const pinned = pinnedBoardId ? sortedBoards.find((board) => board.id === pinnedBoardId) : undefined;
    const nextBoardId = pinned?.id ?? sortedBoards[0].id;
    setSelectedBoardId(nextBoardId);
    onOpenBoardRoute?.(nextBoardId);
  }, [onOpenBoardRoute, pinnedBoardId, selectedBoardId, sortedBoards]);

  useEffect(() => {
    setBoardDraft(selectedBoard ?? null);
  }, [selectedBoard]);

  function openBoard(boardId: bigint) {
    setMessage('');
    setCardSearch('');
    setSelectedBoardId(boardId);
    onOpenBoardRoute?.(boardId);
  }

  async function createNewBoard() {
    const title = newBoardTitle.trim();
    if (!title) return;
    setMessage('');
    try {
      const boardId = await createBoard.mutateAsync({ communityId, title });
      setNewBoardTitle('');
      openBoard(boardId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function renameSelectedBoard(title: string) {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return;
    const previous = boardDraft;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({ ...draft, title })));
    try {
      await renameBoard.mutateAsync({ communityId, boardId: selectedBoardId, title });
      await refetchBoards();
    } catch (error) {
      setBoardDraft(previous);
      setMessage(error instanceof Error ? error.message : String(error));
      await refetchSelectedBoard();
    }
  }

  async function addBoardColumn(title: string) {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return;
    try {
      await addColumn.mutateAsync({ communityId, boardId: selectedBoardId, title });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function renameBoardColumn(columnId: bigint, title: string) {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return;
    const previous = boardDraft;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({
      ...draft,
      columns: draft.columns.map((column) => column.id === columnId ? { ...column, title } : column),
    })));
    try {
      await renameColumn.mutateAsync({ communityId, boardId: selectedBoardId, columnId, title });
      await refetchBoards();
    } catch (error) {
      setBoardDraft(previous);
      setMessage(error instanceof Error ? error.message : String(error));
      await refetchSelectedBoard();
    }
  }

  async function deleteBoardColumn(columnId: bigint) {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return;
    try {
      await deleteColumn.mutateAsync({ communityId, boardId: selectedBoardId, columnId });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function addBoardCard(columnId: bigint, title: string) {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return;
    const input: KanbanCardInput = {
      title,
      description: null,
      assignedTo: [],
      docId: null,
      eventId: null,
      dueDateUtc: null,
    };
    try {
      const card = await addCard.mutateAsync({ communityId, boardId: selectedBoardId, columnId, input });
      await moveCard.mutateAsync({
        communityId,
        boardId: selectedBoardId,
        cardId: card.id,
        toColumnId: columnId,
        toIndex: 0n,
      });
      await refetchSelectedBoard();
      await refetchBoards();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function updateBoardCard(cardId: bigint, fields: KanbanCardUpdateFields) {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return false;
    const card = boardDraft?.cards.find((candidate) => candidate.id === cardId);
    if (!card) return false;
    const previous = boardDraft;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({
      ...draft,
      cards: draft.cards.map((candidate) => candidate.id === cardId ? { ...candidate, ...fields, updatedAt: BigInt(Date.now()) * BigInt(1_000_000) } : candidate),
    })));
    try {
      await updateCard.mutateAsync({
        communityId,
        boardId: selectedBoardId,
        cardId,
        input: inputForCard(card, fields),
      });
      await refetchBoards();
      return true;
    } catch (error) {
      setBoardDraft(previous);
      setMessage(error instanceof Error ? error.message : String(error));
      await refetchSelectedBoard();
      return false;
    }
  }

  async function deleteBoardCard(cardId: bigint) {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return;
    const previous = boardDraft;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({
      ...draft,
      cards: draft.cards.filter((card) => card.id !== cardId),
      columns: draft.columns.map((column) => ({ ...column, cardIds: column.cardIds.filter((id) => id !== cardId) })),
    })));
    try {
      await deleteCard.mutateAsync({ communityId, boardId: selectedBoardId, cardId });
    } catch (error) {
      setBoardDraft(previous);
      setMessage(error instanceof Error ? error.message : String(error));
      await refetchSelectedBoard();
    }
  }

  async function moveBoardCard(cardId: bigint, columnId: bigint, index: number) {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return;
    const previous = boardDraft;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => moveCardInBoard(draft, cardId, columnId, index)));
    try {
      await moveCard.mutateAsync({
        communityId,
        boardId: selectedBoardId,
        cardId,
        toColumnId: columnId,
        toIndex: BigInt(index),
      });
    } catch (error) {
      setBoardDraft(previous);
      setMessage(error instanceof Error ? error.message : String(error));
      await refetchSelectedBoard();
    }
  }

  async function reorderBoardColumns(columnIds: bigint[]) {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return;
    const previous = boardDraft;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => reorderColumnsInBoard(draft, columnIds)));
    try {
      await reorderColumns.mutateAsync({ communityId, boardId: selectedBoardId, columnIds });
    } catch (error) {
      setBoardDraft(previous);
      setMessage(error instanceof Error ? error.message : String(error));
      await refetchSelectedBoard();
    }
  }

  async function archiveSelectedBoard() {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return;
    const confirmed = window.confirm(t('boards.messages.archiveConfirm'));
    if (!confirmed) return;
    try {
      await archiveBoard.mutateAsync({ communityId, boardId: selectedBoardId });
      writePinnedBoardId(currentPrincipal, communityId, pinnedBoardId === selectedBoardId ? null : pinnedBoardId);
      const nextBoard = sortedBoards.find((board) => board.id !== selectedBoardId);
      setSelectedBoardId(nextBoard?.id ?? null);
      if (nextBoard) onOpenBoardRoute?.(nextBoard.id);
      setMessage(t('boards.messages.archived'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function grantBoardAccess(principalText: string, role: WorkspaceRole) {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return;
    setMessage('');
    try {
      await setGrant.mutateAsync({
        communityId,
        boardId: selectedBoardId,
        user: Principal.fromText(principalText),
        role,
      });
      setMessage(t('boards.messages.grantedAccess', { role: t(`workspace.roles.${roleName(role)}`) }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function updateCommunityShare(role: WorkspaceRole | null) {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return;
    const previous = boardDraft;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({ ...draft, communityShare: role })));
    try {
      await setShare.mutateAsync({ communityId, boardId: selectedBoardId, role });
      setMessage(
        role
          ? t('boards.messages.communityShareUpdated', { role: t(`workspace.roles.${roleName(role)}`) })
          : t('boards.messages.private'),
      );
    } catch (error) {
      setBoardDraft(previous);
      setMessage(error instanceof Error ? error.message : String(error));
      await refetchSelectedBoard();
    }
  }

  async function createPublicLink(token: string) {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return undefined;
    try {
      const confirmedToken = await setPublicLink.mutateAsync({ communityId, boardId: selectedBoardId, token });
      setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({ ...draft, publicToken: confirmedToken })));
      setMessage(t('boards.messages.publicLinkCreated'));
      return confirmedToken ? publicBoardUrl(confirmedToken) : undefined;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }

  async function disablePublicLink() {
    if (!hasSelectedCommunityBoardId(selectedBoardId)) return;
    try {
      await setPublicLink.mutateAsync({ communityId, boardId: selectedBoardId, token: null });
      setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({ ...draft, publicToken: null })));
      setMessage(t('boards.messages.publicLinkDisabled'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function togglePinnedBoard() {
    if (!boardDraft) return;
    const nextPinned = pinnedBoardId === boardDraft.id ? null : boardDraft.id;
    writePinnedBoardId(currentPrincipal, communityId, nextPinned);
    setMessage(nextPinned ? t('boards.messages.pinned') : t('boards.messages.unpinned'));
  }

  async function reloadBoard() {
    await Promise.all([refetchBoards(), refetchSelectedBoard()]);
    setMessage(t('boards.messages.synced'));
  }

  const accessLabel =
    access.isPlatformAdmin ? t('common.roles.platformAdmin') :
      access.communityRole === CommunityRole.communityAdmin ? t('common.roles.communityAdmin') :
        access.communityRole === CommunityRole.member ? t('common.roles.member') :
          t('common.roles.viewer');
  const boardPublicUrl = boardDraft?.publicToken ? publicBoardUrl(boardDraft.publicToken) : undefined;

  return (
    <section className="kanban-workspace-app">
      <BoardLibrarySidebar
        boards={sortedBoards}
        canCreate={canCreateBoard}
        currentPrincipal={currentPrincipal}
        members={memberOptions}
        newBoardTitle={newBoardTitle}
        onCreateBoard={() => void createNewBoard()}
        onNewBoardTitleChange={setNewBoardTitle}
        onOpenBoard={openBoard}
        selectedBoardId={selectedBoardId}
      />

      <main className="kanban-stage">
        <header className="kanban-hero">
          <div>
            <p className="amnesty-kicker text-amnesty-pink mb-3">{t('boards.hero.kicker')}</p>
            <h1 className="text-4xl text-amnesty-ink md:text-5xl amnesty-heading">{t('boards.hero.title')}</h1>
            <p>{t('boards.hero.body')}</p>
            <small>{communityName}</small>
          </div>
          <div className="kanban-hero-stats">
            <article>
              <span>{t('boards.hero.yourAccess')}</span>
              <strong>{accessLabel}</strong>
              <p>{canManageCommunityWorkspace ? t('boards.hero.manageAccessBody') : t('boards.hero.shareAccessBody')}</p>
              <Users size={25} />
            </article>
            <article>
              <span>{t('boards.hero.boardStats')}</span>
              <strong>
                {boardDraft
                  ? t('boards.labels.columnsCount', { count: boardDraft.columns.length })
                  : t('boards.labels.boardsCount', { count: sortedBoards.length })}
              </strong>
              <p>
                {boardDraft
                  ? t('boards.labels.activeCardsCount', { count: boardDraft.cards.length })
                  : t('boards.labels.workspaceCardsCount', {
                      count: sortedBoards.reduce((sum, board) => sum + Number(board.cardCount), 0),
                    })}
              </p>
              <BarChart3 size={25} />
            </article>
          </div>
        </header>

        {boardsLoading || boardLoading ? (
          <div className="kanban-empty-state">
            <LoadingSpinner size="large" />
          </div>
        ) : boardDraft ? (
          <KanbanBoard
            board={boardDraft}
            canManageCommunityWorkspace={canManageCommunityWorkspace}
            canPinDefault={Boolean(currentPrincipal)}
            documents={documents}
            events={events}
            isPinned={pinnedBoardId === boardDraft.id}
            memberOptions={memberOptions}
            message={message}
            onAddCard={(columnId, title) => void addBoardCard(columnId, title)}
            onAddColumn={(title) => void addBoardColumn(title)}
            onCreatePublicLink={createPublicLink}
            onDeleteBoard={() => void archiveSelectedBoard()}
            onDeleteCard={(cardId) => void deleteBoardCard(cardId)}
            onDeleteColumn={(columnId) => void deleteBoardColumn(columnId)}
            onDisablePublicLink={() => void disablePublicLink()}
            onGrantAccess={(principalText, role) => void grantBoardAccess(principalText, role)}
            onMoveCard={(cardId, columnId, index) => void moveBoardCard(cardId, columnId, index)}
            onReload={() => void reloadBoard()}
            onRenameBoard={(title) => void renameSelectedBoard(title)}
            onRenameColumn={(columnId, title) => void renameBoardColumn(columnId, title)}
            onReorderColumns={(columnIds) => void reorderBoardColumns(columnIds)}
            onSearchQueryChange={setCardSearch}
            onSetCommunityShare={(role) => void updateCommunityShare(role)}
            onTogglePinned={togglePinnedBoard}
            onUpdateCard={updateBoardCard}
            publicShareUrl={boardPublicUrl}
            searchQuery={cardSearch}
          />
        ) : (
          <div className="kanban-empty-state">
            <RefreshCw size={32} />
            <h2>{selectedBoardId !== null || selectedBoardError ? t('boards.empty.unavailableTitle') : t('boards.empty.noSelectionTitle')}</h2>
            <p>
              {selectedBoardId !== null || selectedBoardError
                ? t('boards.empty.unavailableBody')
                : sortedBoards.length > 0
                ? t('boards.empty.chooseBoard')
                : t('boards.empty.createFirst', { communityName })}
            </p>
            {message ? <p className="notice document-notice">{message}</p> : null}
            <small>{memberNameFromPrincipal(identity?.getPrincipal() ?? null)}</small>
          </div>
        )}
      </main>
    </section>
  );
}
