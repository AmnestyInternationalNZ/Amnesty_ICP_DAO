import React from 'react';
import CommissionApp from './components/commission/CommissionApp';
import { commissionMode } from './commission-api';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import ProfileSetup from './components/ProfileSetup';
import MainTabs from './components/MainTabs';
import LoadingSpinner from './components/LoadingSpinner';
import SiteFooter from './components/SiteFooter';
import LandingPage from './components/LandingPage';
import PublicBoardPage from './components/boards/PublicBoardPage';
import PublicEventPage from './components/calendar/PublicEventPage';
import PublicCampaignPage from './components/fundraising/PublicCampaignPage';
import { parseAppPath } from './routing/appRoutes';

export default function App() {
  return commissionMode ? <CommissionApp /> : <LegacyApp />;
}

function LegacyApp() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;
  const currentRoute = parseAppPath(window.location.pathname);
  const isCommunityDeepLink = currentRoute.communityId !== null;
  const isPublicBoardRoute = currentRoute.page === 'publicBoard' && Boolean(currentRoute.publicBoardToken);
  const isPublicEventRoute = currentRoute.page === 'publicEvent' && Boolean(currentRoute.publicEventToken);
  const isPublicCampaignRoute = currentRoute.page === 'publicCampaign' && Boolean(currentRoute.publicCampaignToken);
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;
  const shouldShowProfileSetup = showProfileSetup && !isCommunityDeepLink;

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

  if (isPublicCampaignRoute && currentRoute.publicCampaignToken) {
    return (
      <div className="min-h-screen bg-amnesty-paper text-amnesty-ink">
        <PublicCampaignPage token={currentRoute.publicCampaignToken} />
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
      {!isAuthenticated ? (
        <LandingPage />
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
