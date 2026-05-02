import React, { useState } from 'react';
import { useGetCampaignById, useGetCampaignUpdates, useGetCampaignContributions, useContributeToCampaign, useAddCampaignUpdate, useFinalizeCampaign, useCanFinalizeCampaign } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { CampaignState, CommunityRole } from '../backend';
import LoadingSpinner from './LoadingSpinner';

interface CampaignDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: bigint;
  canInteract: boolean;
  communityRole?: CommunityRole | null;
  isPlatformAdmin?: boolean;
}

export default function CampaignDetailModal({ 
  isOpen, 
  onClose, 
  campaignId, 
  canInteract
}: CampaignDetailModalProps) {
  const [contributionAmount, setContributionAmount] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'updates' | 'contributions'>('details');
  
  const { data: campaign, isLoading: campaignLoading } = useGetCampaignById(campaignId);
  const { data: updates, isLoading: updatesLoading } = useGetCampaignUpdates(campaignId);
  const { data: contributions, isLoading: contributionsLoading } = useGetCampaignContributions(campaignId);
  const { data: canFinalize, isLoading: canFinalizeLoading } = useCanFinalizeCampaign(campaignId);
  const contributeMutation = useContributeToCampaign();
  const addUpdateMutation = useAddCampaignUpdate();
  const finalizeMutation = useFinalizeCampaign();
  
  const { identity } = useInternetIdentity();
  const currentUserPrincipal = identity?.getPrincipal();
  
  const isCreator = currentUserPrincipal && campaign && campaign.creator.toString() === currentUserPrincipal.toString();
  
  if (!isOpen) return null;
  
  if (campaignLoading || !campaign) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white border-4 border-black p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-amnesty">
          <div className="flex justify-center py-16">
            <LoadingSpinner size="large" />
          </div>
        </div>
      </div>
    );
  }
  
  const progressPercentage = campaign.goalAmount > 0n 
    ? Math.min(Number((campaign.totalRaised * 100n) / campaign.goalAmount), 100)
    : 0;
  
  const goalMet = campaign.totalRaised >= campaign.goalAmount;
  
  const now = Date.now() * 1_000_000;
  const deadlineMs = Number(campaign.deadlineNs) / 1_000_000;
  const nowMs = now / 1_000_000;
  const daysLeft = Math.max(0, Math.ceil((deadlineMs - nowMs) / (1000 * 60 * 60 * 24)));
  
  const handleContribute = async () => {
    if (!contributionAmount || isNaN(Number(contributionAmount)) || Number(contributionAmount) <= 0) {
      alert('Please enter a valid contribution amount');
      return;
    }
    
    try {
      await contributeMutation.mutateAsync({
        campaignId,
        amount: BigInt(Math.floor(Number(contributionAmount)))
      });
      setContributionAmount('');
      alert('Contribution successful!');
    } catch (error: any) {
      alert(`Failed to contribute: ${error.message || 'Unknown error'}`);
    }
  };
  
  const handleAddUpdate = async () => {
    if (!updateContent.trim()) {
      alert('Please enter update content');
      return;
    }
    
    try {
      await addUpdateMutation.mutateAsync({
        campaignId,
        content: updateContent
      });
      setUpdateContent('');
      alert('Update posted successfully!');
    } catch (error: any) {
      alert(`Failed to post update: ${error.message || 'Unknown error'}`);
    }
  };
  
  const handleFinalize = async () => {
    if (!confirm('Are you sure you want to finalize this campaign? This will mark the campaign as successful and complete. This action cannot be undone.')) {
      return;
    }
    
    try {
      await finalizeMutation.mutateAsync(campaignId);
      alert('Campaign finalized successfully!');
    } catch (error: any) {
      alert(`Failed to finalize campaign: ${error.message || 'Unknown error'}`);
    }
  };
  
  const getFinalizeTooltip = () => {
    if (!isCreator) {
      return "Only the campaign creator can finalize the campaign";
    }
    if (campaign.state !== CampaignState.active) {
      return "Campaign has already been finalized";
    }
    if (!goalMet) {
      return "Campaign can only be finalized once the funding goal is reached";
    }
    return "Finalize campaign now that the funding goal has been reached";
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-amnesty">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-black mb-2 amnesty-heading">{campaign.title}</h3>
            <p className="text-lg text-black">Campaign ID: {campaign.id.toString()}</p>
          </div>
          <button
            onClick={onClose}
            className="text-black hover:text-amnesty-gray-700 transition-colors ml-4"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Progress Section */}
        <div className="mb-6 p-6 bg-amnesty-gray-100 border-4 border-black">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl font-bold text-black amnesty-heading">
              ${Number(campaign.totalRaised).toLocaleString()} / ${Number(campaign.goalAmount).toLocaleString()}
            </span>
            <span className="text-2xl font-bold text-black amnesty-heading">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-8 bg-white border-4 border-black mb-3">
            <div 
              className="h-full bg-amnesty-yellow transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-black amnesty-heading">
              {campaign.state === CampaignState.active 
                ? `${daysLeft} DAYS LEFT`
                : 'CAMPAIGN ENDED'
              }
            </span>
            <span className="text-lg font-bold text-black amnesty-heading">
              STATE: {campaign.state.toUpperCase()}
            </span>
          </div>
          {goalMet && campaign.state === CampaignState.active && (
            <div className="mt-3 p-3 bg-amnesty-yellow border-2 border-black">
              <p className="text-base font-bold text-black amnesty-heading">
                🎉 FUNDING GOAL REACHED! Campaign can now be finalized.
              </p>
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <div className="border-4 border-black mb-6">
          <div className="flex border-b-4 border-black">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 px-6 py-4 font-bold uppercase tracking-wide amnesty-heading transition-colors ${
                activeTab === 'details'
                  ? 'bg-amnesty-yellow text-black'
                  : 'bg-white text-black hover:bg-amnesty-gray-100'
              }`}
            >
              DETAILS
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`flex-1 px-6 py-4 font-bold uppercase tracking-wide amnesty-heading transition-colors border-l-4 border-r-4 border-black ${
                activeTab === 'updates'
                  ? 'bg-amnesty-yellow text-black'
                  : 'bg-white text-black hover:bg-amnesty-gray-100'
              }`}
            >
              UPDATES ({updates?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('contributions')}
              className={`flex-1 px-6 py-4 font-bold uppercase tracking-wide amnesty-heading transition-colors ${
                activeTab === 'contributions'
                  ? 'bg-amnesty-yellow text-black'
                  : 'bg-white text-black hover:bg-amnesty-gray-100'
              }`}
            >
              CONTRIBUTIONS ({contributions?.length || 0})
            </button>
          </div>
          
          <div className="p-6 bg-white">
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-bold text-black mb-3 amnesty-heading">CAMPAIGN STORY</h4>
                  <p className="text-lg text-black whitespace-pre-wrap">{campaign.description}</p>
                </div>
                
                <div className="p-4 bg-amnesty-gray-100 border-2 border-black">
                  <h4 className="text-lg font-bold text-black mb-2 amnesty-heading">ALL-OR-NOTHING FUNDING</h4>
                  <p className="text-base text-black">
                    This campaign follows an all-or-nothing model. Funds are only collected if the target amount 
                    is met by the deadline or if the campaign creator finalizes it early once the goal is reached. 
                    If the goal is not reached, no funds will be collected.
                  </p>
                </div>
                
                {canInteract && campaign.state === CampaignState.active && (
                  <div className="p-6 bg-amnesty-yellow border-4 border-black">
                    <h4 className="text-xl font-bold text-black mb-4 amnesty-heading">CONTRIBUTE TO THIS CAMPAIGN</h4>
                    <div className="flex items-end space-x-4">
                      <div className="flex-1">
                        <label className="block text-base font-bold text-black mb-2 amnesty-heading">
                          AMOUNT ($)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={contributionAmount}
                          onChange={(e) => setContributionAmount(e.target.value)}
                          className="input-field"
                          placeholder="Enter amount"
                        />
                      </div>
                      <button
                        onClick={handleContribute}
                        disabled={contributeMutation.isPending}
                        className="bg-black text-white px-8 py-3 font-bold uppercase tracking-wide hover:bg-amnesty-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 border-4 border-black amnesty-heading disabled:opacity-50"
                      >
                        {contributeMutation.isPending ? 'CONTRIBUTING...' : 'CONTRIBUTE'}
                      </button>
                    </div>
                  </div>
                )}
                
                {isCreator && campaign.state === CampaignState.active && (
                  <div className="p-6 bg-amnesty-gray-100 border-4 border-black">
                    <h4 className="text-xl font-bold text-black mb-4 amnesty-heading">CREATOR ACTIONS</h4>
                    <div className="space-y-3">
                      <button
                        onClick={handleFinalize}
                        disabled={finalizeMutation.isPending || canFinalizeLoading || !canFinalize}
                        className="bg-black text-white px-8 py-3 font-bold uppercase tracking-wide hover:bg-amnesty-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 border-4 border-black amnesty-heading disabled:opacity-50 disabled:cursor-not-allowed"
                        title={getFinalizeTooltip()}
                      >
                        {finalizeMutation.isPending ? 'FINALIZING...' : 'FINALIZE CAMPAIGN'}
                      </button>
                      <p className="text-sm text-black">
                        {canFinalizeLoading ? (
                          'Checking finalization status...'
                        ) : canFinalize ? (
                          '✓ Campaign can be finalized now that the funding goal has been reached.'
                        ) : goalMet ? (
                          'Campaign goal has been met! You can finalize the campaign.'
                        ) : (
                          `Campaign can be finalized once the funding goal of $${Number(campaign.goalAmount).toLocaleString()} is reached.`
                        )}
                      </p>
                    </div>
                  </div>
                )}
                
                {!isCreator && campaign.state === CampaignState.active && goalMet && (
                  <div className="p-4 bg-amnesty-gray-100 border-2 border-black">
                    <p className="text-base text-black">
                      <strong>Note:</strong> The funding goal has been reached. The campaign creator can now finalize this campaign.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'updates' && (
              <div className="space-y-6">
                {isCreator && (
                  <div className="p-6 bg-amnesty-yellow border-4 border-black">
                    <h4 className="text-xl font-bold text-black mb-4 amnesty-heading">POST AN UPDATE</h4>
                    <textarea
                      value={updateContent}
                      onChange={(e) => setUpdateContent(e.target.value)}
                      className="input-field mb-4"
                      rows={4}
                      placeholder="Share progress, outcomes, or other updates with backers..."
                    />
                    <button
                      onClick={handleAddUpdate}
                      disabled={addUpdateMutation.isPending}
                      className="bg-black text-white px-8 py-3 font-bold uppercase tracking-wide hover:bg-amnesty-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 border-4 border-black amnesty-heading disabled:opacity-50"
                    >
                      {addUpdateMutation.isPending ? 'POSTING...' : 'POST UPDATE'}
                    </button>
                  </div>
                )}
                
                {updatesLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="medium" />
                  </div>
                ) : !updates || updates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-lg text-black">No updates posted yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {updates.map((update) => (
                      <div key={update.id.toString()} className="p-4 bg-white border-4 border-black">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-black amnesty-heading">
                            UPDATE #{update.id.toString()}
                          </span>
                          <span className="text-sm text-black">
                            {new Date(Number(update.timestampNs) / 1_000_000).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-base text-black whitespace-pre-wrap">{update.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'contributions' && (
              <div className="space-y-4">
                {contributionsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="medium" />
                  </div>
                ) : !contributions || contributions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-lg text-black">No contributions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contributions.map((contribution, index) => (
                      <div key={index} className="p-4 bg-white border-2 border-black flex items-center justify-between">
                        <div>
                          <span className="text-base font-bold text-black amnesty-heading">
                            ${Number(contribution.amount).toLocaleString()}
                          </span>
                          <p className="text-sm text-black">
                            {contribution.contributor.toString().substring(0, 20)}...
                          </p>
                        </div>
                        <span className="text-sm text-black">
                          {new Date(Number(contribution.timestampNs) / 1_000_000).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-amnesty-gray-200 text-black px-8 py-3 font-bold uppercase tracking-wide hover:bg-amnesty-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-400 border-4 border-black amnesty-heading"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
