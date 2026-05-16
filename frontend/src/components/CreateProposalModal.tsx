import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Proposal, ProposalOverrides, ProposalState } from '../backend';
import { useCreateProposal } from '../hooks/useQueries';
import LoadingSpinner from './LoadingSpinner';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: bigint;
  proposals?: Proposal[];
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

export default function CreateProposalModal({
  isOpen,
  onClose,
  communityId,
  proposals = [],
}: CreateProposalModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [useCustomSettings, setUseCustomSettings] = useState(false);
  const [votingWindowDays, setVotingWindowDays] = useState(3);
  const [quorum, setQuorum] = useState(1);
  const [passThreshold, setPassThreshold] = useState(50);
  const createProposal = useCreateProposal();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && description.trim()) {
      try {
        const overrides: ProposalOverrides | null = useCustomSettings ? {
          windowNs: BigInt(votingWindowDays * 24 * 60 * 60 * 1000 * 1000 * 1000),
          quorum: BigInt(quorum),
          passPct: BigInt(passThreshold)
        } : null;

        await createProposal.mutateAsync({
          communityId,
          title: title.trim(),
          description: description.trim(),
          overrides
        });

        setTitle('');
        setDescription('');
        setSidebarSearch('');
        setUseCustomSettings(false);
        setVotingWindowDays(3);
        setQuorum(1);
        setPassThreshold(50);
        onClose();
      } catch (error) {
        console.error('Failed to create proposal:', error);
      }
    }
  };

  const handleClose = () => {
    if (!createProposal.isPending) {
      setTitle('');
      setDescription('');
      setSidebarSearch('');
      setUseCustomSettings(false);
      setVotingWindowDays(3);
      setQuorum(1);
      setPassThreshold(50);
      onClose();
    }
  };

  if (!isOpen) return null;

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
              disabled={createProposal.isPending}
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
                    disabled={createProposal.isPending}
                    maxLength={100}
                  />
                  <p className="mt-2 text-sm font-bold text-amnesty-gray-600">
                    {t('common.labels.characters', { count: title.length, max: 100 })}
                  </p>
                </div>

                <div>
                  <label htmlFor="proposal-description" className="amnesty-kicker mb-2 block text-amnesty-ink">
                    {t('proposals.create.descriptionLabel')}
                  </label>
                  <p className="mb-3 text-base leading-7 text-[#5c727d]">
                    {t('proposals.create.descriptionHelp', {
                      defaultValue: 'Describe your proposal in detail. What are you proposing? Why should the community support it?',
                    })}
                  </p>
                  <textarea
                    id="proposal-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={9}
                    className="input-field rounded-[0.35rem] text-lg leading-7"
                    placeholder={t('proposals.create.descriptionPlaceholder')}
                    required
                    disabled={createProposal.isPending}
                    maxLength={1000}
                  />
                  <p className="mt-2 text-sm font-bold text-amnesty-gray-600">
                    {t('common.labels.characters', { count: description.length, max: 1000 })}
                  </p>
                </div>
              </div>

              {useCustomSettings && (
                <div className="mb-8 grid gap-4 rounded-[0.9rem] border border-amnesty-line bg-white p-5 md:grid-cols-3">
                  <div>
                    <label htmlFor="voting-window" className="amnesty-kicker mb-2 block text-amnesty-ink">
                      {t('proposals.create.votingWindowDaysLabel')}
                    </label>
                    <input
                      type="number"
                      id="voting-window"
                      value={votingWindowDays}
                      onChange={(e) => setVotingWindowDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input-field rounded-[0.35rem] text-lg"
                      min="1"
                      max="30"
                      disabled={createProposal.isPending}
                    />
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
                      disabled={createProposal.isPending}
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
                      disabled={createProposal.isPending}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-amnesty-line pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={createProposal.isPending}
                  className="btn-secondary rounded-full"
                >
                  {t('common.actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || !description.trim() || createProposal.isPending}
                  className="btn-primary rounded-full"
                >
                  {createProposal.isPending ? (
                    <>
                      <LoadingSpinner size="small" className="mr-3" />
                      {t('common.loading.creating')}
                    </>
                  ) : (
                    t('common.actions.createProposal')
                  )}
                </button>
              </div>

              {createProposal.isError && (
                <div className="mt-6 rounded-[0.7rem] border border-amnesty-orange bg-[#fff1e8] p-4 text-amnesty-ink">
                  <p className="text-lg font-bold amnesty-heading">
                    {t('proposals.create.error')}
                  </p>
                </div>
              )}
            </form>

            <aside className="space-y-6 xl:pt-16">
              <button
                type="button"
                onClick={handleClose}
                disabled={createProposal.isPending}
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
                    <li>• {t('proposals.create.votingWindow')}: {useCustomSettings ? t('proposals.create.daysValue', { count: votingWindowDays, defaultValue: '{{count}} days' }) : t('proposals.create.defaultVotingWindow')}</li>
                    <li>• {t('proposals.create.quorum')}: {useCustomSettings ? t('proposals.create.votesValue', { count: quorum, defaultValue: '{{count}} vote minimum' }) : t('proposals.create.defaultQuorum')}</li>
                    <li>• {t('proposals.create.passThreshold')}: {useCustomSettings ? t('proposals.create.percentValue', { count: passThreshold, defaultValue: '{{count}}% yes votes' }) : t('proposals.create.defaultPassThreshold')}</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => setUseCustomSettings((value) => !value)}
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
