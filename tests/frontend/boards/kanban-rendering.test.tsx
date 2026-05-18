import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { Principal } from '@dfinity/principal';
import { CommunityRole, WorkspaceRole, type CommunityBoardPayload, type CommunityBoardSummary, type CommunityMember } from '../../../frontend/src/backend';
import BoardLibrarySidebar from '../../../frontend/src/components/boards/BoardLibrarySidebar';
import KanbanBoard from '../../../frontend/src/components/boards/KanbanBoard';
import CardMarkdown from '../../../frontend/src/components/boards/cardMarkdown';
import { i18n } from '../../../frontend/src/i18n';

const owner = Principal.fromText('2vxsx-fae');
const editor = Principal.fromText('aaaaa-aa');

const members: CommunityMember[] = [
  { principal: owner, role: CommunityRole.member, profile: { name: 'JaiJai' } },
  { principal: editor, role: CommunityRole.member, profile: { name: 'Aroha' } },
];

function renderWithI18n(node: React.ReactElement): string {
  return renderToStaticMarkup(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

function boardSummary(overrides: Partial<CommunityBoardSummary> = {}): CommunityBoardSummary {
  return {
    id: 1n,
    communityId: 9n,
    title: 'Features and Bug Report',
    owner,
    createdAt: 1n,
    updatedAt: 2n,
    archived: false,
    role: WorkspaceRole.owner,
    communityShare: null,
    columnCount: 2n,
    cardCount: 1n,
    ...overrides,
  };
}

function board(): CommunityBoardPayload {
  return {
    ...boardSummary(),
    access: [],
    publicToken: 'x'.repeat(32),
    columns: [
      { id: 10n, title: 'To do', cardIds: [100n] },
      { id: 11n, title: 'Done', cardIds: [] },
    ],
    cards: [
      {
        id: 100n,
        title: 'Workspace Board Bug',
        description: '- [x] Shared board appears\n- [ ] Public link QA\n\n[Doc](https://example.com)',
        createdBy: owner,
        assignedTo: [editor],
        docId: null,
        eventId: null,
        dueDateUtc: null,
        createdAt: 3n,
        updatedAt: 4n,
      },
    ],
  };
}

describe('kanban rendering', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders markdown details with checklists and links', () => {
    const html = renderToStaticMarkup(
      <CardMarkdown text={'# Plan\n- [x] Ship board\n[Evidence](https://example.com)'} />,
    );

    expect(html).toContain('<h2>Plan</h2>');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked=""');
    expect(html).toContain('href="https://example.com"');
  });

  it('renders sidebar sections for my boards, workspace boards, and shared boards', () => {
    const html = renderWithI18n(
      <BoardLibrarySidebar
        boards={[
          boardSummary({ id: 1n, role: WorkspaceRole.owner }),
          boardSummary({ id: 2n, owner: editor, role: WorkspaceRole.viewer, communityShare: WorkspaceRole.viewer, title: 'Workspace Roadmap' }),
          boardSummary({ id: 3n, owner: editor, role: WorkspaceRole.viewer, title: 'Shared Intake' }),
        ]}
        canCreate
        currentPrincipal={owner.toText()}
        members={members}
        newBoardTitle=""
        onCreateBoard={() => undefined}
        onNewBoardTitleChange={() => undefined}
        onOpenBoard={() => undefined}
        selectedBoardId={2n}
      />,
    );

    expect(html).toContain('My boards');
    expect(html).toContain('Workspace boards');
    expect(html).toContain('Shared with me');
    expect(html).toContain('Workspace Roadmap');
    expect(html).toContain('selected');
    expect(html).toContain('disabled=""');
  });

  it('renders board controls, public link sharing, and read-only card metadata', () => {
    const html = renderWithI18n(
      <KanbanBoard
        board={board()}
        canManageCommunityWorkspace={false}
        canPinDefault
        documents={[]}
        events={[]}
        isPinned
        memberOptions={members}
        onAddCard={() => undefined}
        onAddColumn={() => undefined}
        onCreatePublicLink={async () => undefined}
        onDeleteBoard={() => undefined}
        onDeleteCard={() => undefined}
        onDeleteColumn={() => undefined}
        onDisablePublicLink={() => undefined}
        onGrantAccess={() => undefined}
        onMoveCard={() => undefined}
        onReload={() => undefined}
        onRenameBoard={() => undefined}
        onRenameColumn={() => undefined}
        onReorderColumns={() => undefined}
        onSearchQueryChange={() => undefined}
        onSetCommunityShare={() => undefined}
        onTogglePinned={() => undefined}
        onUpdateCard={() => false}
        publicShareUrl="http://127.0.0.1:5175/boards/public/share-token"
        searchQuery=""
      />,
    );

    expect(html).toContain('Features and Bug Report');
    expect(html).toContain('Workspace Board Bug');
    expect(html).toContain('Pinned');
    expect(html).toContain('Share');
    expect(html).toContain('To do');
    expect(html).toContain('kanban-column-card-drop-zone');
  });

  it('hides owner-only board controls in viewer/read-only rendering', () => {
    const readOnlyBoard = { ...board(), role: WorkspaceRole.viewer };
    const html = renderWithI18n(
      <KanbanBoard
        board={readOnlyBoard}
        canManageCommunityWorkspace={false}
        canPinDefault={false}
        documents={[]}
        events={[]}
        isPinned={false}
        memberOptions={members}
        onAddCard={() => undefined}
        onAddColumn={() => undefined}
        onCreatePublicLink={async () => undefined}
        onDeleteBoard={() => undefined}
        onDeleteCard={() => undefined}
        onDeleteColumn={() => undefined}
        onDisablePublicLink={() => undefined}
        onGrantAccess={() => undefined}
        onMoveCard={() => undefined}
        onReload={() => undefined}
        onRenameBoard={() => undefined}
        onRenameColumn={() => undefined}
        onReorderColumns={() => undefined}
        onSearchQueryChange={() => undefined}
        onSetCommunityShare={() => undefined}
        onTogglePinned={() => undefined}
        onUpdateCard={() => false}
        searchQuery=""
      />,
    );

    expect(html).not.toContain('>Share</button>');
    expect(html).not.toContain('Pin');
    expect(html).not.toContain('Add column');
    expect(html).toContain('Workspace Board Bug');
  });
});
