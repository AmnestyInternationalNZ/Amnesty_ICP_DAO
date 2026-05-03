import React from 'react';
import { useTranslation } from 'react-i18next';
import { CommunityRole } from '../backend';
import { useGetCommunityAccess, useGetCommunityById } from '../hooks/useQueries';
import { BoardsTool, CalendarTool } from './CommunityWorkspaceTools';
import CommunityDocumentsWorkspace from './workspace/CommunityDocumentsWorkspace';
import LoadingSpinner from './LoadingSpinner';

export type CommunityWorkspacePageKind = 'documents' | 'boards' | 'calendar';

interface CommunityWorkspacePageProps {
  communityId: bigint;
  initialDocumentId?: bigint;
  kind: CommunityWorkspacePageKind;
  onOpenDocumentRoute?: (documentId: bigint) => void;
}

const toolConfig = {
  documents: {
    kicker: 'workspace.kicker',
    title: 'workspace.title',
    body: 'workspace.body',
    accent: 'text-amnesty-blue',
  },
  boards: {
    kicker: 'app.nav.boards',
    title: 'boards.page.title',
    body: 'boards.page.body',
    accent: 'text-amnesty-green',
  },
  calendar: {
    kicker: 'app.nav.calendar',
    title: 'calendar.page.title',
    body: 'calendar.page.body',
    accent: 'text-amnesty-orange',
  },
} as const;

export default function CommunityWorkspacePage({ communityId, initialDocumentId, kind, onOpenDocumentRoute }: CommunityWorkspacePageProps) {
  const { t } = useTranslation();
  const { data: community, isLoading: communityLoading, error: communityError } = useGetCommunityById(communityId);
  const { data: access, isLoading: accessLoading } = useGetCommunityAccess(communityId);

  if (communityLoading || accessLoading) {
    return (
      <div className="amnesty-panel bg-white p-8">
        <div className="flex justify-center py-16">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  if (communityError || !community || !access) {
    return (
      <div className="amnesty-panel bg-white p-8 text-center">
        <p className="amnesty-kicker text-amnesty-blue mb-4">{t('workspace.kicker')}</p>
        <h2 className="text-4xl text-amnesty-ink amnesty-heading">{t('communities.portal.loadErrorTitle')}</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#38505d]">
          {t('communities.portal.loadErrorBody')}
        </p>
      </div>
    );
  }

  const canUseWorkspace = access.isPlatformAdmin || access.communityRole !== null;
  const canManageCommunityWorkspace = access.isPlatformAdmin || access.communityRole === CommunityRole.communityAdmin;
  const config = toolConfig[kind];

  if (kind === 'documents') {
    return (
      <CommunityDocumentsWorkspace
        access={access}
        communityId={communityId}
        communityName={community.name}
        initialDocumentId={initialDocumentId}
        onOpenDocumentRoute={onOpenDocumentRoute}
      />
    );
  }

  if (!canUseWorkspace) {
    return (
      <section className="amnesty-panel bg-white p-8 md:p-10">
        <p className="amnesty-kicker text-amnesty-blue mb-4">{t('workspace.kicker')}</p>
        <h1 className="text-5xl text-amnesty-ink amnesty-heading">{t('workspace.viewerLockedTitle')}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">{t('workspace.viewerLockedBody')}</p>
      </section>
    );
  }

  return (
    <section className="amnesty-panel bg-white p-8 md:p-10">
      <div className="mb-8">
        <p className={`amnesty-kicker mb-4 ${config.accent}`}>{t(config.kicker)}</p>
        <h1 className="text-5xl text-amnesty-ink md:text-6xl amnesty-heading">{t(config.title)}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">{t(config.body)}</p>
        <p className="mt-3 text-base text-[#5c727d]">{community.name}</p>
      </div>

      {kind === 'boards' && (
        <BoardsTool communityId={communityId} canManageCommunityWorkspace={canManageCommunityWorkspace} />
      )}
      {kind === 'calendar' && (
        <CalendarTool communityId={communityId} canManageCommunityWorkspace={canManageCommunityWorkspace} />
      )}
    </section>
  );
}
