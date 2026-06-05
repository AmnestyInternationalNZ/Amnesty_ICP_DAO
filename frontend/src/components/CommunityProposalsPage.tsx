import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Proposal, ProposalState } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import {
  useGetCommunityAccess,
  useGetCommunityById,
  useListProposalsByCommunity
} from '../hooks/useQueries';
import { routePaths, type ProposalCreateType } from '../routing/appRoutes';
import CreateProposalModal from './CreateProposalModal';
import LoadingSpinner from './LoadingSpinner';
import ProposalCard from './ProposalCard';

interface CommunityProposalsPageProps {
  communityId: bigint;
  initialProposalId?: bigint;
  initialCreate?: boolean;
  initialCreateType?: ProposalCreateType;
  onCreateProposalRoute?: (type?: ProposalCreateType) => void;
  onOpenProposalRoute?: (proposalId: bigint) => void;
}

function proposalDate(valueNs: bigint): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Number(valueNs / 1_000_000n)));
}

function proposalStatusLabel(proposal: Proposal): string {
  if (proposal.state === ProposalState.active) return 'Voting';
  if (proposal.state === ProposalState.pendingFinalization) return 'Pending finalization';
  if (proposal.state === ProposalState.passed) return 'Passed';
  return 'Rejected';
}

function ProposalSidebarSection({
  count,
  emptyCopy,
  onSelect,
  proposals,
  selectedProposalId,
  title,
}: {
  count: number;
  emptyCopy: string;
  onSelect: (proposal: Proposal) => void;
  proposals: Proposal[];
  selectedProposalId: bigint | null;
  title: string;
}) {
  return (
    <section className="proposal-workspace-section">
      <div className="proposal-workspace-section-heading">
        <h3>{title}</h3>
        <span>{count}</span>
      </div>
      {proposals.length === 0 ? (
        <p className="proposal-workspace-empty">{emptyCopy}</p>
      ) : (
        <div className="proposal-workspace-list">
          {proposals.map((proposal) => {
            const selected = selectedProposalId === proposal.id;
            return (
              <button
                key={proposal.id.toString()}
                type="button"
                className={`proposal-workspace-list-card ${selected ? 'active' : ''}`}
                onClick={() => onSelect(proposal)}
              >
                <span>{proposal.title}</span>
                <small>
                  {proposalStatusLabel(proposal)} · {proposalDate(proposal.endNs)}
                </small>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function CommunityProposalsPage({
  communityId,
  initialCreate = false,
  initialCreateType,
  initialProposalId,
  onCreateProposalRoute,
  onOpenProposalRoute,
}: CommunityProposalsPageProps) {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const currentPrincipal = identity?.getPrincipal().toText() ?? null;
  const [mode, setMode] = useState<'detail' | 'create'>(initialCreate ? 'create' : 'detail');
  const [createType, setCreateType] = useState<ProposalCreateType | undefined>(initialCreateType);
  const [selectedProposalId, setSelectedProposalId] = useState<bigint | null>(initialProposalId ?? null);
  const [search, setSearch] = useState('');
  const { data: community, isLoading: communityLoading, error: communityError } = useGetCommunityById(communityId);
  const { data: access, isLoading: accessLoading } = useGetCommunityAccess(communityId);
  const { data: proposals, isLoading: proposalsLoading } = useListProposalsByCommunity(communityId);

  const proposalList = useMemo(
    () => [...(proposals ?? [])].sort((left, right) => Number(right.startNs - left.startNs)),
    [proposals],
  );
  const filteredProposals = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return proposalList;
    return proposalList.filter((proposal) =>
      `${proposal.title} ${proposal.description}`.toLowerCase().includes(needle),
    );
  }, [proposalList, search]);

  const myProposals = filteredProposals.filter((proposal) => proposal.creator.toText() === currentPrincipal);
  const activeProposals = filteredProposals.filter(
    (proposal) => proposal.state === ProposalState.active || proposal.state === ProposalState.pendingFinalization,
  );
  const passedProposals = filteredProposals.filter((proposal) => proposal.state === ProposalState.passed);
  const rejectedProposals = filteredProposals.filter((proposal) => proposal.state === ProposalState.failed);
  const selectedProposal = proposalList.find((proposal) => proposal.id === selectedProposalId) ?? null;

  useEffect(() => {
    if (initialProposalId !== undefined) {
      setMode('detail');
      setSelectedProposalId(initialProposalId);
    }
  }, [initialProposalId]);

  useEffect(() => {
    if (initialCreate) setMode('create');
    setCreateType(initialCreateType);
  }, [initialCreate, initialCreateType]);

  useEffect(() => {
    if (mode === 'create' || selectedProposalId !== null || proposalList.length === 0) return;
    setSelectedProposalId(proposalList[0].id);
    onOpenProposalRoute?.(proposalList[0].id);
  }, [mode, onOpenProposalRoute, proposalList, selectedProposalId]);

  function openCreate(type?: ProposalCreateType) {
    if (!access?.canCreateProposal) return;
    setMode('create');
    setCreateType(type);
    onCreateProposalRoute?.(type);
  }

  function openProposal(proposal: Proposal) {
    setMode('detail');
    setSelectedProposalId(proposal.id);
    onOpenProposalRoute?.(proposal.id);
  }

  function closeCreate() {
    setMode('detail');
    if (selectedProposalId !== null) {
      onOpenProposalRoute?.(selectedProposalId);
    } else {
      window.history.pushState({}, '', routePaths.proposals(communityId));
    }
  }

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
        <p className="amnesty-kicker text-amnesty-pink mb-4">{t('app.nav.proposals')}</p>
        <h2 className="text-4xl text-amnesty-ink amnesty-heading">{t('communities.portal.loadErrorTitle')}</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#38505d]">
          {t('communities.portal.loadErrorBody')}
        </p>
      </div>
    );
  }

  return (
    <section className="proposal-workspace-shell">
      <aside className="proposal-workspace-sidebar" aria-label={t('app.nav.proposals')}>
        <div className="proposal-workspace-sidebar-header">
          <p className="amnesty-kicker">{t('app.nav.proposals')}</p>
          <button
            type="button"
            className="btn-primary rounded-full"
            disabled={!access.canCreateProposal}
            onClick={() => openCreate()}
            title={!access.canCreateProposal ? t('communities.portal.createProposalLockedTitle') : undefined}
          >
            <span className="text-xl leading-none">+</span>
            {t('common.actions.createProposal')}
          </button>
        </div>

        <label className="proposal-workspace-search">
          <span className="sr-only">{t('proposals.create.searchPlaceholder', { defaultValue: 'Search proposals' })}</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('proposals.create.searchPlaceholder', { defaultValue: 'Search proposals' })}
          />
        </label>

        <div className="proposal-workspace-sections">
          <ProposalSidebarSection
            count={myProposals.length}
            emptyCopy={t('proposals.workspace.noMine', { defaultValue: 'Your proposals will appear here.' })}
            onSelect={openProposal}
            proposals={myProposals}
            selectedProposalId={selectedProposalId}
            title={t('proposals.create.myProposals', { defaultValue: 'My proposals' })}
          />
          <ProposalSidebarSection
            count={activeProposals.length}
            emptyCopy={t('communities.portal.emptyProposalsViewer')}
            onSelect={openProposal}
            proposals={activeProposals}
            selectedProposalId={selectedProposalId}
            title={t('proposals.create.activeProposals', { defaultValue: 'Active proposals' })}
          />
          <ProposalSidebarSection
            count={passedProposals.length}
            emptyCopy={t('proposals.create.noPassed', { defaultValue: 'No passed proposals yet.' })}
            onSelect={openProposal}
            proposals={passedProposals}
            selectedProposalId={selectedProposalId}
            title={t('proposals.create.passedProposals', { defaultValue: 'Passed proposals' })}
          />
          <ProposalSidebarSection
            count={rejectedProposals.length}
            emptyCopy={t('proposals.create.noRejected', { defaultValue: 'No rejected proposals yet.' })}
            onSelect={openProposal}
            proposals={rejectedProposals}
            selectedProposalId={selectedProposalId}
            title={t('proposals.create.rejectedProposals', { defaultValue: 'Rejected proposals' })}
          />
        </div>
      </aside>

      <main className="proposal-workspace-main">
        <div className="proposal-workspace-hero">
          <div>
            <p className="amnesty-kicker text-amnesty-pink">{t('app.nav.proposals')}</p>
            <h1>{selectedProposal ? selectedProposal.title : t('communities.portal.proposalsTitle')}</h1>
            <p>
              {selectedProposal
                ? `${proposalStatusLabel(selectedProposal)} · ${proposalDate(selectedProposal.endNs)} · ${community.name}`
                : access.canCreateProposal
                  ? t('communities.portal.proposalsBodyEnabled')
                  : t('communities.portal.proposalsBodyViewer')}
            </p>
          </div>
          <div className="proposal-workspace-stats">
            <span>
              <strong>{proposalList.length}</strong>
              {t('app.nav.proposals')}
            </span>
            <span>
              <strong>{activeProposals.length}</strong>
              {t('proposals.create.activeProposals', { defaultValue: 'Active' })}
            </span>
          </div>
        </div>

        {proposalsLoading ? (
          <div className="proposal-workspace-empty-state">
            <LoadingSpinner size="large" />
          </div>
        ) : proposalList.length === 0 ? (
          <div className="proposal-workspace-empty-state">
            <h2>{t('common.empty.noProposals')}</h2>
            <p>
              {access.canCreateProposal
                ? t('communities.portal.emptyProposalsAdmin')
                : t('communities.portal.emptyProposalsViewer')}
            </p>
            {access.canCreateProposal && (
              <button type="button" onClick={() => openCreate()} className="btn-primary mt-6 rounded-full">
                {t('common.actions.createFirstProposal')}
              </button>
            )}
          </div>
        ) : selectedProposal ? (
          <div className="proposal-workspace-detail">
            <div className="proposal-workspace-tabs" aria-label="Proposal sections">
              <span className="active">{t('proposals.workspace.overview', { defaultValue: 'Overview' })}</span>
              <span>{t('proposals.workspace.voting', { defaultValue: 'Voting' })}</span>
              <span>{t('proposals.workspace.settings', { defaultValue: 'Governance' })}</span>
            </div>
            <ProposalCard
              proposal={selectedProposal}
              canVote={access.canVoteOnProposal}
              communityRole={access.communityRole}
              isPlatformAdmin={access.isPlatformAdmin}
            />
          </div>
        ) : (
          <div className="proposal-workspace-empty-state">
            <h2>{t('proposals.workspace.unavailableTitle', { defaultValue: 'Proposal unavailable' })}</h2>
            <p>{t('proposals.workspace.unavailableBody', { defaultValue: 'This proposal may no longer be visible in this community.' })}</p>
          </div>
        )}
      </main>

      {mode === 'create' && access.canCreateProposal && (
        <CreateProposalModal
          isOpen={mode === 'create'}
          onClose={closeCreate}
          communityId={communityId}
          initialCreateType={createType}
          proposals={proposalList}
        />
      )}
    </section>
  );
}
