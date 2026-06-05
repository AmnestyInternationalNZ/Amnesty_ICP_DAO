import { Copy, ExternalLink, HeartHandshake, Mail, Megaphone, Pencil, Plus, Save, Share2, Trash2, Users } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CampaignState, CampaignVisibility, type FundraisingCampaignPayload } from '../../backend';
import {
  createCampaignShareToken,
  daysLeft,
  draftFromCampaign,
  inputFromDraft,
  progressPercent,
  publicCampaignUrl,
  SUPPORTED_FUNDRAISING_CURRENCIES,
  validateFullDraft,
  type FundraisingDraft,
} from '../../fundraising/fundraisingApi';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../../i18n/format';
import { useLocalePreference } from '../../i18n/preferences';
import { routePaths } from '../../routing/appRoutes';
import {
  useAddCampaignUpdate,
  useArchiveCampaign,
  useContributeToCampaign,
  useGetCommunityAccess,
  useGetCommunityById,
  useGetFundraisingCampaign,
  useListFundraisingCampaigns,
  useSetCampaignPublicLink,
  useUpdateFundraisingCampaign,
} from '../../hooks/useQueries';
import MarkdownContent from '../MarkdownContent';
import LoadingSpinner from '../LoadingSpinner';

interface CommunityFundraisingPageProps {
  communityId: bigint;
  initialCampaignId?: bigint;
  initialCreate?: boolean;
  onCreateCampaignRoute?: () => void;
  onOpenCampaignRoute?: (campaignId: bigint) => void;
}

