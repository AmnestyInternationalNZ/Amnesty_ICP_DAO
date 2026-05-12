import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CommunityRole } from '../backend';
import { formatCurrency, formatNumber } from '../i18n/format';
import { useLocalePreference } from '../i18n/preferences';
import {
  useGetCommunityAccess,
  useGetCommunityById,
  useListFundraisingCampaigns
} from '../hooks/useQueries';
import LoadingSpinner from './LoadingSpinner';
import CommunityMembersList from './CommunityMembersList';
import LeaveCommunityModal from './LeaveCommunityModal';

interface CommunityPortalProps {
  communityId: bigint;
  onBack: () => void;
  onOpenFundraise?: (options?: { create?: boolean; campaignId?: bigint }) => void;
}

export default function CommunityPortal({ communityId, onBack, onOpenFundraise }: CommunityPortalProps) {
  const { t } = useTranslation();
  const { locale } = useLocalePreference();
  const [showLeaveCommunity, setShowLeaveCommunity] = useState(false);

  const { data: community, isLoading: communityLoading, error: communityError } = useGetCommunityById(communityId);
  const { data: access, isLoading: accessLoading } = useGetCommunityAccess(communityId);
  const { data: campaigns, isLoading: campaignsLoading } = useListFundraisingCampaigns(communityId);

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
                {access.canCreateCampaign ? (
                  <button onClick={() => onOpenFundraise?.({ create: true })} className="btn-primary rounded-full">
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
                <button onClick={() => onOpenFundraise?.({ create: true })} className="btn-primary mt-8 rounded-full">
                  {t('common.actions.createFirstCampaign')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id.toString()}
                  type="button"
                  className="amnesty-panel flex w-full flex-col gap-4 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(4,31,45,0.12)]"
                  onClick={() => onOpenFundraise?.({ campaignId: campaign.id })}
                >
                  <div className="h-1.5 w-24 bg-amnesty-green" />
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="amnesty-kicker text-amnesty-green mb-3">{t('common.labels.campaign')}</p>
                      <h3 className="text-4xl text-amnesty-ink amnesty-heading">{campaign.title}</h3>
                      <p className="mt-3 max-w-3xl text-lg leading-8 text-[#38505d]">{campaign.shortDescription}</p>
                    </div>
                    <div className="min-w-[12rem]">
                      <strong className="block text-3xl text-amnesty-ink amnesty-heading">
                        {formatCurrency(campaign.totalRaised, locale)}
                      </strong>
                      <span className="text-sm text-[#5d6d77]">
                        {t('campaigns.card.progress', {
                          raised: formatCurrency(campaign.totalRaised, locale),
                          goal: formatCurrency(campaign.goalAmount, locale)
                        })}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <CommunityMembersList communityId={communityId} />
      </div>

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
