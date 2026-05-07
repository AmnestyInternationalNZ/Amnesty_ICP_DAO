import React from 'react';
import { useTranslation } from 'react-i18next';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import LoginButton from './components/LoginButton';
import LanguageSwitcher from './components/LanguageSwitcher';
import ProfileSetup from './components/ProfileSetup';
import MainTabs from './components/MainTabs';
import LoadingSpinner from './components/LoadingSpinner';
import AmnestyLogo from './components/AmnestyLogo';
import SiteFooter from './components/SiteFooter';
import PublicBoardPage from './components/boards/PublicBoardPage';
import PublicEventPage from './components/calendar/PublicEventPage';
import { parseAppPath } from './routing/appRoutes';

export default function App() {
  const { t } = useTranslation();
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;
  const currentRoute = parseAppPath(window.location.pathname);
  const isCommunityDeepLink = currentRoute.communityId !== null;
  const isPublicBoardRoute = currentRoute.page === 'publicBoard' && Boolean(currentRoute.publicBoardToken);
  const isPublicEventRoute = currentRoute.page === 'publicEvent' && Boolean(currentRoute.publicEventToken);
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;
  const shouldShowProfileSetup = showProfileSetup && !isCommunityDeepLink;
  const landingNav = [
    { label: t('app.nav.communities'), href: '#communities' },
    { label: t('app.nav.proposals'), href: '#proposals' },
    { label: t('app.nav.campaigns'), href: '#campaigns' },
  ];

  if (isPublicBoardRoute && currentRoute.publicBoardToken) {
    return (
      <div className="min-h-screen bg-amnesty-paper text-amnesty-ink">
        <PublicBoardPage token={currentRoute.publicBoardToken} />
        <SiteFooter />
      </div>
    );
  }

  if (isPublicEventRoute && currentRoute.publicEventToken) {
    return (
      <div className="min-h-screen bg-amnesty-paper text-amnesty-ink">
        <PublicEventPage token={currentRoute.publicEventToken} />
        <SiteFooter />
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-amnesty-paper flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amnesty-paper text-amnesty-ink">
      {!isAuthenticated && (
        <header className="border-b border-amnesty-line bg-white">
          <div className="mx-auto flex max-w-7xl flex-col border-x border-amnesty-line lg:flex-row lg:items-stretch lg:justify-between">
            <div className="border-b border-amnesty-line lg:border-b-0 lg:border-r">
              <AmnestyLogo
                className="w-full max-w-[12rem]"
                imageClassName="block w-full h-auto"
              />
            </div>

            <div className="flex flex-1 flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <nav className="flex flex-wrap items-center gap-x-8 gap-y-3">
                {landingNav.map((item) => (
                  <a key={item.label} href={item.href} className="amnesty-nav-link">
                    {item.label}
                  </a>
                ))}
              </nav>

              <div className="flex flex-wrap items-center gap-3">
                <LanguageSwitcher compact />
                <LoginButton compact className="rounded-full px-7 py-3" />
              </div>
            </div>
          </div>
        </header>
      )}

      {!isAuthenticated ? (
        <>
          <main>
            <section className="bg-amnesty-ink text-white">
              <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
                <div className="grid gap-10 xl:grid-cols-[1fr_0.92fr] xl:items-stretch">
                  <div className="flex flex-col justify-center">
                    <p className="amnesty-kicker text-amnesty-yellow mb-5">
                      {t('app.landing.heroKicker')}
                    </p>
                    <h1 className="max-w-4xl text-5xl text-white md:text-7xl amnesty-heading">
                      {t('app.landing.heroTitle')}
                    </h1>
                    <p className="mt-6 max-w-3xl text-lg leading-8 text-white/82 md:text-2xl">
                      {t('app.landing.heroBody')}
                    </p>

                    <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                      <LoginButton className="w-full rounded-full sm:w-auto" />
                      <div className="border border-white/20 bg-white/8 px-5 py-4 text-left backdrop-blur">
                        <p className="amnesty-kicker text-amnesty-yellow mb-2">{t('common.labels.accessModel')}</p>
                        <p className="max-w-xl text-base leading-7 text-white/82">
                          {t('app.landing.accessBody')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="amnesty-hero-art relative overflow-hidden border border-white/18">
                    <div className="absolute right-6 top-6 hidden sm:block">
                      <AmnestyLogo
                        className="max-w-[10rem]"
                        imageClassName="w-full border border-black/15"
                      />
                    </div>

                    <div className="relative flex min-h-[28rem] h-full flex-col justify-end px-8 py-10 md:px-12">
                      <p className="amnesty-kicker text-amnesty-yellow mb-4">{t('app.landing.artKicker')}</p>
                      <h2 className="max-w-[19rem] text-5xl text-white md:max-w-[22rem] md:text-[4.25rem] amnesty-heading">
                        {t('app.landing.artTitle')}
                      </h2>
                      <p className="mt-6 max-w-[21rem] text-base leading-7 text-white/84 md:text-lg">
                        {t('app.landing.artBody')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="communities" className="border-b border-amnesty-line bg-white">
              <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-24">
                <div className="bg-amnesty-yellow px-8 py-10">
                  <p className="amnesty-kicker text-amnesty-ink mb-4">{t('app.landing.joinKicker')}</p>
                  <h2 className="max-w-md text-5xl text-amnesty-ink md:text-6xl amnesty-heading">
                    {t('app.landing.joinTitle')}
                  </h2>
                  <p className="mt-6 max-w-lg text-lg leading-8 text-amnesty-ink">
                    {t('app.landing.joinBody')}
                  </p>
                </div>

                <div className="flex flex-col justify-center">
                  <h3 className="max-w-3xl text-5xl text-amnesty-ink md:text-6xl amnesty-heading">
                    {t('app.landing.visibilityTitle')}
                  </h3>
                  <p className="mt-8 max-w-3xl text-xl leading-8 text-amnesty-ink">
                    {t('app.landing.visibilityBody')}
                  </p>
                  <p className="mt-8 max-w-3xl text-xl font-semibold leading-8 text-amnesty-ink">
                    {t('app.landing.visibilityCallout')}
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-amnesty-ink text-white">
              <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="amnesty-kicker text-amnesty-yellow mb-4">{t('app.landing.actionKicker')}</p>
                    <h2 className="max-w-3xl text-5xl text-white md:text-6xl amnesty-heading">
                      {t('app.landing.actionTitle')}
                    </h2>
                  </div>
                  <p className="max-w-2xl text-lg leading-8 text-white/74">
                    {t('app.landing.actionBody')}
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <article className="bg-white px-7 py-8 text-amnesty-ink amnesty-card-lift">
                    <div className="mb-5 h-1.5 w-24 bg-amnesty-green" />
                    <p className="amnesty-kicker text-amnesty-green mb-4">{t('app.nav.communities')}</p>
                    <h3 className="text-4xl amnesty-heading">{t('app.landing.cards.communitiesTitle')}</h3>
                    <p className="mt-5 text-lg leading-8 text-amnesty-ink">
                      {t('app.landing.cards.communitiesBody')}
                    </p>
                  </article>

                  <article id="proposals" className="bg-white px-7 py-8 text-amnesty-ink amnesty-card-lift">
                    <div className="mb-5 h-1.5 w-24 bg-amnesty-pink" />
                    <p className="amnesty-kicker text-amnesty-pink mb-4">{t('app.nav.proposals')}</p>
                    <h3 className="text-4xl amnesty-heading">{t('app.landing.cards.proposalsTitle')}</h3>
                    <p className="mt-5 text-lg leading-8 text-amnesty-ink">
                      {t('app.landing.cards.proposalsBody')}
                    </p>
                  </article>

                  <article id="campaigns" className="bg-white px-7 py-8 text-amnesty-ink amnesty-card-lift">
                    <div className="mb-5 h-1.5 w-24 bg-amnesty-yellow" />
                    <p className="amnesty-kicker text-amnesty-orange mb-4">{t('app.nav.campaigns')}</p>
                    <h3 className="text-4xl amnesty-heading">{t('app.landing.cards.campaignsTitle')}</h3>
                    <p className="mt-5 text-lg leading-8 text-amnesty-ink">
                      {t('app.landing.cards.campaignsBody')}
                    </p>
                  </article>
                </div>
              </div>
            </section>
          </main>

          <SiteFooter />
        </>
      ) : shouldShowProfileSetup ? (
        <>
          <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <ProfileSetup />
          </main>
          <SiteFooter />
        </>
      ) : profileLoading ? (
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex justify-center py-16">
            <LoadingSpinner size="large" />
          </div>
        </main>
      ) : (
        <MainTabs />
      )}
    </div>
  );
}
