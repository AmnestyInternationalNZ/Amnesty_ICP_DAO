import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVoteOnProposal, useGetUserProfile, useFinalizeProposal } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { CommunityRole, Proposal, ProposalState, ProposalType } from '../backend';
import { formatNumber } from '../i18n/format';
import { useLocalePreference } from '../i18n/preferences';
import { routePaths } from '../routing/appRoutes';
import LoadingSpinner from './LoadingSpinner';
import MarkdownContent from './MarkdownContent';

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
  const { t } = useTranslation();
  const { locale } = useLocalePreference();
  const { identity } = useInternetIdentity();
  const voteOnProposal = useVoteOnProposal();
  const finalizeProposal = useFinalizeProposal();
  const getUserProfile = useGetUserProfile();
  const [creatorName, setCreatorName] = React.useState<string>('');
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState(false);

  const currentUserPrincipal = identity?.getPrincipal();
  const creatorPrincipalText = proposal.creator.toString();
  
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
        text: t('proposals.card.alreadyVotedTitle').toUpperCase(),
        className: "px-4 py-3 text-lg text-amnesty-ink bg-[#eef3f5] border border-[#082333] amnesty-heading font-bold cursor-not-allowed opacity-75",
        disabled: true,
        title: t('proposals.card.voteButtonTitles.alreadyVoted')
      };
    }
    if (!isVotingActive) {
      return {
        text: hasVotingEnded ? t('proposals.card.votingClosed').toUpperCase() : t('proposals.card.votingNotStarted').toUpperCase(),
        className: "px-4 py-3 text-lg text-amnesty-ink bg-[#eef3f5] border border-[#082333] amnesty-heading font-bold cursor-not-allowed opacity-75",
        disabled: true,
        title: hasVotingEnded ? t('proposals.card.voteButtonTitles.votingClosed') : t('proposals.card.voteButtonTitles.votingNotStarted')
      };
    }
    if (!canVote) {
      return {
        text: t('proposals.card.viewerAccess').toUpperCase(),
        className: "px-4 py-3 text-lg text-amnesty-ink bg-[#eef3f5] border border-[#082333] amnesty-heading font-bold cursor-not-allowed opacity-75",
        disabled: true,
        title: t('proposals.card.voteButtonTitles.viewer')
      };
    }

    const normalizedBaseClass = "px-6 py-3 font-bold uppercase tracking-[0.12em] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center border border-[#082333] amnesty-heading text-lg";
    
    return {
      text: voteType === 'yes' ? t('proposals.card.voteYes').toUpperCase() : t('proposals.card.voteNo').toUpperCase(),
      className: voteType === 'yes' 
        ? `bg-amnesty-green text-black hover:bg-amnesty-yellow ${normalizedBaseClass}`
        : `bg-amnesty-pink text-white hover:bg-amnesty-purple ${normalizedBaseClass}`,
      disabled: false,
      title: voteType === 'yes' ? t('proposals.card.voteButtonTitles.yes') : t('proposals.card.voteButtonTitles.no')
    };
  };

  React.useEffect(() => {
    let cancelled = false;

    const fetchCreatorName = async () => {
      try {
        const profile = await getUserProfile.mutateAsync(proposal.creator);
        if (!cancelled) {
          setCreatorName(profile?.name || t('proposals.card.creatorUnknown').toUpperCase());
        }
      } catch (error) {
        if (!cancelled) {
          setCreatorName(t('proposals.card.creatorUnknown').toUpperCase());
        }
      }
    };

    setCreatorName('');
    fetchCreatorName();

    return () => {
      cancelled = true;
    };
    // Do not depend on the React Query mutation object here: mutation state changes
    // after mutateAsync resolves, which previously retriggered this effect forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorPrincipalText, t]);

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
          ? { text: t('common.states.proposal.active').toUpperCase(), color: 'bg-amnesty-blue text-black' }
          : { text: t('common.states.proposal.pendingFinalization').toUpperCase(), color: 'bg-amnesty-yellow text-black' };
      case ProposalState.pendingFinalization:
        return { text: t('common.states.proposal.pendingFinalization').toUpperCase(), color: 'bg-amnesty-yellow text-black' };
      case ProposalState.passed:
        return { text: t('common.states.proposal.passed').toUpperCase(), color: 'bg-amnesty-green text-black' };
      case ProposalState.failed:
        return { text: t('common.states.proposal.failed').toUpperCase(), color: 'bg-amnesty-pink text-white' };
      default:
        return { text: t('common.labels.unknown').toUpperCase(), color: 'bg-amnesty-gray-400 text-black' };
    }
  };

  const stateDisplay = getStateDisplay();
  const typeLabel = proposal.body.type === ProposalType.fundraising
    ? t('proposals.create.proposalTypes.fundraisingTitle')
    : proposal.body.type === ProposalType.roleChange
      ? t('proposals.create.proposalTypes.roleChangeTitle')
      : t('proposals.create.proposalTypes.motionTitle');
  const roleChangeRoleLabel = proposal.body.type === ProposalType.roleChange
    ? proposal.body.roleChange.role === CommunityRole.communityAdmin
      ? t('common.roles.communityAdmin')
      : proposal.body.roleChange.role === CommunityRole.member
        ? t('common.roles.member')
        : t('proposals.create.roleActions.remove')
    : '';
  const typeSummary = proposal.body.type === ProposalType.fundraising
    ? proposal.body.campaign.shortDescription
    : proposal.body.type === ProposalType.roleChange
      ? `${roleChangeRoleLabel} · ${proposal.body.roleChange.target.toText()}`
      : proposal.body.description;
  const executionLabel = proposal.executionState.status === 'notApplicable'
    ? null
    : proposal.executionState.status === 'failed'
      ? t('proposals.card.executionFailed', { message: proposal.executionState.message })
      : proposal.executionState.status === 'applied'
        ? t('proposals.card.executionApplied')
        : t('proposals.card.executionPending');
  const launchedCampaignId = proposal.linkedResource?.type === 'campaign' ? proposal.linkedResource.campaignId : null;
  const campaignVisibilityLabel = proposal.body.type === ProposalType.fundraising && proposal.body.campaign.visibility === 'publicCampaign'
    ? t('proposals.create.campaignVisibilityOptions.public')
    : t('proposals.create.campaignVisibilityOptions.community');
  const totalVotes = Number(proposal.yes) + Number(proposal.no);
  const yesPercentage = totalVotes > 0 ? Math.round((Number(proposal.yes) / totalVotes) * 100) : 0;
  const noPercentage = totalVotes > 0 ? Math.round((Number(proposal.no) / totalVotes) * 100) : 0;
  const roleLabel = isPlatformAdmin
    ? t('common.roles.platformAdmin').toUpperCase()
    : communityRole === CommunityRole.communityAdmin
      ? t('common.roles.communityAdmin').toUpperCase()
      : communityRole === CommunityRole.member
        ? t('common.roles.member').toUpperCase()
        : t('common.roles.viewer').toUpperCase();

  // Check if the error is specifically about duplicate voting
  const isDuplicateVoteError = voteOnProposal.error?.message?.includes('already voted') || 
                               voteOnProposal.error?.message?.includes('duplicate');

  const formatTimeRemaining = () => {
    if (!isVotingActive) return null;
    
    if (daysRemaining > 0) {
      return t('proposals.card.timeDaysHours', {
        days: formatNumber(daysRemaining, locale),
        hours: formatNumber(hoursRemaining, locale)
      });
    } else if (hoursRemaining > 0) {
      return t('proposals.card.timeHoursMinutes', {
        hours: formatNumber(hoursRemaining, locale),
        minutes: formatNumber(minutesRemaining, locale)
      });
    } else if (minutesRemaining > 0) {
      return t('proposals.card.timeMinutes', {
        minutes: formatNumber(minutesRemaining, locale)
      });
    } else {
      return t('proposals.card.lessThanMinute');
    }
  };

  return (
    <div className="amnesty-panel bg-white p-8 amnesty-card-lift">
      <div className="mb-6 h-1.5 w-24 bg-amnesty-pink" />
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <p className="amnesty-kicker text-amnesty-pink mb-3">{t('common.labels.proposal')}</p>
          <div className="flex items-center mb-4">
            <h4 className="mr-4 text-4xl text-amnesty-ink amnesty-heading">{proposal.title}</h4>
            <span className={`px-3 py-1 text-sm font-bold amnesty-heading ${stateDisplay.color}`}>
              {stateDisplay.text}
            </span>
            <span className="ml-2 bg-[#fff4ba] px-3 py-1 text-sm font-bold amnesty-heading text-amnesty-ink">
              {typeLabel}
            </span>
            {isOwnProposal && (
              <span className="ml-2 bg-[#e9f4f8] px-3 py-1 text-sm font-bold amnesty-heading text-amnesty-ink">
                {t('proposals.card.yourProposal')}
              </span>
            )}
          </div>
          <MarkdownContent className="proposal-markdown-content mb-6" text={proposal.description} />
          {typeSummary && typeSummary !== proposal.description && (
            <div className="mb-6 rounded-[0.75rem] border border-amnesty-line bg-[#fbfaf4] p-5">
              <p className="amnesty-kicker mb-2 text-amnesty-ink">{t('proposals.card.details', { type: typeLabel })}</p>
              <p className="text-base leading-7 text-amnesty-ink">{typeSummary}</p>
            </div>
          )}
          {proposal.body.type === ProposalType.fundraising && (
            <div className="mb-6 grid gap-4 rounded-[0.75rem] border border-amnesty-line bg-white p-5 md:grid-cols-3">
              <div>
                <p className="amnesty-kicker text-amnesty-green">{t('proposals.create.campaignGoalLabel')}</p>
                <p className="mt-1 text-2xl amnesty-heading">{proposal.body.campaign.currency} {proposal.body.campaign.goalAmount.toString()}</p>
              </div>
              <div>
                <p className="amnesty-kicker text-amnesty-green">{t('proposals.card.visibility')}</p>
                <p className="mt-1 text-2xl amnesty-heading">{campaignVisibilityLabel}</p>
              </div>
              <div>
                <p className="amnesty-kicker text-amnesty-green">{t('app.nav.campaigns')}</p>
                {launchedCampaignId === null ? (
                  <p className="mt-1 text-base font-bold text-[#5c727d]">{t('proposals.card.campaignPending')}</p>
                ) : (
                  <a
                    className="mt-1 inline-flex rounded-full bg-amnesty-yellow px-4 py-2 font-bold text-amnesty-ink"
                    href={routePaths.campaign(proposal.communityId, launchedCampaignId)}
                  >
                    {t('proposals.card.viewLaunchedCampaign')}
                  </a>
                )}
              </div>
            </div>
          )}
          {executionLabel && (
            <div className={`mb-6 rounded-[0.75rem] border p-4 ${
              proposal.executionState.status === 'failed'
                ? 'border-amnesty-pink bg-[#fff1f4]'
                : 'border-[#dbe7c8] bg-[#eff7e7]'
            }`}>
              <p className="font-bold text-amnesty-ink amnesty-heading">{executionLabel}</p>
            </div>
          )}
          <div className="mb-4 flex items-center space-x-6 text-lg text-[#38505d]">
            <span className="font-bold amnesty-heading">{t('common.labels.by', { name: creatorName })}</span>
            <span className="font-bold">•</span>
            <span className="font-bold amnesty-heading">#{proposal.id.toString()}</span>
          </div>

          <div className="mb-4 border border-amnesty-line bg-[#f4f7f8] p-5">
            <h5 className="mb-3 text-lg font-bold text-amnesty-ink amnesty-heading">{t('proposals.card.governanceSettings')}</h5>
            <div className="grid grid-cols-1 gap-4 text-amnesty-ink md:grid-cols-3">
              <div>
                <span className="font-bold amnesty-heading">{t('proposals.card.votingWindow')}</span>
                <p>{t('proposals.card.daysCount', { count: formatNumber(Math.round(Number(proposal.endNs - proposal.startNs) / (24 * 60 * 60 * 1000 * 1000 * 1000)), locale) })}</p>
              </div>
              <div>
                <span className="font-bold amnesty-heading">{t('proposals.card.quorum')}</span>
                <p>{t('proposals.card.votesMinimum', { count: formatNumber(proposal.quorum, locale) })}</p>
              </div>
              <div>
                <span className="font-bold amnesty-heading">{t('proposals.card.passThreshold')}</span>
                <p>{t('proposals.card.passThresholdValue', { count: formatNumber(proposal.passPct, locale) })}</p>
              </div>
            </div>
          </div>

          {isVotingActive && (
            <div className="mb-4 bg-amnesty-blue p-4">
              <p className="text-white font-bold amnesty-heading">
                {t('proposals.card.timeRemaining', { value: formatTimeRemaining() })}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 border border-amnesty-line bg-white p-5">
        <h5 className="mb-4 text-lg font-bold text-amnesty-ink amnesty-heading">{t('proposals.card.votingResults')}</h5>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex h-8 w-8 items-center justify-center bg-amnesty-green">
                <svg className="w-5 h-5 text-amnesty-ink" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7v3m-3 10h3m-3 0h-3m3 0v-3m-3 3v-3" />
                </svg>
              </div>
              <span className="text-xl font-bold text-amnesty-ink amnesty-heading">
                {t('proposals.card.yes', {
                  count: formatNumber(proposal.yes, locale),
                  percentage: formatNumber(yesPercentage, locale)
                })}
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
                {t('proposals.card.no', {
                  count: formatNumber(proposal.no, locale),
                  percentage: formatNumber(noPercentage, locale)
                })}
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
              {t('proposals.card.totalVotesRequired', {
                total: formatNumber(totalVotes, locale),
                required: formatNumber(proposal.quorum, locale)
              })}
            </span>
          </div>
        </div>
      </div>

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
                  {t('common.loading.voting')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7v3m-3 10h3m-3 0h-3m3 0v-3m-3 3v-3" />
                  </svg>
                  {t('proposals.card.voteYes').toUpperCase()}
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
                  {t('common.loading.voting')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17v-3m-6-10h-3m3 0h3m-3 0v3m3-3v3" />
                  </svg>
                  {t('proposals.card.voteNo').toUpperCase()}
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="text-lg text-black">
            {hasAlreadyVoted ? (
              <span className="bg-amnesty-yellow px-3 py-1 font-bold amnesty-heading">
                {t('proposals.card.alreadyVotedTitle').toUpperCase()}
              </span>
            ) : !isVotingActive ? (
              <span className="bg-[#eef3f5] px-3 py-1 font-bold amnesty-heading">
                {hasVotingEnded ? t('proposals.card.votingClosed').toUpperCase() : t('proposals.card.votingNotStarted').toUpperCase()}
              </span>
            ) : (
              <span className="bg-[#eef3f5] px-3 py-1 font-bold amnesty-heading">
                {roleLabel}
              </span>
            )}
          </div>
        )}

        {canFinalize && (
          <button
            onClick={handleFinalize}
            disabled={finalizeProposal.isPending}
            className="btn-primary text-lg"
          >
            {finalizeProposal.isPending ? (
              <>
                <LoadingSpinner size="small" className="mr-3" />
                {t('common.loading.finalizing')}
              </>
            ) : (
              t('common.actions.finalizeProposal')
            )}
          </button>
        )}
      </div>

      {hasAlreadyVoted && (
        <div className="mt-4 bg-amnesty-yellow p-4 text-amnesty-ink">
          <p className="text-lg font-bold amnesty-heading">
            {t('proposals.card.alreadyVotedTitle').toUpperCase()}
          </p>
          <p className="text-black mt-2">
            {t('proposals.card.alreadyVotedBody')}
            {isOwnProposal ? ` ${t('proposals.card.alreadyVotedCreator')}` : ''}
          </p>
        </div>
      )}

      {voteOnProposal.isError && !isDuplicateVoteError && (
        <div className="mt-4 border border-amnesty-line bg-amnesty-ink p-4 text-white">
          <p className="text-lg font-bold amnesty-heading">
            {t('proposals.card.voteErrorTitle')}
          </p>
          <p className="text-white mt-2">
            {voteOnProposal.error?.message || t('common.errors.genericVote')}
          </p>
        </div>
      )}

      {voteOnProposal.isSuccess && (
        <div className="mt-4 bg-[#eff7e7] p-4 text-amnesty-ink">
          <p className="text-lg font-bold amnesty-heading">
            {t('proposals.card.voteSuccessTitle').toUpperCase()}
          </p>
          <p className="text-black mt-2">
            {t('proposals.card.voteSuccessBody')}
            {isOwnProposal ? ` ${t('proposals.card.voteSuccessCreator')}` : ''}
          </p>
        </div>
      )}

      {finalizeProposal.isError && (
        <div className="mt-4 border border-amnesty-line bg-amnesty-ink p-4 text-white">
          <p className="text-lg font-bold amnesty-heading">
            {t('proposals.card.finalizeErrorTitle')}
          </p>
          <p className="text-white mt-2">
            {finalizeProposal.error?.message || t('common.errors.genericFinalizeProposal')}
          </p>
        </div>
      )}

      {finalizeProposal.isSuccess && (
        <div className="mt-4 bg-[#e9f4f8] p-4 text-amnesty-ink">
          <p className="text-lg font-bold amnesty-heading">
            {t('proposals.card.finalizeSuccessTitle')}
          </p>
          <p className="text-white mt-2">
            {t('proposals.card.finalizeSuccessBody')}
          </p>
        </div>
      )}
    </div>
  );
}
