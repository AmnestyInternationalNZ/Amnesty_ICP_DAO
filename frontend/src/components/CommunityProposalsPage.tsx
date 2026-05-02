import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetCommunityAccess,
  useGetCommunityById,
  useListProposalsByCommunity
} from '../hooks/useQueries';
import CreateProposalModal from './CreateProposalModal';
import LoadingSpinner from './LoadingSpinner';
import ProposalCard from './ProposalCard';

interface CommunityProposalsPageProps {
  communityId: bigint;
}

export default function CommunityProposalsPage({ communityId }: CommunityProposalsPageProps) {
  const { t } = useTranslation();
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const { data: community, isLoading: communityLoading, error: communityError } = useGetCommunityById(communityId);
  const { data: access, isLoading: accessLoading } = useGetCommunityAccess(communityId);
  const { data: proposals, isLoading: proposalsLoading } = useListProposalsByCommunity(communityId);

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
    <>
      <section className="amnesty-panel bg-white p-8 md:p-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="amnesty-kicker text-amnesty-pink mb-4">{t('app.nav.proposals')}</p>
            <h1 className="text-5xl text-amnesty-ink md:text-6xl amnesty-heading">
              {t('communities.portal.proposalsTitle')}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">
              {access.canCreateProposal
                ? t('communities.portal.proposalsBodyEnabled')
                : t('communities.portal.proposalsBodyViewer')}
            </p>
            <p className="mt-3 text-base text-[#5c727d]">{community.name}</p>
          </div>

          {access.canCreateProposal ? (
            <button onClick={() => setShowCreateProposal(true)} className="btn-primary rounded-full">
              {t('common.actions.createProposal')}
            </button>
          ) : (
            <button
              disabled
              className="btn-secondary rounded-full opacity-50"
              title={t('communities.portal.createProposalLockedTitle')}
            >
              {t('common.buttons.proposalAccessLocked')}
            </button>
          )}
        </div>

        {proposalsLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="large" />
          </div>
        ) : !proposals || proposals.length === 0 ? (
          <div className="border border-amnesty-line bg-[#f8f3f8] px-6 py-10 text-center">
            <h3 className="text-4xl text-amnesty-ink amnesty-heading">{t('common.empty.noProposals')}</h3>
            <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">
              {access.canCreateProposal
                ? t('communities.portal.emptyProposalsAdmin')
                : t('communities.portal.emptyProposalsViewer')}
            </p>
            {access.canCreateProposal && (
              <button onClick={() => setShowCreateProposal(true)} className="btn-inverted mt-8 rounded-full">
                {t('common.actions.createFirstProposal')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {proposals.map((proposal) => (
              <ProposalCard
                key={proposal.id.toString()}
                proposal={proposal}
                canVote={access.canVoteOnProposal}
                communityRole={access.communityRole}
                isPlatformAdmin={access.isPlatformAdmin}
              />
            ))}
          </div>
        )}
      </section>

      {showCreateProposal && access.canCreateProposal && (
        <CreateProposalModal
          isOpen={showCreateProposal}
          onClose={() => setShowCreateProposal(false)}
          communityId={communityId}
        />
      )}
    </>
  );
}
