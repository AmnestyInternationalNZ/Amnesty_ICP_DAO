import React, { useEffect, useMemo, useState } from 'react';
import { Principal } from '@dfinity/principal';
import { BarChart3, RefreshCw, Users } from 'lucide-react';
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
  const { data: selectedBoard, isLoading: boardLoading, refetch: refetchSelectedBoard } = useGetCommunityBoard(communityId, selectedBoardId);

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
    const boardId = await createBoard.mutateAsync({ communityId, title });
    setNewBoardTitle('');
    openBoard(boardId);
  }

  async function renameSelectedBoard(title: string) {
    if (!selectedBoardId) return;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({ ...draft, title })));
    await renameBoard.mutateAsync({ communityId, boardId: selectedBoardId, title });
  }

  async function addBoardColumn(title: string) {
    if (!selectedBoardId) return;
    await addColumn.mutateAsync({ communityId, boardId: selectedBoardId, title });
  }

  async function renameBoardColumn(columnId: bigint, title: string) {
    if (!selectedBoardId) return;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({
      ...draft,
      columns: draft.columns.map((column) => column.id === columnId ? { ...column, title } : column),
    })));
    await renameColumn.mutateAsync({ communityId, boardId: selectedBoardId, columnId, title });
  }

  async function deleteBoardColumn(columnId: bigint) {
    if (!selectedBoardId) return;
    await deleteColumn.mutateAsync({ communityId, boardId: selectedBoardId, columnId });
  }

  async function addBoardCard(columnId: bigint, title: string) {
    if (!selectedBoardId) return;
    const input: KanbanCardInput = {
      title,
      description: null,
      assignedTo: [],
      docId: null,
      eventId: null,
      dueDateUtc: null,
    };
    await addCard.mutateAsync({ communityId, boardId: selectedBoardId, columnId, input });
  }

  async function updateBoardCard(cardId: bigint, fields: KanbanCardUpdateFields) {
    if (!selectedBoardId) return false;
    const card = boardDraft?.cards.find((candidate) => candidate.id === cardId);
    if (!card) return false;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({
      ...draft,
      cards: draft.cards.map((candidate) => candidate.id === cardId ? { ...candidate, ...fields, updatedAt: BigInt(Date.now()) * BigInt(1_000_000) } : candidate),
    })));
    await updateCard.mutateAsync({
      communityId,
      boardId: selectedBoardId,
      cardId,
      input: inputForCard(card, fields),
    });
    return true;
  }

  async function deleteBoardCard(cardId: bigint) {
    if (!selectedBoardId) return;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({
      ...draft,
      cards: draft.cards.filter((card) => card.id !== cardId),
      columns: draft.columns.map((column) => ({ ...column, cardIds: column.cardIds.filter((id) => id !== cardId) })),
    })));
    await deleteCard.mutateAsync({ communityId, boardId: selectedBoardId, cardId });
  }

  async function moveBoardCard(cardId: bigint, columnId: bigint, index: number) {
    if (!selectedBoardId) return;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => moveCardInBoard(draft, cardId, columnId, index)));
    await moveCard.mutateAsync({
      communityId,
      boardId: selectedBoardId,
      cardId,
      toColumnId: columnId,
      toIndex: BigInt(index),
    });
  }

  async function reorderBoardColumns(columnIds: bigint[]) {
    if (!selectedBoardId) return;
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => reorderColumnsInBoard(draft, columnIds)));
    await reorderColumns.mutateAsync({ communityId, boardId: selectedBoardId, columnIds });
  }

  async function archiveSelectedBoard() {
    if (!selectedBoardId) return;
    const confirmed = window.confirm('Archive this board? It will disappear from the workspace lists.');
    if (!confirmed) return;
    await archiveBoard.mutateAsync({ communityId, boardId: selectedBoardId });
    writePinnedBoardId(currentPrincipal, communityId, pinnedBoardId === selectedBoardId ? null : pinnedBoardId);
    const nextBoard = sortedBoards.find((board) => board.id !== selectedBoardId);
    setSelectedBoardId(nextBoard?.id ?? null);
    if (nextBoard) onOpenBoardRoute?.(nextBoard.id);
  }

  async function grantBoardAccess(principalText: string, role: WorkspaceRole) {
    if (!selectedBoardId) return;
    setMessage('');
    try {
      await setGrant.mutateAsync({
        communityId,
        boardId: selectedBoardId,
        user: Principal.fromText(principalText),
        role,
      });
      setMessage(`Granted ${roleName(role)} access.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function updateCommunityShare(role: WorkspaceRole | null) {
    if (!selectedBoardId) return;
    await setShare.mutateAsync({ communityId, boardId: selectedBoardId, role });
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({ ...draft, communityShare: role })));
  }

  async function createPublicLink(token: string) {
    if (!selectedBoardId) return undefined;
    const confirmedToken = await setPublicLink.mutateAsync({ communityId, boardId: selectedBoardId, token });
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({ ...draft, publicToken: confirmedToken })));
    setMessage('Public read-only link created and copied.');
    return confirmedToken ? publicBoardUrl(confirmedToken) : undefined;
  }

  async function disablePublicLink() {
    if (!selectedBoardId) return;
    await setPublicLink.mutateAsync({ communityId, boardId: selectedBoardId, token: null });
    setBoardDraft((board) => applyBoardPatch(board, selectedBoardId, (draft) => ({ ...draft, publicToken: null })));
    setMessage('Public link disabled.');
  }

  function togglePinnedBoard() {
    if (!boardDraft) return;
    const nextPinned = pinnedBoardId === boardDraft.id ? null : boardDraft.id;
    writePinnedBoardId(currentPrincipal, communityId, nextPinned);
    setMessage(nextPinned ? 'Pinned as your default board for this community.' : 'Default board pin removed.');
  }

  async function reloadBoard() {
    await Promise.all([refetchBoards(), refetchSelectedBoard()]);
    setMessage('Board synced.');
  }

  const accessLabel =
    access.isPlatformAdmin ? 'Platform admin' :
      access.communityRole === CommunityRole.communityAdmin ? 'Community admin' :
        access.communityRole === CommunityRole.member ? 'Member' :
          'Viewer';
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
            <p className="amnesty-kicker text-amnesty-pink mb-3">Boards</p>
            <h1 className="text-4xl text-amnesty-ink md:text-5xl amnesty-heading">Coordinate work and track progress together.</h1>
            <p>Organise tasks, surface blockers, and move your community's work toward impact.</p>
            <small>{communityName}</small>
          </div>
          <div className="kanban-hero-stats">
            <article>
              <span>Your access</span>
              <strong>{accessLabel}</strong>
              <p>{canManageCommunityWorkspace ? 'You can manage workspace boards, columns, and members.' : 'Your board actions follow each board share setting.'}</p>
              <Users size={25} />
            </article>
            <article>
              <span>Board stats</span>
              <strong>{boardDraft ? `${boardDraft.columns.length} columns` : `${sortedBoards.length} boards`}</strong>
              <p>{boardDraft ? `${boardDraft.cards.length} active cards` : `${sortedBoards.reduce((sum, board) => sum + Number(board.cardCount), 0)} cards across this workspace`}</p>
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
            <h2>No board selected</h2>
            <p>
              {sortedBoards.length > 0
                ? 'Choose a board from the sidebar to continue.'
                : `Create the first board for ${communityName}.`}
            </p>
            <small>{memberNameFromPrincipal(identity?.getPrincipal() ?? null)}</small>
          </div>
        )}
      </main>
    </section>
  );
}
