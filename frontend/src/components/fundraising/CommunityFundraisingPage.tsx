import { Copy, ExternalLink, HeartHandshake, Image as ImageIcon, Mail, Megaphone, Pencil, Plus, Save, Share2, Trash2, Users } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CampaignState, CampaignVisibility, type FundraisingCampaignPayload } from '../../backend';
import {
  createCampaignShareToken,
  createEmptyFundraisingDraft,
  daysLeft,
  draftFromCampaign,
  inputFromDraft,
  progressPercent,
  publicCampaignUrl,
  validateDraftStep,
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
  useCreateFundraisingCampaign,
  useGetCommunityAccess,
  useGetCommunityById,
  useGetFundraisingCampaign,
  useListFundraisingCampaigns,
  useSetCampaignPublicLink,
  useUpdateFundraisingCampaign,
} from '../../hooks/useQueries';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import MarkdownContent from '../MarkdownContent';
import LoadingSpinner from '../LoadingSpinner';

interface CommunityFundraisingPageProps {
  communityId: bigint;
  initialCampaignId?: bigint;
  initialCreate?: boolean;
  onCreateCampaignRoute?: () => void;
  onOpenCampaignRoute?: (campaignId: bigint) => void;
}

const steps = [
  { label: 'Campaign details', body: 'Name, purpose and story' },
  { label: 'Goal and timeline', body: 'Set your target and duration' },
  { label: 'Funds and impact', body: 'How funds will be used' },
  { label: 'Media', body: 'Add images and videos' },
  { label: 'About you', body: 'Your details and campaign info' },
  { label: 'Review', body: 'Check and launch' },
];

function draftStorageKey(communityId: bigint, principal: string | null) {
  return `amnesty.fundraisingDraft.${principal ?? 'anonymous'}.${communityId.toString()}`;
}

function readDraft(communityId: bigint, principal: string | null, creatorName: string): FundraisingDraft {
  const fallback = createEmptyFundraisingDraft(creatorName);
  try {
    const value = window.localStorage.getItem(draftStorageKey(communityId, principal));
    return value ? { ...fallback, ...JSON.parse(value) } : fallback;
  } catch {
    return fallback;
  }
}

function writeDraft(communityId: bigint, principal: string | null, draft: FundraisingDraft) {
  window.localStorage.setItem(draftStorageKey(communityId, principal), JSON.stringify(draft));
}