function principalInitial(label: string) {
  return (label.trim()[0] || 'A').toUpperCase();
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function tx(t: ReturnType<typeof useTranslation>['t'], key: string, defaultValue: string) {
  return t(key, { defaultValue });
}

export default function CommunityFundraisingPage({
  communityId,
  initialCampaignId,
  initialCreate = false,
  onCreateCampaignRoute,
  onOpenCampaignRoute,
}: CommunityFundraisingPageProps) {
  const { t } = useTranslation();
  const [selectedCampaignId, setSelectedCampaignId] = useState<bigint | null>(initialCampaignId ?? null);
  const [search, setSearch] = useState('');

  const community = useGetCommunityById(communityId);
  const access = useGetCommunityAccess(communityId);
  const campaignsQuery = useListFundraisingCampaigns(communityId);
  const campaignQuery = useGetFundraisingCampaign(communityId, selectedCampaignId);

  const campaigns = useMemo(
    () => [...(campaignsQuery.data ?? [])].sort((left, right) => Number(right.updatedNs - left.updatedNs)),
    [campaignsQuery.data],
  );
  const filteredCampaigns = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return campaigns;
    return campaigns.filter((campaign) =>
      `${campaign.title} ${campaign.shortDescription}`.toLowerCase().includes(needle),
    );
  }, [campaigns, search]);

  useEffect(() => {
    if (initialCampaignId !== undefined) {
      setSelectedCampaignId(initialCampaignId);
    }
  }, [initialCampaignId]);

  useEffect(() => {
    if (initialCreate) onCreateCampaignRoute?.();
  }, [initialCreate, onCreateCampaignRoute]);

  useEffect(() => {
    if (selectedCampaignId !== null || campaigns.length === 0) return;
    setSelectedCampaignId(campaigns[0].id);
    onOpenCampaignRoute?.(campaigns[0].id);
  }, [campaigns, onOpenCampaignRoute, selectedCampaignId]);

  function openCampaign(campaignId: bigint) {
    setSelectedCampaignId(campaignId);
    onOpenCampaignRoute?.(campaignId);
  }

  function openCreate() {
    onCreateCampaignRoute?.();
  }

  const canProposeCampaign = Boolean(access.data?.canCreateProposal);
  const selectedCampaign = campaignQuery.data ?? campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;

  return (
    <section className="fundraising-shell">
      <aside className="fundraising-sidebar" aria-label={tx(t, 'fundraising.sidebar.aria', 'Campaign navigation')}>
        <div className="fundraising-sidebar-header">
          <p className="amnesty-kicker">{tx(t, 'fundraising.sidebar.liveCampaigns', 'Live campaigns')}</p>
          <button
            type="button"
            className="btn-primary rounded-full"
            disabled={!canProposeCampaign}
            onClick={openCreate}
            title={!canProposeCampaign ? tx(t, 'fundraising.sidebar.createLocked', 'Only community members can propose campaigns.') : undefined}
          >
            <Plus size={18} />
            {tx(t, 'fundraising.actions.newProposal', 'Propose campaign')}
          </button>
        </div>

        <label className="fundraising-search">
          <span className="sr-only">{tx(t, 'fundraising.sidebar.search', 'Search campaigns')}</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tx(t, 'fundraising.sidebar.searchPlaceholder', 'Search campaigns')}
          />
        </label>

        <div className="fundraising-list">
          {campaignsQuery.isLoading ? (
            <LoadingSpinner size="medium" />
          ) : filteredCampaigns.length === 0 ? (
            <p className="fundraising-muted">{tx(t, 'fundraising.sidebar.empty', 'No campaigns found yet.')}</p>
          ) : (
            filteredCampaigns.map((campaign) => (
              <button
                key={campaign.id.toString()}
                type="button"
                className={`fundraising-list-card ${selectedCampaignId === campaign.id ? 'active' : ''}`}
                onClick={() => openCampaign(campaign.id)}
              >
                <span>{campaign.title}</span>
                <small>
                  {formatCurrency(campaign.totalRaised, undefined, campaign.currency)} {tx(t, 'fundraising.sidebar.raised', 'raised')} · {formatNumber(progressPercent(campaign))}%
                </small>
              </button>
            ))
          )}
        </div>

        <div className="fundraising-sidebar-foot">
          <p>{tx(t, 'fundraising.footerLine', 'Approved by the community. Ready for public support.')}</p>
        </div>
      </aside>

      <main className="fundraising-main">
        {community.isLoading || access.isLoading ? (
          <div className="fundraising-empty">
            <LoadingSpinner size="large" />
          </div>
        ) : selectedCampaign ? (
          <CampaignDetailView
            campaign={selectedCampaign}
            communityId={communityId}
            communityName={community.data?.name ?? tx(t, 'fundraising.common.community', 'Community')}
            onArchived={() => {
              void campaignsQuery.refetch();
              setSelectedCampaignId(null);
            }}
            onRefresh={async () => {
              await campaignQuery.refetch();
              await campaignsQuery.refetch();
            }}
          />
        ) : (
          <div className="fundraising-empty">
            <p className="amnesty-kicker text-amnesty-pink">{tx(t, 'fundraising.hero.kicker', 'Fundraise')}</p>
            <h1>{tx(t, 'fundraising.empty.title', 'No live campaigns yet')}</h1>
            <p>{tx(t, 'fundraising.empty.body', 'Fundraising campaigns appear here after the community approves and finalizes a fundraising proposal.')}</p>
            <button type="button" className="btn-primary rounded-full" disabled={!canProposeCampaign} onClick={openCreate}>
              <Plus size={18} />
              {tx(t, 'fundraising.actions.createFirst', 'Propose a campaign')}
            </button>
          </div>
        )}
      </main>
    </section>
  );
}

function Field({ children, hint, label, required = false }: { children: React.ReactNode; hint?: string; label: string; required?: boolean }) {
  return (
    <label className="fundraising-field">
      <span>
        {label} {required ? <em>*</em> : null}
        {hint ? <small>{hint}</small> : null}
      </span>
      {children}
    </label>
  );
}

