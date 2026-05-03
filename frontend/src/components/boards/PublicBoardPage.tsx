import React, { useState } from 'react';
import { Eye, ShieldCheck } from 'lucide-react';
import { useGetPublicCommunityBoard } from '../../hooks/useQueries';
import AmnestyLogo from '../AmnestyLogo';
import LoadingSpinner from '../LoadingSpinner';
import KanbanBoard from './KanbanBoard';

interface PublicBoardPageProps {
  token: string;
}

export default function PublicBoardPage({ token }: PublicBoardPageProps) {
  const { data: board, isLoading, error, refetch } = useGetPublicCommunityBoard(token);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      <header className="public-board-header">
        <a href="/" aria-label="Amnesty DAO home">
          <AmnestyLogo className="max-w-[10rem]" imageClassName="w-full" />
        </a>
        <div>
          <span><Eye size={16} /> Public read-only board</span>
          <strong>Shared workspace view</strong>
        </div>
      </header>

      <main className="public-board-page">
        <section className="public-board-intro">
          <p className="amnesty-kicker text-amnesty-green mb-3">Boards</p>
          <h1 className="text-4xl text-amnesty-ink md:text-5xl amnesty-heading">A shared board, safely view-only.</h1>
          <p>
            Anyone with this link can read the board. Editing, sharing settings, member grants,
            and private workspace metadata stay available only to authorised community members.
          </p>
          <div>
            <ShieldCheck size={18} />
            <span>No sign-in required for this public read-only view.</span>
          </div>
        </section>

        {isLoading ? (
          <div className="kanban-empty-state public-loading">
            <LoadingSpinner size="large" />
          </div>
        ) : error || !board ? (
          <section className="kanban-empty-state public-loading">
            <h2>Board link unavailable</h2>
            <p>This public board link may have been disabled, mistyped, or archived.</p>
          </section>
        ) : (
          <KanbanBoard
            board={board}
            canManageCommunityWorkspace={false}
            canPinDefault={false}
            documents={[]}
            events={[]}
            isPinned={false}
            memberOptions={[]}
            onAddCard={() => undefined}
            onAddColumn={() => undefined}
            onCreatePublicLink={async () => undefined}
            onDeleteBoard={() => undefined}
            onDeleteCard={() => undefined}
            onDeleteColumn={() => undefined}
            onDisablePublicLink={() => undefined}
            onGrantAccess={() => undefined}
            onMoveCard={() => undefined}
            onReload={() => void refetch()}
            onRenameBoard={() => undefined}
            onRenameColumn={() => undefined}
            onReorderColumns={() => undefined}
            onSearchQueryChange={setSearchQuery}
            onSetCommunityShare={() => undefined}
            onTogglePinned={() => undefined}
            onUpdateCard={() => false}
            searchQuery={searchQuery}
          />
        )}
      </main>
    </>
  );
}
