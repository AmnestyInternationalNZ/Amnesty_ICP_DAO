import React, { useState } from 'react';
import { useGetCommunityById, useListProposalsByCommunity, useListCampaignsByCommunity, useGetCallerUserRole, useEnterCommunityPortal, useGetCommunityMembers, useLeaveCommunity, useIsCallerAdmin } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { UserRole } from '../backend';
import LoadingSpinner from './LoadingSpinner';
import CreateProposalModal from './CreateProposalModal';
import CreateCampaignModal from './CreateCampaignModal';
import ProposalCard from './ProposalCard';
import CampaignCard from './CampaignCard';
import CommunityMembersList from './CommunityMembersList';
import LeaveCommunityModal from './LeaveCommunityModal';

interface CommunityPortalProps {
  communityId: bigint;
  onBack: () => void;
}

export default function CommunityPortal({ communityId, onBack }: CommunityPortalProps) {
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showLeaveCommunity, setShowLeaveCommunity] = useState(false);
  const { data: community, isLoading: communityLoading, error: communityError } = useGetCommunityById(communityId);
  const { data: proposals, isLoading: proposalsLoading } = useListProposalsByCommunity(communityId);
  const { data: campaigns, isLoading: campaignsLoading } = useListCampaignsByCommunity(communityId);
  const { data: userRole, isLoading: roleLoading } = useGetCallerUserRole();
  const { data: portalAccess, isLoading: portalLoading, error: portalError } = useEnterCommunityPortal(communityId);
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { identity } = useInternetIdentity();
  
  const currentUserPrincipal = identity?.getPrincipal();
  
  const isUserMember = !!portalAccess && !portalError;
  const hasLeftCommunity = !isUserMember && !!community && !communityError;
  const canInteract = isUserMember && userRole !== UserRole.guest;
  
  const canLeaveCommunity = isUserMember && 
    userRole === UserRole.user &&
    !isAdmin && 
    community && 
    currentUserPrincipal && 
    community.admin.toString() !== currentUserPrincipal.toString();

  if (communityLoading || roleLoading || adminLoading) {
    return (
      <div className="bg-white border-4 border-black p-8 shadow-amnesty">
        <div className="flex justify-center py-16">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  if (communityError || !community) {
    return (
      <div className="bg-white border-4 border-black p-8 shadow-amnesty">
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-black border-4 border-amnesty-yellow flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-amnesty-yellow" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h4 className="text-2xl font-bold text-black mb-4 amnesty-heading">COMMUNITY NOT FOUND</h4>
          <p className="text-xl text-black mb-8">
            The requested community could not be found or loaded.
          </p>
          <button
            onClick={onBack}
            className="btn-primary text-lg"
          >
            BACK TO COMMUNITIES
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Community Header */}
        <div className="bg-white border-4 border-black p-8 shadow-amnesty">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center text-black hover:text-amnesty-gray-700 transition-colors font-bold text-lg amnesty-heading"
            >
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              BACK TO COMMUNITIES
            </button>
            <span className="text-sm bg-amnesty-yellow text-black px-3 py-2 border-2 border-black amnesty-heading">
              ID: {community.id.toString()}
            </span>
          </div>
          
          <div className="mb-6">
            <h2 className="text-4xl font-bold text-black mb-4 amnesty-heading">{community.name}</h2>
            <p className="text-xl text-black">{community.policy}</p>
          </div>

          {/* Access Status Banner */}
          {userRole === UserRole.guest && !hasLeftCommunity && (
            <div className="mb-6 p-4 bg-amnesty-yellow border-4 border-black">
              <div className="flex">
                <svg className="w-6 h-6 text-black mt-1 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div>
                  <h4 className="text-lg font-bold text-black mb-1 amnesty-heading">READ-ONLY ACCESS</h4>
                  <p className="text-black">
                    You are viewing this community as a guest. To create proposals, vote, and participate in campaigns, you need member privileges.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasLeftCommunity && (
            <div className="mb-6 p-4 bg-amnesty-gray-200 border-4 border-black">
              <div className="flex">
                <svg className="w-6 h-6 text-black mt-1 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div>
                  <h4 className="text-lg font-bold text-black mb-1 amnesty-heading">FORMER MEMBER - GUEST ACCESS</h4>
                  <p className="text-black">
                    You have left this community and are now viewing it as a guest. Your historical contributions remain visible, 
                    but you cannot create proposals, vote, or participate in campaigns. Contact an admin to rejoin as a member.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isUserMember && !hasLeftCommunity && userRole !== UserRole.guest && (
            <div className="mb-6 p-4 bg-amnesty-gray-200 border-4 border-black">
              <div className="flex">
                <svg className="w-6 h-6 text-black mt-1 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div>
                  <h4 className="text-lg font-bold text-black mb-1 amnesty-heading">NOT A MEMBER</h4>
                  <p className="text-black">
                    You need to join this community to create proposals, vote, and participate in campaigns. Go back to join this community.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-lg text-black">
              {isUserMember && userRole !== UserRole.guest && (
                <span className="text-black font-bold bg-amnesty-yellow px-3 py-1 border-2 border-black amnesty-heading">
                  YOU ARE A MEMBER
                </span>
              )}
              {hasLeftCommunity && (
                <span className="text-black font-bold bg-amnesty-gray-200 px-3 py-1 border-2 border-black amnesty-heading">
                  FORMER MEMBER (GUEST ACCESS)
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {canInteract ? (
                <>
                  <button
                    onClick={() => setShowCreateProposal(true)}
                    className="bg-black text-white px-6 py-3 font-bold uppercase tracking-wide hover:bg-amnesty-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 border-4 border-black amnesty-heading text-lg"
                  >
                    CREATE PROPOSAL
                  </button>
                  <button
                    onClick={() => setShowCreateCampaign(true)}
                    className="bg-amnesty-yellow text-black px-6 py-3 font-bold uppercase tracking-wide hover:bg-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-300 border-4 border-black amnesty-heading text-lg"
                  >
                    CREATE CAMPAIGN
                  </button>
                </>
              ) : (
                <>
                  <button
                    disabled
                    className="bg-amnesty-gray-300 text-amnesty-gray-600 px-6 py-3 font-bold uppercase tracking-wide border-4 border-black amnesty-heading text-lg cursor-not-allowed opacity-50"
                    title={
                      userRole === UserRole.guest 
                        ? "Guests cannot create proposals" 
                        : hasLeftCommunity 
                          ? "Former members cannot create proposals. Contact an admin to rejoin."
                          : "Only community members can create proposals"
                    }
                  >
                    CREATE PROPOSAL
                  </button>
                  <button
                    disabled
                    className="bg-amnesty-gray-300 text-amnesty-gray-600 px-6 py-3 font-bold uppercase tracking-wide border-4 border-black amnesty-heading text-lg cursor-not-allowed opacity-50"
                    title={
                      userRole === UserRole.guest 
                        ? "Guests cannot create campaigns" 
                        : hasLeftCommunity 
                          ? "Former members cannot create campaigns. Contact an admin to rejoin."
                          : "Only community members can create campaigns"
                    }
                  >
                    CREATE CAMPAIGN
                  </button>
                </>
              )}
              
              {canLeaveCommunity && (
                <button
                  onClick={() => setShowLeaveCommunity(true)}
                  className="bg-amnesty-gray-200 text-black px-6 py-3 font-bold uppercase tracking-wide hover:bg-amnesty-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-400 border-4 border-black amnesty-heading text-lg"
                >
                  LEAVE COMMUNITY
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fundraising Campaigns Section */}
        <div className="bg-white border-4 border-black p-8 shadow-amnesty">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-black amnesty-heading">FUNDRAISING CAMPAIGNS</h3>
              <p className="text-xl text-black mt-2">
                {userRole === UserRole.guest || hasLeftCommunity
                  ? "View campaigns and their progress"
                  : canInteract 
                    ? "Support campaigns or create your own"
                    : "Join this community to participate in fundraising"
                }
              </p>
            </div>
          </div>

          {campaignsLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="large" />
            </div>
          ) : !campaigns || campaigns.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-amnesty-gray-200 border-4 border-black flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <h4 className="text-2xl font-bold text-black mb-4 amnesty-heading">NO CAMPAIGNS YET</h4>
              <p className="text-xl text-black mb-8">
                {canInteract 
                  ? "Be the first to create a fundraising campaign for this community."
                  : userRole === UserRole.guest || hasLeftCommunity
                    ? "No fundraising campaigns have been created for this community yet."
                    : "Join this community to create the first campaign."
                }
              </p>
              {canInteract && (
                <button
                  onClick={() => setShowCreateCampaign(true)}
                  className="bg-amnesty-yellow text-black px-8 py-4 font-bold uppercase tracking-wide hover:bg-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-300 border-4 border-black amnesty-heading text-xl"
                >
                  CREATE FIRST CAMPAIGN
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {campaigns.map((campaign) => (
                <CampaignCard 
                  key={campaign.id.toString()} 
                  campaign={campaign} 
                  canInteract={canInteract}
                  userRole={userRole}
                  hasLeftCommunity={hasLeftCommunity}
                />
              ))}
            </div>
          )}
        </div>

        {/* Proposals Section */}
        <div className="bg-white border-4 border-black p-8 shadow-amnesty">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-black amnesty-heading">COMMUNITY PROPOSALS</h3>
              <p className="text-xl text-black mt-2">
                {userRole === UserRole.guest || hasLeftCommunity
                  ? "View proposals and voting results"
                  : canInteract 
                    ? "Vote on proposals to shape the community"
                    : "Join this community to participate in voting"
                }
              </p>
            </div>
          </div>

          {proposalsLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="large" />
            </div>
          ) : !proposals || proposals.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-amnesty-gray-200 border-4 border-black flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                </svg>
              </div>
              <h4 className="text-2xl font-bold text-black mb-4 amnesty-heading">NO PROPOSALS YET</h4>
              <p className="text-xl text-black mb-8">
                {canInteract 
                  ? "Be the first to create a proposal for this community."
                  : userRole === UserRole.guest || hasLeftCommunity
                    ? "No proposals have been created for this community yet."
                    : "Join this community to create the first proposal."
                }
              </p>
              {canInteract && (
                <button
                  onClick={() => setShowCreateProposal(true)}
                  className="bg-black text-white px-8 py-4 font-bold uppercase tracking-wide hover:bg-amnesty-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 border-4 border-black amnesty-heading text-xl"
                >
                  CREATE FIRST PROPOSAL
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {proposals.map((proposal) => (
                <ProposalCard 
                  key={proposal.id.toString()} 
                  proposal={proposal} 
                  canVote={canInteract}
                  userRole={userRole}
                  hasLeftCommunity={hasLeftCommunity}
                />
              ))}
            </div>
          )}
        </div>

        {/* Community Members Section */}
        <CommunityMembersList communityId={communityId} />
      </div>

      {showCreateProposal && canInteract && (
        <CreateProposalModal
          isOpen={showCreateProposal}
          onClose={() => setShowCreateProposal(false)}
          communityId={communityId}
        />
      )}

      {showCreateCampaign && canInteract && (
        <CreateCampaignModal
          isOpen={showCreateCampaign}
          onClose={() => setShowCreateCampaign(false)}
          communityId={communityId}
        />
      )}

      {showLeaveCommunity && canLeaveCommunity && (
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