function clearDraft(communityId: bigint, principal: string | null) {
  window.localStorage.removeItem(draftStorageKey(communityId, principal));
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
  const { identity } = useInternetIdentity();
  const currentPrincipal = identity?.getPrincipal().toText() ?? null;
  const profileName = '';
  const [mode, setMode] = useState<'campaign' | 'create'>(initialCreate ? 'create' : 'campaign');
  const [selectedCampaignId, setSelectedCampaignId] = useState<bigint | null>(initialCampaignId ?? null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<FundraisingDraft>(() => readDraft(communityId, currentPrincipal, profileName));

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
      setMode('campaign');
      setSelectedCampaignId(initialCampaignId);
    }
  }, [initialCampaignId]);

  useEffect(() => {
    if (initialCreate) setMode('create');
  }, [initialCreate]);

  useEffect(() => {
    if (mode === 'create' || selectedCampaignId !== null || campaigns.length === 0) return;
    setSelectedCampaignId(campaigns[0].id);
    onOpenCampaignRoute?.(campaigns[0].id);
  }, [campaigns, mode, onOpenCampaignRoute, selectedCampaignId]);

  useEffect(() => {
    if (mode !== 'create') return;
    writeDraft(communityId, currentPrincipal, draft);
  }, [communityId, currentPrincipal, draft, mode]);

  function openCampaign(campaignId: bigint) {
    setMode('campaign');
    setSelectedCampaignId(campaignId);
    onOpenCampaignRoute?.(campaignId);
  }

  function openCreate() {
    setMode('create');
    setSelectedCampaignId(null);
    onCreateCampaignRoute?.();
  }

  const canCreateCampaign = Boolean(access.data?.canCreateCampaign);
  const selectedCampaign = campaignQuery.data ?? campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;

  return (
    <section className="fundraising-shell">
      <aside className="fundraising-sidebar" aria-label={tx(t, 'fundraising.sidebar.aria', 'Campaign navigation')}>
        <div className="fundraising-sidebar-header">
          <p className="amnesty-kicker">{tx(t, 'fundraising.sidebar.myCampaigns', 'My campaigns')}</p>
          <button
            type="button"
            className="btn-primary rounded-full"
            disabled={!canCreateCampaign}
            onClick={openCreate}
            title={!canCreateCampaign ? tx(t, 'fundraising.sidebar.createLocked', 'Only community members can create campaigns.') : undefined}
          >
            <Plus size={18} />
            {tx(t, 'fundraising.actions.new', 'New campaign')}
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
                className={`fundraising-list-card ${selectedCampaignId === campaign.id && mode === 'campaign' ? 'active' : ''}`}
                onClick={() => openCampaign(campaign.id)}
              >
                <span>{campaign.title}</span>
                <small>
                  {formatCurrency(campaign.totalRaised)} {tx(t, 'fundraising.sidebar.raised', 'raised')} · {formatNumber(progressPercent(campaign))}%
                </small>
              </button>
            ))
          )}
        </div>

        <div className="fundraising-sidebar-foot">
          <p>{tx(t, 'fundraising.footerLine', 'People power change. Your campaign can too.')}</p>
        </div>
      </aside>

      <main className="fundraising-main">
        {community.isLoading || access.isLoading ? (
          <div className="fundraising-empty">
            <LoadingSpinner size="large" />
          </div>
        ) : mode === 'create' ? (
          <CampaignWizard
            canCreate={canCreateCampaign}
            communityId={communityId}
            communityName={community.data?.name ?? tx(t, 'fundraising.common.community', 'Community')}
            currentPrincipal={currentPrincipal}
            draft={draft}
            onCancel={() => {
              setMode('campaign');
              if (campaigns[0]) openCampaign(campaigns[0].id);
            }}
            onDraftChange={setDraft}
            onLaunch={(campaignId) => {
              clearDraft(communityId, currentPrincipal);
              setDraft(createEmptyFundraisingDraft(profileName));
              openCampaign(campaignId);
            }}
          />
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
            <h1>{tx(t, 'fundraising.empty.title', 'Create a fundraising campaign')}</h1>
            <p>{tx(t, 'fundraising.empty.body', 'Tell your story, set a goal, and invite your community to support the change you want to see.')}</p>
            <button type="button" className="btn-primary rounded-full" disabled={!canCreateCampaign} onClick={openCreate}>
              <Plus size={18} />
              {tx(t, 'fundraising.actions.createFirst', 'Create first campaign')}
            </button>
          </div>
        )}
      </main>
    </section>
  );
}

