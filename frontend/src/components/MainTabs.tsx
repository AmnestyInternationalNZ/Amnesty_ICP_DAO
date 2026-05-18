import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PlatformRole } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import {
  useBootstrapPlatformAdmin,
  useGetCallerPlatformRole,
  useIsCallerPlatformAdmin,
  useListPlatformAdmins
} from '../hooks/useQueries';
import AdminPanel from './AdminPanel';
import AmnestyLogo from './AmnestyLogo';
import CommunityPortal from './CommunityPortal';
import CommunityProposalsPage from './CommunityProposalsPage';
import CommunityFundraisingPage from './fundraising/CommunityFundraisingPage';
import CommunityWorkspacePage from './CommunityWorkspacePage';
import Dashboard from './Dashboard';
import LanguageSwitcher from './LanguageSwitcher';
import LoadingSpinner from './LoadingSpinner';
import ProfilePage from './ProfilePage';
import SiteFooter from './SiteFooter';
import { parseAppPath, routePaths, type AppPage, type ParsedAppRoute } from '../routing/appRoutes';

const communityScopedPages: AppPage[] = ['community', 'proposals', 'fundraise', 'workspace', 'boards', 'calendar'];
const LAST_COMMUNITY_KEY = 'amnesty.lastCommunityId';

function readLastCommunityId(): bigint | null {
  const value = window.localStorage.getItem(LAST_COMMUNITY_KEY);
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function readCurrentRoute(): ParsedAppRoute {
  return parseAppPath(window.location.pathname, readLastCommunityId());
}

export default function MainTabs() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { clear } = useInternetIdentity();
  const [activePage, setActivePage] = useState<AppPage>(() => readCurrentRoute().page);
  const [selectedCommunityId, setSelectedCommunityId] = useState<bigint | null>(() => readCurrentRoute().communityId);
  const [initialWorkspaceDocumentId, setInitialWorkspaceDocumentId] = useState<bigint | undefined>(() => readCurrentRoute().documentId);
  const [initialProposalId, setInitialProposalId] = useState<bigint | undefined>(() => readCurrentRoute().proposalId);
  const [initialProposalCreate, setInitialProposalCreate] = useState<boolean>(() => readCurrentRoute().proposalCreate ?? false);
  const [initialCampaignId, setInitialCampaignId] = useState<bigint | undefined>(() => readCurrentRoute().campaignId);
  const [initialCampaignCreate, setInitialCampaignCreate] = useState<boolean>(() => readCurrentRoute().campaignCreate ?? false);
  const [initialWorkspaceBoardId, setInitialWorkspaceBoardId] = useState<bigint | undefined>(() => readCurrentRoute().boardId);
  const [initialWorkspaceEventId, setInitialWorkspaceEventId] = useState<bigint | undefined>(() => readCurrentRoute().eventId);
  const { data: platformRole, isLoading: roleLoading } = useGetCallerPlatformRole();
  const { data: isPlatformAdmin, isLoading: adminLoading } = useIsCallerPlatformAdmin();
  const { data: platformAdmins, isLoading: platformAdminsLoading } = useListPlatformAdmins();
  const bootstrapPlatformAdmin = useBootstrapPlatformAdmin();

  const isAdmin = !!isPlatformAdmin;
  const adminCount = platformAdmins?.length ?? 0;
  const needsBootstrap = adminCount === 0;
  const isLoadingShell = roleLoading || adminLoading || platformAdminsLoading;
  const roleLabel =
    platformRole === PlatformRole.platformAdmin ? t('common.roles.platformAdmin') : t('common.roles.viewer');
  const isFullWidthPage = activePage === 'workspace' || activePage === 'boards' || activePage === 'calendar' || activePage === 'fundraise' || activePage === 'proposals';

  const applyRoute = (route: ParsedAppRoute) => {
    setActivePage(route.page);
    if (route.communityId !== null) {
      setSelectedCommunityId(route.communityId);
      window.localStorage.setItem(LAST_COMMUNITY_KEY, route.communityId.toString());
    } else if (route.page === 'hub') {
      setSelectedCommunityId(null);
    }
    setInitialProposalId(route.page === 'proposals' ? route.proposalId : undefined);
    setInitialProposalCreate(route.page === 'proposals' ? route.proposalCreate ?? false : false);
    setInitialCampaignId(route.page === 'fundraise' ? route.campaignId : undefined);
    setInitialCampaignCreate(route.page === 'fundraise' ? route.campaignCreate ?? false : false);
    setInitialWorkspaceDocumentId(route.page === 'workspace' ? route.documentId : undefined);
    setInitialWorkspaceBoardId(route.page === 'boards' ? route.boardId : undefined);
    setInitialWorkspaceEventId(route.page === 'calendar' ? route.eventId : undefined);
  };

  const navigateTo = (path: string, mode: 'push' | 'replace' = 'push') => {
    if (window.location.pathname !== path) {
      window.history[mode === 'replace' ? 'replaceState' : 'pushState']({}, '', path);
    }
    applyRoute(parseAppPath(path, selectedCommunityId));
  };

  const pathForPage = (page: AppPage): string => {
    if (page === 'hub') return routePaths.hub();
    if (page === 'profile') return routePaths.profile();
    if (page === 'admin') return routePaths.admin();
    if (selectedCommunityId === null) return routePaths.hub();
    if (page === 'community') return routePaths.community(selectedCommunityId);
    if (page === 'proposals') return routePaths.proposals(selectedCommunityId);
    if (page === 'fundraise') return routePaths.fundraise(selectedCommunityId);
    if (page === 'workspace') return routePaths.workspace(selectedCommunityId);
    if (page === 'boards') return routePaths.boards(selectedCommunityId);
    if (page === 'calendar') return routePaths.calendar(selectedCommunityId);
    return routePaths.hub();
  };

  useEffect(() => {
    const route = readCurrentRoute();
    applyRoute(route);
    if (route.canonicalPath && route.canonicalPath !== window.location.pathname) {
      window.history.replaceState({}, '', route.canonicalPath);
    }

    const onPopState = () => applyRoute(readCurrentRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // Run once to hydrate from the current URL and support browser back/forward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCommunityId === null && communityScopedPages.includes(activePage)) {
      navigateTo(routePaths.hub(), 'replace');
    }
  }, [activePage, selectedCommunityId]);

  useEffect(() => {
    if (!isAdmin && activePage === 'admin') {
      navigateTo(routePaths.hub(), 'replace');
    }
  }, [activePage, isAdmin]);

  const handleEnterCommunity = (communityId: bigint) => {
    navigateTo(routePaths.community(communityId));
  };

  const handleBackToHub = () => {
    navigateTo(routePaths.hub());
  };

  const handleBootstrap = async () => {
    try {
      await bootstrapPlatformAdmin.mutateAsync();
    } catch (error) {
      console.error('Failed to bootstrap platform admin:', error);
    }
  };

  const handleSignOut = async () => {
    await clear();
    queryClient.clear();
  };

  const navItems: Array<{ id: AppPage; label: string; contextual?: boolean }> = [
    { id: 'hub', label: t('app.nav.hub') },
    ...(selectedCommunityId !== null
      ? [
          { id: 'community' as const, label: t('app.nav.community'), contextual: true },
          { id: 'proposals' as const, label: t('app.nav.proposals'), contextual: true },
          { id: 'fundraise' as const, label: t('app.nav.fundraise', { defaultValue: 'Fundraise' }), contextual: true },
          { id: 'workspace' as const, label: t('app.nav.workspace'), contextual: true },
          { id: 'boards' as const, label: t('app.nav.boards'), contextual: true },
          { id: 'calendar' as const, label: t('app.nav.calendar'), contextual: true },
        ]
      : []),
    ...(isAdmin ? [{ id: 'admin' as const, label: t('app.nav.admin') }] : []),
    { id: 'profile', label: t('app.nav.profile') },
  ];

  return (
    <div className="min-h-screen bg-amnesty-paper text-amnesty-ink">
      <header className="sticky top-0 z-40 border-b border-amnesty-line bg-white shadow-[0_10px_30px_rgba(4,31,45,0.05)]">
        <div className="flex flex-col lg:min-h-[5.5rem] lg:flex-row lg:items-stretch">
          <button
            type="button"
            onClick={() => navigateTo(routePaths.hub())}
            className="flex shrink-0 items-center bg-amnesty-yellow px-7 py-5 text-left transition hover:brightness-95 lg:w-[13.125rem]"
            aria-label={t('app.nav.hub')}
          >
            <AmnestyLogo className="w-full max-w-[9.5rem]" imageClassName="w-full" />
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-3 xl:gap-x-8">
              {navItems.map((item) => {
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(pathForPage(item.id))}
                    className={`rounded-full px-4 py-2 text-base uppercase tracking-[0.04em] transition amnesty-heading ${
                      active
                        ? 'bg-amnesty-yellow text-amnesty-ink'
                        : 'text-amnesty-ink hover:bg-[#f3f3ed]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              <LanguageSwitcher compact />
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex w-fit items-center justify-center gap-3 rounded-[0.9rem] bg-amnesty-yellow px-6 py-3 text-base text-amnesty-ink transition hover:brightness-95 amnesty-heading"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25 15.75 12 12 15.75M15.75 12H3" />
                </svg>
                {t('auth.action.signOut')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={isFullWidthPage ? 'mx-auto max-w-none px-0 py-0' : 'mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14'}>
        {isLoadingShell ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <div className="space-y-12">
            {activePage === 'hub' && (
              <HubPage
                adminCount={adminCount}
                bootstrapPending={bootstrapPlatformAdmin.isPending}
                needsBootstrap={needsBootstrap}
                onBootstrap={handleBootstrap}
                onEnterCommunity={handleEnterCommunity}
                roleLabel={roleLabel}
                showMemberRoleNote={!isAdmin && !needsBootstrap}
              />
            )}

            {activePage === 'community' && selectedCommunityId !== null && (
              <CommunityPortal
                communityId={selectedCommunityId}
                onBack={handleBackToHub}
                onOpenFundraise={(options) => {
                  if (options?.campaignId !== undefined) {
                    navigateTo(routePaths.campaign(selectedCommunityId, options.campaignId));
                    return;
                  }
                  navigateTo(options?.create ? routePaths.newCampaign(selectedCommunityId) : routePaths.fundraise(selectedCommunityId));
                }}
              />
            )}

            {activePage === 'proposals' && selectedCommunityId !== null && (
              <CommunityProposalsPage
                communityId={selectedCommunityId}
                initialCreate={initialProposalCreate}
                initialProposalId={initialProposalId}
                onCreateProposalRoute={() => {
                  setInitialProposalCreate(true);
                  window.history.pushState({}, '', routePaths.newProposal(selectedCommunityId));
                }}
                onOpenProposalRoute={(proposalId) => {
                  setInitialProposalCreate(false);
                  setInitialProposalId(proposalId);
                  window.history.pushState({}, '', routePaths.proposal(selectedCommunityId, proposalId));
                }}
              />
            )}

            {activePage === 'fundraise' && selectedCommunityId !== null && (
              <CommunityFundraisingPage
                communityId={selectedCommunityId}
                initialCampaignId={initialCampaignId}
                initialCreate={initialCampaignCreate}
                onCreateCampaignRoute={() => {
                  setInitialCampaignCreate(true);
                  window.history.pushState({}, '', routePaths.newCampaign(selectedCommunityId));
                }}
                onOpenCampaignRoute={(campaignId) => {
                  setInitialCampaignCreate(false);
                  setInitialCampaignId(campaignId);
                  window.history.pushState({}, '', routePaths.campaign(selectedCommunityId, campaignId));
                }}
              />
            )}

            {activePage === 'workspace' && selectedCommunityId !== null && (
              <CommunityWorkspacePage
                communityId={selectedCommunityId}
                initialDocumentId={initialWorkspaceDocumentId}
                kind="documents"
                onOpenDocumentRoute={(documentId) => {
                  setInitialWorkspaceDocumentId(documentId);
                  window.history.pushState({}, '', routePaths.document(selectedCommunityId, documentId));
                }}
              />
            )}

            {activePage === 'boards' && selectedCommunityId !== null && (
              <CommunityWorkspacePage
                communityId={selectedCommunityId}
                initialBoardId={initialWorkspaceBoardId}
                kind="boards"
                onOpenBoardRoute={(boardId) => {
                  setInitialWorkspaceBoardId(boardId);
                  window.history.pushState({}, '', routePaths.board(selectedCommunityId, boardId));
                }}
              />
            )}

            {activePage === 'calendar' && selectedCommunityId !== null && (
              <CommunityWorkspacePage
                communityId={selectedCommunityId}
                initialEventId={initialWorkspaceEventId}
                kind="calendar"
                onOpenEventRoute={(eventId) => {
                  setInitialWorkspaceEventId(eventId);
                  window.history.pushState({}, '', routePaths.event(selectedCommunityId, eventId));
                }}
              />
            )}

            {activePage === 'admin' && isAdmin && <AdminPanel />}

            {activePage === 'profile' && <ProfilePage />}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

interface HubPageProps {
  adminCount: number;
  bootstrapPending: boolean;
  needsBootstrap: boolean;
  onBootstrap: () => void;
  onEnterCommunity: (communityId: bigint) => void;
  roleLabel: string;
  showMemberRoleNote: boolean;
}

function HubPage({
  adminCount,
  bootstrapPending,
  needsBootstrap,
  onBootstrap,
  onEnterCommunity,
  roleLabel,
  showMemberRoleNote,
}: HubPageProps) {
  const { t } = useTranslation();

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
        <div>
          <p className="amnesty-kicker text-amnesty-pink mb-4">{t('mainTabs.kicker')}</p>
          <h1 className="max-w-4xl text-5xl text-amnesty-ink md:text-7xl amnesty-heading">
            {t('mainTabs.title')}
          </h1>
          <p className="mt-6 max-w-3xl text-xl leading-8 text-amnesty-ink">
            {t('mainTabs.body')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="amnesty-panel bg-white p-6">
            <p className="amnesty-kicker text-amnesty-blue mb-3">{t('mainTabs.yourAccess')}</p>
            <p className="text-4xl text-amnesty-ink amnesty-heading">{roleLabel}</p>
            <p className="mt-4 text-base leading-7 text-[#38505d]">
              {t('mainTabs.yourAccessBody')}
            </p>
          </div>

          <div className="amnesty-panel bg-white p-6">
            <p className="amnesty-kicker text-amnesty-green mb-3">{t('mainTabs.platformRoles')}</p>
            <p className="text-4xl text-amnesty-ink amnesty-heading">{adminCount}</p>
            <p className="mt-4 text-base leading-7 text-[#38505d]">
              {t('mainTabs.platformRolesBody')}
            </p>
          </div>
        </div>
      </section>

      {needsBootstrap && (
        <section className="amnesty-dark-band px-8 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="amnesty-kicker text-amnesty-yellow mb-3">{t('mainTabs.setupKicker')}</p>
              <h2 className="text-3xl text-white amnesty-heading">{t('mainTabs.setupTitle')}</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-white/80">
                {t('mainTabs.setupBody')}
              </p>
            </div>
            <button
              onClick={onBootstrap}
              disabled={bootstrapPending}
              className="btn-primary rounded-full"
            >
              {bootstrapPending ? t('common.loading.creating') : t('mainTabs.claimAction')}
            </button>
          </div>
        </section>
      )}

      <Dashboard onEnterCommunity={onEnterCommunity} />

      {showMemberRoleNote && (
        <section className="border border-amnesty-line bg-white px-6 py-5">
          <p className="amnesty-kicker text-amnesty-blue mb-3">{t('communities.membership.kicker')}</p>
          <p className="text-lg leading-8 text-amnesty-ink">
            {t('mainTabs.roleModelBody')}
          </p>
        </section>
      )}
    </>
  );
}
