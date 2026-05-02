import React, { useMemo, useState, useEffect } from 'react';
import { useVoteOnProposal, useGetUserProfile, useFinalizeProposal } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { CommunityRole, Proposal, ProposalState } from '../backend';
import LoadingSpinner from './LoadingSpinner';

interface ProposalCardProps {
  proposal: Proposal;
  canVote?: boolean;
  communityRole?: CommunityRole | null;
  isPlatformAdmin?: boolean;
}

export default function ProposalCard({
  proposal,
  canVote = true,
  communityRole,
  isPlatformAdmin = false
}: ProposalCardProps) {
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
        className: "px-4 py-3 text-lg text-amnesty-ink bg-[#eef3f5] border border-[#082333] amnesty-heading font-bold cursor-not-allowed opacity-75",
        disabled: true,
        title: "You have already voted on this proposal"
      };
    }
    if (!isVotingActive) {
      return {
        text: hasVotingEnded ? 'VOTING CLOSED' : 'VOTING NOT STARTED',
        className: "px-4 py-3 text-lg text-amnesty-ink bg-[#eef3f5] border border-[#082333] amnesty-heading font-bold cursor-not-allowed opacity-75",
        disabled: true,
        title: hasVotingEnded ? "The voting window has closed" : "Voting has not started yet"
      };
    }
    if (!canVote) {
      return {
        text: 'VIEWER ACCESS',
        className: "px-4 py-3 text-lg text-amnesty-ink bg-[#eef3f5] border border-[#082333] amnesty-heading font-bold cursor-not-allowed opacity-75",
        disabled: true,
        title: "Only assigned community members and admins can vote"
      };
    }

    const normalizedBaseClass = "px-6 py-3 font-bold uppercase tracking-[0.12em] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center border border-[#082333] amnesty-heading text-lg";
    
    return {
      text: voteType === 'yes' ? 'VOTE YES' : 'VOTE NO',
      className: voteType === 'yes' 
        ? `bg-amnesty-green text-black hover:bg-amnesty-yellow ${normalizedBaseClass}`
        : `bg-amnesty-pink text-white hover:bg-amnesty-purple ${normalizedBaseClass}`,
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
          ? { text: 'ACTIVE', color: 'bg-amnesty-blue text-black' }
          : { text: 'PENDING FINALIZATION', color: 'bg-amnesty-yellow text-black' };
      case ProposalState.pendingFinalization:
        return { text: 'PENDING FINALIZATION', color: 'bg-amnesty-yellow text-black' };
      case ProposalState.passed:
        return { text: 'PASSED', color: 'bg-amnesty-green text-black' };
      case ProposalState.failed:
        return { text: 'FAILED', color: 'bg-amnesty-pink text-white' };
      default:
        return { text: 'UNKNOWN', color: 'bg-amnesty-gray-400 text-black' };
    }
  };

  const stateDisplay = getStateDisplay();
  const totalVotes = Number(proposal.yes) + Number(proposal.no);
  const yesPercentage = totalVotes > 0 ? Math.round((Number(proposal.yes) / totalVotes) * 100) : 0;
  const noPercentage = totalVotes > 0 ? Math.round((Number(proposal.no) / totalVotes) * 100) : 0;
  const roleLabel = isPlatformAdmin
    ? 'PLATFORM ADMIN'
    : communityRole === CommunityRole.communityAdmin
      ? 'COMMUNITY ADMIN'
      : communityRole === CommunityRole.member
        ? 'MEMBER'
        : 'VIEWER';

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
    <div className="amnesty-panel bg-white p-8 amnesty-card-lift">
      <div className="mb-6 h-1.5 w-24 bg-amnesty-pink" />
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <p className="amnesty-kicker text-amnesty-pink mb-3">Proposal</p>
          <div className="flex items-center mb-4">
            <h4 className="mr-4 text-4xl text-amnesty-ink amnesty-heading">{proposal.title}</h4>
            <span className={`px-3 py-1 text-sm font-bold amnesty-heading ${stateDisplay.color}`}>
              {stateDisplay.text}
            </span>
            {isOwnProposal && (
              <span className="ml-2 bg-[#e9f4f8] px-3 py-1 text-sm font-bold amnesty-heading text-amnesty-ink">
                Your proposal
              </span>
            )}
          </div>
          <p className="mb-6 text-lg leading-8 text-[#38505d]">{proposal.description}</p>
          <div className="mb-4 flex items-center space-x-6 text-lg text-[#38505d]">
            <span className="font-bold amnesty-heading">By {creatorName}</span>
            <span className="font-bold">•</span>
            <span className="font-bold amnesty-heading">#{proposal.id.toString()}</span>
          </div>

          {/* Governance Settings Display */}
          <div className="mb-4 border border-amnesty-line bg-[#f4f7f8] p-5">
            <h5 className="mb-3 text-lg font-bold text-amnesty-ink amnesty-heading">Governance settings</h5>
            <div className="grid grid-cols-1 gap-4 text-amnesty-ink md:grid-cols-3">
              <div>
                <span className="font-bold amnesty-heading">Voting window</span>
                <p>{Math.round(Number(proposal.endNs - proposal.startNs) / (24 * 60 * 60 * 1000 * 1000 * 1000))} days</p>
              </div>
              <div>
                <span className="font-bold amnesty-heading">Quorum</span>
                <p>{proposal.quorum.toString()} votes minimum</p>
              </div>
              <div>
                <span className="font-bold amnesty-heading">Pass threshold</span>
                <p>{proposal.passPct.toString()}% yes votes</p>
              </div>
            </div>
          </div>

          {/* Time Remaining Display */}
          {isVotingActive && (
            <div className="mb-4 bg-amnesty-blue p-4">
              <p className="text-white font-bold amnesty-heading">
                TIME REMAINING: {formatTimeRemaining()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Vote Results */}
      <div className="mb-6 border border-amnesty-line bg-white p-5">
        <h5 className="mb-4 text-lg font-bold text-amnesty-ink amnesty-heading">Voting results</h5>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex h-8 w-8 items-center justify-center bg-amnesty-green">
                <svg className="w-5 h-5 text-amnesty-ink" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7v3m-3 10h3m-3 0h-3m3 0v-3m-3 3v-3" />
                </svg>
              </div>
              <span className="text-xl font-bold text-amnesty-ink amnesty-heading">
                YES: {proposal.yes.toString()} ({yesPercentage}%)
              </span>
            </div>
            <div className="h-4 w-32 bg-[#e6ecef]">
              <div
                className="h-full bg-amnesty-green"
                style={{ width: `${yesPercentage}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex h-8 w-8 items-center justify-center bg-amnesty-pink">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17v-3m-6-10h-3m3 0h3m-3 0v3m3-3v3" />
                </svg>
              </div>
              <span className="text-xl font-bold text-amnesty-ink amnesty-heading">
                NO: {proposal.no.toString()} ({noPercentage}%)
              </span>
            </div>
            <div className="h-4 w-32 bg-[#e6ecef]">
              <div
                className="h-full bg-amnesty-pink"
                style={{ width: `${noPercentage}%` }}
              />
            </div>
          </div>

          <div className="border-t border-amnesty-line pt-2">
            <span className="text-lg font-bold text-amnesty-ink amnesty-heading">
              TOTAL VOTES: {totalVotes} / {proposal.quorum.toString()} REQUIRED
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 border-t border-amnesty-line pt-6 lg:flex-row lg:items-center lg:justify-between">
        {isVotingActive && canVote ? (
          <div className="flex flex-col gap-3 sm:flex-row">
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
              <span className="bg-amnesty-yellow px-3 py-1 font-bold amnesty-heading">
                YOU HAVE VOTED
              </span>
            ) : !isVotingActive ? (
              <span className="bg-[#eef3f5] px-3 py-1 font-bold amnesty-heading">
                {hasVotingEnded ? 'VOTING CLOSED' : 'VOTING NOT STARTED'}
              </span>
            ) : (
              <span className="bg-[#eef3f5] px-3 py-1 font-bold amnesty-heading">
                {roleLabel}
              </span>
            )}
          </div>
        )}

        {/* Finalize Button */}
        {canFinalize && (
          <button
            onClick={handleFinalize}
            disabled={finalizeProposal.isPending}
            className="btn-primary text-lg"
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
        <div className="mt-4 bg-amnesty-yellow p-4 text-amnesty-ink">
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
        <div className="mt-4 border border-amnesty-line bg-amnesty-ink p-4 text-white">
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
        <div className="mt-4 bg-[#eff7e7] p-4 text-amnesty-ink">
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
        <div className="mt-4 border border-amnesty-line bg-amnesty-ink p-4 text-white">
          <p className="text-lg font-bold amnesty-heading">
            FAILED TO FINALIZE PROPOSAL.
          </p>
          <p className="text-white mt-2">
            {finalizeProposal.error?.message || 'An error occurred while finalizing the proposal. Please try again.'}
          </p>
        </div>
      )}

      {finalizeProposal.isSuccess && (
        <div className="mt-4 bg-[#e9f4f8] p-4 text-amnesty-ink">
          <p className="text-lg font-bold amnesty-heading">
            PROPOSAL FINALIZED SUCCESSFULLY!
          </p>
          <p className="text-white mt-2">
            The proposal has been finalized and its final status has been determined based on the voting results.
          </p>
        </div>
      )}
    </div>
  );
}
