import React, { useMemo, useState, useEffect } from 'react';
import { useVoteOnProposal, useGetUserProfile, useFinalizeProposal } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Proposal, UserRole, ProposalState } from '../backend';
import LoadingSpinner from './LoadingSpinner';

interface ProposalCardProps {
  proposal: Proposal;
  canVote?: boolean;
  userRole?: UserRole;
  hasLeftCommunity?: boolean;
}

export default function ProposalCard({ proposal, canVote = true, userRole, hasLeftCommunity = false }: ProposalCardProps) {
  const { identity } = useInternetIdentity();
  const voteOnProposal = useVoteOnProposal();
  const finalizeProposal = useFinalizeProposal();
  const getUserProfile = useGetUserProfile();
  const [creatorName, setCreatorName] = React.useState<string>('');
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState(false);

  const currentUserPrincipal = identity?.getPrincipal();
  
  // Memoize expensive computations
  const isOwnProposal = useMemo(() => {
    return currentUserPrincipal && proposal.creator.toString() === currentUserPrincipal.toString();
  }, [currentUserPrincipal, proposal.creator]);

  // Calculate time-related values
  const now = Date.now() * 1000 * 1000; // Convert to nanoseconds
  const startTime = Number(proposal.startNs);
  const endTime = Number(proposal.endNs);
  const isVotingActive = now >= startTime && now <= endTime && proposal.state === ProposalState.active;
  const hasVotingEnded = now > endTime;
  const canFinalize = hasVotingEnded && proposal.state === ProposalState.active;

  // Calculate remaining time
  const timeRemaining = Math.max(0, endTime - now);
  const daysRemaining = Math.floor(timeRemaining / (24 * 60 * 60 * 1000 * 1000 * 1000));
  const hoursRemaining = Math.floor((timeRemaining % (24 * 60 * 60 * 1000 * 1000 * 1000)) / (60 * 60 * 1000 * 1000 * 1000));
  const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000 * 1000 * 1000)) / (60 * 1000 * 1000 * 1000));

  // Check if the error indicates the user has already voted
  useEffect(() => {
    if (voteOnProposal.error) {
      const errorMessage = voteOnProposal.error.message;
      if (errorMessage && errorMessage.includes('already voted')) {
        setHasAlreadyVoted(true);
      }
    }
  }, [voteOnProposal.error]);

  // Reset voting status when proposal changes
  useEffect(() => {
    setHasAlreadyVoted(false);
  }, [proposal.id]);

  const getVoteButtonConfig = (voteType: 'yes' | 'no') => {
    if (hasAlreadyVoted) {
      return {
        text: 'YOU HAVE ALREADY VOTED',
        className: "text-lg text-black bg-amnesty-gray-200 px-4 py-3 border-4 border-black amnesty-heading font-bold cursor-not-allowed opacity-75",
        disabled: true,
        title: "You have already voted on this proposal"
      };
    }
    if (!isVotingActive) {
      return {
        text: hasVotingEnded ? 'VOTING CLOSED' : 'VOTING NOT STARTED',
        className: "text-lg text-black bg-amnesty-gray-200 px-4 py-3 border-4 border-black amnesty-heading font-bold cursor-not-allowed opacity-75",
        disabled: true,
        title: hasVotingEnded ? "The voting window has closed" : "Voting has not started yet"
      };
    }
    if (userRole === UserRole.guest) {
      return {
        text: 'GUESTS CANNOT VOTE',
        className: "text-lg text-black bg-amnesty-gray-200 px-4 py-3 border-4 border-black amnesty-heading font-bold cursor-not-allowed opacity-75",
        disabled: true,
        title: "Guests cannot vote on proposals"
      };
    }
    if (hasLeftCommunity) {
      return {
        text: 'FORMER MEMBERS CANNOT VOTE',
        className: "text-lg text-black bg-amnesty-gray-200 px-4 py-3 border-4 border-black amnesty-heading font-bold cursor-not-allowed opacity-75",
        disabled: true,
        title: "You left this community and cannot vote. Contact an admin to rejoin."
      };
    }
    if (!canVote) {
      return {
        text: 'JOIN TO VOTE',
        className: "text-lg text-black bg-amnesty-gray-200 px-4 py-3 border-4 border-black amnesty-heading font-bold cursor-not-allowed opacity-75",
        disabled: true,
        title: "Join this community to vote"
      };
    }
    
    const baseClass = "px-6 py-3 font-bold uppercase tracking-wide focus:outline-none focus:ring-4 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center border-4 border-black amnesty-heading text-lg";
    
    return {
      text: voteType === 'yes' ? 'VOTE YES' : 'VOTE NO',
      className: voteType === 'yes' 
        ? `bg-green-600 text-white hover:bg-green-700 ${baseClass}`
        : `bg-red-600 text-white hover:bg-red-700 ${baseClass}`,
      disabled: false,
      title: `Vote ${voteType} on this proposal`
    };
  };

  React.useEffect(() => {
    const fetchCreatorName = async () => {
      try {
        const profile = await getUserProfile.mutateAsync(proposal.creator);
        setCreatorName(profile?.name || 'UNKNOWN MEMBER');
      } catch (error) {
        setCreatorName('UNKNOWN MEMBER');
      }
    };
    fetchCreatorName();
  }, [proposal.creator, getUserProfile]);

  const handleVote = async (voteYes: boolean) => {
    const config = getVoteButtonConfig(voteYes ? 'yes' : 'no');
    if (config.disabled) return;
    
    try {
      await voteOnProposal.mutateAsync({ proposalId: proposal.id, voteYes });
    } catch (error) {
      console.error('Failed to vote on proposal:', error);
    }
  };

  const handleFinalize = async () => {
    try {
      await finalizeProposal.mutateAsync(proposal.id);
    } catch (error) {
      console.error('Failed to finalize proposal:', error);
    }
  };

  const getStateDisplay = () => {
    switch (proposal.state) {
      case ProposalState.active:
        return isVotingActive 
          ? { text: 'ACTIVE', color: 'bg-green-600 text-white' }
          : { text: 'PENDING FINALIZATION', color: 'bg-amnesty-yellow text-black' };
      case ProposalState.pendingFinalization:
        return { text: 'PENDING FINALIZATION', color: 'bg-amnesty-yellow text-black' };
      case ProposalState.passed:
        return { text: 'PASSED', color: 'bg-green-600 text-white' };
      case ProposalState.failed:
        return { text: 'FAILED', color: 'bg-red-600 text-white' };
      default:
        return { text: 'UNKNOWN', color: 'bg-amnesty-gray-400 text-black' };
    }
  };

  const stateDisplay = getStateDisplay();
  const totalVotes = Number(proposal.yes) + Number(proposal.no);
  const yesPercentage = totalVotes > 0 ? Math.round((Number(proposal.yes) / totalVotes) * 100) : 0;
  const noPercentage = totalVotes > 0 ? Math.round((Number(proposal.no) / totalVotes) * 100) : 0;

  // Check if the error is specifically about duplicate voting
  const isDuplicateVoteError = voteOnProposal.error?.message?.includes('already voted') || 
                               voteOnProposal.error?.message?.includes('duplicate');

  const formatTimeRemaining = () => {
    if (!isVotingActive) return null;
    
    if (daysRemaining > 0) {
      return `${daysRemaining}d ${hoursRemaining}h remaining`;
    } else if (hoursRemaining > 0) {
      return `${hoursRemaining}h ${minutesRemaining}m remaining`;
    } else if (minutesRemaining > 0) {
      return `${minutesRemaining}m remaining`;
    } else {
      return 'Less than 1m remaining';
    }
  };

  return (
    <div className="border-4 border-black p-8 hover:shadow-amnesty transition-all bg-white">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center mb-4">
            <h4 className="text-2xl font-bold text-black amnesty-heading mr-4">{proposal.title}</h4>
            <span className={`px-3 py-1 text-sm font-bold amnesty-heading border-2 border-black ${stateDisplay.color}`}>
              {stateDisplay.text}
            </span>
            {isOwnProposal && (
              <span className="ml-2 px-3 py-1 text-sm font-bold amnesty-heading border-2 border-black bg-amnesty-yellow text-black">
                YOUR PROPOSAL
              </span>
            )}
          </div>
          <p className="text-lg text-black mb-6 leading-relaxed">{proposal.description}</p>
          <div className="flex items-center text-lg text-black space-x-6 mb-4">
            <span className="font-bold amnesty-heading">BY: {creatorName}</span>
            <span className="font-bold">•</span>
            <span className="font-bold amnesty-heading">ID: {proposal.id.toString()}</span>
          </div>

          {/* Governance Settings Display */}
          <div className="bg-amnesty-gray-100 border-2 border-black p-4 mb-4">
            <h5 className="text-lg font-bold text-black mb-2 amnesty-heading">GOVERNANCE SETTINGS</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-black">
              <div>
                <span className="font-bold amnesty-heading">VOTING WINDOW:</span>
                <p>{Math.round(Number(proposal.endNs - proposal.startNs) / (24 * 60 * 60 * 1000 * 1000 * 1000))} days</p>
              </div>
              <div>
                <span className="font-bold amnesty-heading">QUORUM:</span>
                <p>{proposal.quorum.toString()} votes minimum</p>
              </div>
              <div>
                <span className="font-bold amnesty-heading">PASS THRESHOLD:</span>
                <p>{proposal.passPct.toString()}% yes votes</p>
              </div>
            </div>
          </div>

          {/* Time Remaining Display */}
          {isVotingActive && (
            <div className="bg-amnesty-yellow border-2 border-black p-3 mb-4">
              <p className="text-black font-bold amnesty-heading">
                ⏰ {formatTimeRemaining()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Vote Results */}
      <div className="mb-6 p-4 border-4 border-black bg-white">
        <h5 className="text-lg font-bold text-black mb-4 amnesty-heading">VOTING RESULTS</h5>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-green-600 border-2 border-black flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7v3m-3 10h3m-3 0h-3m3 0v-3m-3 3v-3" />
                </svg>
              </div>
              <span className="text-xl font-bold text-black amnesty-heading">
                YES: {proposal.yes.toString()} ({yesPercentage}%)
              </span>
            </div>
            <div className="w-32 bg-amnesty-gray-200 border-2 border-black h-4">
              <div 
                className="h-full bg-green-600" 
                style={{ width: `${yesPercentage}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-red-600 border-2 border-black flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17v-3m-6-10h-3m3 0h3m-3 0v3m3-3v3" />
                </svg>
              </div>
              <span className="text-xl font-bold text-black amnesty-heading">
                NO: {proposal.no.toString()} ({noPercentage}%)
              </span>
            </div>
            <div className="w-32 bg-amnesty-gray-200 border-2 border-black h-4">
              <div 
                className="h-full bg-red-600" 
                style={{ width: `${noPercentage}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t-2 border-black">
            <span className="text-lg font-bold text-black amnesty-heading">
              TOTAL VOTES: {totalVotes} / {proposal.quorum.toString()} REQUIRED
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t-4 border-black">
        {isVotingActive && (canVote && userRole !== UserRole.guest && !hasLeftCommunity) ? (
          <div className="flex space-x-4">
            <button
              onClick={() => handleVote(true)}
              disabled={getVoteButtonConfig('yes').disabled || voteOnProposal.isPending}
              className={getVoteButtonConfig('yes').className}
              title={getVoteButtonConfig('yes').title}
            >
              {voteOnProposal.isPending ? (
                <>
                  <LoadingSpinner size="small" className="mr-3" />
                  VOTING...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7v3m-3 10h3m-3 0h-3m3 0v-3m-3 3v-3" />
                  </svg>
                  VOTE YES
                </>
              )}
            </button>
            
            <button
              onClick={() => handleVote(false)}
              disabled={getVoteButtonConfig('no').disabled || voteOnProposal.isPending}
              className={getVoteButtonConfig('no').className}
              title={getVoteButtonConfig('no').title}
            >
              {voteOnProposal.isPending ? (
                <>
                  <LoadingSpinner size="small" className="mr-3" />
                  VOTING...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17v-3m-6-10h-3m3 0h3m-3 0v3m3-3v3" />
                  </svg>
                  VOTE NO
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="text-lg text-black">
            {hasAlreadyVoted ? (
              <span className="font-bold amnesty-heading bg-amnesty-yellow px-3 py-1 border-2 border-black">
                YOU HAVE VOTED
              </span>
            ) : !isVotingActive ? (
              <span className="font-bold amnesty-heading bg-amnesty-gray-200 px-3 py-1 border-2 border-black">
                {hasVotingEnded ? 'VOTING CLOSED' : 'VOTING NOT STARTED'}
              </span>
            ) : (
              <span className="font-bold amnesty-heading bg-amnesty-gray-200 px-3 py-1 border-2 border-black">
                CANNOT VOTE
              </span>
            )}
          </div>
        )}

        {/* Finalize Button */}
        {canFinalize && (
          <button
            onClick={handleFinalize}
            disabled={finalizeProposal.isPending}
            className="bg-amnesty-yellow text-black px-6 py-3 font-bold uppercase tracking-wide hover:bg-yellow-300 focus:outline-none focus:ring-4 focus:ring-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center amnesty-heading border-4 border-black"
          >
            {finalizeProposal.isPending ? (
              <>
                <LoadingSpinner size="small" className="mr-3" />
                FINALIZING...
              </>
            ) : (
              'FINALIZE PROPOSAL'
            )}
          </button>
        )}
      </div>

      {/* Show message for users who have already voted */}
      {hasAlreadyVoted && (
        <div className="mt-4 p-4 bg-amnesty-yellow text-black border-4 border-black">
          <p className="text-lg font-bold amnesty-heading">
            YOU HAVE ALREADY VOTED ON THIS PROPOSAL
          </p>
          <p className="text-black mt-2">
            The system enforces one vote per person per proposal. Your vote has been recorded and counted.
            {isOwnProposal && " As the proposal creator, you were able to vote on your own proposal."}
          </p>
        </div>
      )}

      {/* Show error for voting errors (not duplicate votes) */}
      {voteOnProposal.isError && !isDuplicateVoteError && (
        <div className="mt-4 p-4 bg-black text-white border-4 border-amnesty-yellow">
          <p className="text-lg font-bold amnesty-heading">
            FAILED TO VOTE. PLEASE TRY AGAIN.
          </p>
          <p className="text-white mt-2">
            {voteOnProposal.error?.message || 'An error occurred while processing your vote. Please try again.'}
          </p>
        </div>
      )}

      {/* Show success message for voting */}
      {voteOnProposal.isSuccess && (
        <div className="mt-4 p-4 bg-amnesty-yellow text-black border-4 border-black">
          <p className="text-lg font-bold amnesty-heading">
            VOTE CAST SUCCESSFULLY!
          </p>
          <p className="text-black mt-2">
            Your vote has been recorded. The system ensures one vote per person per proposal.
            {isOwnProposal && " As the proposal creator, you successfully voted on your own proposal."}
          </p>
        </div>
      )}

      {/* Show finalization messages */}
      {finalizeProposal.isError && (
        <div className="mt-4 p-4 bg-black text-white border-4 border-amnesty-yellow">
          <p className="text-lg font-bold amnesty-heading">
            FAILED TO FINALIZE PROPOSAL.
          </p>
          <p className="text-white mt-2">
            {finalizeProposal.error?.message || 'An error occurred while finalizing the proposal. Please try again.'}
          </p>
        </div>
      )}

      {finalizeProposal.isSuccess && (
        <div className="mt-4 p-4 bg-amnesty-yellow text-black border-4 border-black">
          <p className="text-lg font-bold amnesty-heading">
            PROPOSAL FINALIZED SUCCESSFULLY!
          </p>
          <p className="text-black mt-2">
            The proposal has been finalized and its final status has been determined based on the voting results.
          </p>
        </div>
      )}
    </div>
  );
}
