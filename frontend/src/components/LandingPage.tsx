import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Columns3,
  Globe2,
  Heart,
  Languages,
  LockKeyhole,
  Megaphone,
  ShieldCheck,
  Users,
} from 'lucide-react';
import AmnestyLogo from './AmnestyLogo';
import LanguageSwitcher from './LanguageSwitcher';
import SiteFooter from './SiteFooter';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import heroCouncil from '../assets/landing/amnesty_1.webp';
import heroMarch from '../assets/landing/amnesty_2.webp';
import heroMegaphone from '../assets/landing/amnesty_3.webp';
import heroDignity from '../assets/landing/amnesty_4.webp';
import heroWorkspace from '../assets/landing/amnesty_5.webp';
import networkMap from '../assets/landing/map.webp';

const platformCards = [
  {
    icon: ClipboardList,
    tone: 'yellow',
    titleKey: 'documentsTitle',
    bodyKey: 'documentsBody',
  },
  {
    icon: Columns3,
    tone: 'green',
    titleKey: 'boardsTitle',
    bodyKey: 'boardsBody',
  },
  {
    icon: CalendarDays,
    tone: 'purple',
    titleKey: 'calendarsTitle',
    bodyKey: 'calendarsBody',
  },
  {
    icon: Users,
    tone: 'orange',
    titleKey: 'proposalsTitle',
    bodyKey: 'proposalsBody',
  },
  {
    icon: Heart,
    tone: 'pink',
    titleKey: 'fundraisingTitle',
    bodyKey: 'fundraisingBody',
  },
  {
    icon: Globe2,
    tone: 'blue',
    titleKey: 'languageTitle',
    bodyKey: 'languageBody',
  },
];

const languages = [
  ['englishName', 'englishLabel', '🇬🇧'],
  ['arabicName', 'arabicLabel', '🇸🇦'],
  ['frenchName', 'frenchLabel', '🇫🇷'],
  ['russianName', 'russianLabel', '🇷🇺'],
  ['chineseName', 'chineseLabel', '🇨🇳'],
  ['burmeseName', 'burmeseLabel', '🇲🇲'],
  ['persianName', 'persianLabel', '🇮🇷'],
  ['swahiliName', 'swahiliLabel', '🇹🇿'],
  ['amharicName', 'amharicLabel', '🇪🇹'],
  ['koreanName', 'koreanLabel', '🇰🇷'],
];

const faqs = [
  'what',
  'who',
  'decisions',
  'affiliation',
  'data',
  'funded',
  'different',
  'started',
];

function LandingAuthButton({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { login, loginStatus } = useInternetIdentity();
  const disabled = loginStatus === 'logging-in';
  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Unable to start Internet Identity login', error);
    }
  };

  return (
    <button className={className} disabled={disabled} onClick={() => void handleLogin()} type="button">
      {disabled ? t('app.landing.redesign.actions.openingSignIn') : children}
    </button>
  );
}

