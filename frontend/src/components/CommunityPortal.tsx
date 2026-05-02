import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CommunityRole } from '../backend';
import { formatNumber } from '../i18n/format';
import { useLocalePreference } from '../i18n/preferences';
import {
  useGetCommunityAccess,
  useGetCommunityById,
  useListCampaignsByCommunity,
  useListProposalsByCommunity
} from '../hooks/useQueries';
import LoadingSpinner from './LoadingSpinner';
import CreateCampaignModal from './CreateCampaignModal';
import CreateProposalModal from './CreateProposalModal';
import CampaignCard from './CampaignCard';
import CommunityMembersList from './CommunityMembersList';
import LeaveCommunityModal from './LeaveCommunityModal';
import ProposalCard from './ProposalCard';

interface CommunityPortalProps {
  communityId: bigint;
  onBack: () => void;
}

export default function CommunityPortal({ communityId, onBack }: CommunityPortalProps) {
  const { t } = useTranslation();
  const { locale } = useLocalePreference();
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showLeaveCommunity, setShowLeaveCommunity] = useState(false);

  const { data: community, isLoading: communityLoading, error: communityError } = useGetCommunityById(communityId);
  const { data: access, isLoading: accessLoading } = useGetCommunityAccess(communityId);
  const { data: proposals, isLoading: proposalsLoading } = useListProposalsByCommunity(communityId);
  const { data: campaigns, isLoading: campaignsLoading } = useListCampaignsByCommunity(communityId);

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
      <div className="amnesty-panel bg-white p-8">
        <div className="text-center py-16">
          <p className="amnesty-kicker text-amnesty-pink mb-4">{t('communities.portal.kicker')}</p>
          <h2 className="text-4xl text-amnesty-ink amnesty-heading">{t('communities.portal.loadErrorTitle')}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#38505d]">
            {t('communities.portal.loadErrorBody')}
          </p>
          <button onClick={onBack} className="btn-primary mt-8 rounded-full">
            {t('communities.portal.backToCommunities')}
          </button>
        </div>
      </div>
    );
  }

  const roleLabel = access.isPlatformAdmin
    ? t('common.roles.platformAdmin')
    : access.communityRole === CommunityRole.communityAdmin
      ? t('common.roles.communityAdmin')
      : access.communityRole === CommunityRole.member
        ? t('common.roles.member')
        : t('common.roles.viewer');

  const accessBanner = access.isPlatformAdmin
    ? {
        title: t('communities.portal.accessBanners.platformAdminTitle'),
        body: t('communities.portal.accessBanners.platformAdminBody'),
        className: 'bg-amnesty-ink text-white',
      }
    : access.communityRole === CommunityRole.communityAdmin
      ? {
          title: t('communities.portal.accessBanners.communityAdminTitle'),
          body: t('communities.portal.accessBanners.communityAdminBody'),
          className: 'bg-[#0f3044] text-white',
        }
      : access.communityRole === CommunityRole.member
        ? {
            title: t('communities.portal.accessBanners.memberTitle'),
            body: t('communities.portal.accessBanners.memberBody'),
            className: 'bg-[#eff7e7] text-amnesty-ink',
          }
        : {
            title: t('communities.portal.accessBanners.viewerTitle'),
            body: t('communities.portal.accessBanners.viewerBody'),
            className: 'bg-white text-amnesty-ink border border-amnesty-line',
          };

  return (
    <>
      <div className="space-y-10">
        <section className="amnesty-panel bg-white p-8 md:p-10">
          <button
            onClick={onBack}
            className="mb-8 flex items-center gap-3 text-lg text-amnesty-ink amnesty-heading hover:text-amnesty-purple"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('communities.portal.backToCommunities')}
          </button>

          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="amnesty-kicker text-amnesty-pink mb-4">{t('communities.portal.kicker')}</p>
              <h1 className="max-w-4xl text-5xl text-amnesty-ink md:text-7xl amnesty-heading">
                {community.name}
              </h1>
              <p className="mt-6 max-w-4xl text-xl leading-8 text-[#38505d]">{community.policy}</p>

              <div className={`mt-8 px-5 py-5 ${accessBanner.className}`}>
                <p className="amnesty-kicker text-amnesty-yellow mb-3">
                  {access.isPlatformAdmin ? t('communities.portal.platformAccessTitle') : t('communities.portal.roleAccessTitle')}
                </p>
                <h2 className="text-3xl amnesty-heading">{accessBanner.title}</h2>
                <p className="mt-3 text-base leading-7">{accessBanner.body}</p>
              </div>
            </div>

            <div className="amnesty-dark-band px-6 py-7">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-amnesty-yellow px-3 py-2 text-sm text-amnesty-ink amnesty-heading">
                  {roleLabel}
                </span>
                <span className="border border-white/20 px-3 py-2 text-sm text-white amnesty-heading">
                  #{community.id.toString()}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="amnesty-kicker text-amnesty-blue mb-2">{t('communities.portal.assignedParticipants')}</p>
                  <p className="text-4xl text-white amnesty-heading">{formatNumber(community.members.length, locale)}</p>
                </div>
                <div>
                  <p className="amnesty-kicker text-amnesty-green mb-2">{t('communities.portal.capabilities')}</p>
                  <p className="text-base leading-7 text-white/80">
                    {access.canCreateProposal
                      ? t('communities.portal.capabilitiesEnabled')
                      : t('communities.portal.capabilitiesViewer')}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3">
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

                {access.canCreateCampaign ? (
                  <button onClick={() => setShowCreateCampaign(true)} className="btn-secondary rounded-full text-white border-white hover:bg-white/10">
                    {t('common.actions.createCampaign')}
                  </button>
                ) : (
                  <button
                    disabled
                    className="btn-secondary rounded-full text-white border-white opacity-50"
                    title={t('communities.portal.createCampaignLockedTitle')}
                  >
                    {t('common.buttons.campaignAccessLocked')}
                  </button>
                )}

                {access.canLeaveCommunity && (
                  <button onClick={() => setShowLeaveCommunity(true)} className="btn-secondary rounded-full text-white border-white hover:bg-white/10">
                    {t('common.actions.leaveCommunity')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="amnesty-panel bg-white p-8 md:p-10">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="amnesty-kicker text-amnesty-green mb-4">{t('communities.portal.campaignsKicker')}</p>
              <h2 className="text-5xl text-amnesty-ink amnesty-heading">{t('communities.portal.campaignsTitle')}</h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">
                {access.canContributeToCampaign
                  ? t('communities.portal.campaignsBodyEnabled')
                  : t('communities.portal.campaignsBodyViewer')}
              </p>
            </div>
          </div>

          {campaignsLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="large" />
            </div>
          ) : !campaigns || campaigns.length === 0 ? (
            <div className="border border-amnesty-line bg-[#f4f7f8] px-6 py-10 text-center">
              <h3 className="text-4xl text-amnesty-ink amnesty-heading">{t('common.empty.noCampaigns')}</h3>
              <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">
                {access.canCreateCampaign
                  ? t('communities.portal.emptyCampaignsAdmin')
                  : t('communities.portal.emptyCampaignsViewer')}
              </p>
              {access.canCreateCampaign && (
                <button onClick={() => setShowCreateCampaign(true)} className="btn-primary mt-8 rounded-full">
                  {t('common.actions.createFirstCampaign')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id.toString()}
                  campaign={campaign}
                  canInteract={access.canContributeToCampaign}
                  communityRole={access.communityRole}
                  isPlatformAdmin={access.isPlatformAdmin}
                />
              ))}
            </div>
          )}
        </section>

        <section className="amnesty-panel bg-white p-8 md:p-10">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="amnesty-kicker text-amnesty-pink mb-4">{t('app.nav.proposals')}</p>
              <h2 className="text-5xl text-amnesty-ink amnesty-heading">{t('communities.portal.proposalsTitle')}</h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">
                {access.canCreateProposal
                  ? t('communities.portal.proposalsBodyEnabled')
                  : t('communities.portal.proposalsBodyViewer')}
              </p>
            </div>
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

        <CommunityMembersList communityId={communityId} />
      </div>

      {showCreateProposal && access.canCreateProposal && (
        <CreateProposalModal
          isOpen={showCreateProposal}
          onClose={() => setShowCreateProposal(false)}
          communityId={communityId}
        />
      )}

      {showCreateCampaign && access.canCreateCampaign && (
        <CreateCampaignModal
          isOpen={showCreateCampaign}
          onClose={() => setShowCreateCampaign(false)}
          communityId={communityId}
        />
      )}

      {showLeaveCommunity && access.canLeaveCommunity && (
        <LeaveCommunityModal
          isOpen={showLeaveCommunity}
          onClose={() => setShowLeaveCommunity(false)}
          communityId={communityId}
          communityName={community.name}
          onSuccess={onBack}
        />
      )}
    </>
  );
}