function CampaignDetailView({
  campaign,
  communityId,
  communityName,
  onArchived,
  onRefresh,
}: {
  campaign: FundraisingCampaignPayload;
  communityId: bigint;
  communityName: string;
  onArchived: () => void;
  onRefresh: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { locale } = useLocalePreference();
  const [activeTab, setActiveTab] = useState<'overview' | 'updates' | 'donations' | 'fundraisers' | 'share' | 'edit'>('overview');
  const [donationAmount, setDonationAmount] = useState('25');
  const [updateContent, setUpdateContent] = useState('');
  const [grantMessage, setGrantMessage] = useState('');
  const [editDraft, setEditDraft] = useState(() => draftFromCampaign(campaign));
  const [message, setMessage] = useState<string | null>(null);
  const contribute = useContributeToCampaign();
  const addUpdate = useAddCampaignUpdate();
  const archiveCampaign = useArchiveCampaign();
  const updateCampaign = useUpdateFundraisingCampaign();
  const setPublicLink = useSetCampaignPublicLink();

  useEffect(() => {
    setEditDraft(draftFromCampaign(campaign));
  }, [campaign]);

  const progress = progressPercent(campaign);
  const deadlineMs = Number(campaign.deadlineNs / 1_000_000n);
  const publicUrl = campaign.publicToken ? publicCampaignUrl(campaign.publicToken) : '';
  const canDonate = campaign.canContribute && campaign.state === CampaignState.active && !campaign.archived;

  async function donate() {
    const amount = BigInt(Math.max(1, Math.floor(Number(donationAmount) || 0)));
    try {
      await contribute.mutateAsync({ campaignId: campaign.id, amount });
      setDonationAmount('25');
      setMessage(tx(t, 'fundraising.messages.donationSaved', 'Donation recorded.'));
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function postUpdate() {
    if (!updateContent.trim()) return;
    try {
      await addUpdate.mutateAsync({ campaignId: campaign.id, content: updateContent.trim() });
      setUpdateContent('');
      setMessage(tx(t, 'fundraising.messages.updatePosted', 'Update posted.'));
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function createPublicLink() {
    try {
      const token = await setPublicLink.mutateAsync({
        communityId,
        campaignId: campaign.id,
        token: campaign.publicToken ?? createCampaignShareToken(),
      });
      if (token) {
        await copyText(publicCampaignUrl(token));
        setMessage(tx(t, 'fundraising.messages.linkCopied', 'Public link copied.'));
      }
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function disablePublicLink() {
    try {
      await setPublicLink.mutateAsync({ communityId, campaignId: campaign.id, token: null });
      setMessage(tx(t, 'fundraising.messages.linkDisabled', 'Public link disabled.'));
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function saveEdits() {
    const error = validateFullDraft(editDraft);
    if (error) {
      setMessage(error);
      return;
    }
    try {
      await updateCampaign.mutateAsync({ communityId, campaignId: campaign.id, input: inputFromDraft(editDraft) });
      setMessage(tx(t, 'fundraising.messages.campaignSaved', 'Campaign saved.'));
      setActiveTab('overview');
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function archiveCurrentCampaign() {
    if (!window.confirm(tx(t, 'fundraising.messages.archiveConfirm', 'Archive this campaign?'))) return;
    try {
      await archiveCampaign.mutateAsync({ communityId, campaignId: campaign.id });
      onArchived();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="fundraising-detail">
      <section className="fundraising-detail-hero">
        <div>
          <p className="amnesty-kicker text-amnesty-pink">{tx(t, 'fundraising.hero.campaign', 'Campaign')}</p>
          <h1>{campaign.title}</h1>
          <p>{campaign.shortDescription}</p>
          <div className="fundraising-byline">
            <span className="avatar-dot">{principalInitial(campaign.creatorName)}</span>
            <span>{tx(t, 'fundraising.common.by', 'By')} {campaign.creatorName}</span>
            <span>{formatDate(Number(campaign.createdNs / 1_000_000n), locale)}</span>
            <span>{campaign.visibility === CampaignVisibility.publicCampaign ? tx(t, 'fundraising.common.publicCampaign', 'Public campaign') : communityName}</span>
          </div>
        </div>
        <div className="fundraising-actions">
          <button type="button" className="btn-secondary rounded-full" onClick={() => setActiveTab('share')}>
            <Share2 size={17} /> {tx(t, 'fundraising.actions.share', 'Share')}
          </button>
          {campaign.canEdit ? (
            <>
              <button type="button" className="btn-secondary rounded-full" onClick={() => setActiveTab('edit')}>
                <Pencil size={17} /> {tx(t, 'fundraising.actions.edit', 'Edit')}
              </button>
              <button type="button" className="btn-danger rounded-full" onClick={archiveCurrentCampaign}>
                <Trash2 size={17} /> {tx(t, 'fundraising.actions.archive', 'Archive')}
              </button>
            </>
          ) : null}
        </div>
      </section>

      {message ? <div className="fundraising-message">{message}</div> : null}

      <div className="fundraising-detail-grid">
        <div>
          <nav className="fundraising-tabs" aria-label={tx(t, 'fundraising.tabs.aria', 'Campaign sections')}>
            {[
              ['overview', tx(t, 'fundraising.tabs.overview', 'Overview')],
              ['updates', `${tx(t, 'fundraising.tabs.updates', 'Updates')} ${campaign.updates.length}`],
              ['donations', `${tx(t, 'fundraising.tabs.donations', 'Donations')} ${campaign.contributions.length}`],
              ['fundraisers', tx(t, 'fundraising.tabs.fundraisers', 'Fundraisers')],
              ['share', tx(t, 'fundraising.tabs.share', 'Share and embed')],
              ...(campaign.canEdit ? [['edit', tx(t, 'fundraising.tabs.edit', 'Edit campaign')]] : []),
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={activeTab === id ? 'active' : ''}
                onClick={() => setActiveTab(id as typeof activeTab)}
              >
                {label}
              </button>
            ))}
          </nav>

          {activeTab === 'overview' ? (
            <article className="fundraising-story-card">
              <div className="fundraising-hero-media">
                {campaign.mediaUrl ? <img src={campaign.mediaUrl} alt="" /> : <Megaphone size={58} />}
              </div>
              <h2>{tx(t, 'fundraising.sections.about', 'About this campaign')}</h2>
              <MarkdownContent className="fundraising-markdown-content" text={campaign.story || campaign.shortDescription} />
              <h2>{tx(t, 'fundraising.sections.funds', 'How funds will be used')}</h2>
              <MarkdownContent className="fundraising-markdown-content" text={campaign.fundsUse} />
              <h2>{tx(t, 'fundraising.sections.impact', 'Impact')}</h2>
              <MarkdownContent className="fundraising-markdown-content" text={campaign.impact} />
            </article>
          ) : null}

          {activeTab === 'updates' ? (
            <section className="fundraising-card-block">
              {campaign.canEdit ? (
                <div className="fundraising-update-box">
                  <textarea value={updateContent} onChange={(event) => setUpdateContent(event.target.value)} placeholder={tx(t, 'fundraising.updates.placeholder', 'Share campaign progress...')} />
                  <button type="button" className="btn-primary rounded-full" disabled={addUpdate.isPending} onClick={postUpdate}>
                    {tx(t, 'fundraising.actions.postUpdate', 'Post update')}
                  </button>
                </div>
              ) : null}
              {campaign.updates.length === 0 ? <p>{tx(t, 'fundraising.updates.empty', 'No updates have been posted yet.')}</p> : null}
              {campaign.updates.map((update) => (
                <article key={update.id.toString()} className="fundraising-timeline-item">
                  <strong>{update.creatorName}</strong>
                  <small>{formatDateTime(Number(update.timestampNs / 1_000_000n), locale)}</small>
                  <p>{update.content}</p>
                </article>
              ))}
            </section>
          ) : null}

          {activeTab === 'donations' ? (
            <section className="fundraising-card-block">
              {campaign.contributions.length === 0 ? <p>{tx(t, 'fundraising.donations.empty', 'No donations have been recorded yet.')}</p> : null}
              {campaign.contributions.map((contribution) => (
                <div key={`${contribution.timestampNs.toString()}-${contribution.amount.toString()}`} className="fundraising-donation-row">
                  <span className="avatar-dot">{principalInitial(contribution.contributorName)}</span>
                  <strong>{contribution.contributorName}</strong>
                  <span>{formatCurrency(contribution.amount, locale, campaign.currency)}</span>
                  <small>{formatDateTime(Number(contribution.timestampNs / 1_000_000n), locale)}</small>
                </div>
              ))}
            </section>
          ) : null}

          {activeTab === 'fundraisers' ? (
            <section className="fundraising-card-block fundraising-empty-mini">
              <Users size={34} />
              <h2>{tx(t, 'fundraising.fundraisers.title', 'Peer fundraisers are not enabled yet')}</h2>
              <p>{tx(t, 'fundraising.fundraisers.body', 'This campaign can be shared now. Dedicated peer fundraiser pages can be added in a later pass.')}</p>
            </section>
          ) : null}

          {activeTab === 'share' ? (
            <section className="fundraising-card-block">
              <h2>{tx(t, 'fundraising.share.title', 'Share this campaign')}</h2>
              <p>{tx(t, 'fundraising.share.body', 'Create a public read-only link or copy the routed community campaign URL.')}</p>
              <div className="fundraising-share-actions">
                <button type="button" className="btn-primary rounded-full" disabled={!campaign.canManagePublicLink || setPublicLink.isPending} onClick={createPublicLink}>
                  <Share2 size={17} /> {campaign.publicToken ? tx(t, 'fundraising.share.copyPublic', 'Copy public link') : tx(t, 'fundraising.share.createPublic', 'Create public link')}
                </button>
                <button type="button" className="btn-secondary rounded-full" disabled={!campaign.publicToken || !campaign.canManagePublicLink} onClick={disablePublicLink}>
                  {tx(t, 'fundraising.share.disablePublic', 'Disable public link')}
                </button>
                <button type="button" className="btn-secondary rounded-full" onClick={() => void copyText(`${window.location.origin}${routePaths.campaign(communityId, campaign.id)}`)}>
                  <Copy size={17} /> {tx(t, 'fundraising.share.copyCommunity', 'Copy community link')}
                </button>
              </div>
              {publicUrl ? (
                <a className="fundraising-public-url" href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} /> {publicUrl}
                </a>
              ) : null}
              <label className="fundraising-field">
                <span>{tx(t, 'fundraising.share.directAccess', 'Grant direct access')}</span>
                <input value={grantMessage} onChange={(event) => setGrantMessage(event.target.value)} placeholder={tx(t, 'fundraising.share.directPlaceholder', 'Direct campaign grants can be added in a later pass.')} disabled />
              </label>
            </section>
          ) : null}

          {activeTab === 'edit' && campaign.canEdit ? (
            <section className="fundraising-card-block">
              <h2>{tx(t, 'fundraising.edit.title', 'Edit campaign')}</h2>
              <EditFields draft={editDraft} onChange={setEditDraft} />
              <button type="button" className="btn-primary rounded-full" disabled={updateCampaign.isPending} onClick={saveEdits}>
                <Save size={17} /> {tx(t, 'fundraising.actions.saveChanges', 'Save changes')}
              </button>
            </section>
          ) : null}
        </div>

        <aside className="fundraising-right-rail">
          <section className="fundraising-progress-card">
            <h2>{formatCurrency(campaign.totalRaised, locale, campaign.currency)}</h2>
            <p>{tx(t, 'fundraising.progress.raisedOf', 'raised of')} {formatCurrency(campaign.goalAmount, locale, campaign.currency)} {tx(t, 'fundraising.progress.goal', 'goal')}</p>
            <div className="fundraising-progress-bar"><span style={{ width: `${progress}%` }} /></div>
            <div className="fundraising-stat-grid">
              <span><strong>{formatNumber(campaign.contributions.length, locale)}</strong>{tx(t, 'fundraising.progress.donations', 'donations')}</span>
              <span><strong>{formatNumber(daysLeft(campaign.deadlineNs), locale)}</strong>{tx(t, 'fundraising.progress.daysLeft', 'days left')}</span>
              <span><strong>{formatCurrency(campaign.goalAmount, locale, campaign.currency)}</strong>{tx(t, 'fundraising.progress.goal', 'goal')}</span>
            </div>
            <div className="fundraising-donate-row">
              <input disabled={!canDonate} type="number" min="1" value={donationAmount} onChange={(event) => setDonationAmount(event.target.value)} />
              <button type="button" className="btn-primary rounded-full" disabled={!canDonate || contribute.isPending} onClick={donate}>
                <HeartHandshake size={17} /> {tx(t, 'fundraising.actions.donateNow', 'Donate now')}
              </button>
            </div>
            {!canDonate ? <small>{tx(t, 'fundraising.progress.signInMessage', 'Sign in with community access to donate.')}</small> : null}
          </section>

          <section className="fundraising-card-block">
            <div className="fundraising-section-head">
              <h2>{tx(t, 'fundraising.donations.recent', 'Recent donations')}</h2>
              <button type="button" onClick={() => setActiveTab('donations')}>{tx(t, 'fundraising.actions.viewAll', 'View all')}</button>
            </div>
            {campaign.contributions.slice(0, 5).map((contribution) => (
              <div key={`${contribution.timestampNs.toString()}-${contribution.contributorName}`} className="fundraising-mini-donation">
                <span className="avatar-dot">{principalInitial(contribution.contributorName)}</span>
                <strong>{contribution.contributorName}</strong>
                <span>{formatCurrency(contribution.amount, locale, campaign.currency)}</span>
              </div>
            ))}
            {campaign.contributions.length === 0 ? <p className="fundraising-muted">{tx(t, 'fundraising.donations.noneRecent', 'No donations yet.')}</p> : null}
          </section>

          <section className="fundraising-card-block">
            <h2>{tx(t, 'fundraising.creator.title', 'Campaign created by')}</h2>
            <div className="fundraising-creator-row">
              <span className="avatar-dot large">{principalInitial(campaign.creatorName)}</span>
              <div>
                <strong>{campaign.creatorName}</strong>
                <small>{formatDate(deadlineMs, locale)}</small>
              </div>
              {campaign.creatorContact ? (
                <a className="btn-secondary rounded-full" href={`mailto:${campaign.creatorContact}`}>
                  <Mail size={16} /> {tx(t, 'fundraising.creator.contact', 'Contact creator')}
                </a>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function EditFields({ draft, onChange }: { draft: FundraisingDraft; onChange: (draft: FundraisingDraft) => void }) {
  function update<K extends keyof FundraisingDraft>(key: K, value: FundraisingDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="fundraising-edit-grid">
      <Field label="Campaign title" required>
        <input value={draft.title} onChange={(event) => update('title', event.target.value)} />
      </Field>
      <Field label="Short description" required>
        <textarea rows={2} value={draft.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} />
      </Field>
      <Field label="Story" required>
        <textarea rows={7} value={draft.story} onChange={(event) => update('story', event.target.value)} />
      </Field>
      <Field label="Funds use" required>
        <textarea rows={4} value={draft.fundsUse} onChange={(event) => update('fundsUse', event.target.value)} />
      </Field>
      <Field label="Impact" required>
        <textarea rows={4} value={draft.impact} onChange={(event) => update('impact', event.target.value)} />
      </Field>
      <Field label="Media URL">
        <input value={draft.mediaUrl} onChange={(event) => update('mediaUrl', event.target.value)} />
      </Field>
      <Field label="Goal" required>
        <input type="number" min="1" value={draft.goalAmount} onChange={(event) => update('goalAmount', event.target.value)} />
      </Field>
      <Field label="Currency" required>
        <select value={draft.currency} onChange={(event) => update('currency', event.target.value)}>
          {SUPPORTED_FUNDRAISING_CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code} · {currency.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Deadline" required>
        <input type="datetime-local" value={draft.deadlineLocal} onChange={(event) => update('deadlineLocal', event.target.value)} />
      </Field>
      <Field label="Creator name" required>
        <input value={draft.creatorName} onChange={(event) => update('creatorName', event.target.value)} />
      </Field>
      <Field label="Creator contact">
        <input value={draft.creatorContact} onChange={(event) => update('creatorContact', event.target.value)} />
      </Field>
      <label className="fundraising-checkbox">
        <input
          checked={draft.visibility === CampaignVisibility.publicCampaign}
          type="checkbox"
          onChange={(event) => update('visibility', event.target.checked ? CampaignVisibility.publicCampaign : CampaignVisibility.community)}
        />
        Public campaign
      </label>
    </div>
  );
}
