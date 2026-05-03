import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import type { CommunityBoardSummary, CommunityMember } from '../../backend';
import { WorkspaceRole } from '../../backend';
import { compactPrincipal, readableDate } from '../../workspace/workspaceApi';

function memberLabel(members: CommunityMember[] | undefined, principal: unknown): string {
  const text = typeof (principal as { toText?: unknown })?.toText === 'function' ? (principal as { toText: () => string }).toText() : String(principal);
  return members?.find((member) => member.principal.toText() === text)?.profile?.name ?? compactPrincipal(principal);
}

function boardMatchesSearch(board: CommunityBoardSummary, query: string): boolean {
  if (!query) return true;
  return `${board.title} ${board.cardCount.toString()} ${board.columnCount.toString()}`.toLowerCase().includes(query.toLowerCase());
}

function sortBoards(boards: CommunityBoardSummary[]): CommunityBoardSummary[] {
  return [...boards].sort((a, b) => Number(b.updatedAt - a.updatedAt));
}

function BoardRow({
  board,
  members,
  onOpenBoard,
  selected,
}: {
  board: CommunityBoardSummary;
  members: CommunityMember[] | undefined;
  onOpenBoard: (boardId: bigint) => void;
  selected: boolean;
}) {
  return (
    <button className={selected ? 'kanban-sidebar-board selected' : 'kanban-sidebar-board'} onClick={() => onOpenBoard(board.id)} type="button">
      <strong>{board.title}</strong>
      <span>
        {memberLabel(members, board.owner)} · {board.columnCount.toString()} columns · {board.cardCount.toString()} cards
      </span>
      <small>{readableDate(board.updatedAt)}</small>
    </button>
  );
}

function BoardSection({
  boards,
  collapsed,
  empty,
  members,
  onOpenBoard,
  onToggle,
  selectedBoardId,
  title,
}: {
  boards: CommunityBoardSummary[];
  collapsed: boolean;
  empty: string;
  members: CommunityMember[] | undefined;
  onOpenBoard: (boardId: bigint) => void;
  onToggle: () => void;
  selectedBoardId: bigint | null;
  title: string;
}) {
  return (
    <section className="kanban-sidebar-section">
      <button className="kanban-sidebar-section-head" onClick={onToggle} type="button">
        {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        <span>{title}</span>
        <b>{boards.length}</b>
      </button>
      {!collapsed ? (
        <div className="kanban-sidebar-section-body">
          {boards.length === 0 ? (
            <p>{empty}</p>
          ) : (
            boards.map((board) => (
              <BoardRow board={board} key={board.id.toString()} members={members} onOpenBoard={onOpenBoard} selected={selectedBoardId === board.id} />
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}

export default function BoardLibrarySidebar({
  boards,
  canCreate,
  currentPrincipal,
  members,
  newBoardTitle,
  onCreateBoard,
  onNewBoardTitleChange,
  onOpenBoard,
  selectedBoardId,
}: {
  boards: CommunityBoardSummary[];
  canCreate: boolean;
  currentPrincipal: string | null;
  members: CommunityMember[] | undefined;
  newBoardTitle: string;
  onCreateBoard: () => void;
  onNewBoardTitleChange: (title: string) => void;
  onOpenBoard: (boardId: bigint) => void;
  selectedBoardId: bigint | null;
}) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({ mine: false, workspace: false, shared: false });
  const filtered = useMemo(() => sortBoards(boards.filter((board) => boardMatchesSearch(board, search))), [boards, search]);
  const mine = filtered.filter((board) => board.role === WorkspaceRole.owner || (currentPrincipal !== null && board.owner.toText() === currentPrincipal));
  const workspace = filtered.filter((board) => !mine.some((item) => item.id === board.id) && board.communityShare !== null);
  const shared = filtered.filter((board) => !mine.some((item) => item.id === board.id) && !workspace.some((item) => item.id === board.id));

  return (
    <aside aria-label="Boards" className="kanban-sidebar">
      <h2>Boards</h2>
      {canCreate ? (
        <div className="kanban-create-board">
          <input
            aria-label="New board title"
            onChange={(event) => onNewBoardTitleChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onCreateBoard();
            }}
            placeholder="New board title"
            value={newBoardTitle}
          />
          <button className="btn-primary rounded-full" onClick={onCreateBoard} type="button">
            <Plus size={16} />
            Create board
          </button>
        </div>
      ) : null}
      <label className="kanban-board-search">
        <Search size={16} />
        <input aria-label="Search boards" onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search boards" value={search} />
      </label>
      <BoardSection
        boards={mine}
        collapsed={collapsed.mine}
        empty="No boards yet."
        members={members}
        onOpenBoard={onOpenBoard}
        onToggle={() => setCollapsed((value) => ({ ...value, mine: !value.mine }))}
        selectedBoardId={selectedBoardId}
        title="My boards"
      />
      <BoardSection
        boards={workspace}
        collapsed={collapsed.workspace}
        empty="No workspace boards found."
        members={members}
        onOpenBoard={onOpenBoard}
        onToggle={() => setCollapsed((value) => ({ ...value, workspace: !value.workspace }))}
        selectedBoardId={selectedBoardId}
        title="Workspace boards"
      />
      <BoardSection
        boards={shared}
        collapsed={collapsed.shared}
        empty="No directly shared boards found."
        members={members}
        onOpenBoard={onOpenBoard}
        onToggle={() => setCollapsed((value) => ({ ...value, shared: !value.shared }))}
        selectedBoardId={selectedBoardId}
        title="Shared with me"
      />
    </aside>
  );
}
