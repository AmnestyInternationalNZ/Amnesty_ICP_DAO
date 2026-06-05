import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Principal } from '@dfinity/principal';
import { CampaignVisibility, CommunityRole, Proposal, ProposalOverrides, ProposalState } from '../backend';
import {
  createEmptyFundraisingDraft,
  daysLeft,
  inputFromDraft,
  nanosFromLocalDateTime,
  SUPPORTED_FUNDRAISING_CURRENCIES,
  validateDraftStep,
  validateFullDraft,
  type FundraisingDraft,
} from '../fundraising/fundraisingApi';
import { useCreateFundraisingProposal, useCreateMotionProposal, useCreateRoleChangeProposal } from '../hooks/useQueries';
import { formatCurrency, formatDate, formatNumber } from '../i18n/format';
import { useLocalePreference } from '../i18n/preferences';
import type { ProposalCreateType } from '../routing/appRoutes';
import LoadingSpinner from './LoadingSpinner';
import MarkdownContent from './MarkdownContent';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: bigint;
  proposals?: Proposal[];
  initialCreateType?: ProposalCreateType;
}

function proposalDate(valueNs: bigint): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Number(valueNs / 1_000_000n)));
}

function ProposalSidebarSection({
  count,
  emptyCopy,
  proposals,
  title,
}: {
  count: number;
  emptyCopy: string;
  proposals: Proposal[];
  title: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base uppercase tracking-[0.12em] text-amnesty-ink amnesty-heading">{title}</h3>
        <span className="rounded-full border border-amnesty-line bg-white px-2.5 py-1 text-xs font-bold text-amnesty-ink">
          {count}
        </span>
      </div>
      {proposals.length === 0 ? (
        <p className="text-sm leading-6 text-[#5c727d]">{emptyCopy}</p>
      ) : (
        <div className="space-y-2">
          {proposals.slice(0, 3).map((proposal, index) => (
            <div
              key={proposal.id.toString()}
              className={`rounded-[0.65rem] p-4 ${
                index === 0 ? 'bg-[#ecebea]' : 'bg-transparent'
              }`}
            >
              <p className="line-clamp-2 text-base font-bold text-amnesty-ink">{proposal.title}</p>
              <p className="mt-1 text-sm text-[#5c727d]">
                {proposal.state === ProposalState.active ? 'Voting' : proposal.state} · {proposalDate(proposal.endNs)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type MarkdownCommand = 'bold' | 'italic' | 'link' | 'list' | 'quote' | 'heading';

const fundraisingProposalSteps = [
  { titleKey: 'fundraising.steps.detailsTitle', fallbackTitle: 'Campaign details', bodyKey: 'fundraising.wizard.stepDetails', fallbackBody: 'Name, purpose and story' },
  { titleKey: 'fundraising.steps.goalTitle', fallbackTitle: 'Goal and timeline', bodyKey: 'fundraising.wizard.stepGoal', fallbackBody: 'Set your target and duration' },
  { titleKey: 'fundraising.steps.impactTitle', fallbackTitle: 'Funds and impact', bodyKey: 'fundraising.wizard.stepImpact', fallbackBody: 'How funds will be used' },
  { titleKey: 'fundraising.steps.mediaTitle', fallbackTitle: 'Media', bodyKey: 'fundraising.wizard.stepMedia', fallbackBody: 'Add images and videos' },
  { titleKey: 'fundraising.steps.creatorTitle', fallbackTitle: 'About you', bodyKey: 'fundraising.wizard.stepCreator', fallbackBody: 'Your details and campaign info' },
  { titleKey: 'fundraising.steps.reviewTitle', fallbackTitle: 'Review', bodyKey: 'fundraising.wizard.stepReview', fallbackBody: 'Check and submit' },
];

type VotingWindowUnit = 'minutes' | 'hours' | 'days';

const VOTING_WINDOW_UNITS: VotingWindowUnit[] = ['minutes', 'hours', 'days'];
const NANOSECONDS_PER_MINUTE = 60n * 1_000_000_000n;

function votingWindowMin(unit: VotingWindowUnit): number {
  return unit === 'minutes' ? 5 : 1;
}

function votingWindowMax(unit: VotingWindowUnit): number {
  if (unit === 'minutes') return 30 * 24 * 60;
  if (unit === 'hours') return 30 * 24;
  return 30;
}

function clampVotingWindowAmount(value: number, unit: VotingWindowUnit): number {
  const parsed = Number.isFinite(value) ? Math.floor(value) : votingWindowMin(unit);
  return Math.min(votingWindowMax(unit), Math.max(votingWindowMin(unit), parsed));
}

function votingWindowMinutes(amount: number, unit: VotingWindowUnit): bigint {
  const safeAmount = BigInt(clampVotingWindowAmount(amount, unit));
  if (unit === 'days') return safeAmount * 24n * 60n;
  if (unit === 'hours') return safeAmount * 60n;
  return safeAmount;
}

function votingWindowNs(amount: number, unit: VotingWindowUnit): bigint {
  return votingWindowMinutes(amount, unit) * NANOSECONDS_PER_MINUTE;
}

function votingWindowDisplay(
  t: ReturnType<typeof useTranslation>['t'],
  amount: number,
  unit: VotingWindowUnit,
): string {
  const count = clampVotingWindowAmount(amount, unit);
  if (unit === 'days') {
    return t('proposals.create.daysValue', { count, defaultValue: '{{count}} days' });
  }
  if (unit === 'hours') {
    return t('proposals.create.hoursValue', { count, defaultValue: '{{count}} hours' });
  }
  return t('proposals.create.minutesValue', { count, defaultValue: '{{count}} minutes' });
}

function principalInitial(label: string) {
  return (label.trim()[0] || 'A').toUpperCase();
}

function FundraisingLiveCampaignPreview({
  draft,
  locale,
  t,
}: {
  draft: FundraisingDraft;
  locale: string;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const goalAmount = BigInt(Math.max(1, Math.floor(Number(draft.goalAmount) || 0)));
  const deadlineNs = nanosFromLocalDateTime(draft.deadlineLocal);
  const deadlineMs = deadlineNs > 0n ? Number(deadlineNs / 1_000_000n) : Date.now();
  const visibilityLabel = draft.visibility === CampaignVisibility.publicCampaign
    ? t('proposals.create.campaignVisibilityOptions.public')
    : t('proposals.create.campaignVisibilityOptions.community');
  const mediaUrl = draft.mediaUrl.trim();

  return (
    <article className="rounded-[1rem] border border-amnesty-line bg-white p-5 shadow-[0_20px_48px_rgba(4,31,45,0.08)]">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          <p className="amnesty-kicker mb-4 text-amnesty-pink">
            {t('fundraising.preview.kicker', { defaultValue: 'Campaign preview' })}
          </p>
          <h2 className="text-4xl text-amnesty-ink amnesty-heading md:text-5xl">{draft.title}</h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-[#38505d]">{draft.shortDescription}</p>
          <div className="fundraising-byline">
            <span className="avatar-dot">{principalInitial(draft.creatorName)}</span>
            <span>{t('fundraising.common.by', { defaultValue: 'By' })} {draft.creatorName}</span>
            <span>{formatDate(Date.now(), locale)}</span>
            <span>{visibilityLabel}</span>
          </div>

          <div className="fundraising-hero-media mt-5">
            {mediaUrl ? (
              <img src={mediaUrl} alt="" />
            ) : (
              <span className="amnesty-kicker text-[#7c8790]">
                {t('fundraising.preview.mediaPlaceholder', { defaultValue: 'Campaign media will appear here' })}
              </span>
            )}
          </div>

          <section className="fundraising-story-card border-0 p-0 shadow-none">
            <h2>{t('fundraising.sections.about', { defaultValue: 'About this campaign' })}</h2>
            <MarkdownContent className="fundraising-markdown-content" text={draft.story} />
            <h2>{t('fundraising.sections.funds', { defaultValue: 'How funds will be used' })}</h2>
            <MarkdownContent className="fundraising-markdown-content" text={draft.fundsUse} />
            <h2>{t('fundraising.sections.impact', { defaultValue: 'Impact' })}</h2>
            <MarkdownContent className="fundraising-markdown-content" text={draft.impact} />
          </section>
        </div>

        <aside className="fundraising-right-rail">
          <section className="fundraising-progress-card">
            <h2>{formatCurrency(0, locale, draft.currency)}</h2>
            <p>
              {t('fundraising.progress.raisedOf', { defaultValue: 'raised of' })}{' '}
              {formatCurrency(goalAmount, locale, draft.currency)}{' '}
              {t('fundraising.progress.goal', { defaultValue: 'goal' })}
            </p>
            <div className="fundraising-progress-bar"><span style={{ width: '0%' }} /></div>
            <div className="fundraising-stat-grid">
              <span>
                <strong>{formatNumber(0, locale)}</strong>
                {t('fundraising.progress.donations', { defaultValue: 'donations' })}
              </span>
              <span>
                <strong>{formatNumber(daysLeft(deadlineNs), locale)}</strong>
                {t('fundraising.progress.daysLeft', { defaultValue: 'days left' })}
              </span>
              <span>
                <strong>{formatCurrency(goalAmount, locale, draft.currency)}</strong>
                {t('fundraising.progress.goal', { defaultValue: 'goal' })}
              </span>
            </div>
            <button type="button" className="btn-primary w-full rounded-full" disabled>
              {t('fundraising.actions.donateNow', { defaultValue: 'Donate now' })}
            </button>
          </section>

          <section className="fundraising-card-block">
            <h2>{t('fundraising.creator.title', { defaultValue: 'Campaign created by' })}</h2>
            <div className="fundraising-creator-row">
              <span className="avatar-dot large">{principalInitial(draft.creatorName)}</span>
              <div>
                <strong>{draft.creatorName}</strong>
                <small>{formatDate(Date.now(), locale)}</small>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </article>
  );
}

export default function CreateProposalModal({
  isOpen,
  onClose,
  communityId,
  initialCreateType,
  proposals = [],
}: CreateProposalModalProps) {
  const { t } = useTranslation();
  const { locale } = useLocalePreference();
  const [proposalType, setProposalType] = useState<ProposalCreateType | undefined>(initialCreateType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionMode, setDescriptionMode] = useState<'edit' | 'preview'>('edit');
  const [fundraisingDraft, setFundraisingDraft] = useState<FundraisingDraft>(() => createEmptyFundraisingDraft());
  const [fundraisingStep, setFundraisingStep] = useState(0);
  const [roleTarget, setRoleTarget] = useState('');
  const [roleAction, setRoleAction] = useState<'member' | 'communityAdmin' | 'remove'>('member');
  const [roleReason, setRoleReason] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [useCustomSettings, setUseCustomSettings] = useState(false);
  const [votingWindowAmount, setVotingWindowAmount] = useState(3);
  const [votingWindowUnit, setVotingWindowUnit] = useState<VotingWindowUnit>('days');
  const [quorum, setQuorum] = useState(1);
  const [passThreshold, setPassThreshold] = useState(50);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const createMotionProposal = useCreateMotionProposal();
  const createFundraisingProposal = useCreateFundraisingProposal();
  const createRoleChangeProposal = useCreateRoleChangeProposal();
  const isPending = createMotionProposal.isPending || createFundraisingProposal.isPending || createRoleChangeProposal.isPending;
  const isError = createMotionProposal.isError || createFundraisingProposal.isError || createRoleChangeProposal.isError || submitError !== null;

  useEffect(() => {
    if (isOpen) {
      setProposalType(initialCreateType);
      setFundraisingStep(0);
    }
  }, [initialCreateType, isOpen]);

  const filteredProposals = useMemo(() => {
    const query = sidebarSearch.trim().toLowerCase();
    if (!query) return proposals;
    return proposals.filter((proposal) => proposal.title.toLowerCase().includes(query));
  }, [proposals, sidebarSearch]);

  const activeProposals = filteredProposals.filter(
    (proposal) =>
      proposal.state === ProposalState.active || proposal.state === ProposalState.pendingFinalization
  );
  const passedProposals = filteredProposals.filter((proposal) => proposal.state === ProposalState.passed);
  const rejectedProposals = filteredProposals.filter((proposal) => proposal.state === ProposalState.failed);

  function resetForm() {
    setProposalType(initialCreateType);
    setTitle('');
    setDescription('');
    setDescriptionMode('edit');
    setFundraisingDraft(createEmptyFundraisingDraft());
    setFundraisingStep(0);
    setRoleTarget('');
    setRoleAction('member');
    setRoleReason('');
    setSubmitError(null);
    setSidebarSearch('');
    setUseCustomSettings(false);
    setVotingWindowAmount(3);
    setVotingWindowUnit('days');
    setQuorum(1);
    setPassThreshold(50);
  }

  const proposalOverrides: ProposalOverrides = {
    windowNs: votingWindowNs(votingWindowAmount, votingWindowUnit),
    quorum: BigInt(quorum),
    passPct: BigInt(passThreshold)
  };
  const votingWindowSummary = votingWindowDisplay(t, votingWindowAmount, votingWindowUnit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    try {
      if (!proposalType) {
        setSubmitError(t('proposals.create.selectProposalTypeError'));
        return;
      }

      if (proposalType === 'motion') {
        if (!title.trim() || !description.trim()) return;
        await createMotionProposal.mutateAsync({
          communityId,
          title: title.trim(),
          description: description.trim(),
          overrides: proposalOverrides
        });
      } else if (proposalType === 'fundraising') {
        const stepError = validateDraftStep(fundraisingDraft, fundraisingStep);
        if (fundraisingStep < fundraisingProposalSteps.length - 1) {
          if (stepError) {
            setSubmitError(stepError);
            return;
          }
          setFundraisingStep((current) => Math.min(current + 1, fundraisingProposalSteps.length - 1));
          return;
        }
        const validationError = validateFullDraft(fundraisingDraft);
        if (validationError) {
          setSubmitError(validationError);
          return;
        }
        await createFundraisingProposal.mutateAsync({
          communityId,
          input: inputFromDraft(fundraisingDraft),
          overrides: proposalOverrides
        });
      } else {
        if (!title.trim() || !roleTarget.trim() || !roleReason.trim()) return;
        const target = Principal.fromText(roleTarget.trim());
        await createRoleChangeProposal.mutateAsync({
          communityId,
          title: title.trim(),
          input: {
            target,
            role: roleAction === 'remove'
              ? null
              : roleAction === 'communityAdmin'
                ? CommunityRole.communityAdmin
                : CommunityRole.member,
            reason: roleReason.trim()
          },
          overrides: proposalOverrides
        });
      }

      resetForm();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create proposal.';
      setSubmitError(message);
      console.error('Failed to create proposal:', error);
    }
  };

  const handleClose = () => {
    if (!isPending) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  function replaceSelectedDescriptionText(command: MarkdownCommand) {
    const textarea = descriptionRef.current;
    if (!textarea || isPending) return;

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectedText = description.slice(selectionStart, selectionEnd);
    let replacement = selectedText;

    if (command === 'bold') {
      replacement = `**${selectedText || 'bold text'}**`;
    } else if (command === 'italic') {
      replacement = `*${selectedText || 'italic text'}*`;
    } else if (command === 'link') {
      replacement = `[${selectedText || 'link text'}](https://example.org)`;
    } else if (command === 'list') {
      const text = selectedText || 'List item';
      replacement = text
        .split(/\r?\n/)
        .map((line) => `- ${line.replace(/^[-*]\s+/, '')}`)
        .join('\n');
    } else if (command === 'quote') {
      const text = selectedText || 'Quote';
      replacement = text
        .split(/\r?\n/)
        .map((line) => `> ${line.replace(/^>\s?/, '')}`)
        .join('\n');
    } else if (command === 'heading') {
      replacement = `## ${selectedText || 'Heading'}`;
    }

    const nextDescription = `${description.slice(0, selectionStart)}${replacement}${description.slice(selectionEnd)}`;
    setDescription(nextDescription);
    setDescriptionMode('edit');
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionStart + replacement.length);
    });
  }

  const submitDisabled = isPending
    || !proposalType
    || (proposalType === 'motion' && (!title.trim() || !description.trim()))
    || (proposalType === 'fundraising' && Boolean(
      fundraisingStep < fundraisingProposalSteps.length - 1
        ? validateDraftStep(fundraisingDraft, fundraisingStep)
        : validateFullDraft(fundraisingDraft)
    ))
    || (proposalType === 'roleChange' && (!title.trim() || !roleTarget.trim() || !roleReason.trim()));

  const submitLabel = proposalType === 'fundraising'
    ? fundraisingStep < fundraisingProposalSteps.length - 1
      ? t('fundraising.actions.saveContinue', { defaultValue: 'Save and continue' })
      : t('proposals.create.submitFundraising')
    : proposalType === 'roleChange'
      ? t('proposals.create.submitRoleChange')
      : t('common.actions.createProposal');

  function updateFundraisingDraft<K extends keyof FundraisingDraft>(key: K, value: FundraisingDraft[K]) {
    setSubmitError(null);
    setFundraisingDraft((draft) => ({ ...draft, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-amnesty-paper text-amnesty-ink">
      <div className="grid min-h-screen lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="border-b border-amnesty-line bg-[#fbfbf7] p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 lg:block">
            <h2 className="text-xl uppercase tracking-[0.16em] text-amnesty-ink amnesty-heading">
              {t('app.nav.proposals')}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="rounded-full p-2 text-amnesty-ink transition hover:bg-[#efeee9] lg:hidden"
              aria-label={t('common.actions.cancel')}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button type="button" className="btn-primary mt-7 w-full rounded-full">
            <span className="text-xl leading-none">+</span>
            {t('common.actions.createProposal')}
          </button>

          <label className="mt-6 flex min-h-[3.1rem] items-center gap-3 rounded-[0.9rem] border border-amnesty-line bg-white px-4">
            <svg className="h-5 w-5 text-[#5c727d]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
            </svg>
            <input
              value={sidebarSearch}
              onChange={(event) => setSidebarSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#7d8c92]"
              placeholder={t('proposals.create.searchPlaceholder', { defaultValue: 'Search proposals' })}
            />
          </label>

          <div className="mt-7 space-y-7">
            <ProposalSidebarSection
              count={0}
              emptyCopy={t('proposals.create.noDrafts', { defaultValue: 'Drafts will appear here once proposal drafting is saved.' })}
              proposals={[]}
              title={t('proposals.create.myProposals', { defaultValue: 'My proposals' })}
            />
            <ProposalSidebarSection
              count={activeProposals.length}
              emptyCopy={t('communities.portal.emptyProposalsViewer')}
              proposals={activeProposals}
              title={t('proposals.create.activeProposals', { defaultValue: 'Active proposals' })}
            />
            <ProposalSidebarSection
              count={passedProposals.length}
              emptyCopy={t('proposals.create.noPassed', { defaultValue: 'No passed proposals yet.' })}
              proposals={passedProposals}
              title={t('proposals.create.passedProposals', { defaultValue: 'Passed proposals' })}
            />
            <ProposalSidebarSection
              count={rejectedProposals.length}
              emptyCopy={t('proposals.create.noRejected', { defaultValue: 'No rejected proposals yet.' })}
              proposals={rejectedProposals}
              title={t('proposals.create.rejectedProposals', { defaultValue: 'Rejected proposals' })}
            />
          </div>
        </aside>

        <main className="px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
          <div className="mx-auto grid max-w-[78rem] gap-10 xl:grid-cols-[minmax(0,1fr)_23rem]">
            <form onSubmit={handleSubmit} className="min-w-0">
              <div className="border-b border-amnesty-line pb-8">
                <p className="amnesty-kicker mb-5 text-amnesty-pink">{t('app.nav.proposals')}</p>
                <h1 className="text-5xl text-amnesty-ink md:text-6xl amnesty-heading">
                  {t('proposals.create.title')}
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-[#38505d]">
                  {t('proposals.create.intro', {
                    defaultValue: 'Share your idea for the community and set the governance parameters.',
                  })}
                </p>
              </div>

              <div className="space-y-8 py-8">
                <div>
                  <p className="amnesty-kicker mb-3 text-amnesty-ink">{t('proposals.create.proposalType')}</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      {
                        type: 'motion' as const,
                        title: t('proposals.create.proposalTypes.motionTitle'),
                        body: t('proposals.create.proposalTypes.motionBody'),
                      },
                      {
                        type: 'fundraising' as const,
                        title: t('proposals.create.proposalTypes.fundraisingTitle'),
                        body: t('proposals.create.proposalTypes.fundraisingBody'),
                      },
                      {
                        type: 'roleChange' as const,
                        title: t('proposals.create.proposalTypes.roleChangeTitle'),
                        body: t('proposals.create.proposalTypes.roleChangeBody'),
                      },
                    ].map((option) => (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => {
                          setProposalType(option.type);
                          setSubmitError(null);
                          if (option.type === 'fundraising') setFundraisingStep(0);
                        }}
                        disabled={isPending}
                        className={`rounded-[0.8rem] border p-4 text-left transition ${
                          proposalType === option.type
                            ? 'border-amnesty-ink bg-amnesty-yellow text-amnesty-ink'
                            : 'border-amnesty-line bg-white hover:border-amnesty-ink'
                        }`}
                      >
                        <span className="block text-xl amnesty-heading">{option.title}</span>
                        <span className="mt-2 block text-sm leading-6">{option.body}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {!proposalType && (
                  <div className="rounded-[0.9rem] border border-[#efe2a3] bg-[#fff9d8] p-5 text-amnesty-ink">
                    <p className="text-lg font-bold amnesty-heading">{t('proposals.create.chooseTypeTitle')}</p>
                    <p className="mt-2 text-base leading-7">{t('proposals.create.chooseTypeBody')}</p>
                  </div>
                )}

                {proposalType && proposalType !== 'fundraising' && (
                <div>
                  <label htmlFor="proposal-title" className="amnesty-kicker mb-3 block text-amnesty-ink">
                    {t('proposals.create.titleLabel')}
                  </label>
                  <input
                    type="text"
                    id="proposal-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                    placeholder={t('proposals.create.titlePlaceholder')}
                    required
                    disabled={isPending}
                    maxLength={100}
                  />
                  <p className="mt-2 text-sm font-bold text-amnesty-gray-600">
                    {t('common.labels.characters', { count: title.length, max: 100 })}
                  </p>
                </div>
                )}

                {proposalType === 'motion' && (
                <div>
                  <label htmlFor="proposal-description" className="amnesty-kicker mb-2 block text-amnesty-ink">
                    {t('proposals.create.descriptionLabel')}
                  </label>
                  <p className="mb-3 text-base leading-7 text-[#5c727d]">
                    {t('proposals.create.descriptionHelp', {
                      defaultValue: 'Describe your proposal in detail. What are you proposing? Why should the community support it?',
                    })}
                  </p>
                  <div className="proposal-markdown-editor">
                    <div className="proposal-markdown-toolbar" aria-label="Markdown formatting tools">
                      <button type="button" onClick={() => replaceSelectedDescriptionText('heading')} disabled={isPending || descriptionMode === 'preview'}>Heading</button>
                      <button type="button" onClick={() => replaceSelectedDescriptionText('bold')} disabled={isPending || descriptionMode === 'preview'}>B</button>
                      <button type="button" onClick={() => replaceSelectedDescriptionText('italic')} disabled={isPending || descriptionMode === 'preview'}><em>I</em></button>
                      <button type="button" onClick={() => replaceSelectedDescriptionText('link')} disabled={isPending || descriptionMode === 'preview'}>Link</button>
                      <button type="button" onClick={() => replaceSelectedDescriptionText('list')} disabled={isPending || descriptionMode === 'preview'}>List</button>
                      <button type="button" onClick={() => replaceSelectedDescriptionText('quote')} disabled={isPending || descriptionMode === 'preview'}>Quote</button>
                      <span />
                      <button
                        type="button"
                        className={descriptionMode === 'edit' ? 'selected' : ''}
                        onClick={() => setDescriptionMode('edit')}
                        disabled={isPending}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={descriptionMode === 'preview' ? 'selected' : ''}
                        onClick={() => setDescriptionMode('preview')}
                        disabled={!description.trim()}
                      >
                        Preview
                      </button>
                    </div>
                    {descriptionMode === 'preview' ? (
                      <div className="proposal-markdown-preview">
                        {description.trim() ? (
                          <MarkdownContent className="proposal-markdown-content" text={description} />
                        ) : (
                          <p>{t('proposals.create.descriptionPlaceholder')}</p>
                        )}
                      </div>
                    ) : (
                      <textarea
                        id="proposal-description"
                        ref={descriptionRef}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={9}
                        className="input-field rounded-[0.35rem] text-lg leading-7"
                        placeholder={t('proposals.create.descriptionPlaceholder')}
                        required
                        disabled={isPending}
                        maxLength={1000}
                      />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-bold text-amnesty-gray-600">
                    {t('common.labels.characters', { count: description.length, max: 1000 })}
                  </p>
                </div>
                )}

                {proposalType === 'fundraising' && (
                  <div className="grid gap-6">
                    <div className="grid gap-3 lg:grid-cols-6">
                      {fundraisingProposalSteps.map((step, index) => (
                        <button
                          key={step.titleKey}
                          type="button"
                          className={`rounded-[0.75rem] border p-3 text-left transition ${
                            index === fundraisingStep
                              ? 'border-amnesty-ink bg-amnesty-yellow text-amnesty-ink'
                              : index < fundraisingStep
                                ? 'border-amnesty-yellow bg-[#fff9d8] text-amnesty-ink'
                                : 'border-amnesty-line bg-white text-[#5c727d]'
                          }`}
                          onClick={() => setFundraisingStep(index)}
                          disabled={isPending}
                        >
                          <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full border border-current text-sm font-bold">
                            {index + 1}
                          </span>
                          <strong className="block text-sm amnesty-heading">
                            {t(step.titleKey, { defaultValue: step.fallbackTitle })}
                          </strong>
                          <small className="mt-1 block leading-5">
                            {t(step.bodyKey, { defaultValue: step.fallbackBody })}
                          </small>
                        </button>
                      ))}
                    </div>

                    {fundraisingStep === 0 && (
                      <div className="grid gap-5">
                        <div>
                          <label htmlFor="fundraising-title" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.campaignTitleLabel')}</label>
                          <input
                            id="fundraising-title"
                            value={fundraisingDraft.title}
                            onChange={(event) => updateFundraisingDraft('title', event.target.value)}
                            className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                            placeholder={t('proposals.create.campaignTitlePlaceholder')}
                            disabled={isPending}
                            maxLength={100}
                          />
                        </div>
                        <div>
                          <label htmlFor="fundraising-short" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.campaignShortDescriptionLabel')}</label>
                          <input
                            id="fundraising-short"
                            value={fundraisingDraft.shortDescription}
                            onChange={(event) => updateFundraisingDraft('shortDescription', event.target.value)}
                            className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                            placeholder={t('proposals.create.campaignShortDescriptionPlaceholder')}
                            disabled={isPending}
                            maxLength={240}
                          />
                        </div>
                        <div>
                          <label htmlFor="fundraising-story" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.campaignStoryLabel')}</label>
                          <textarea
                            id="fundraising-story"
                            value={fundraisingDraft.story}
                            onChange={(event) => updateFundraisingDraft('story', event.target.value)}
                            rows={8}
                            className="input-field rounded-[0.35rem] text-lg leading-7"
                            placeholder={t('proposals.create.campaignStoryPlaceholder')}
                            disabled={isPending}
                            maxLength={4000}
                          />
                        </div>
                      </div>
                    )}

                    {fundraisingStep === 1 && (
                      <div className="grid gap-5">
                        <div className="grid gap-5 md:grid-cols-3">
                          <div>
                            <label htmlFor="fundraising-goal" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.campaignGoalLabel')}</label>
                            <input
                              id="fundraising-goal"
                              type="number"
                              min="1"
                              value={fundraisingDraft.goalAmount}
                              onChange={(event) => updateFundraisingDraft('goalAmount', event.target.value)}
                              className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                              disabled={isPending}
                            />
                          </div>
                          <div>
                            <label htmlFor="fundraising-currency" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.campaignCurrencyLabel')}</label>
                            <select
                              id="fundraising-currency"
                              value={fundraisingDraft.currency}
                              onChange={(event) => updateFundraisingDraft('currency', event.target.value)}
                              className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                              disabled={isPending}
                            >
                              {SUPPORTED_FUNDRAISING_CURRENCIES.map((currency) => (
                                <option key={currency.code} value={currency.code}>{currency.code} - {currency.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="fundraising-deadline" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.campaignDeadlineLabel')}</label>
                            <input
                              id="fundraising-deadline"
                              type="datetime-local"
                              value={fundraisingDraft.deadlineLocal}
                              onChange={(event) => updateFundraisingDraft('deadlineLocal', event.target.value)}
                              className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                              disabled={isPending}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="fundraising-visibility" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.campaignVisibilityLabel')}</label>
                          <select
                            id="fundraising-visibility"
                            value={fundraisingDraft.visibility}
                            onChange={(event) => updateFundraisingDraft('visibility', event.target.value as CampaignVisibility)}
                            className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                            disabled={isPending}
                          >
                            <option value={CampaignVisibility.community}>{t('proposals.create.campaignVisibilityOptions.community')}</option>
                            <option value={CampaignVisibility.publicCampaign}>{t('proposals.create.campaignVisibilityOptions.public')}</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {fundraisingStep === 2 && (
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <label htmlFor="fundraising-funds-use" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.campaignFundsUseLabel')}</label>
                          <textarea
                            id="fundraising-funds-use"
                            value={fundraisingDraft.fundsUse}
                            onChange={(event) => updateFundraisingDraft('fundsUse', event.target.value)}
                            rows={6}
                            className="input-field rounded-[0.35rem] text-lg leading-7"
                            disabled={isPending}
                          />
                        </div>
                        <div>
                          <label htmlFor="fundraising-impact" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.campaignImpactLabel')}</label>
                          <textarea
                            id="fundraising-impact"
                            value={fundraisingDraft.impact}
                            onChange={(event) => updateFundraisingDraft('impact', event.target.value)}
                            rows={6}
                            className="input-field rounded-[0.35rem] text-lg leading-7"
                            disabled={isPending}
                          />
                        </div>
                      </div>
                    )}

                    {fundraisingStep === 3 && (
                      <div>
                        <label htmlFor="fundraising-media" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.campaignMediaLabel')}</label>
                        <input
                          id="fundraising-media"
                          value={fundraisingDraft.mediaUrl}
                          onChange={(event) => updateFundraisingDraft('mediaUrl', event.target.value)}
                          className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                          placeholder={t('proposals.create.campaignMediaPlaceholder')}
                          disabled={isPending}
                        />
                        <p className="mt-3 rounded-[0.7rem] border border-amnesty-line bg-white p-4 text-base leading-7 text-[#5c727d]">
                          {t('fundraising.steps.mediaHint', { defaultValue: 'Use a direct image or video URL for this pass.' })}
                        </p>
                      </div>
                    )}

                    {fundraisingStep === 4 && (
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <label htmlFor="fundraising-creator" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.campaignCreatorLabel')}</label>
                          <input
                            id="fundraising-creator"
                            value={fundraisingDraft.creatorName}
                            onChange={(event) => updateFundraisingDraft('creatorName', event.target.value)}
                            className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                            disabled={isPending}
                          />
                        </div>
                        <div>
                          <label htmlFor="fundraising-contact" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.campaignContactLabel')}</label>
                          <input
                            id="fundraising-contact"
                            value={fundraisingDraft.creatorContact}
                            onChange={(event) => updateFundraisingDraft('creatorContact', event.target.value)}
                            className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                            disabled={isPending}
                          />
                        </div>
                      </div>
                    )}

                    {fundraisingStep === 5 && (
                      <div className="grid gap-5">
                        <FundraisingLiveCampaignPreview draft={fundraisingDraft} locale={locale} t={t} />
                        <div className="rounded-[0.9rem] border border-[#efe2a3] bg-[#fff9d8] p-5 text-base leading-7 text-amnesty-ink">
                          {t('proposals.create.fundraisingGovernanceNotice', {
                            defaultValue: 'Submitting this will open a fundraising proposal for voting. The live campaign is created only if the proposal passes and finalization succeeds.',
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {proposalType === 'roleChange' && (
                  <div className="grid gap-5">
                    <div>
                      <label htmlFor="role-target" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.roleTargetLabel')}</label>
                      <input
                        id="role-target"
                        value={roleTarget}
                        onChange={(event) => setRoleTarget(event.target.value)}
                        className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                        placeholder={t('proposals.create.roleTargetPlaceholder')}
                        disabled={isPending}
                      />
                    </div>
                    <div>
                      <label htmlFor="role-action" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.roleActionLabel')}</label>
                      <select
                        id="role-action"
                        value={roleAction}
                        onChange={(event) => setRoleAction(event.target.value as typeof roleAction)}
                        className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                        disabled={isPending}
                      >
                        <option value="member">{t('proposals.create.roleActions.member')}</option>
                        <option value="communityAdmin">{t('proposals.create.roleActions.admin')}</option>
                        <option value="remove">{t('proposals.create.roleActions.remove')}</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="role-reason" className="amnesty-kicker mb-3 block text-amnesty-ink">{t('proposals.create.roleReasonLabel')}</label>
                      <textarea
                        id="role-reason"
                        value={roleReason}
                        onChange={(event) => setRoleReason(event.target.value)}
                        rows={6}
                        className="input-field rounded-[0.35rem] text-lg leading-7"
                        placeholder={t('proposals.create.roleReasonPlaceholder')}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                )}
              </div>

              {useCustomSettings && (
                <div className="mb-8 grid gap-4 rounded-[0.9rem] border border-amnesty-line bg-white p-5 md:grid-cols-3">
                  <div>
                    <label htmlFor="voting-window" className="amnesty-kicker mb-2 block text-amnesty-ink">
                      {t('proposals.create.votingWindowLabel', { defaultValue: 'Voting window' })}
                    </label>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem] md:grid-cols-1">
                      <input
                        type="number"
                        id="voting-window"
                        value={votingWindowAmount}
                        onChange={(event) => setVotingWindowAmount(
                          clampVotingWindowAmount(Number(event.target.value), votingWindowUnit),
                        )}
                        className="input-field rounded-[0.35rem] text-lg"
                        min={votingWindowMin(votingWindowUnit)}
                        max={votingWindowMax(votingWindowUnit)}
                        disabled={isPending}
                      />
                      <select
                        value={votingWindowUnit}
                        onChange={(event) => {
                          const nextUnit = event.target.value as VotingWindowUnit;
                          setVotingWindowUnit(nextUnit);
                          setVotingWindowAmount((current) => clampVotingWindowAmount(current, nextUnit));
                        }}
                        className="input-field rounded-[0.35rem] text-lg"
                        disabled={isPending}
                        aria-label={t('proposals.create.votingWindowUnitLabel', { defaultValue: 'Voting window unit' })}
                      >
                        {VOTING_WINDOW_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {t(`proposals.create.votingWindowUnits.${unit}`, { defaultValue: unit })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-2 text-sm font-bold text-amnesty-gray-600">
                      {t('proposals.create.votingWindowFineHelp', {
                        defaultValue: 'Minimum 5 minutes. Maximum 30 days.',
                      })}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="quorum" className="amnesty-kicker mb-2 block text-amnesty-ink">
                      {t('proposals.create.minimumVotesLabel')}
                    </label>
                    <input
                      type="number"
                      id="quorum"
                      value={quorum}
                      onChange={(e) => setQuorum(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input-field rounded-[0.35rem] text-lg"
                      min="1"
                      disabled={isPending}
                    />
                  </div>

                  <div>
                    <label htmlFor="pass-threshold" className="amnesty-kicker mb-2 block text-amnesty-ink">
                      {t('proposals.create.passThresholdLabel')}
                    </label>
                    <input
                      type="number"
                      id="pass-threshold"
                      value={passThreshold}
                      onChange={(e) => setPassThreshold(Math.max(1, Math.min(100, parseInt(e.target.value) || 50)))}
                      className="input-field rounded-[0.35rem] text-lg"
                      min="1"
                      max="100"
                      disabled={isPending}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-amnesty-line pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="btn-secondary rounded-full"
                >
                  {t('common.actions.cancel')}
                </button>
                {proposalType === 'fundraising' && fundraisingStep > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitError(null);
                      setFundraisingStep((current) => Math.max(0, current - 1));
                    }}
                    disabled={isPending}
                    className="btn-secondary rounded-full"
                  >
                    {t('common.actions.back', { defaultValue: 'Back' })}
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className="btn-primary rounded-full"
                >
                  {isPending ? (
                    <>
                      <LoadingSpinner size="small" className="mr-3" />
                      {t('common.loading.creating')}
                    </>
                  ) : (
                    submitLabel
                  )}
                </button>
              </div>

              {isError && (
                <div className="mt-6 rounded-[0.7rem] border border-amnesty-orange bg-[#fff1e8] p-4 text-amnesty-ink">
                  <p className="text-lg font-bold amnesty-heading">
                    {t('proposals.create.error')}
                  </p>
                  {submitError && <p className="mt-2 text-base leading-7">{submitError}</p>}
                </div>
              )}
            </form>

            <aside className="space-y-6 xl:pt-16">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="ml-auto hidden rounded-full p-2 text-amnesty-ink transition hover:bg-[#f3f3ed] disabled:opacity-50 lg:flex"
                aria-label={t('common.actions.cancel')}
              >
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <section className="rounded-[0.85rem] border border-amnesty-line bg-white p-6 shadow-[0_20px_48px_rgba(4,31,45,0.08)]">
                <h2 className="text-2xl text-amnesty-ink amnesty-heading">
                  {t('proposals.create.customizeGovernance')}
                </h2>
                <div className="mt-5 rounded-[0.65rem] border border-[#efe2a3] bg-[#fff9d8] p-5">
                  <h3 className="mb-3 text-lg text-amnesty-ink amnesty-heading">
                    {useCustomSettings
                      ? t('proposals.create.customSettings', { defaultValue: 'Custom settings' })
                      : t('proposals.create.defaultSettings')}
                  </h3>
                  <ul className="space-y-2 text-base leading-7 text-amnesty-ink">
                    <li>• {t('proposals.create.votingWindow')}: {votingWindowSummary}</li>
                    <li>• {t('proposals.create.quorum')}: {t('proposals.create.votesValue', { count: quorum, defaultValue: '{{count}} vote minimum' })}</li>
                    <li>• {t('proposals.create.passThreshold')}: {t('proposals.create.percentValue', { count: passThreshold, defaultValue: '{{count}}% yes votes' })}</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (useCustomSettings) {
                      setVotingWindowAmount(3);
                      setVotingWindowUnit('days');
                      setQuorum(1);
                      setPassThreshold(50);
                      setUseCustomSettings(false);
                      return;
                    }
                    setUseCustomSettings(true);
                  }}
                  className="btn-secondary mt-5 w-full rounded-[0.45rem]"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h10m4 0h2M4 16h2m4 0h10M8 5v6m8 2v6" />
                  </svg>
                  {useCustomSettings
                    ? t('proposals.create.useDefaults', { defaultValue: 'Use default settings' })
                    : t('proposals.create.customizeSettings', { defaultValue: 'Customize settings' })}
                </button>
              </section>

              <section className="rounded-[0.85rem] border border-amnesty-line bg-white p-6 shadow-[0_20px_48px_rgba(4,31,45,0.08)]">
                <h2 className="text-2xl text-amnesty-ink amnesty-heading">
                  {t('proposals.create.submissionTitle')}
                </h2>
                <div className="mt-6 flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff9d8] text-amnesty-ink">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 11h8M8 15h4M6 3h12a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z" />
                    </svg>
                  </span>
                  <p className="text-base leading-7 text-amnesty-ink">
                    {t('proposals.create.submissionBody')}
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
