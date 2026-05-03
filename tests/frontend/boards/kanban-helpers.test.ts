import { describe, expect, it } from 'vitest';
import { Principal } from '@dfinity/principal';
import { WorkspaceRole, type CommunityBoardPayload, type KanbanCard } from '../../../frontend/src/backend';
import {
  cardMatchesQuery,
  cardsForColumn,
  columnIdForDragTarget,
  findCardLocation,
  moveCardInBoard,
  moveColumnIds,
  reorderColumnsInBoard,
} from '../../../frontend/src/components/boards/KanbanBoard';
import { cardKey, parseCardKey } from '../../../frontend/src/components/boards/KanbanCard';
import { columnDropKey, columnKey, parseColumnDropKey, parseColumnKey } from '../../../frontend/src/components/boards/KanbanColumn';

const owner = Principal.fromText('2vxsx-fae');

function card(id: bigint, title: string, description: string | null = null): KanbanCard {
  return {
    id,
    title,
    description,
    createdBy: owner,
    assignedTo: [],
    docId: null,
    eventId: null,
    dueDateUtc: null,
    createdAt: id,
    updatedAt: id,
  };
}

function board(): CommunityBoardPayload {
  return {
    id: 100n,
    communityId: 7n,
    title: 'Features and Bug Report',
    owner,
    createdAt: 1n,
    updatedAt: 2n,
    archived: false,
    role: WorkspaceRole.owner,
    communityShare: WorkspaceRole.viewer,
    access: [],
    publicToken: 'x'.repeat(32),
    columnCount: 3n,
    cardCount: 3n,
    columns: [
      { id: 1n, title: 'To do', cardIds: [10n, 11n] },
      { id: 2n, title: 'Doing', cardIds: [12n] },
      { id: 3n, title: 'Done', cardIds: [] },
    ],
    cards: [
      card(10n, 'Workspace Board Bug', 'Sharing does not show in the side panel.'),
      card(11n, 'Admin cycles issue'),
      card(12n, 'Public link QA'),
    ],
  };
}

describe('kanban helpers', () => {
  it('parses drag keys for cards, columns, and column drop targets', () => {
    expect(cardKey(42n)).toBe('card:42');
    expect(parseCardKey('card:42')).toBe(42n);
    expect(columnKey(3n)).toBe('column:3');
    expect(parseColumnKey('column:3')).toBe(3n);
    expect(columnDropKey(4n)).toBe('column-drop:4');
    expect(parseColumnDropKey('column-drop:4')).toBe(4n);
  });

  it('moves cards between columns without mutating the original board', () => {
    const source = board();
    const moved = moveCardInBoard(source, 11n, 2n, 1);

    expect(source.columns[0].cardIds).toEqual([10n, 11n]);
    expect(moved.columns[0].cardIds).toEqual([10n]);
    expect(moved.columns[1].cardIds).toEqual([12n, 11n]);
    expect(findCardLocation(moved, 11n)).toEqual({ columnId: 2n, index: 1 });
  });

  it('reorders columns and resolves card drag targets', () => {
    const source = board();
    expect(moveColumnIds(source, 1n, 3n)).toEqual([2n, 3n, 1n]);
    expect(reorderColumnsInBoard(source, [3n, 1n, 2n]).columns.map((column) => column.id)).toEqual([3n, 1n, 2n]);
    expect(columnIdForDragTarget(source, 'card:12')).toBe(2n);
    expect(columnIdForDragTarget(source, 'column-drop:3')).toBe(3n);
  });

  it('filters cards for board search', () => {
    const source = board();
    expect(cardMatchesQuery(source.cards[0], 'side panel')).toBe(true);
    expect(cardsForColumn(source, 1n, 'admin').map((item) => item.id)).toEqual([11n]);
  });
});