function CampaignWizard({
  canCreate,
  communityId,
  communityName,
  currentPrincipal,
  draft,
  onCancel,
  onDraftChange,
  onLaunch,
}: {
  canCreate: boolean;
  communityId: bigint;
  communityName: string;
  currentPrincipal: string | null;
  draft: FundraisingDraft;
  onCancel: () => void;
  onDraftChange: (draft: FundraisingDraft) => void;
  onLaunch: (campaignId: bigint) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const createCampaign = useCreateFundraisingCampaign();

  function update<K extends keyof FundraisingDraft>(key: K, value: FundraisingDraft[K]) {
    setMessage(null);
    onDraftChange({ ...draft, [key]: value });
  }

  function nextStep() {
    const error = validateDraftStep(draft, step);
    if (error) {
      setMessage(error);
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function launchCampaign() {
    const error = validateFullDraft(draft);
    if (error) {
      setMessage(error);
      return;
    }
    try {
      const campaignId = await createCampaign.mutateAsync({ communityId, input: inputFromDraft(draft) });
      onLaunch(campaignId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="fundraising-wizard">
      <div className="fundraising-wizard-steps">
        <p className="amnesty-kicker">{tx(t, 'fundraising.wizard.newCampaign', 'New campaign')}</p>
        {steps.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className={`fundraising-step ${index === step ? 'active' : ''} ${index < step ? 'complete' : ''}`}
            onClick={() => setStep(index)}
          >
            <span>{index + 1}</span>
            <strong>{item.label}</strong>
            <small>{item.body}</small>
          </button>
        ))}
        <button
          type="button"
          className="btn-secondary rounded-full"
          onClick={() => {
            writeDraft(communityId, currentPrincipal, draft);
            onCancel();
          }}
        >
          {tx(t, 'fundraising.actions.saveDraftExit', 'Save draft and exit')}
        </button>
        <small>{tx(t, 'fundraising.wizard.autosave', 'Drafts are saved automatically.')}</small>
      </div>

      <div className="fundraising-wizard-content">
        <div className="fundraising-page-heading">
          <p className="amnesty-kicker text-amnesty-pink">{tx(t, 'fundraising.hero.kicker', 'Fundraise')}</p>
          <h1>{tx(t, 'fundraising.wizard.title', 'Create a fundraising campaign')}</h1>
          <p>{tx(t, 'fundraising.wizard.body', 'Tell your story, set a goal, and invite your community to support the change you want to see.')}</p>
        </div>

        {message ? <div className="fundraising-message error">{message}</div> : null}
        {!canCreate ? (
          <div className="fundraising-message error">{tx(t, 'fundraising.wizard.locked', 'You need a community role before creating campaigns.')}</div>
        ) : null}

        <div className="fundraising-wizard-grid">
          <section className="fundraising-form-card">
            {step === 0 ? (
              <>
                <h2>{tx(t, 'fundraising.steps.detailsTitle', 'Campaign details')}</h2>
                <Field label={tx(t, 'fundraising.fields.title', 'Campaign title')} required>
                  <input value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Protect education in Myanmar" />
                </Field>
                <Field label={tx(t, 'fundraising.fields.shortDescription', 'Short description')} required hint={`${draft.shortDescription.length} / 120`}>
                  <textarea rows={2} maxLength={120} value={draft.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} placeholder="One sentence that explains your campaign." />
                </Field>
                <Field label={tx(t, 'fundraising.fields.story', 'Story')} required>
                  <MarkdownToolbar />
                  <textarea rows={8} value={draft.story} onChange={(event) => update('story', event.target.value)} placeholder="Write your story here..." />
                </Field>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h2>{tx(t, 'fundraising.steps.goalTitle', 'Goal and timeline')}</h2>
                <Field label={tx(t, 'fundraising.fields.goal', 'Fundraising goal')} required>
                  <input min="1" type="number" value={draft.goalAmount} onChange={(event) => update('goalAmount', event.target.value)} />
                </Field>
                <Field label={tx(t, 'fundraising.fields.deadline', 'Campaign deadline')} required>
                  <input type="datetime-local" value={draft.deadlineLocal} onChange={(event) => update('deadlineLocal', event.target.value)} />
                </Field>
                <label className="fundraising-checkbox">
                  <input
                    checked={draft.visibility === CampaignVisibility.publicCampaign}
                    type="checkbox"
                    onChange={(event) => update('visibility', event.target.checked ? CampaignVisibility.publicCampaign : CampaignVisibility.community)}
                  />
                  {tx(t, 'fundraising.fields.publicCampaign', 'Launch as a public campaign')}
                </label>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h2>{tx(t, 'fundraising.steps.impactTitle', 'Funds and impact')}</h2>
                <Field label={tx(t, 'fundraising.fields.fundsUse', 'How funds will be used')} required>
                  <textarea rows={5} value={draft.fundsUse} onChange={(event) => update('fundsUse', event.target.value)} />
                </Field>
                <Field label={tx(t, 'fundraising.fields.impact', 'Expected impact')} required>
                  <textarea rows={5} value={draft.impact} onChange={(event) => update('impact', event.target.value)} />
                </Field>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h2>{tx(t, 'fundraising.steps.mediaTitle', 'Media')}</h2>
                <Field label={tx(t, 'fundraising.fields.mediaUrl', 'Hero media URL')}>
                  <input value={draft.mediaUrl} onChange={(event) => update('mediaUrl', event.target.value)} placeholder="https://example.org/photo.jpg" />
                </Field>
                <div className="fundraising-media-drop">
                  <ImageIcon size={34} />
                  <span>{tx(t, 'fundraising.steps.mediaHint', 'Use a direct image or video URL for this pass.')}</span>
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <h2>{tx(t, 'fundraising.steps.creatorTitle', 'About you')}</h2>
                <Field label={tx(t, 'fundraising.fields.creatorName', 'Creator display name')} required>
                  <input value={draft.creatorName} onChange={(event) => update('creatorName', event.target.value)} placeholder="Campaign team" />
                </Field>
                <Field label={tx(t, 'fundraising.fields.creatorContact', 'Creator contact')}>
                  <input value={draft.creatorContact} onChange={(event) => update('creatorContact', event.target.value)} placeholder="email@example.org" />
                </Field>
              </>
            ) : null}

            {step === 5 ? (
              <>
                <h2>{tx(t, 'fundraising.steps.reviewTitle', 'Review and launch')}</h2>
                <ReviewList draft={draft} communityName={communityName} />
              </>
            ) : null}

            <footer className="fundraising-form-actions">
              <button type="button" className="btn-secondary rounded-full" onClick={step === 0 ? onCancel : () => setStep((current) => current - 1)}>
                {step === 0 ? tx(t, 'common.actions.cancel', 'Cancel') : tx(t, 'common.actions.back', 'Back')}
              </button>
              {step < steps.length - 1 ? (
                <button type="button" className="btn-primary rounded-full" onClick={nextStep}>
                  {tx(t, 'fundraising.actions.saveContinue', 'Save and continue')}
                </button>
              ) : (
                <button type="button" className="btn-primary rounded-full" disabled={createCampaign.isPending || !canCreate} onClick={launchCampaign}>
                  <Save size={17} />
                  {createCampaign.isPending ? tx(t, 'fundraising.actions.launching', 'Launching...') : tx(t, 'fundraising.actions.launch', 'Launch campaign')}
                </button>
              )}
            </footer>
          </section>

          <CampaignPreview draft={draft} />
        </div>
      </div>
    </div>
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

function MarkdownToolbar() {
  return (
    <div className="fundraising-markdown-toolbar" aria-hidden="true">
      <button type="button">Paragraph</button>
      <button type="button">B</button>
      <button type="button"><em>I</em></button>
      <button type="button">Link</button>
      <button type="button">List</button>
      <button type="button">Quote</button>
    </div>
  );
}

function CampaignPreview({ draft }: { draft: FundraisingDraft }) {
  const { t } = useTranslation();
  const { locale } = useLocalePreference();
  const goal = BigInt(Math.max(0, Math.floor(Number(draft.goalAmount) || 0)));
  return (
    <aside className="fundraising-preview">
      <p className="amnesty-kicker">{tx(t, 'fundraising.preview.kicker', 'Campaign preview')}</p>
      <div className="fundraising-preview-media">
        {draft.mediaUrl ? <img src={draft.mediaUrl} alt="" /> : <ImageIcon size={32} />}
      </div>
      <h3>{draft.title || tx(t, 'fundraising.preview.title', 'Your campaign title')}</h3>
      <p>{draft.shortDescription || tx(t, 'fundraising.preview.body', 'Short description of your campaign will appear here.')}</p>
      <div className="fundraising-progress-bar">
        <span style={{ width: '0%' }} />
      </div>
      <div className="fundraising-preview-stats">
        <span>{formatCurrency(0, locale)} {tx(t, 'fundraising.preview.raised', 'raised')}</span>
        <span>{formatCurrency(goal, locale)} {tx(t, 'fundraising.preview.goal', 'goal')}</span>
      </div>
      <button type="button" className="btn-primary rounded-full">{tx(t, 'fundraising.actions.donate', 'Donate')}</button>
      <small>{tx(t, 'fundraising.preview.createdBy', 'Campaign created by')} {draft.creatorName || tx(t, 'fundraising.common.you', 'You')}</small>
    </aside>
  );
}

function ReviewList({ communityName, draft }: { communityName: string; draft: FundraisingDraft }) {
  const { locale } = useLocalePreference();
  return (
    <div className="fundraising-review-list">
      <div><span>Community</span><strong>{communityName}</strong></div>
      <div><span>Title</span><strong>{draft.title}</strong></div>
      <div><span>Goal</span><strong>{formatCurrency(BigInt(Math.floor(Number(draft.goalAmount) || 0)), locale)}</strong></div>
      <div><span>Deadline</span><strong>{formatDate(new Date(draft.deadlineLocal), locale)}</strong></div>
      <div><span>Visibility</span><strong>{draft.visibility === CampaignVisibility.publicCampaign ? 'Public' : 'Community'}</strong></div>
    </div>
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
                  <span>{formatCurrency(contribution.amount, locale)}</span>
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
            <h2>{formatCurrency(campaign.totalRaised, locale)}</h2>
            <p>{tx(t, 'fundraising.progress.raisedOf', 'raised of')} {formatCurrency(campaign.goalAmount, locale)} {tx(t, 'fundraising.progress.goal', 'goal')}</p>
            <div className="fundraising-progress-bar"><span style={{ width: `${progress}%` }} /></div>
            <div className="fundraising-stat-grid">
              <span><strong>{formatNumber(campaign.contributions.length, locale)}</strong>{tx(t, 'fundraising.progress.donations', 'donations')}</span>
              <span><strong>{formatNumber(daysLeft(campaign.deadlineNs), locale)}</strong>{tx(t, 'fundraising.progress.daysLeft', 'days left')}</span>
              <span><strong>{formatCurrency(campaign.goalAmount, locale)}</strong>{tx(t, 'fundraising.progress.goal', 'goal')}</span>
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
                <span>{formatCurrency(contribution.amount, locale)}</span>
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
