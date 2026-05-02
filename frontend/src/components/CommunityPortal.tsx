import React, { useState } from 'react';
import { CommunityRole } from '../backend';
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
          <p className="amnesty-kicker text-amnesty-pink mb-4">Community portal</p>
          <h2 className="text-4xl text-amnesty-ink amnesty-heading">We could not load this community.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#38505d]">
            The requested community is missing or could not be loaded right now.
          </p>
          <button onClick={onBack} className="btn-primary mt-8 rounded-full">
            Back to communities
          </button>
        </div>
      </div>
    );
  }

  const roleLabel = access.isPlatformAdmin
    ? 'Platform admin'
    : access.communityRole === CommunityRole.communityAdmin
      ? 'Community admin'
      : access.communityRole === CommunityRole.member
        ? 'Member'
        : 'Viewer';

  const accessBanner = access.isPlatformAdmin
    ? {
        title: 'Platform-wide stewardship',
        body: 'You can participate here and manage community membership because you hold the platform admin role.',
        className: 'bg-amnesty-ink text-white',
      }
    : access.communityRole === CommunityRole.communityAdmin
      ? {
          title: 'Community stewardship',
          body: 'You can participate in governance and manage community role assignments inside this space.',
          className: 'bg-[#0f3044] text-white',
        }
      : access.communityRole === CommunityRole.member
        ? {
            title: 'Community participation',
            body: 'You can create proposals, vote, contribute to campaigns, and step back from this community if needed.',
            className: 'bg-[#eff7e7] text-amnesty-ink',
          }
        : {
            title: 'Viewer access',
            body: 'You can read community context, proposals, and campaigns. Participation opens once a role is assigned.',
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
            Back to communities
          </button>

          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="amnesty-kicker text-amnesty-pink mb-4">Community portal</p>
              <h1 className="max-w-4xl text-5xl text-amnesty-ink md:text-7xl amnesty-heading">
                {community.name}
              </h1>
              <p className="mt-6 max-w-4xl text-xl leading-8 text-[#38505d]">{community.policy}</p>

              <div className={`mt-8 px-5 py-5 ${accessBanner.className}`}>
                <p className="amnesty-kicker text-amnesty-yellow mb-3">
                  {access.isPlatformAdmin ? 'Platform access' : 'Role access'}
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
                  <p className="amnesty-kicker text-amnesty-blue mb-2">Assigned participants</p>
                  <p className="text-4xl text-white amnesty-heading">{community.members.length}</p>
                </div>
                <div>
                  <p className="amnesty-kicker text-amnesty-green mb-2">Your capabilities</p>
                  <p className="text-base leading-7 text-white/80">
                    {access.canCreateProposal
                      ? 'Create proposals, vote, and help shape community action.'
                      : 'Read the full community context while you remain in viewer mode.'}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3">
                {access.canCreateProposal ? (
                  <button onClick={() => setShowCreateProposal(true)} className="btn-primary rounded-full">
                    Create proposal
                  </button>
                ) : (
                  <button
                    disabled
                    className="btn-secondary rounded-full opacity-50"
                    title="Only assigned community members and admins can create proposals"
                  >
                    Proposal access locked
                  </button>
                )}

                {access.canCreateCampaign ? (
                  <button onClick={() => setShowCreateCampaign(true)} className="btn-secondary rounded-full text-white border-white hover:bg-white/10">
                    Create campaign
                  </button>
                ) : (
                  <button
                    disabled
                    className="btn-secondary rounded-full text-white border-white opacity-50"
                    title="Only assigned community members and admins can create campaigns"
                  >
                    Campaign access locked
                  </button>
                )}

                {access.canLeaveCommunity && (
                  <button onClick={() => setShowLeaveCommunity(true)} className="btn-secondary rounded-full text-white border-white hover:bg-white/10">
                    Leave community
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="amnesty-panel bg-white p-8 md:p-10">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="amnesty-kicker text-amnesty-green mb-4">Campaigns</p>
              <h2 className="text-5xl text-amnesty-ink amnesty-heading">Fund local action</h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">
                {access.canContributeToCampaign
                  ? 'Support campaigns or launch a new one for this community.'
                  : 'Follow campaign progress here. Contribution opens once a community role is assigned.'}
              </p>
            </div>
          </div>

          {campaignsLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="large" />
            </div>
          ) : !campaigns || campaigns.length === 0 ? (
            <div className="border border-amnesty-line bg-[#f4f7f8] px-6 py-10 text-center">
              <h3 className="text-4xl text-amnesty-ink amnesty-heading">No campaigns yet</h3>
              <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">
                {access.canCreateCampaign
                  ? 'Start the first fundraising campaign for this community when the moment calls for collective support.'
                  : 'No campaigns have been created for this community yet.'}
              </p>
              {access.canCreateCampaign && (
                <button onClick={() => setShowCreateCampaign(true)} className="btn-primary mt-8 rounded-full">
                  Create first campaign
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
              <p className="amnesty-kicker text-amnesty-pink mb-4">Proposals</p>
              <h2 className="text-5xl text-amnesty-ink amnesty-heading">Use community voice</h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">
                {access.canVoteOnProposal
                  ? 'Debate and vote on proposals that shape this community.'
                  : 'Read proposal context and outcomes here. Voting opens once a community role is assigned.'}
              </p>
            </div>
          </div>

          {proposalsLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="large" />
            </div>
          ) : !proposals || proposals.length === 0 ? (
            <div className="border border-amnesty-line bg-[#f8f3f8] px-6 py-10 text-center">
              <h3 className="text-4xl text-amnesty-ink amnesty-heading">No proposals yet</h3>
              <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">
                {access.canCreateProposal
                  ? 'Be the first to bring a proposal into this community space.'
                  : 'No proposals have been created for this community yet.'}
              </p>
              {access.canCreateProposal && (
                <button onClick={() => setShowCreateProposal(true)} className="btn-inverted mt-8 rounded-full">
                  Create first proposal
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
        />
      )}
    </>
  );
}
