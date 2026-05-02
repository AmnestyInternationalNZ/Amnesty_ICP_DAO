import React, { useState } from 'react';
import { Campaign, CampaignState, CommunityRole } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import CampaignDetailModal from './CampaignDetailModal';

interface CampaignCardProps {
  campaign: Campaign;
  canInteract: boolean;
  communityRole?: CommunityRole | null;
  isPlatformAdmin?: boolean;
}

export default function CampaignCard({ campaign, canInteract, communityRole, isPlatformAdmin = false }: CampaignCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const { identity } = useInternetIdentity();
  const currentUserPrincipal = identity?.getPrincipal();
  
  const isCreator = currentUserPrincipal && campaign.creator.toString() === currentUserPrincipal.toString();
  
  // Calculate progress percentage
  const progressPercentage = campaign.goalAmount > 0n 
    ? Math.min(Number((campaign.totalRaised * 100n) / campaign.goalAmount), 100)
    : 0;
  
  // Calculate days left
  const now = Date.now() * 1_000_000; // Convert to nanoseconds
  const deadlineMs = Number(campaign.deadlineNs) / 1_000_000;
  const nowMs = now / 1_000_000;
  const daysLeft = Math.max(0, Math.ceil((deadlineMs - nowMs) / (1000 * 60 * 60 * 24)));
  
  const getStateDisplay = (state: CampaignState) => {
    switch (state) {
      case CampaignState.active:
        return { text: 'ACTIVE', color: 'bg-amnesty-yellow text-black' };
      case CampaignState.successful:
        return { text: 'SUCCESSFUL', color: 'bg-amnesty-green text-black' };
      case CampaignState.failed:
        return { text: 'FAILED', color: 'bg-amnesty-orange text-black' };
      case CampaignState.expired:
        return { text: 'EXPIRED', color: 'bg-amnesty-purple text-white' };
      default:
        return { text: 'UNKNOWN', color: 'bg-amnesty-gray-300 text-black' };
    }
  };
  
  const stateDisplay = getStateDisplay(campaign.state);
  
  return (
    <>
      <div className="amnesty-panel bg-white p-6 amnesty-card-lift">
        <div className="mb-6 h-1.5 w-24 bg-amnesty-green" />
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="amnesty-kicker text-amnesty-green mb-3">Campaign</p>
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="text-4xl text-amnesty-ink amnesty-heading">{campaign.title}</h4>
              {isCreator && (
                <span className="bg-[#e9f4f8] px-2 py-1 text-xs text-amnesty-ink amnesty-heading">
                  Your campaign
                </span>
              )}
            </div>
            <p className="text-lg leading-8 text-[#38505d] line-clamp-3">{campaign.description}</p>
          </div>
          <span className={`px-4 py-2 text-sm font-bold amnesty-heading ml-4 ${stateDisplay.color}`}>
            {stateDisplay.text}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-amnesty-ink amnesty-heading">
              ${Number(campaign.totalRaised).toLocaleString()} / ${Number(campaign.goalAmount).toLocaleString()}
            </span>
            <span className="text-lg font-bold text-amnesty-ink amnesty-heading">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="h-4 w-full bg-[#e6ecef]">
            <div 
              className="h-full bg-amnesty-yellow transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Campaign Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-amnesty-ink" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
              <span className="text-base font-bold text-amnesty-ink amnesty-heading">
                {campaign.state === CampaignState.active 
                  ? `${daysLeft} DAYS LEFT`
                  : 'ENDED'
                }
              </span>
            </div>
          </div>
        </div>
        
        {/* All-or-Nothing Notice */}
        {campaign.state === CampaignState.active && (
          <div className="mb-4 border border-amnesty-line bg-[#f4f7f8] p-4">
            <p className="text-sm text-amnesty-ink font-bold amnesty-heading">
              ALL-OR-NOTHING: Funds are only collected if the target is met by the deadline.
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => setShowDetail(true)}
            className="flex-1 btn-inverted"
          >
            VIEW DETAILS
          </button>
          
          {canInteract && campaign.state === CampaignState.active && (
            <button
              onClick={() => setShowDetail(true)}
              className="btn-primary"
            >
              CONTRIBUTE
            </button>
          )}
          
          {!canInteract && campaign.state === CampaignState.active && (
            <button
              disabled
              className="border border-[#082333] bg-[#eef3f5] px-6 py-3 font-bold uppercase tracking-wide text-amnesty-ink amnesty-heading cursor-not-allowed opacity-50"
              title="Only assigned community members and admins can contribute to campaigns"
            >
              CONTRIBUTE
            </button>
          )}
        </div>
      </div>
      
      {showDetail && (
        <CampaignDetailModal
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          campaignId={campaign.id}
          canInteract={canInteract}
          communityRole={communityRole}
          isPlatformAdmin={isPlatformAdmin}
        />
      )}
    </>
  );
}