function HeroCollage() {
  const { t } = useTranslation();

  return (
    <div className="landing-hero-collage" aria-label={t('app.landing.redesign.hero.collageLabel')}>
      <img className="collage-card collage-council" src={heroCouncil} alt={t('app.landing.redesign.hero.altCouncil')} />
      <div className="collage-callout">
        <Globe2 size={28} />
        <strong>{t('app.landing.redesign.hero.calloutTitle')}</strong>
        <span>{t('app.landing.redesign.hero.calloutBody')}</span>
      </div>
      <img className="collage-card collage-march" src={heroMarch} alt={t('app.landing.redesign.hero.altMarch')} />
      <img className="collage-card collage-megaphone" src={heroMegaphone} alt={t('app.landing.redesign.hero.altMegaphone')} />
      <img className="collage-card collage-dignity" src={heroDignity} alt={t('app.landing.redesign.hero.altDignity')} />
      <img className="collage-card collage-workspace" src={heroWorkspace} alt={t('app.landing.redesign.hero.altWorkspace')} />
    </div>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="landing-page">
      <header className="sticky top-0 z-40 border-b border-amnesty-line bg-white shadow-[0_10px_30px_rgba(4,31,45,0.05)]">
        <div className="flex flex-col lg:min-h-[5.5rem] lg:flex-row lg:items-stretch">
          <a
            className="flex shrink-0 items-center bg-amnesty-yellow px-7 py-5 text-left transition hover:brightness-95 lg:w-[13.125rem]"
            href="#mission"
            aria-label={t('app.landing.redesign.header.homeLabel')}
          >
            <AmnestyLogo className="w-full max-w-[9.5rem]" imageClassName="w-full" />
          </a>

          <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-3 xl:gap-x-8" aria-label={t('app.landing.redesign.header.navLabel')}>
              <a className="rounded-full bg-amnesty-yellow px-4 py-2 text-base uppercase tracking-[0.04em] text-amnesty-ink transition amnesty-heading" href="#mission">
                {t('app.landing.redesign.header.mission')}
              </a>
              <a className="rounded-full px-4 py-2 text-base uppercase tracking-[0.04em] text-amnesty-ink transition hover:bg-[#f3f3ed] amnesty-heading" href="#platform">
                {t('app.landing.redesign.header.platform')}
              </a>
              <a className="rounded-full px-4 py-2 text-base uppercase tracking-[0.04em] text-amnesty-ink transition hover:bg-[#f3f3ed] amnesty-heading" href="#faq">
                {t('app.landing.redesign.header.faq')}
              </a>
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              <LanguageSwitcher compact />
              <LandingAuthButton className="inline-flex w-fit items-center justify-center rounded-[0.9rem] bg-amnesty-yellow px-6 py-3 text-base text-amnesty-ink transition hover:brightness-95 amnesty-heading">
                {t('app.landing.redesign.actions.joinDao')}
              </LandingAuthButton>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="mission" className="landing-hero">
          <div className="landing-hero-copy">
            <h1>
              {t('app.landing.redesign.hero.titleLine1')}
              <span>{t('app.landing.redesign.hero.titleLine2')}</span>
            </h1>
            <p className="landing-lede">
              {t('app.landing.redesign.hero.body')}
            </p>
            <div className="landing-proof-list">
              <span><Globe2 size={20} /> {t('app.landing.redesign.hero.proofRemote')}</span>
              <span><ShieldCheck size={20} /> {t('app.landing.redesign.hero.proofPresence')}</span>
              <span><LockKeyhole size={20} /> {t('app.landing.redesign.hero.proofResist')}</span>
            </div>
            <div className="landing-hero-actions">
              <LandingAuthButton className="landing-primary-cta">
                {t('app.landing.redesign.actions.joinMovement')} <ArrowRight size={18} />
              </LandingAuthButton>
              <a className="landing-secondary-cta" href="#platform">{t('app.landing.redesign.actions.explorePlatform')}</a>
            </div>
            <p className="landing-strapline">{t('app.landing.redesign.hero.strapline')}</p>
          </div>
          <HeroCollage />
        </section>

        {/* Landing summary strip intentionally hidden: it repeated the platform cards below. */}

        <section id="platform" className="landing-section">
          <p className="landing-kicker">{t('app.landing.redesign.platform.kicker')}</p>
          <h2>{t('app.landing.redesign.platform.title')}</h2>
          <div className="landing-platform-grid">
            {platformCards.map(({ icon: Icon, tone, titleKey, bodyKey }) => (
              <article className="landing-platform-card" key={titleKey}>
                <div className={`landing-tool-icon ${tone}`}><Icon size={28} /></div>
                <h3>{t(`app.landing.redesign.platform.cards.${titleKey}`)}</h3>
                <p>{t(`app.landing.redesign.platform.cards.${bodyKey}`)}</p>
              </article>
            ))}
          </div>
          <p className="landing-centered-note">{t('app.landing.redesign.platform.note')}</p>
        </section>

        <section className="landing-split">
          <article id="languages" className="landing-info-card">
            <p className="landing-kicker green">{t('app.landing.redesign.languages.kicker')}</p>
            <h2>{t('app.landing.redesign.languages.title')}</h2>
            <p>{t('app.landing.redesign.languages.body')}</p>
            <div className="landing-language-grid">
              {languages.map(([nameKey, labelKey, flag]) => (
                <div className="landing-language-pill" key={nameKey}>
                  <span className="language-flag" aria-hidden="true">{flag}</span>
                  <strong>{t(`app.landing.redesign.languages.${nameKey}`)}</strong>
                  {labelKey ? <small>{t(`app.landing.redesign.languages.${labelKey}`)}</small> : null}
                </div>
              ))}
            </div>
          </article>

          <article id="on-chain" className="landing-info-card landing-chain-card">
            <div>
              <p className="landing-kicker blue">{t('app.landing.redesign.onChain.kicker')}</p>
              <h2>{t('app.landing.redesign.onChain.title')}</h2>
              <p>
                {t('app.landing.redesign.onChain.body')}
              </p>
              <ul className="landing-check-list">
                <li><CheckCircle2 size={18} /> {t('app.landing.redesign.onChain.checkSecurity')}</li>
                <li><CheckCircle2 size={18} /> {t('app.landing.redesign.onChain.checkReplication')}</li>
                <li><CheckCircle2 size={18} /> {t('app.landing.redesign.onChain.checkAlwaysOn')}</li>
                <li><CheckCircle2 size={18} /> {t('app.landing.redesign.onChain.checkJurisdiction')}</li>
              </ul>
            </div>
            <div className="landing-map-wrap">
              <img src={networkMap} alt={t('app.landing.redesign.onChain.mapAlt')} />
              <div className="landing-shield-badge"><ShieldCheck size={38} /></div>
            </div>
          </article>
        </section>

        <section id="faq" className="landing-section landing-faq-section">
          <p className="landing-kicker purple">{t('app.landing.redesign.faq.kicker')}</p>
          <h2>{t('app.landing.redesign.faq.title')}</h2>
          <div className="landing-faq-grid">
            {faqs.map((faqKey) => (
              <details className="landing-faq-item" key={faqKey}>
                <summary>{t(`app.landing.redesign.faq.items.${faqKey}.question`)}</summary>
                <p>{t(`app.landing.redesign.faq.items.${faqKey}.answer`)}</p>
              </details>
            ))}
          </div>
          <p className="landing-contact">
            {t('app.landing.redesign.faq.contactPrefix')} <a href="mailto:community@example.org">{t('app.landing.redesign.faq.contactLink')}</a>
          </p>
        </section>

        <section className="landing-cta-band">
          <div>
            <Megaphone size={44} />
            <div>
              <h2>{t('app.landing.redesign.cta.title')}</h2>
              <p>{t('app.landing.redesign.cta.body')}</p>
            </div>
          </div>
          <LandingAuthButton className="landing-dark-cta">
            {t('app.landing.redesign.actions.joinDao')} <ArrowRight size={18} />
          </LandingAuthButton>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
