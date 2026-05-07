import React, { useState } from 'react';
import { Eye, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGetPublicCommunityBoard } from '../../hooks/useQueries';
import AmnestyLogo from '../AmnestyLogo';
import LoadingSpinner from '../LoadingSpinner';
import KanbanBoard from './KanbanBoard';

interface PublicBoardPageProps {
  token: string;
}

export default function PublicBoardPage({ token }: PublicBoardPageProps) {
  const { t } = useTranslation();
  const { data: board, isLoading, error, refetch } = useGetPublicCommunityBoard(token);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      <header className="public-board-header">
        <a href="/" aria-label={t('boards.public.homeAria')}>
          <AmnestyLogo className="max-w-[10rem]" imageClassName="w-full" />
        </a>
        <div>
          <span><Eye size={16} /> {t('boards.public.readOnlyBoard')}</span>
          <strong>{t('boards.public.sharedWorkspaceView')}</strong>
        </div>
      </header>

      <main className="public-board-page">
        <section className="public-board-intro">
          <p className="amnesty-kicker text-amnesty-green mb-3">{t('boards.hero.kicker')}</p>
          <h1 className="text-4xl text-amnesty-ink md:text-5xl amnesty-heading">{t('boards.public.title')}</h1>
          <p>{t('boards.public.body')}</p>
          <div>
            <ShieldCheck size={18} />
            <span>{t('boards.public.noSignIn')}</span>
          </div>
        </section>

        {isLoading ? (
          <div className="kanban-empty-state public-loading">
            <LoadingSpinner size="large" />
          </div>
        ) : error || !board ? (
          <section className="kanban-empty-state public-loading">
            <h2>{t('boards.public.unavailableTitle')}</h2>
            <p>{t('boards.public.unavailableBody')}</p>
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
