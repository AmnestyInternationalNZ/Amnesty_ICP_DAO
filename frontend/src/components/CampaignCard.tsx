import React, { useState } from 'react';
import { Campaign, CampaignState, UserRole } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import CampaignDetailModal from './CampaignDetailModal';

interface CampaignCardProps {
  campaign: Campaign;
  canInteract: boolean;
  userRole?: UserRole;
  hasLeftCommunity?: boolean;
}

export default function CampaignCard({ campaign, canInteract, userRole, hasLeftCommunity }: CampaignCardProps) {
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
        return { text: 'SUCCESSFUL', color: 'bg-black text-amnesty-yellow' };
      case CampaignState.failed:
        return { text: 'FAILED', color: 'bg-amnesty-gray-600 text-white' };
      case CampaignState.expired:
        return { text: 'EXPIRED', color: 'bg-amnesty-gray-400 text-black' };
      default:
        return { text: 'UNKNOWN', color: 'bg-amnesty-gray-300 text-black' };
    }
  };
  
  const stateDisplay = getStateDisplay(campaign.state);
  
  return (
    <>
      <div className="bg-white border-4 border-black p-6 shadow-amnesty hover:shadow-amnesty-yellow transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="text-2xl font-bold text-black amnesty-heading">{campaign.title}</h4>
              {isCreator && (
                <span className="text-xs bg-amnesty-gray-200 text-black px-2 py-1 border-2 border-black amnesty-heading">
                  YOUR CAMPAIGN
                </span>
              )}
            </div>
            <p className="text-lg text-black line-clamp-2">{campaign.description}</p>
          </div>
          <span className={`px-4 py-2 text-sm font-bold amnesty-heading border-2 border-black ml-4 ${stateDisplay.color}`}>
            {stateDisplay.text}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-black amnesty-heading">
              ${Number(campaign.totalRaised).toLocaleString()} / ${Number(campaign.goalAmount).toLocaleString()}
            </span>
            <span className="text-lg font-bold text-black amnesty-heading">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-6 bg-amnesty-gray-200 border-4 border-black">
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
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
              <span className="text-base font-bold text-black amnesty-heading">
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
          <div className="mb-4 p-3 bg-amnesty-gray-100 border-2 border-black">
            <p className="text-sm text-black font-bold amnesty-heading">
              ALL-OR-NOTHING: Funds are only collected if the target is met by the deadline.
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowDetail(true)}
            className="flex-1 bg-black text-white px-6 py-3 font-bold uppercase tracking-wide hover:bg-amnesty-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 border-4 border-black amnesty-heading"
          >
            VIEW DETAILS
          </button>
          
          {canInteract && campaign.state === CampaignState.active && (
            <button
              onClick={() => setShowDetail(true)}
              className="bg-amnesty-yellow text-black px-6 py-3 font-bold uppercase tracking-wide hover:bg-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-300 border-4 border-black amnesty-heading"
            >
              CONTRIBUTE
            </button>
          )}
          
          {!canInteract && campaign.state === CampaignState.active && (
            <button
              disabled
              className="bg-amnesty-gray-300 text-amnesty-gray-600 px-6 py-3 font-bold uppercase tracking-wide border-4 border-black amnesty-heading cursor-not-allowed opacity-50"
              title={
                userRole === UserRole.guest 
                  ? "Guests cannot contribute to campaigns" 
                  : hasLeftCommunity 
                    ? "Former members cannot contribute. Contact an admin to rejoin."
                    : "Only community members can contribute"
              }
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
          userRole={userRole}
          hasLeftCommunity={hasLeftCommunity}
        />
      )}
    </>
  );
}
