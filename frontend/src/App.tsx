import React from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import LoginButton from './components/LoginButton';
import ProfileSetup from './components/ProfileSetup';
import MainTabs from './components/MainTabs';
import LoadingSpinner from './components/LoadingSpinner';
import AmnestyLogo from './components/AmnestyLogo';

const landingNav = [
  { label: 'Communities', href: '#communities' },
  { label: 'Proposals', href: '#proposals' },
  { label: 'Campaigns', href: '#campaigns' },
];

const appNav = [
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'Communities', href: '#communities' },
  { label: 'Platform', href: '#platform' },
];

function StatementBand() {
  return (
    <section className="bg-amnesty-yellow">
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="mx-auto max-w-5xl text-3xl font-bold leading-tight text-amnesty-ink md:text-5xl amnesty-heading">
          Community voice, visible accountability, and collective action belong in the
          same place.
        </p>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-20">
      <StatementBand />
      <div className="bg-amnesty-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr] lg:px-8">
          <div className="space-y-5">
            <AmnestyLogo className="max-w-[11rem]" imageClassName="w-full" />
            <p className="max-w-sm text-base leading-7 text-white/74">
              A local expression of Amnesty Community, shaped for proposals, campaigns,
              and people power across Aotearoa.
            </p>
          </div>

          <div>
            <p className="mb-5 text-xl text-white amnesty-heading">Community</p>
            <p className="text-base leading-7 text-white/74">
              Browse community spaces, read the kaupapa behind each group, and see where
              you can take part.
            </p>
          </div>

          <div>
            <p className="mb-5 text-xl text-white amnesty-heading">Governance</p>
            <p className="text-base leading-7 text-white/74">
              Debate proposals with visible voting windows, quorum settings, and clearly
              attributed decisions.
            </p>
          </div>

          <div>
            <p className="mb-5 text-xl text-white amnesty-heading">Action</p>
            <p className="text-base leading-7 text-white/74">
              Support campaigns, fund urgent work together, and keep community action
              grounded in accountability.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;
  const navigation = isAuthenticated ? appNav : landingNav;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-amnesty-paper flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amnesty-paper text-amnesty-ink">
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
              {navigation.map((item) => (
                <a key={item.label} href={item.href} className="amnesty-nav-link">
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {isAuthenticated && userProfile && (
                <div className="border border-amnesty-line bg-white px-4 py-3">
                  <p className="amnesty-kicker text-amnesty-blue mb-1">Signed in</p>
                  <p className="text-lg text-amnesty-ink amnesty-heading">{userProfile.name}</p>
                </div>
              )}
              <LoginButton compact className="rounded-full px-7 py-3" />
            </div>
          </div>
        </div>
      </header>

      {!isAuthenticated ? (
        <>
          <main>
            <section className="bg-amnesty-ink text-white">
              <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
                <div className="grid gap-10 xl:grid-cols-[1fr_0.92fr] xl:items-stretch">
                  <div className="flex flex-col justify-center">
                    <p className="amnesty-kicker text-amnesty-yellow mb-5">
                      A human rights movement in Aotearoa
                    </p>
                    <h1 className="max-w-4xl text-5xl text-white md:text-7xl amnesty-heading">
                      People power for community governance
                    </h1>
                    <p className="mt-6 max-w-3xl text-lg leading-8 text-white/82 md:text-2xl">
                      Bring Amnesty communities together to organise local events, debate
                      proposals, and fund urgent action with visible accountability.
                    </p>

                    <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                      <LoginButton className="w-full rounded-full sm:w-auto" />
                      <div className="border border-white/20 bg-white/8 px-5 py-4 text-left backdrop-blur">
                        <p className="amnesty-kicker text-amnesty-yellow mb-2">Access model</p>
                        <p className="max-w-xl text-base leading-7 text-white/82">
                          Viewers can explore every community. Assigned members and
                          community admins can propose, vote, and contribute together.
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
                      <p className="amnesty-kicker text-amnesty-yellow mb-4">People power</p>
                      <h2 className="max-w-[19rem] text-5xl text-white md:max-w-[22rem] md:text-[4.25rem] amnesty-heading">
                        If you care enough to question, you care enough to act.
                      </h2>
                      <p className="mt-6 max-w-[21rem] text-base leading-7 text-white/84 md:text-lg">
                        Shape collective decisions, support urgent campaigns, and keep
                        community action grounded in accountability.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="communities" className="border-b border-amnesty-line bg-white">
              <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-24">
                <div className="bg-amnesty-yellow px-8 py-10">
                  <p className="amnesty-kicker text-amnesty-ink mb-4">Join Amnesty Community</p>
                  <h2 className="max-w-md text-5xl text-amnesty-ink md:text-6xl amnesty-heading">
                    Meet other human rights advocates
                  </h2>
                  <p className="mt-6 max-w-lg text-lg leading-8 text-amnesty-ink">
                    Communities create a shared place to organise around local action,
                    clear participation, and practical solidarity.
                  </p>
                </div>

                <div className="flex flex-col justify-center">
                  <h3 className="max-w-3xl text-5xl text-amnesty-ink md:text-6xl amnesty-heading">
                    When community voice becomes visible, action can move faster.
                  </h3>
                  <p className="mt-8 max-w-3xl text-xl leading-8 text-amnesty-ink">
                    Read community spaces, understand the local kaupapa, and see where you
                    can help organise proposals, campaigns, and people power.
                  </p>
                  <p className="mt-8 max-w-3xl text-xl font-semibold leading-8 text-amnesty-ink">
                    <span className="amnesty-underline">View communities openly.</span>{' '}
                    Take part where you are trusted with a role.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-amnesty-ink text-white">
              <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="amnesty-kicker text-amnesty-yellow mb-4">Take action together</p>
                    <h2 className="max-w-3xl text-5xl text-white md:text-6xl amnesty-heading">
                      Build local momentum across communities, proposals, and campaigns.
                    </h2>
                  </div>
                  <p className="max-w-2xl text-lg leading-8 text-white/74">
                    The live Amnesty site balances urgency with openness. This application
                    now follows that same rhythm: more editorial space, clearer calls to
                    action, and less of the boxed dashboard feel.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <article className="bg-white px-7 py-8 text-amnesty-ink amnesty-card-lift">
                    <div className="mb-5 h-1.5 w-24 bg-amnesty-green" />
                    <p className="amnesty-kicker text-amnesty-green mb-4">Communities</p>
                    <h3 className="text-4xl amnesty-heading">Build local momentum</h3>
                    <p className="mt-5 text-lg leading-8 text-amnesty-ink">
                      Organise community spaces, invite participation deliberately, and
                      keep human rights work rooted in people power.
                    </p>
                  </article>

                  <article id="proposals" className="bg-white px-7 py-8 text-amnesty-ink amnesty-card-lift">
                    <div className="mb-5 h-1.5 w-24 bg-amnesty-pink" />
                    <p className="amnesty-kicker text-amnesty-pink mb-4">Proposals</p>
                    <h3 className="text-4xl amnesty-heading">Use community voice</h3>
                    <p className="mt-5 text-lg leading-8 text-amnesty-ink">
                      Move ideas from discussion to decision with clear windows, visible
                      voting results, and community accountability.
                    </p>
                  </article>

                  <article id="campaigns" className="bg-white px-7 py-8 text-amnesty-ink amnesty-card-lift">
                    <div className="mb-5 h-1.5 w-24 bg-amnesty-yellow" />
                    <p className="amnesty-kicker text-amnesty-orange mb-4">Campaigns</p>
                    <h3 className="text-4xl amnesty-heading">Practice generosity</h3>
                    <p className="mt-5 text-lg leading-8 text-amnesty-ink">
                      Support urgent work together with shared targets, visible progress,
                      and community-led fundraising decisions.
                    </p>
                  </article>
                </div>
              </div>
            </section>
          </main>

          <SiteFooter />
        </>
      ) : showProfileSetup ? (
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
        <>
          <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <MainTabs />
          </main>
          <SiteFooter />
        </>
      )}
    </div>
  );
}
