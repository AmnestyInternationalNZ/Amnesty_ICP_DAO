import { useState } from 'react';
import { ExternalLink, Globe2, HeartHandshake, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CampaignVisibility } from '../../backend';
import { daysLeft, progressPercent } from '../../fundraising/fundraisingApi';
import { formatCurrency, formatDate, formatNumber } from '../../i18n/format';
import { useLocalePreference } from '../../i18n/preferences';
import { useContributeToPublicCampaign, useGetPublicCampaign } from '../../hooks/useQueries';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import AmnestyLogo from '../AmnestyLogo';
import LoginButton from '../LoginButton';
import LoadingSpinner from '../LoadingSpinner';
import MarkdownContent from '../MarkdownContent';

function tx(t: ReturnType<typeof useTranslation>['t'], key: string, defaultValue: string) {
  return t(key, { defaultValue });
}

function initial(label: string) {
  return (label.trim()[0] || 'A').toUpperCase();
}

export default function PublicCampaignPage({ token }: { token: string }) {
  const { t } = useTranslation();
  const { locale } = useLocalePreference();
  const { identity } = useInternetIdentity();
  const { data: campaign, isLoading, error, refetch } = useGetPublicCampaign(token);
  const contribute = useContributeToPublicCampaign();
  const [donationAmount, setDonationAmount] = useState('25');
  const [donationMessage, setDonationMessage] = useState<string | null>(null);
  const [donationError, setDonationError] = useState<string | null>(null);

  const donate = async () => {
    setDonationMessage(null);
    setDonationError(null);
    const parsed = Number(donationAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDonationError(tx(t, 'fundraising.public.invalidDonation', 'Enter a donation amount greater than zero.'));
      return;
    }

    try {
      // TODO(stripe): replace this signed-in canister-ledger bridge with Stripe
      // guest checkout. The backend should then record only Stripe-confirmed
      // donations as external/payment-backed contributions from checkout/webhook data.
      await contribute.mutateAsync({ token, amount: BigInt(Math.floor(parsed)) });
      setDonationMessage(tx(t, 'fundraising.public.donationSuccess', 'Thank you. Your donation has been recorded.'));
      await refetch();
    } catch (err: any) {
      setDonationError(err?.message ?? tx(t, 'fundraising.public.donationFailed', 'Donation failed. Please try again.'));
    }
  };

  return (
    <>
      <header className="public-fundraising-header">
        <a href="/" aria-label={tx(t, 'fundraising.public.home', 'Back to Amnesty DAO home')}>
          <AmnestyLogo className="max-w-[10rem]" imageClassName="w-full" />
        </a>
        <div>
          <span><Globe2 size={16} /> {tx(t, 'fundraising.public.campaign', 'Public campaign')}</span>
          <strong>{tx(t, 'fundraising.public.noSignIn', 'No sign-in needed to view')}</strong>
        </div>
      </header>

      <main className="public-fundraising-page">
        {isLoading ? (
          <section className="fundraising-empty">
            <LoadingSpinner size="large" />
            <h1>{tx(t, 'fundraising.public.openingTitle', 'Opening campaign')}</h1>
          </section>
        ) : error || !campaign ? (
          <section className="fundraising-empty">
            <p className="amnesty-kicker text-amnesty-pink">{tx(t, 'fundraising.public.unavailableKicker', 'Campaign unavailable')}</p>
            <h1>{tx(t, 'fundraising.public.unavailableTitle', 'This campaign link is not available')}</h1>
            <p>{tx(t, 'fundraising.public.unavailableBody', 'The campaign may have been archived, revoked, or moved back to community-only visibility.')}</p>
          </section>
        ) : (
          <div className="public-fundraising-grid">
            <article className="public-fundraising-story">
              <p className="amnesty-kicker text-amnesty-pink">{tx(t, 'fundraising.hero.campaign', 'Campaign')}</p>
              <h1>{campaign.title}</h1>
              <p className="lead">{campaign.shortDescription}</p>
              <div className="fundraising-byline">
                <span className="avatar-dot">{initial(campaign.creatorName)}</span>
                <span>{campaign.creatorName}</span>
                <span>{formatDate(Number(campaign.createdNs / 1_000_000n), locale)}</span>
                <span>{campaign.visibility === CampaignVisibility.publicCampaign ? tx(t, 'fundraising.common.publicCampaign', 'Public campaign') : ''}</span>
              </div>
              <div className="fundraising-hero-media">
                {campaign.mediaUrl ? <img src={campaign.mediaUrl} alt="" /> : <ShieldCheck size={54} />}
              </div>
              <h2>{tx(t, 'fundraising.sections.about', 'About this campaign')}</h2>
              <MarkdownContent className="fundraising-markdown-content" text={campaign.story || campaign.shortDescription} />
              <h2>{tx(t, 'fundraising.sections.funds', 'How funds will be used')}</h2>
              <MarkdownContent className="fundraising-markdown-content" text={campaign.fundsUse} />
              <h2>{tx(t, 'fundraising.sections.impact', 'Impact')}</h2>
              <MarkdownContent className="fundraising-markdown-content" text={campaign.impact} />
            </article>

            <aside className="public-fundraising-rail">
              <section className="fundraising-progress-card">
                <h2>{formatCurrency(campaign.totalRaised, locale)}</h2>
                <p>{tx(t, 'fundraising.progress.raisedOf', 'raised of')} {formatCurrency(campaign.goalAmount, locale)} {tx(t, 'fundraising.progress.goal', 'goal')}</p>
                <div className="fundraising-progress-bar"><span style={{ width: `${progressPercent(campaign)}%` }} /></div>
                <div className="fundraising-stat-grid">
                  <span><strong>{formatNumber(campaign.contributions.length, locale)}</strong>{tx(t, 'fundraising.progress.donations', 'donations')}</span>
                  <span><strong>{formatNumber(daysLeft(campaign.deadlineNs), locale)}</strong>{tx(t, 'fundraising.progress.daysLeft', 'days left')}</span>
                  <span><strong>{formatCurrency(campaign.goalAmount, locale)}</strong>{tx(t, 'fundraising.progress.goal', 'goal')}</span>
                </div>
                {identity ? (
                  <div className="fundraising-donate-row">
                    <input
                      aria-label={tx(t, 'fundraising.public.amountLabel', 'Donation amount')}
                      min="1"
                      type="number"
                      value={donationAmount}
                      onChange={(event) => setDonationAmount(event.target.value)}
                    />
                    <button type="button" className="btn-primary rounded-full" disabled={contribute.isPending} onClick={donate}>
                      <HeartHandshake size={17} /> {tx(t, 'fundraising.actions.donateNow', 'Donate now')}
                    </button>
                  </div>
                ) : (
                  <LoginButton compact className="rounded-full" />
                )}
                {donationMessage ? <p className="fundraising-message">{donationMessage}</p> : null}
                {donationError ? <p className="fundraising-message error">{donationError}</p> : null}
                <small>
                  {identity
                    ? tx(t, 'fundraising.public.donationNoteAuthed', 'Public supporters do not need community access. This temporary canister path uses Internet Identity until Stripe guest checkout is integrated.')
                    : tx(t, 'fundraising.public.donationNote', 'Public supporters can donate without community access. Sign in for this temporary canister flow; Stripe guest checkout will remove this requirement later.')}
                </small>
              </section>

              <section className="fundraising-card-block">
                <h2>{tx(t, 'fundraising.donations.recent', 'Recent donations')}</h2>
                {campaign.contributions.slice(0, 5).map((contribution) => (
                  <div key={`${contribution.timestampNs.toString()}-${contribution.amount.toString()}`} className="fundraising-mini-donation">
                    <span className="avatar-dot">{initial(contribution.contributorName)}</span>
                    <strong>{contribution.contributorName}</strong>
                    <span>{formatCurrency(contribution.amount, locale)}</span>
                  </div>
                ))}
                {campaign.contributions.length === 0 ? <p className="fundraising-muted">{tx(t, 'fundraising.donations.noneRecent', 'No donations yet.')}</p> : null}
              </section>

              <section className="fundraising-card-block">
                <h2>{tx(t, 'fundraising.public.privacyTitle', 'Privacy-safe public view')}</h2>
                <p>{tx(t, 'fundraising.public.privacyBody', 'This page hides direct grants, raw contributor principals, and owner-only public tokens.')}</p>
                <a href="/" className="fundraising-public-url"><ExternalLink size={16} /> {tx(t, 'fundraising.public.joinDao', 'Open Amnesty DAO')}</a>
              </section>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
